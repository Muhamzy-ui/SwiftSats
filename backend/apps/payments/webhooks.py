"""
Paystack Webhook Endpoint with Signature Verification & Idempotency Controls.
"""
import json
import logging
from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .signature import verify_paystack_webhook_signature
from apps.audit.services import acquire_idempotency_lock
from apps.orders.models import Order
from apps.orders.state_machine import OrderStateMachine
from apps.orders.tasks import process_crypto_payout
from core.constants import OrderStatus, AuditActor

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class PaystackWebhookView(APIView):
    """
    Secure Paystack Webhook Receiver.
    Validates HMAC SHA512 signatures, enforces idempotency, confirms payment,
    and immediately dispatches Celery crypto payout worker.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Public endpoint verified via HMAC signature header

    def post(self, request):
        signature_header = request.headers.get("x-paystack-signature", "")
        raw_body = request.body

        # 1. Cryptographic Signature Verification
        # In production or when keys are configured, signature verification is strictly enforced.
        is_dev_mock = settings.DEBUG and not getattr(settings, "PAYSTACK_SECRET_KEY", "").startswith("sk_live")
        if not is_dev_mock:
            if not verify_paystack_webhook_signature(raw_body, signature_header):
                logger.warning("Rejected unverified Paystack webhook attempt.")
                return Response(
                    {"error": "Invalid webhook cryptographic signature"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # 2. Parse Payload
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            logger.error("Malformed JSON in Paystack webhook: %s", exc)
            return Response({"error": "Malformed JSON payload"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get("event")
        event_data = payload.get("data", {})
        event_id = str(event_data.get("id") or event_data.get("reference") or payload.get("id") or "")

        logger.info("Received Paystack webhook: event=%s id=%s", event_type, event_id)

        # 3. Database-Level Idempotency Check
        if event_id:
            is_new_event, _ = acquire_idempotency_lock(
                event_source="paystack",
                event_id=event_id,
                raw_payload=raw_body,
            )
            if not is_new_event:
                logger.info("Duplicate Paystack event %s ignored cleanly (Idempotent 200).", event_id)
                return Response({"status": "already_processed"}, status=status.HTTP_200_OK)

        # 4. Handle Successful Charge / Bank Transfer
        if event_type in ("charge.success", "dedicated_account.assign.success", "transfer.success"):
            reference = event_data.get("reference", "")
            amount_kobo = event_data.get("amount", 0)
            amount_paid_ngn = Decimal(str(amount_kobo)) / Decimal("100.00")
            dva_account = event_data.get("authorization", {}).get("account_number") or event_data.get("dedicated_account", {}).get("account_number")

            # Look up matching order
            order = None
            if reference:
                order = Order.objects.filter(paystack_reference=reference).first()
                if not order and reference.startswith("PSTK_"):
                    potential_ref = reference.replace("PSTK_", "").split("_")[0]
                    order = Order.objects.filter(order_reference=potential_ref).first()

            if not order and dva_account:
                order = Order.objects.filter(virtual_account_number=dva_account).first()

            if not order:
                logger.warning(
                    "Paystack webhook received for unmatched order: ref=%s dva=%s amount=%s",
                    reference,
                    dva_account,
                    amount_paid_ngn
                )
                return Response({"status": "order_not_found"}, status=status.HTTP_200_OK)

            # Check if order is in valid state for payment confirmation
            if order.status in (OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PAYOUT_PROCESSING, OrderStatus.COMPLETED):
                logger.info("Order %s already processed. Ignoring duplicate payment notice.", order.order_reference)
                return Response({"status": "already_confirmed"}, status=status.HTTP_200_OK)

            # Validate amount paid matches order amount
            if amount_paid_ngn > 0 and amount_paid_ngn < order.fiat_amount_ngn:
                logger.error(
                    "Underpayment detected for order %s: expected %s, got %s",
                    order.order_reference,
                    order.fiat_amount_ngn,
                    amount_paid_ngn
                )
                # Still log the payment attempt in metadata
                OrderStateMachine.transition_to(
                    order=order,
                    target_state=OrderStatus.FAILED,
                    actor=AuditActor.SYSTEM_WEBHOOK,
                    metadata={"error": "Underpayment", "received_ngn": str(amount_paid_ngn)},
                )
                return Response({"status": "underpayment_recorded"}, status=status.HTTP_200_OK)

            # 5. Atomically transition to PAYMENT_CONFIRMED
            client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR"))
            OrderStateMachine.transition_to(
                order=order,
                target_state=OrderStatus.PAYMENT_CONFIRMED,
                actor=AuditActor.SYSTEM_WEBHOOK,
                ip_address=client_ip,
                metadata={
                    "paystack_event": event_type,
                    "paystack_reference": reference,
                    "amount_kobo": amount_kobo,
                    "channel": event_data.get("channel"),
                    "paid_at": event_data.get("paid_at"),
                },
                paystack_reference=reference or order.paystack_reference,
            )

            # 6. IMMEDIATELY dispatch Celery payout task (<10s target)
            logger.info("Dispatching Celery crypto payout worker for order: %s", order.order_reference)
            try:
                # If running locally with eager or standard worker:
                process_crypto_payout.delay(str(order.id))
            except Exception as task_exc:
                logger.error("Failed to queue Celery payout task: %s, executing synchronously", task_exc)
                process_crypto_payout(str(order.id))

        return Response({"status": "processed"}, status=status.HTTP_200_OK)


class SimulatePaymentView(APIView):
    """
    Development & Testing Helper Endpoint.
    Allows triggering payment confirmation for an order to test the end-to-end flow without real Naira.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_reference = request.data.get("order_reference")
        if not order_reference:
            return Response({"error": "order_reference is required"}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(order_reference=order_reference).first()
        if not order:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.status in (OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PAYOUT_PROCESSING, OrderStatus.COMPLETED):
            return Response({"message": f"Order already in state {order.status}"})

        # Transition to payment confirmed
        OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.PAYMENT_CONFIRMED,
            actor=AuditActor.PUBLIC_USER,
            metadata={"simulated": True},
        )

        # Trigger payout task
        try:
            process_crypto_payout.delay(str(order.id))
        except Exception:
            process_crypto_payout(str(order.id))

        # Re-fetch updated order
        order.refresh_from_db()

        return Response({
            "success": True,
            "message": "Payment simulation completed. Payout executed.",
            "order": {
                "reference": order.order_reference,
                "status": order.status,
                "tx_hash": order.tx_hash,
                "speed_metric_ms": order.speed_metric_ms,
            }
        })
