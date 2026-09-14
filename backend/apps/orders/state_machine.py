"""
Deterministic Order State Machine with Atomic DB Locks & Immutable Audit Logging.
"""
from typing import Any, Dict, Optional, Set
import logging
from django.db import transaction
from django.utils import timezone
from .models import Order
from apps.audit.services import record_audit_log
from core.constants import OrderStatus, AuditActor
from core.exceptions import StateTransitionError

logger = logging.getLogger(__name__)


# Explicit matrix of allowable transitions
VALID_TRANSITIONS: Dict[str, Set[str]] = {
    OrderStatus.QUOTE_LOCKED: {
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.VERIFYING,
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.FAILED,
    },
    OrderStatus.AWAITING_PAYMENT: {
        OrderStatus.VERIFYING,
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.FAILED,
    },
    OrderStatus.VERIFYING: {
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.PAYOUT_PROCESSING,
        OrderStatus.COMPLETED,
        OrderStatus.FAILED,
    },
    OrderStatus.PAYMENT_CONFIRMED: {
        OrderStatus.PAYOUT_PROCESSING,
        OrderStatus.COMPLETED,
        OrderStatus.REFUNDED,
        OrderStatus.FAILED,
    },
    OrderStatus.PAYOUT_PROCESSING: {
        OrderStatus.COMPLETED,
        OrderStatus.FAILED,
    },
    OrderStatus.FAILED: {
        OrderStatus.REFUNDED,
        OrderStatus.PAYOUT_PROCESSING,  # Manual retry from admin dispute panel
    },
    OrderStatus.COMPLETED: set(),  # Terminal state
    OrderStatus.REFUNDED: set(),   # Terminal state
}


class OrderStateMachine:
    """
    Manages all state changes for Order models.
    Guarantees row-level locking (select_for_update) and atomic audit logging.
    """

    @classmethod
    @transaction.atomic
    def transition_to(
        cls,
        order: Order,
        target_state: str,
        actor: str = AuditActor.SYSTEM_WEBHOOK,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **update_fields
    ) -> Order:
        """
        Atomically transition an order from its current state to target_state.
        Locks the order row in PostgreSQL using select_for_update.
        """
        # Lock row in DB to prevent concurrent race conditions
        locked_order = Order.objects.select_for_update().get(id=order.id)
        current_state = locked_order.status

        # If already in target state (idempotent no-op)
        if current_state == target_state:
            logger.info("Order %s already in state %s. No-op.", locked_order.order_reference, target_state)
            return locked_order

        # Validate allowable transition
        allowed_targets = VALID_TRANSITIONS.get(current_state, set())
        if target_state not in allowed_targets:
            err_msg = f"Cannot transition order '{locked_order.order_reference}' from {current_state} to {target_state}."
            logger.error(err_msg)
            raise StateTransitionError(
                message=err_msg,
                details={
                    "order_reference": locked_order.order_reference,
                    "current_state": current_state,
                    "target_state": target_state,
                    "allowed_targets": list(allowed_targets),
                }
            )

        # Update state and specific timestamps
        now = timezone.now()
        locked_order.status = target_state

        if target_state == OrderStatus.PAYMENT_CONFIRMED and not locked_order.payment_received_at:
            locked_order.payment_received_at = now
        elif target_state == OrderStatus.PAYOUT_PROCESSING and not locked_order.payout_initiated_at:
            locked_order.payout_initiated_at = now
        elif target_state == OrderStatus.COMPLETED and not locked_order.completed_at:
            locked_order.completed_at = now

        # Apply any extra field updates passed in kwargs
        for field_name, val in update_fields.items():
            if hasattr(locked_order, field_name):
                setattr(locked_order, field_name, val)

        locked_order.save()

        # Write immutable audit log record within the same atomic transaction
        record_audit_log(
            order_reference=locked_order.order_reference,
            from_state=current_state,
            to_state=target_state,
            actor=actor,
            actor_id=actor_id,
            ip_address=ip_address or locked_order.ip_address,
            metadata=metadata or {},
        )

        logger.info(
            "State transition SUCCESS: [%s] %s -> %s by %s",
            locked_order.order_reference,
            current_state,
            target_state,
            actor
        )

        return locked_order
