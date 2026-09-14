"""
Immutable Audit Log and Idempotency Models.
Guarantees full forensic traceability and zero duplicate webhook/payout executions.
"""
import uuid
from django.db import models
from core.constants import AuditActor


class AuditLog(models.Model):
    """
    Immutable audit trail for order state changes and system administrative events.
    Records are append-only.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_reference = models.CharField(max_length=64, db_index=True, help_text="Reference of the associated order")
    from_state = models.CharField(max_length=32, help_text="State before transition")
    to_state = models.CharField(max_length=32, help_text="State after transition")
    actor = models.CharField(max_length=32, choices=AuditActor.choices, default=AuditActor.SYSTEM_WEBHOOK)
    actor_id = models.CharField(max_length=128, blank=True, null=True, help_text="Admin user ID or worker thread ID")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Detailed payload, error message, or latency data")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=["order_reference", "-timestamp"]),
            models.Index(fields=["actor", "-timestamp"]),
        ]

    def __str__(self) -> str:
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.order_reference}: {self.from_state} -> {self.to_state} by {self.actor}"


class IdempotencyRecord(models.Model):
    """
    Database-enforced idempotency lock for webhooks and external payout requests.
    Prevents duplicate payouts even under concurrent webhook deliveries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_source = models.CharField(max_length=32, db_index=True, help_text="e.g. paystack, quidax")
    event_id = models.CharField(max_length=128, db_index=True, help_text="External unique event identifier")
    payload_hash = models.CharField(max_length=64, help_text="SHA256 hash of payload")
    response_code = models.IntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "idempotency_records"
        constraints = [
            models.UniqueConstraint(
                fields=["event_source", "event_id"],
                name="unique_source_event_id"
            )
        ]
        verbose_name = "Idempotency Record"
        verbose_name_plural = "Idempotency Records"

    def __str__(self) -> str:
        return f"{self.event_source}:{self.event_id} ({self.created_at})"
