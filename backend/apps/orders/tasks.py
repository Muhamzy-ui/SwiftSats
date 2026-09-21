"""
Celery Asynchronous Tasks for SwiftSats.
Handles instantaneous blockchain payout execution upon payment confirmation.
"""
from decimal import Decimal
import logging
import time
from celery import shared_task
from django.utils import timezone
from .models import Order
from .state_machine import OrderStateMachine
from apps.exchange.payout import PayoutService
from core.constants import OrderStatus, AuditActor
from core.exceptions import PayoutExecutionError

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="orders.process_crypto_payout",
    max_retries=3,
    default_retry_delay=5,
    acks_late=True,
)
def process_crypto_payout(self, order_id: str):
    """
    Execute crypto payout via Quidax immediately upon payment confirmation.
    Target execution: webhook received -> payout dispatched < 10 seconds.
    """
    t_start = time.perf_counter()
    logger.info("Starting crypto payout task for order_id=%s", order_id)

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        logger.error("Order %s not found for payout task", order_id)
        return False

    # Prevent re-execution if already completed or processing
    if order.status in (OrderStatus.COMPLETED, OrderStatus.REFUNDED):
        logger.info("Order %s already finalized in state %s. Skipping.", order.order_reference, order.status)
        return True

    # 1. Atomically transition state to PAYOUT_PROCESSING
    try:
        order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.PAYOUT_PROCESSING,
            actor=AuditActor.CELERY_WORKER,
            actor_id=f"celery_task_{self.request.id}",
            metadata={"celery_task_id": self.request.id},
        )
    except Exception as exc:
        logger.error("Failed state transition to PAYOUT_PROCESSING for %s: %s", order.order_reference, exc)
        return False

    # 2. Execute crypto withdrawal via Quidax Payout Service
    payout_service = PayoutService()
    try:
        payout_result = payout_service.execute_payout(
            coin=order.coin,
            amount=order.crypto_amount,
            destination_address=order.wallet_address,
            order_reference=order.order_reference,
        )

        payout_id = str(payout_result.get("id") or payout_result.get("payout_id") or "")
        tx_hash = payout_result.get("transaction_hash") or payout_result.get("tx_hash") or ""
        payout_status = (payout_result.get("status") or "").lower()

        # Update payout ID and initial hash immediately
        order.quidax_payout_id = payout_id
        if tx_hash:
            order.tx_hash = tx_hash
        order.save(update_fields=["quidax_payout_id", "tx_hash"])

        # If tx_hash not yet assigned, poll Quidax up to 3 times (giving exchange time to broadcast)
        if not tx_hash and payout_id and payout_service.client.is_live:
            for _ in range(3):
                time.sleep(2)
                status_data = payout_service.client.get_withdrawal_status(payout_id)
                tx_hash = status_data.get("transaction_hash") or status_data.get("txid") or ""
                payout_status = (status_data.get("status") or payout_status).lower()
                if tx_hash or payout_status in ["done", "completed", "rejected", "cancelled"]:
                    break

        if tx_hash:
            order.tx_hash = tx_hash
            order.save(update_fields=["tx_hash"])

        now = timezone.now()
        speed_ms = None
        if order.payment_received_at:
            delta = now - order.payment_received_at
            speed_ms = int(delta.total_seconds() * 1000)

        # ONLY transition to COMPLETED if on-chain tx_hash is confirmed or status is done/completed
        if tx_hash or payout_status in ["done", "completed"]:
            OrderStateMachine.transition_to(
                order=order,
                target_state=OrderStatus.COMPLETED,
                actor=AuditActor.CELERY_WORKER,
                actor_id=f"celery_task_{self.request.id}",
                metadata={
                    "payout_id": payout_id,
                    "tx_hash": tx_hash,
                    "quidax_status": payout_status,
                    "speed_metric_ms": speed_ms,
                    "task_duration_seconds": round(time.perf_counter() - t_start, 3),
                },
                quidax_payout_id=payout_id,
                tx_hash=tx_hash,
                speed_metric_ms=speed_ms,
            )
            logger.info("Crypto payout COMPLETED for %s: tx=%s speed=%sms", order.order_reference, tx_hash, speed_ms)
            return True
        elif payout_status in ["rejected", "cancelled", "failed"]:
            fail_reason = f"Quidax withdrawal was {payout_status} by exchange."
            OrderStateMachine.transition_to(
                order=order,
                target_state=OrderStatus.FAILED,
                actor=AuditActor.CELERY_WORKER,
                actor_id=f"celery_task_{self.request.id}",
                metadata={"payout_id": payout_id, "quidax_status": payout_status, "error": fail_reason},
                payout_error=fail_reason,
            )
            logger.error("Crypto payout FAILED for %s: %s", order.order_reference, fail_reason)
            return False
        else:
            # Stays in PAYOUT_PROCESSING awaiting on-chain confirmation
            logger.info("Crypto payout initiated for %s (id=%s), status=%s. Awaiting blockchain broadcast.", order.order_reference, payout_id, payout_status)
            return True

    except PayoutExecutionError as p_err:
        logger.error("Payout execution error for %s: %s", order.order_reference, p_err)
        fail_msg = str(p_err.message) if hasattr(p_err, "message") else str(p_err)
        OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.FAILED,
            actor=AuditActor.CELERY_WORKER,
            actor_id=f"celery_task_{self.request.id}",
            metadata={"error": str(p_err), "details": getattr(p_err, "details", {})},
            payout_error=fail_msg,
        )
        return False

    except Exception as exc:
        logger.exception("Unexpected error in payout task for %s: %s", order.order_reference, exc)
        OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.FAILED,
            actor=AuditActor.CELERY_WORKER,
            actor_id=f"celery_task_{self.request.id}",
            metadata={"error": str(exc)},
            payout_error=f"Unexpected error: {str(exc)}",
        )
        return False


@shared_task(name="orders.expire_stale_orders")
def expire_stale_orders():
    """
    Periodic maintenance task to mark unfulfilled, expired quotes as FAILED.
    """
    now = timezone.now()
    stale_orders = Order.objects.filter(
        status__in=[OrderStatus.QUOTE_LOCKED, OrderStatus.AWAITING_PAYMENT],
        quote_expires_at__lt=now,
    )

    expired_count = 0
    for order in stale_orders:
        try:
            OrderStateMachine.transition_to(
                order=order,
                target_state=OrderStatus.FAILED,
                actor=AuditActor.CRON_CLEANUP,
                metadata={"reason": "Quote expired without confirmed payment"},
            )
            expired_count += 1
        except Exception as exc:
            logger.warning("Failed to auto-expire order %s: %s", order.order_reference, exc)

    logger.info("Expired %d stale orders", expired_count)
    return expired_count
