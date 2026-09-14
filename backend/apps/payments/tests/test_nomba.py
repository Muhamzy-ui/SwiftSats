"""
Unit & Integration Tests for Nomba 24/7 Webhook & Dynamic Kobo Salt Automation.
"""
import uuid
import json
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase, Client
from django.utils import timezone
from apps.orders.models import Order, UnmatchedPaymentAlert
from apps.admin_api.models import PlatformSettings
from core.constants import OrderStatus, SupportedCoin, BlockchainNetwork


class NombaAutomationTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.platform_settings = PlatformSettings.get_settings()
        self.platform_settings.payout_mode = PlatformSettings.PayoutMode.AUTOMATED
        self.platform_settings.save()

    def test_kobo_salt_generation_unique_across_orders(self):
        """Test that multiple quotes generate unique kobo salts without collision."""
        base_amount = 10000
        salts = set()
        for i in range(10):
            res = self.client.post("/api/v1/orders/quote/", {
                "coin": "USDT_TRC20",
                "amount_ngn": base_amount,
            }, content_type="application/json")
            self.assertEqual(res.status_code, 201)
            data = res.json()
            salt = data["salt_kobo_value"]
            self.assertGreaterEqual(salt, 11)
            self.assertLessEqual(salt, 99)
            salts.add(salt)
            self.assertIn(data["settlement_bank"], ["Moniepoint MFB", "Nomba MFB"])
            self.assertEqual(data["expires_in_seconds"], 900)

        # 10 quotes created consecutively should all have unique salts
        self.assertEqual(len(salts), 10)

    def test_nomba_webhook_24_7_automated_payout(self):
        """Test full 24/7 automated flow from Nomba webhook to Quidax payout."""
        # 1. Create quote
        quote_res = self.client.post("/api/v1/orders/quote/", {
            "coin": "SOL",
            "amount_ngn": 25000,
        }, content_type="application/json")
        self.assertEqual(quote_res.status_code, 201)
        quote_data = quote_res.json()
        expected_amount = Decimal(quote_data["fiat_amount_expected"])
        order_ref = quote_data["order_reference"]

        # 2. Lock wallet
        lock_res = self.client.post("/api/v1/orders/create/", {
            "order_reference": order_ref,
            "wallet_address": "7EYnhQoR9YM3N7UoaKRoA44BW8WDakFCafRoeErC9QKA",
            "user_email": "test@swiftsats.io",
        }, content_type="application/json")
        self.assertEqual(lock_res.status_code, 200)

        # 3. Simulate Nomba webhook inbound payment
        webhook_payload = {
            "event_type": "payment_success",
            "data": {
                "amount": float(expected_amount),
                "transaction_reference": f"NMB_TX_{uuid.uuid4().hex[:12]}",
                "sender_name": "Amina Bello",
                "status": "SUCCESS",
            }
        }
        wb_res = self.client.post(
            "/api/v1/payments/webhook/nomba/",
            data=json.dumps(webhook_payload),
            content_type="application/json"
        )
        self.assertEqual(wb_res.status_code, 200)
        wb_data = wb_res.json()
        self.assertEqual(wb_data["status"], "automated_success")
        self.assertTrue(len(wb_data["tx_hash"]) > 0)

        # 4. Verify order completed in DB
        order = Order.objects.get(order_reference=order_ref)
        self.assertEqual(order.status, OrderStatus.COMPLETED)
        self.assertIsNotNone(order.completed_at)
        self.assertIsNotNone(order.speed_metric_ms)
        self.assertTrue(order.tx_hash.startswith("0x"))

    def test_nomba_webhook_idempotency(self):
        """Test that replaying the exact same bank transfer does not double-payout."""
        quote_res = self.client.post("/api/v1/orders/quote/", {
            "coin": "USDT_TRC20",
            "amount_ngn": 15000,
        }, content_type="application/json")
        quote_data = quote_res.json()
        expected_amount = float(quote_data["fiat_amount_expected"])
        order_ref = quote_data["order_reference"]

        self.client.post("/api/v1/orders/create/", {
            "order_reference": order_ref,
            "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeSTow5KAnsP5",
        }, content_type="application/json")

        bank_tx_ref = f"NMB_TX_REPEAT_{uuid.uuid4().hex[:8]}"
        payload = {
            "data": {
                "amount": expected_amount,
                "transaction_reference": bank_tx_ref,
                "sender_name": "Chidi Eze",
            }
        }

        # First call: succeeds
        res1 = self.client.post("/api/v1/payments/webhook/nomba/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["status"], "automated_success")

        # Second call with same reference: returns already_processed
        res2 = self.client.post("/api/v1/payments/webhook/nomba/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["status"], "already_processed")

    def test_unmatched_payment_logged(self):
        """Test that unexpected payment is logged to UnmatchedPaymentAlert without crashing."""
        payload = {
            "data": {
                "amount": 99999.99,  # No order exists for this
                "transaction_reference": f"NMB_TX_UNKNOWN_{uuid.uuid4().hex[:8]}",
                "sender_name": "Unknown Sender",
            }
        }
        res = self.client.post("/api/v1/payments/webhook/nomba/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "unmatched_logged")

        alert = UnmatchedPaymentAlert.objects.filter(transaction_reference=payload["data"]["transaction_reference"]).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.amount, Decimal("99999.99"))
        self.assertEqual(alert.reason, "NO_ACTIVE_ORDER_MATCH")

    def test_manual_mode_holds_for_admin_approval(self):
        """Test that switching to MANUAL mode holds order in VERIFYING state."""
        self.platform_settings.payout_mode = PlatformSettings.PayoutMode.MANUAL
        self.platform_settings.save()

        quote_res = self.client.post("/api/v1/orders/quote/", {
            "coin": "BTC",
            "amount_ngn": 50000,
        }, content_type="application/json")
        quote_data = quote_res.json()
        expected_amount = float(quote_data["fiat_amount_expected"])
        order_ref = quote_data["order_reference"]

        self.client.post("/api/v1/orders/create/", {
            "order_reference": order_ref,
            "wallet_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        }, content_type="application/json")

        payload = {
            "data": {
                "amount": expected_amount,
                "transaction_reference": f"NMB_TX_MANUAL_{uuid.uuid4().hex[:8]}",
                "sender_name": "Emeka Obi",
            }
        }
        res = self.client.post("/api/v1/payments/webhook/nomba/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "awaiting_manual_approval")

        order = Order.objects.get(order_reference=order_ref)
        self.assertEqual(order.status, OrderStatus.VERIFYING)
