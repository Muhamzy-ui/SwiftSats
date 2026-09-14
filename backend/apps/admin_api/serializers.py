"""
Serializers for Custom Admin API Endpoints.
"""
from rest_framework import serializers
from apps.orders.models import Order
from apps.audit.models import AuditLog


class AdminAuditLogSerializer(serializers.ModelSerializer):
    """Audit log item representation."""
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "order_reference",
            "from_state",
            "to_state",
            "actor",
            "actor_id",
            "ip_address",
            "metadata",
            "timestamp",
        ]


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Condensed order representation for admin tables."""
    masked_wallet = serializers.CharField(source="masked_wallet_address", read_only=True)
    explorer_url = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_reference",
            "coin",
            "network",
            "fiat_amount_ngn",
            "crypto_amount",
            "quote_rate",
            "wallet_address",
            "masked_wallet",
            "status",
            "virtual_bank_name",
            "virtual_account_number",
            "paystack_reference",
            "tx_hash",
            "explorer_url",
            "speed_metric_ms",
            "created_at",
            "payment_received_at",
            "completed_at",
        ]


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """Comprehensive order detail with full audit history for manual inspection."""
    audit_logs = serializers.SerializerMethodField()
    explorer_url = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_reference",
            "idempotency_key",
            "coin",
            "network",
            "fiat_amount_ngn",
            "crypto_amount",
            "quote_rate",
            "service_fee_ngn",
            "network_fee_crypto",
            "wallet_address",
            "user_email",
            "ip_address",
            "status",
            "quote_expires_at",
            "paystack_reference",
            "virtual_account_number",
            "virtual_bank_name",
            "virtual_account_name",
            "paystack_customer_code",
            "quidax_payout_id",
            "quidax_swap_id",
            "tx_hash",
            "explorer_url",
            "payout_error",
            "payment_received_at",
            "payout_initiated_at",
            "completed_at",
            "speed_metric_ms",
            "created_at",
            "updated_at",
            "audit_logs",
        ]

    def get_audit_logs(self, obj: Order):
        logs = AuditLog.objects.filter(order_reference=obj.order_reference).order_by("-timestamp")
        return AdminAuditLogSerializer(logs, many=True).data


class AdminDisputeActionSerializer(serializers.Serializer):
    """Input serializer for resolving a disputed or failed order."""
    action = serializers.ChoiceField(choices=["RETRY_PAYOUT", "MARK_REFUNDED", "FLAG_SUSPICIOUS", "CANCEL"])
    notes = serializers.CharField(required=False, allow_blank=True)


class AdminReportRequestSerializer(serializers.Serializer):
    """Input serializer for custom reports."""
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    coin = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    export_format = serializers.ChoiceField(choices=["json", "csv"], default="json")
