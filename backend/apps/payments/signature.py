"""
Cryptographic Webhook Signature Verification.
Protects payment endpoints from tampering or spoofed payment confirmations.
"""
import hmac
import hashlib
import logging
from typing import Union
from django.conf import settings
from core.exceptions import WebhookSignatureVerificationError

logger = logging.getLogger(__name__)


def verify_paystack_webhook_signature(
    request_body: Union[bytes, str],
    signature_header: str,
    secret_key: str = None
) -> bool:
    """
    Verify Paystack webhook signature using HMAC SHA512.
    Uses timing-safe comparison to prevent timing attacks.
    """
    secret = secret_key or getattr(settings, "PAYSTACK_WEBHOOK_SECRET", "") or getattr(settings, "PAYSTACK_SECRET_KEY", "")

    if not secret:
        logger.error("Paystack secret key is not configured.")
        return False

    if not signature_header:
        logger.warning("Missing x-paystack-signature header in webhook request.")
        return False

    if isinstance(request_body, str):
        body_bytes = request_body.encode("utf-8")
    else:
        body_bytes = request_body

    computed_hmac = hmac.new(
        key=secret.encode("utf-8"),
        msg=body_bytes,
        digestmod=hashlib.sha512
    ).hexdigest()

    is_valid = hmac.compare_digest(computed_hmac.lower(), signature_header.strip().lower())
    if not is_valid:
        logger.warning(
            "Paystack signature mismatch. Received: %s... Computed: %s...",
            signature_header[:12],
            computed_hmac[:12]
        )

    return is_valid
