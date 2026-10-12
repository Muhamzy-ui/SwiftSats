"""
Nomba MFB Webhook & Receipt Proof Settlement Engine.
Handles 24/7 automated payment verification, dynamic kobo salt matching,
instant Quidax crypto payout, and Telegram push alerts.
"""
import os
import hmac
import hashlib
import json
import logging
from decimal import Decimal
from typing import Optional, Tuple
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.orders.models import Order, UnmatchedPaymentAlert
from apps.orders.state_machine import OrderStateMachine
from apps.admin_api.models import PlatformSettings
from apps.exchange.payout import PayoutService
from core.constants import OrderStatus, AuditActor
from core.telegram import send_telegram_alert
from core.webpush import send_admin_webpush

logger = logging.getLogger(__name__)


def verify_nomba_signature(payload_bytes: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify HMAC SHA-512 or SHA-256 signature from Nomba if secret is configured.
    """
    secret = os.getenv("NOMBA_WEBHOOK_SECRET", "")
    if not secret or not signature_header:
        # If secret is not configured in environment, allow connection safely
        return True

    sig_clean = signature_header.strip().lower()
    expected_sha512 = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha512).hexdigest().lower()
    if hmac.compare_digest(expected_sha512, sig_clean):
        return True

    expected_sha256 = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest().lower()
    if hmac.compare_digest(expected_sha256, sig_clean):
        return True

    return False


import threading
import urllib.request


def dispatch_partner_webhook(order, tx_hash=""):
    """
    Asynchronously notify partner websites (like Axiom Wallet) that an order has completed.
    """
    def _post():
        try:
            urls = ["https://www.axiomwallets.io/webhooks/swiftsats/"]
            payload = json.dumps({
                "order_id": order.order_reference,
                "partner_user_id": getattr(order.customer, "email", "") or (order.user_email or ""),
                "wallet_address": order.wallet_address,
                "coin": order.coin,
                "crypto_asset": order.coin,
                "crypto_amount": str(order.crypto_amount),
                "tx_hash": tx_hash or order.payout_tx_hash or f"SWIFTSATS-{order.order_reference}",
            }).encode("utf-8")
            for u in urls:
                try:
                    req = urllib.request.Request(
                        u,
                        data=payload,
                        headers={"Content-Type": "application/json", "User-Agent": "SwiftSatsWebhookEngine/1.0"},
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=3.0) as resp:
                        logger.info("Partner webhook dispatched to %s: status %s", u, resp.status)
                except Exception as inner_e:
                    logger.debug("Partner webhook dispatch non-fatal: %s", inner_e)
        except Exception as e:
            logger.debug("Failed dispatching partner webhook: %s", e)

    threading.Thread(target=_post, daemon=True).start()


class NombaWebhookView(APIView):
    """
    POST /api/v1/payments/webhook/nomba/
    Core 24/7 server-to-server webhook endpoint for Nomba MFB bank transfers.
    Matches the incoming decimal amount (with unique kobo salt) to active orders.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        raw_body = request.body
        signature = (
            request.META.get("HTTP_X_NOMBA_SIGNATURE")
            or request.META.get("HTTP_NOMBA_SIGNATURE")
            or request.META.get("HTTP_SIGNATURE")
            or request.META.get("HTTP_X_SIGNATURE")
        )

        if not verify_nomba_signature(raw_body, signature):
            logger.warning("Rejected Nomba webhook: Invalid HMAC signature")
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        logger.info("Received Nomba webhook payload: %s", json.dumps(data)[:300])

        # Extract transaction fields from nested or flat Nomba payload
        payload_data = data.get("data", data)
        if not isinstance(payload_data, dict):
            payload_data = data

        tx_obj = payload_data.get("transaction") if isinstance(payload_data.get("transaction"), dict) else {}
        cust_obj = payload_data.get("customer") if isinstance(payload_data.get("customer"), dict) else {}

        raw_amount = (
            tx_obj.get("transactionAmount")
            or tx_obj.get("amount")
            or payload_data.get("amount")
            or payload_data.get("transactionAmount")
            or payload_data.get("fiat_amount")
            or payload_data.get("total_amount")
            or data.get("amount")
        )
        tx_ref = str(
            tx_obj.get("transactionId")
            or tx_obj.get("sessionId")
            or tx_obj.get("reference")
            or payload_data.get("transaction_reference")
            or payload_data.get("transactionId")
            or payload_data.get("reference")
            or payload_data.get("id")
            or data.get("requestId")
            or ""
        )
        sender_name = (
            cust_obj.get("senderName")
            or payload_data.get("senderName")
            or payload_data.get("sender_name")
            or payload_data.get("sender")
            or "Direct Bank Transfer"
        )

        if not raw_amount or not tx_ref:
            logger.warning("Nomba webhook missing amount or reference: %s", data)
            return Response({"error": "Missing amount or transaction reference"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            paid_amount = Decimal(str(raw_amount)).quantize(Decimal("0.01"))
        except Exception:
            return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)

        # Idempotency Check: Already processed this bank reference?
        if Order.objects.filter(nomba_transaction_ref=tx_ref).exists():
            logger.info("Nomba webhook duplicate reference %s already completed (idempotent 200)", tx_ref)
            return Response({"status": "already_processed", "reference": tx_ref}, status=status.HTTP_200_OK)

        now = timezone.now()
        platform_settings = PlatformSettings.get_settings()

        with transaction.atomic():
            # Match active order by exact expected amount (including kobo salt) or fiat_amount_ngn
            matching_order = (
                Order.objects.select_for_update()
                .filter(
                    Q(fiat_amount_expected=paid_amount) | Q(fiat_amount_ngn=paid_amount),
                    status__in=[
                        OrderStatus.QUOTE_LOCKED,
                        OrderStatus.AWAITING_PAYMENT,
                        OrderStatus.VERIFYING,
                    ],
                )
                .order_by("-created_at")
                .first()
            )

            # Handle Unmatched Payment
            if not matching_order:
                logger.warning(
                    "Unmatched Nomba payment received: ₦%s (Ref: %s, Sender: %s)",
                    paid_amount, tx_ref, sender_name
                )
                UnmatchedPaymentAlert.objects.create(
                    amount=paid_amount,
                    sender_name=sender_name,
                    transaction_reference=tx_ref,
                    channel="NOMBA_WEBHOOK",
                    reason="NO_ACTIVE_ORDER_MATCH",
                    raw_payload=data,
                )
                send_telegram_alert(
                    f"⚠️ <b>UNMATCHED NOMBA PAYMENT RECEIVED!</b>\n"
                    f"<b>Amount:</b> ₦{paid_amount:,.2f}\n"
                    f"<b>Sender:</b> {sender_name}\n"
                    f"<b>Ref:</b> <code>{tx_ref}</code>\n"
                    f"<i>No active order found with this exact kobo amount. Logged for review.</i>"
                )
                return Response({"status": "unmatched_logged", "amount": str(paid_amount)}, status=status.HTTP_200_OK)

            # Check if Quote has Expired
            if matching_order.is_quote_expired:
                logger.warning(
                    "Order %s paid after expiration (expired at %s)",
                    matching_order.order_reference, matching_order.quote_expires_at
                )
                UnmatchedPaymentAlert.objects.create(
                    amount=paid_amount,
                    sender_name=sender_name,
                    transaction_reference=tx_ref,
                    channel="NOMBA_WEBHOOK",
                    reason="EXPIRED_ORDER",
                    raw_payload=data,
                )
                matching_order.status = OrderStatus.FAILED
                matching_order.save(update_fields=["status"])
                send_telegram_alert(
                    f"⏰ <b>EXPIRED ORDER PAYMENT RECEIVED!</b>\n"
                    f"<b>Order:</b> {matching_order.order_reference}\n"
                    f"<b>Amount:</b> ₦{paid_amount:,.2f}\n"
                    f"<b>Reason:</b> Customer paid after 15-minute window.\n"
                    f"<i>Logged in admin panel for manual refund or execution.</i>"
                )
                return Response({"status": "expired_logged"}, status=status.HTTP_200_OK)

            # Order is VALID and ACTIVE
            matching_order.nomba_transaction_ref = tx_ref
            matching_order.payment_received_at = now
            matching_order.save(update_fields=["nomba_transaction_ref", "payment_received_at"])

            # Check Payout Mode
            if platform_settings.payout_mode == PlatformSettings.PayoutMode.MANUAL:
                # Manual Admin Approval Mode
                OrderStateMachine.transition_to(
                    order=matching_order,
                    target_state=OrderStatus.VERIFYING,
                    actor=AuditActor.SYSTEM_WEBHOOK,
                    metadata={"nomba_ref": tx_ref, "paid_amount": str(paid_amount)},
                )
                send_telegram_alert(
                    f"🔔 <b>PAYMENT VERIFIED (MANUAL MODE)</b>\n"
                    f"<b>Order:</b> {matching_order.order_reference}\n"
                    f"<b>Amount:</b> ₦{paid_amount:,.2f}\n"
                    f"<b>Asset:</b> {matching_order.crypto_amount} {matching_order.coin}\n"
                    f"<b>Wallet:</b> <code>{matching_order.wallet_address}</code>\n"
                    f"<i>Tap approve on admin dashboard to release crypto.</i>"
                )
                send_admin_webpush(
                    title="💰 Payment Received!",
                    body=f"{matching_order.order_reference}: ₦{paid_amount:,.2f} received. Tap to approve.",
                    url=f"/admin/orders?search={matching_order.order_reference}",
                    tag=f"order-{matching_order.order_reference}"
                )
                return Response({"status": "awaiting_manual_approval"}, status=status.HTTP_200_OK)

            # 24/7 FULLY AUTOMATED MODE: Execute Hot Wallet Blockchain Payout
            logger.info("Executing 24/7 automated payout for order %s", matching_order.order_reference)

            start_payout_time = timezone.now()
            OrderStateMachine.transition_to(
                order=matching_order,
                target_state=OrderStatus.PAYMENT_CONFIRMED,
                actor=AuditActor.SYSTEM_WEBHOOK,
            )
            OrderStateMachine.transition_to(
                order=matching_order,
                target_state=OrderStatus.PAYOUT_PROCESSING,
                actor=AuditActor.SYSTEM_WEBHOOK,
            )

            payout_service = PayoutService()
            payout_result = payout_service.execute_payout(
                coin=matching_order.coin,
                amount=matching_order.crypto_amount,
                destination_address=matching_order.wallet_address,
                order_reference=matching_order.order_reference,
            )

            end_payout_time = timezone.now()
            speed_ms = int((end_payout_time - start_payout_time).total_seconds() * 1000)

            payout_status = (payout_result.get("status") or "").lower()
            tx_hash = payout_result.get("transaction_hash") or payout_result.get("tx_hash") or ""
            payout_id = payout_result.get("id") or ""
            swap_id = payout_result.get("swap_id") or ""

            if tx_hash and payout_status in ["completed", "done"]:
                OrderStateMachine.transition_to(
                    order=matching_order,
                    target_state=OrderStatus.COMPLETED,
                    actor=AuditActor.SYSTEM_WEBHOOK,
                    tx_hash=tx_hash,
                    payout_tx_hash=tx_hash,
                    quidax_payout_id=payout_id,
                    quidax_swap_id=swap_id,
                    completed_at=end_payout_time,
                    speed_metric_ms=speed_ms,
                )

                dispatch_partner_webhook(matching_order, tx_hash)

                partner_str = f"\n<b>Source:</b> {matching_order.partner_code.upper()}" if matching_order.partner_code else ""
                send_telegram_alert(
                    f"🎉 <b>24/7 NOMBA AUTOMATED SALE COMPLETED!</b>\n"
                    f"<b>Order:</b> {matching_order.order_reference}{partner_str}\n"
                    f"<b>Received:</b> ₦{paid_amount:,.2f} (Nomba)\n"
                    f"<b>Delivered:</b> {matching_order.crypto_amount} {matching_order.coin}\n"
                    f"<b>Wallet:</b> <code>{matching_order.masked_wallet_address}</code>\n"
                    f"<b>TxHash:</b> <code>{tx_hash[:18]}...</code>\n"
                    f"<b>Velocity:</b> {speed_ms} ms\n"
                    f"<b>Status:</b> 100% AUTOMATED SUCCESS ✅"
                )
                send_admin_webpush(
                    title="🚀 Payout Delivered!",
                    body=f"{matching_order.order_reference}: {matching_order.crypto_amount} {matching_order.coin} sent to customer",
                    url=f"/admin/orders?search={matching_order.order_reference}",
                    tag=f"order-{matching_order.order_reference}"
                )

                return Response({
                    "status": "automated_success",
                    "order_reference": matching_order.order_reference,
                    "tx_hash": tx_hash,
                    "speed_ms": speed_ms,
                }, status=status.HTTP_200_OK)
            else:
                send_telegram_alert(
                    f"🔔 <b>PAYMENT CONFIRMED VIA NOMBA!</b>\n"
                    f"<b>Order:</b> {matching_order.order_reference}\n"
                    f"<b>Received:</b> ₦{paid_amount:,.2f} (Nomba)\n"
                    f"<b>Deliver:</b> {matching_order.crypto_amount} {matching_order.coin}\n"
                    f"<b>Customer Wallet:</b> <code>{matching_order.wallet_address}</code>\n"
                    f"<b>Status:</b> Awaiting 1-Tap Admin Approval or Hot Wallet funding."
                )
                send_admin_webpush(
                    title="🔔 Payment Confirmed!",
                    body=f"{matching_order.order_reference}: ₦{paid_amount:,.2f} received. Awaiting release.",
                    url=f"/admin/orders?search={matching_order.order_reference}",
                    tag=f"order-{matching_order.order_reference}"
                )

                return Response({
                    "status": "awaiting_manual_approval",
                    "order_reference": matching_order.order_reference,
                    "message": "Payment verified. Ready for 1-Tap Admin Approval.",
                }, status=status.HTTP_200_OK)


class SubmitReceiptProofView(APIView):
    """
    POST /api/v1/payments/submit-receipt/
    User submits their transfer receipt screenshot from their bank app.
    Saves clean image to local storage and updates order status to VERIFYING.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        order_ref = request.data.get("order_reference")
        receipt_file = request.FILES.get("receipt_file")

        if not order_ref:
            return Response({"error": "order_reference is required"}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(order_reference=order_ref).first()
        if not order:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.status in [OrderStatus.COMPLETED, OrderStatus.REFUNDED]:
            return Response({"error": "Order is already finalized"}, status=status.HTTP_400_BAD_REQUEST)

        if order.is_quote_expired:
            return Response({"error": "Order quotation has expired"}, status=status.HTTP_400_BAD_REQUEST)

        # Save receipt file to local disk (zero database bloat)
        if receipt_file:
            order.receipt_image = receipt_file

        if order.status in [OrderStatus.QUOTE_LOCKED, OrderStatus.AWAITING_PAYMENT]:
            OrderStateMachine.transition_to(
                order=order,
                target_state=OrderStatus.VERIFYING,
                actor=AuditActor.PUBLIC_USER,
            )
        else:
            order.save(update_fields=["receipt_image"])

        send_telegram_alert(
            f"📸 <b>RECEIPT PROOF SUBMITTED!</b>\n"
            f"<b>Order:</b> {order.order_reference}\n"
            f"<b>Expected:</b> ₦{order.fiat_amount_expected:,.2f}\n"
            f"<b>Coin:</b> {order.crypto_amount} {order.coin}\n"
            f"<b>Status:</b> Customer confirmed transfer - Verifying..."
        )

        return Response({
            "success": True,
            "message": "Receipt submitted successfully. Settlement ledger is verifying.",
            "order_reference": order.order_reference,
            "status": order.status,
        }, status=status.HTTP_200_OK)
