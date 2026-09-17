"""
Serializers for Admin Authentication and Profile.
"""
from rest_framework import serializers
from .models import AdminUser, Customer
from apps.orders.models import Order


class AdminLoginInitSerializer(serializers.Serializer):
    """Initial email + password check."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class Admin2FAVerifySerializer(serializers.Serializer):
    """Second step: verify TOTP token."""
    email = serializers.EmailField()
    temp_session_token = serializers.CharField()
    totp_code = serializers.CharField(min_length=6, max_length=6)


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin user profile representation."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = AdminUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_two_factor_enabled",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "email", "created_at"]


class CustomerRegisterSerializer(serializers.Serializer):
    """Registration input serializer for customers."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")

    def validate_email(self, value: str) -> str:
        clean_email = value.strip().lower()
        if Customer.objects.filter(email__iexact=clean_email).exists():
            raise serializers.ValidationError("An account with this email already exists. Please log in.")
        return clean_email

    def validate_password(self, value: str) -> str:
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        return value


class CustomerLoginSerializer(serializers.Serializer):
    """Login credentials serializer for customers."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class CustomerSerializer(serializers.ModelSerializer):
    """Customer profile representation."""

    class Meta:
        model = Customer
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "is_active",
            "is_email_verified",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "is_email_verified", "created_at"]


class CustomerOrderSerializer(serializers.ModelSerializer):
    """Full order details for authenticated customer dashboard."""
    masked_wallet_address = serializers.CharField(read_only=True)
    explorer_url = serializers.CharField(read_only=True)

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
            "masked_wallet_address",
            "wallet_address",
            "status",
            "virtual_bank_name",
            "virtual_account_number",
            "virtual_account_name",
            "tx_hash",
            "explorer_url",
            "speed_metric_ms",
            "created_at",
            "completed_at",
        ]
