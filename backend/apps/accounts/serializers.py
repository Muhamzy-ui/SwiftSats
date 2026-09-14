"""
Serializers for Admin Authentication and Profile.
"""
from rest_framework import serializers
from .models import AdminUser


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
