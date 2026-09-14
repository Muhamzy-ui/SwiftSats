"""
Tests for Paystack Webhook Cryptographic HMAC SHA512 Signature Verification.
"""
import hmac
import hashlib
import json
from apps.payments.signature import verify_paystack_webhook_signature


class TestPaystackSignature:
    """Test HMAC SHA512 signature verification."""

    def test_valid_signature_passes(self):
        secret = "test_paystack_secret_key_12345"
        payload = json.dumps({"event": "charge.success", "data": {"amount": 5000000}}).encode("utf-8")

        # Generate expected signature
        signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha512).hexdigest()

        assert verify_paystack_webhook_signature(
            request_body=payload,
            signature_header=signature,
            secret_key=secret,
        ) is True

    def test_tampered_payload_fails(self):
        secret = "test_paystack_secret_key_12345"
        payload = json.dumps({"event": "charge.success", "data": {"amount": 5000000}}).encode("utf-8")
        tampered_payload = json.dumps({"event": "charge.success", "data": {"amount": 5000}}).encode("utf-8")

        signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha512).hexdigest()

        assert verify_paystack_webhook_signature(
            request_body=tampered_payload,
            signature_header=signature,
            secret_key=secret,
        ) is False

    def test_empty_signature_fails(self):
        secret = "test_paystack_secret_key_12345"
        payload = b'{"test": 1}'
        assert verify_paystack_webhook_signature(
            request_body=payload,
            signature_header="",
            secret_key=secret,
        ) is False
