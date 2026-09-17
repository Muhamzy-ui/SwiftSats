"""
Serializers for Crypto Buy Orders and Quotes.
Strict validation ensures zero unvalidated input reaches business logic.
"""
from decimal import Decimal
from typing import Any, Dict
from django.utils import timezone
from rest_framework import serializers
from .models import Order
from core.constants import SupportedCoin, COIN_METADATA, OrderStatus
from core.validators import validate_wallet_for_coin


class CreateQuoteRequestSerializer(serializers.Serializer):
    """Input serializer for generating a locked crypto quote."""
    coin = serializers.ChoiceField(choices=SupportedCoin.choices)
    amount_ngn = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("1000.00"))

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        coin = attrs.get("coin")
        amount = attrs.get("amount_ngn")
        meta = COIN_METADATA.get(coin)

        if not meta:
            raise serializers.ValidationError({"coin": "Unsupported cryptocurrency."})

        min_ngn = meta["min_amount_ngn"]
        max_ngn = meta["max_amount_ngn"]

        if amount < min_ngn:
            raise serializers.ValidationError({
                "amount_ngn": f"Minimum order amount for {coin} is ₦{min_ngn:,.2f}."
            })
        if amount > max_ngn:
            raise serializers.ValidationError({
                "amount_ngn": f"Maximum single order amount is ₦{max_ngn:,.2f}."
            })

        return attrs


class LockQuoteAndSubmitWalletSerializer(serializers.Serializer):
    """Input serializer for binding destination wallet and generating virtual bank account."""
    order_reference = serializers.CharField(max_length=64)
    wallet_address = serializers.CharField(max_length=128)
    user_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        order_ref = attrs.get("order_reference")
        wallet = attrs.get("wallet_address", "").strip()

        order = Order.objects.filter(order_reference=order_ref).first()
        if not order:
            raise serializers.ValidationError({"order_reference": "Order reference not found."})

        if order.status != OrderStatus.QUOTE_LOCKED:
            raise serializers.ValidationError({
                "order_reference": f"Order is in state '{order.status}' and cannot be locked."
            })

        if order.is_quote_expired:
            raise serializers.ValidationError({
                "order_reference": "Locked quote has expired. Please request a fresh quote."
            })

        # Validate wallet format & checksum strictly for the specific coin
        is_valid, err_msg = validate_wallet_for_coin(order.coin, wallet)
        if not is_valid:
            raise serializers.ValidationError({"wallet_address": err_msg})

        attrs["order_instance"] = order
        attrs["clean_wallet"] = wallet
        return attrs


class PublicOrderDetailSerializer(serializers.ModelSerializer):
    """Sanitized public order representation for user buy wizard and order status lookup."""
    masked_wallet_address = serializers.CharField(read_only=True)
    explorer_url = serializers.CharField(read_only=True)
    seconds_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_reference",
            "coin",
            "network",
            "fiat_amount_ngn",
            "salt_kobo_value",
            "fiat_amount_expected",
            "crypto_amount",
            "quote_rate",
            "service_fee_ngn",
            "network_fee_crypto",
            "masked_wallet_address",
            "status",
            "quote_expires_at",
            "seconds_remaining",
            "virtual_bank_name",
            "virtual_account_number",
            "virtual_account_name",
            "tx_hash",
            "explorer_url",
            "speed_metric_ms",
            "created_at",
            "completed_at",
        ]

    def get_seconds_remaining(self, obj: Order) -> int:
        if not obj.quote_expires_at:
            return 0
        diff = (obj.quote_expires_at - timezone.now()).total_seconds()
        return max(0, int(diff))


class PublicRecentOrderSerializer(serializers.ModelSerializer):
    """Sanitized representation of recent orders for public tracking telemetry."""
    masked_wallet_address = serializers.CharField(read_only=True)
    explorer_url = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_reference",
            "coin",
            "network",
            "fiat_amount_ngn",
            "crypto_amount",
            "status",
            "speed_metric_ms",
            "tx_hash",
            "explorer_url",
            "masked_wallet_address",
            "created_at",
            "completed_at",
        ]
