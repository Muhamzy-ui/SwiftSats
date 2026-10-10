"""
Platform configuration and runtime controls for SwiftSats.
Stores 24/7 automation mode, settlement account details, and fee settings.
"""
from django.db import models


class PlatformSettings(models.Model):
    """
    Singleton runtime platform configuration.
    """
    class PayoutMode(models.TextChoices):
        AUTOMATED = "AUTOMATED", "24/7 Fully Automated (Nomba Webhook)"
        MANUAL = "MANUAL", "Manual Admin Approval"

    payout_mode = models.CharField(
        max_length=20,
        choices=PayoutMode.choices,
        default=PayoutMode.MANUAL,
        help_text="24/7 automated instant payout vs manual 1-tap admin approval"
    )
    use_paystack_virtual_accounts = models.BooleanField(
        default=False,
        help_text="Generate Paystack dynamic accounts vs Direct Merchant Settlement Bank Account"
    )
    # Primary Settlement Account
    settlement_bank_name = models.CharField(
        max_length=64,
        default="Nomba Microfinance Bank",
        help_text="Primary bank partner"
    )
    settlement_account_name = models.CharField(
        max_length=128,
        default="Mbovibe Systems/swiftsats",
        help_text="Primary settlement desk account name"
    )
    settlement_account_number = models.CharField(
        max_length=32,
        default="1623796514",
        help_text="Primary account number"
    )

    # Secondary Settlement Account
    settlement_bank_name_2 = models.CharField(
        max_length=64,
        default="Nomba Microfinance Bank",
        help_text="Secondary virtual bank partner"
    )
    settlement_account_name_2 = models.CharField(
        max_length=128,
        default="Mbovibe Systems/swiftsats",
        help_text="Secondary settlement desk account name"
    )
    settlement_account_number_2 = models.CharField(
        max_length=32,
        default="1623796514",
        help_text="Secondary virtual account number"
    )

    rotate_accounts = models.BooleanField(
        default=False,
        help_text="Automatically alternate between settlement accounts for each incoming order"
    )
    rotation_counter = models.IntegerField(
        default=0,
        help_text="Internal counter tracking account round-robin rotation"
    )

    telegram_alerts_enabled = models.BooleanField(
        default=True,
        help_text="Dispatch instant alerts to Telegram bot"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_settings"
        verbose_name = "Platform Setting"
        verbose_name_plural = "Platform Settings"

    @classmethod
    def get_settings(cls) -> "PlatformSettings":
        settings_obj, _ = cls.objects.get_or_create(id=1)
        return settings_obj

    def get_next_settlement_account(self) -> dict:
        """
        Cycles between Account 1 (Moniepoint) and Account 2 (Nomba) if rotation is enabled.
        Returns a dict: {"bank_name": ..., "account_number": ..., "account_name": ...}
        """
        if not self.rotate_accounts or not self.settlement_account_number_2:
            return {
                "bank_name": self.settlement_bank_name,
                "account_number": self.settlement_account_number,
                "account_name": self.settlement_account_name,
            }

        self.rotation_counter = (self.rotation_counter + 1) % 1000000
        self.save(update_fields=["rotation_counter"])

        if self.rotation_counter % 2 == 0:
            return {
                "bank_name": self.settlement_bank_name,
                "account_number": self.settlement_account_number,
                "account_name": self.settlement_account_name,
            }
        else:
            return {
                "bank_name": self.settlement_bank_name_2,
                "account_number": self.settlement_account_number_2,
                "account_name": self.settlement_account_name_2,
            }


class PartnerIntegration(models.Model):
    """
    Linked Website / App Integration (e.g. Axiom Wallet, external partner sites).
    Controls deep-linking activation, tracking, and revenue attribution.
    """
    name = models.CharField(max_length=128, help_text="Human-friendly name of the linked website or app")
    code = models.SlugField(max_length=64, unique=True, db_index=True, help_text="Unique slug/identifier (e.g. 'axiom_wallet')")
    is_active = models.BooleanField(default=True, help_text="Toggle to activate or deactivate this partner's link")
    website_url = models.URLField(blank=True, null=True, help_text="URL of the partner website")
    commission_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Partner commission rate % (if any)")
    notes = models.TextField(blank=True, null=True, help_text="Internal notes or contact info")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "partner_integrations"
        ordering = ["-created_at"]
        verbose_name = "Partner Integration"
        verbose_name_plural = "Partner Integrations"

    def __str__(self):
        return f"{self.name} ({self.code}) - {'ACTIVE' if self.is_active else 'INACTIVE'}"
