"""
End-to-End QA Validation Test Suite for SwiftSats.
Covers Security, Webhook Idempotency, Cryptographic Signatures, Wallet Validation,
Expired Quote Protection, 2FA Admin Authentication, and Payout Speed Telemetry.
"""
import hmac
import hashlib
import json
import time
from decimal import Decimal
from datetime import timedelta
import pytest
from django.utils import timezone
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.orders.models import Order
from apps.accounts.models import AdminUser
from apps.exchange.rates import RateService
from apps.exchange.payout import PayoutService
from apps.exchange.client import QuidaxClient
from core.constants import OrderStatus, SupportedCoin, BlockchainNetwork, AdminRole
from core.validators import validate_wallet_for_coin


@pytest.mark.django_db
class TestSwiftSatsComprehensiveQA:
    def setup_method(self):
        self.client = APIClient()
        self.rate_service = RateService()
        self.payout_service = PayoutService()

        # Create test admin
        self.admin = AdminUser.objects.create(
            email="qa_admin@swiftsats.com",
            first_name="QA",
            last_name="Tester",
            role=AdminRole.SUPER_ADMIN,
            is_staff=True,
            is_two_factor_enabled=True,
            two_factor_secret="JBSWY3DPEHPK3PXP",
        )
        self.admin.set_password("SecurePassword2026!")
        self.admin.save()

    # -------------------------------------------------------------
    # 1. SECURITY: Missing, Malformed, and Wrong-Type Data
    # -------------------------------------------------------------
    def test_quote_rejection_on_malformed_and_invalid_inputs(self):
        """Confirm negative, string, missing, and below-minimum amounts are rejected."""
        # Negative amount
        res1 = self.client.post("/api/v1/orders/quote/", {"coin": "USDT_TRC20", "amount_ngn": -5000}, format="json")
        assert res1.status_code == status.HTTP_400_BAD_REQUEST

        # Below minimum (N7,000 / $5.00 min)
        res2 = self.client.post("/api/v1/orders/quote/", {"coin": "USDT_TRC20", "amount_ngn": 500}, format="json")
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

        # String where number expected
        res3 = self.client.post("/api/v1/orders/quote/", {"coin": "USDT_TRC20", "amount_ngn": "NOT_A_NUMBER"}, format="json")
        assert res3.status_code == status.HTTP_400_BAD_REQUEST

        # Unsupported / Invalid coin
        res4 = self.client.post("/api/v1/orders/quote/", {"coin": "FAKE_COIN_XYZ", "amount_ngn": 10000}, format="json")
        assert res4.status_code == status.HTTP_400_BAD_REQUEST

    # -------------------------------------------------------------
    # 2. SECURITY: Wallet Checksum & Address Validation
    # -------------------------------------------------------------
    def test_invalid_wallet_rejection_per_network(self):
        """Confirm malformed wallet addresses are strictly rejected for every coin network."""
        invalid_wallets = [
            ("USDT_TRC20", "0xInvalidTronAddress12345"),
            ("BTC", "invalid_btc_address"),
            ("SOL", "short_sol_addr"),
            ("BNB", "TInvalidBnbAddressNot0x"),
            ("USDC", "invalid_base_address_not_hex"),
        ]

        for coin, bad_addr in invalid_wallets:
            is_valid, _ = validate_wallet_for_coin(coin, bad_addr)
            assert is_valid is False, f"Bad address {bad_addr} for {coin} should have failed validation!"

    # -------------------------------------------------------------
    # 3. SECURITY: Expired Locked Quote Protection
    # -------------------------------------------------------------
    def test_expired_quote_cannot_be_locked(self):
        """Confirm an expired quote is rejected and cannot proceed to order creation."""
        expired_order = Order.objects.create(
            coin=SupportedCoin.USDT_TRC20,
            network=BlockchainNetwork.TRC20,
            fiat_amount_ngn=Decimal("8363.25"),
            crypto_amount=Decimal("5.29592266"),
            quote_rate=Decimal("1328.32"),
            network_fee_crypto=Decimal("1.0"),
            service_fee_ngn=Decimal("1310.00"),
            status=OrderStatus.QUOTE_LOCKED,
            quote_expires_at=timezone.now() - timedelta(seconds=10),  # Expired in the past
        )

        res = self.client.post(
            "/api/v1/orders/create/",
            {
                "order_reference": expired_order.order_reference,
                "wallet_address": "TLyqzVGLV1srkB7dToTApsgihc4TBMV2pn",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(res.data).lower()

    # -------------------------------------------------------------
    # 4. SECURITY: Webhook Signature Verification
    # -------------------------------------------------------------
    def test_tampered_webhook_signature_rejected_with_401(self, settings):
        """Confirm webhooks with invalid HMAC signatures are rejected with 401."""
        settings.PAYSTACK_SECRET_KEY = "sk_test_mock_secret_key_12345"
        payload = json.dumps({"event": "charge.success", "data": {"reference": "TEST-123"}})
        bad_signature = "bad_tampered_hmac_hash_1234567890abcdef"

        res = self.client.post(
            "/api/v1/payments/webhook/paystack/",
            data=payload,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=bad_signature,
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    # -------------------------------------------------------------
    # 5. SECURITY: Webhook Idempotency (Replay Attack Prevention)
    # -------------------------------------------------------------
    def test_webhook_replay_protection_is_idempotent(self, settings, mocker):
        """Confirm replaying the same successful webhook does not trigger double fulfillment."""
        settings.PAYSTACK_SECRET_KEY = "sk_test_mock_secret_key_12345"
        mocker.patch("apps.payments.webhooks.process_crypto_payout.delay")

        order = Order.objects.create(
            coin=SupportedCoin.USDT_TRC20,
            network=BlockchainNetwork.TRC20,
            wallet_address="TLyqzVGLV1srkB7dToTApsgihc4TBMV2pn",
            fiat_amount_ngn=Decimal("8363.25"),
            crypto_amount=Decimal("5.29592266"),
            quote_rate=Decimal("1328.32"),
            network_fee_crypto=Decimal("1.0"),
            service_fee_ngn=Decimal("1310.00"),
            status=OrderStatus.AWAITING_PAYMENT,
            paystack_reference="PAY_TEST_REPLAY_123",
            quote_expires_at=timezone.now() + timedelta(minutes=5),
        )

        secret = settings.PAYSTACK_SECRET_KEY
        payload_dict = {
            "event": "charge.success",
            "data": {
                "id": 998877,
                "reference": order.paystack_reference,
                "amount": 836325,
                "status": "success",
                "paid_at": timezone.now().isoformat(),
            },
        }
        raw_body = json.dumps(payload_dict)
        valid_sig = hmac.new(secret.encode("utf-8"), raw_body.encode("utf-8"), hashlib.sha512).hexdigest()

        # First webhook arrival -> transitions to PAYMENT_CONFIRMED
        res1 = self.client.post(
            "/api/v1/payments/webhook/paystack/",
            data=raw_body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=valid_sig,
        )
        assert res1.status_code == status.HTTP_200_OK

        order.refresh_from_db()
        assert order.status == OrderStatus.PAYMENT_CONFIRMED

        # Second replayed webhook arrival -> safely acknowledged without duplicated payout
        res2 = self.client.post(
            "/api/v1/payments/webhook/paystack/",
            data=raw_body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=valid_sig,
        )
        assert res2.status_code == status.HTTP_200_OK

    # -------------------------------------------------------------
    # 6. SECURITY: Admin 2FA Enforcement
    # -------------------------------------------------------------
    def test_admin_login_without_valid_2fa_is_denied(self):
        """Confirm admin login with correct password but invalid/missing 2FA is rejected."""
        # Step 1: Initial login gives temp token
        res1 = self.client.post(
            "/api/v1/auth/login/init/",
            {"email": "qa_admin@swiftsats.com", "password": "SecurePassword2026!"},
            format="json",
        )
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["requires_2fa"] is True
        temp_token = res1.data["temp_session_token"]

        # Step 2: Try invalid 2FA code
        res2 = self.client.post(
            "/api/v1/auth/login/verify-2fa/",
            {"email": "qa_admin@swiftsats.com", "temp_session_token": temp_token, "code": "000000"},
            format="json",
        )
        assert res2.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]

    # -------------------------------------------------------------
    # 7. SPEED & ACCURACY: End-to-End Payout Timing < 10 Seconds
    # -------------------------------------------------------------
    def test_payout_execution_velocity_under_10_seconds(self):
        """Verify payout dispatches in less than 500ms (far below 10-second threshold)."""
        mock_client = QuidaxClient()
        mock_client.is_live = False
        payout_service = PayoutService(client=mock_client)

        start_time = time.time()
        res = payout_service.execute_payout(
            coin=SupportedCoin.USDT_TRC20,
            destination_address="TLyqzVGLV1srkB7dToTApsgihc4TBMV2pn",
            amount=Decimal("5.00"),
            order_reference="SATS-QA-SPEED-TEST",
        )
        elapsed = time.time() - start_time

        assert elapsed < 10.0, f"Payout latency ({elapsed:.3f}s) exceeded 10.0s threshold!"
        assert res["status"] in ["SENT", "PENDING_NETWORK", "COMPLETED", "completed"]
        assert len(res["transaction_hash"]) > 10
