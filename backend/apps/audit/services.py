"""
Audit logging and Idempotency service functions.
"""
import hashlib
import json
import logging
from typing import Any, Dict, Optional, Tuple
from django.db import IntegrityError, transaction
from .models import AuditLog, IdempotencyRecord
from core.constants import AuditActor

logger = logging.getLogger(__name__)


def record_audit_log(
    order_reference: str,
    from_state: str,
    to_state: str,
    actor: str = AuditActor.SYSTEM_WEBHOOK,
    actor_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Append-only audit record creation.
    Must never fail or rollback main transaction if non-critical, but runs inside active transaction.
    """
    try:
        log_entry = AuditLog.objects.create(
            order_reference=order_reference,
            from_state=from_state,
            to_state=to_state,
            actor=actor,
            actor_id=actor_id,
            ip_address=ip_address,
            metadata=metadata or {},
        )
        logger.info(
            "Audit event logged: [%s] %s -> %s by %s",
            order_reference,
            from_state,
            to_state,
            actor
        )
        return log_entry
    except Exception as exc:
        logger.error("Failed to create audit log: %s", exc, exc_info=True)
        raise


def acquire_idempotency_lock(
    event_source: str,
    event_id: str,
    raw_payload: Optional[bytes] = None,
    payload_dict: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[IdempotencyRecord]]:
    """
    Atomically acquire an idempotency lock for an incoming webhook event.
    Returns (is_new_event, record).
    If is_new_event is False, the event was already processed or is in progress.
    """
    if raw_payload is not None:
        payload_hash = hashlib.sha256(raw_payload).hexdigest()
    elif payload_dict is not None:
        payload_bytes = json.dumps(payload_dict, sort_keys=True).encode("utf-8")
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()
    else:
        payload_hash = hashlib.sha256(f"{event_source}:{event_id}".encode("utf-8")).hexdigest()

    try:
        with transaction.atomic():
            record = IdempotencyRecord.objects.create(
                event_source=event_source,
                event_id=event_id,
                payload_hash=payload_hash,
            )
            return True, record
    except IntegrityError:
        # Already exists in DB - duplicate event!
        existing_record = IdempotencyRecord.objects.filter(
            event_source=event_source,
            event_id=event_id
        ).first()
        logger.warning(
            "Idempotency duplicate detected: source=%s event_id=%s created_at=%s",
            event_source,
            event_id,
            getattr(existing_record, "created_at", None)
        )
        return False, existing_record
