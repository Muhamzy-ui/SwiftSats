"""
Core Order Model for SwiftSats.
Stores exact amounts, rates, Paystack virtual account details, and Quidax payout tx hashes.
"""
import uuid
import secrets
from django.db import models
from django.utils import timezone
from core.constants import OrderStatus, SupportedCoin, BlockchainNetwork, COIN_METADATA


def generate_order_reference() -> str:
    """Generate a clean, unambiguous order reference e.g., 'SATS-8F2K-9X1B'."""
    prefix = "SATS"
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"{prefix}-{part1}-{part2}"


class Order(models.Model):
    """
    Crypto onramp purchase order.
    State transitions are strictly managed via OrderStateMachine.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_reference = models.CharField(
        max_length=64,
        unique=True,
        default=generate_order_reference,
        db_index=True,
        help_text="Public-facing unique order reference"
    )
    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # Asset Selection
    coin = models.CharField(max_length=32, choices=SupportedCoin.choices)
    network = models.CharField(max_length=32, choices=BlockchainNetwork.choices)

    # Amounts & Rates (Locked server-side)
    fiat_amount_ngn = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Exact amount in NGN the user must pay"
    )
    crypto_amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Exact crypto amount to be delivered to wallet"
    )
    quote_rate = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        help_text="Locked NGN price per 1 full unit of crypto"
    )
    service_fee_ngn = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="SwiftSats platform fee in NGN"
    )
    network_fee_crypto = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=0,
        help_text="Blockchain gas/network fee deducted or covered"
    )

    # Destination & Customer
    wallet_address = models.CharField(max_length=128, db_index=True)
    user_email = models.EmailField(blank=True, null=True, help_text="Optional receipt email")
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Dynamic Kobo Salt & Nomba Automation
    salt_kobo_value = models.IntegerField(null=True, blank=True, help_text="Unique 2-digit kobo salt 11-99")
    fiat_amount_expected = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        db_index=True,
        help_text="Exact expected NGN amount including unique kobo salt"
    )
    receipt_image = models.FileField(upload_to="receipts/%Y/%m/", null=True, blank=True)
    nomba_transaction_ref = models.CharField(max_length=128, blank=True, null=True, unique=True, db_index=True)
    payout_tx_hash = models.CharField(max_length=128, blank=True, null=True, db_index=True)

    # State
    status = models.CharField(
        max_length=32,
        choices=OrderStatus.choices,
        default=OrderStatus.QUOTE_LOCKED,
        db_index=True
    )
    quote_expires_at = models.DateTimeField(db_index=True)

    # Paystack Virtual Account Details (Naira Inflow)
    paystack_reference = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    virtual_account_number = models.CharField(max_length=64, blank=True, null=True)
    virtual_bank_name = models.CharField(max_length=64, blank=True, null=True)
    virtual_account_name = models.CharField(max_length=128, blank=True, null=True)
    paystack_customer_code = models.CharField(max_length=64, blank=True, null=True)

    # Quidax Payout Details (Crypto Outflow)
    quidax_payout_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    quidax_swap_id = models.CharField(max_length=128, blank=True, null=True)
    tx_hash = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    payout_error = models.TextField(blank=True, null=True)

    # Audit & Speed Metrics
    payment_received_at = models.DateTimeField(null=True, blank=True)
    payout_initiated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    speed_metric_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Milliseconds from payment-webhook-received to payout-request-sent"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        verbose_name = "Crypto Order"
        verbose_name_plural = "Crypto Orders"
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["coin", "-created_at"]),
            models.Index(fields=["paystack_reference"]),
            models.Index(fields=["quidax_payout_id"]),
        ]

    def __str__(self) -> str:
        return f"[{self.order_reference}] {self.fiat_amount_ngn:,.2f} NGN -> {self.crypto_amount} {self.coin} ({self.status})"

    @property
    def is_quote_expired(self) -> bool:
        """Check if quote has expired."""
        if not self.quote_expires_at:
            return False
        return timezone.now() > self.quote_expires_at

    @property
    def masked_wallet_address(self) -> str:
        """Display address safely for public/admin UI (e.g. '0x1234...abcd')."""
        if not self.wallet_address or len(self.wallet_address) < 10:
            return self.wallet_address or ""
        return f"{self.wallet_address[:6]}...{self.wallet_address[-4:]}"

    @property
    def explorer_url(self) -> str:
        """Get public blockchain explorer URL for transaction hash."""
        if not self.tx_hash:
            return ""
        template = COIN_METADATA.get(self.coin, {}).get("explorer_url", "")
        return template.format(tx_hash=self.tx_hash) if template else ""


class UnmatchedPaymentAlert(models.Model):
    """
    Audit log of incoming bank payments that could not be automatically matched
    to an active order, arrived after expiration, or had mismatched amounts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    transaction_reference = models.CharField(max_length=128, unique=True, db_index=True)
    channel = models.CharField(max_length=32, default="NOMBA_WEBHOOK")
    reason = models.CharField(max_length=255)  # e.g., "EXPIRED_ORDER", "NO_ACTIVE_ORDER", "AMOUNT_MISMATCH"
    raw_payload = models.JSONField(default=dict)
    logged_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "unmatched_payment_alerts"
        ordering = ["-logged_at"]
        verbose_name = "Unmatched Payment Alert"
        verbose_name_plural = "Unmatched Payment Alerts"

    def __str__(self) -> str:
        return f"[ALERT] {self.amount:,.2f} NGN ({self.reason}) - Ref: {self.transaction_reference}"
