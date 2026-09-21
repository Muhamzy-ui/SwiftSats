"""
Admin JWT Authentication class and token generators.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import AdminUser, Customer


def generate_admin_jwt_token(user: AdminUser) -> str:
    """
    Generate signed JWT for authenticated and 2FA-verified admin.
    """
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(minutes=settings.ADMIN_SESSION_TIMEOUT_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_2fa_verified": True,
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


class AdminJWTAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication class for Admin API endpoints.
    Extracts signed JWT from httpOnly Secure cookie or Authorization Bearer header.
    """

    def authenticate(self, request) -> Optional[Tuple[AdminUser, dict]]:
        raw_token = None

        # 1. Primary: Extract from secure httpOnly cookie (XSS immune)
        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "swiftsats_admin_jwt")
        if cookie_name in request.COOKIES:
            raw_token = request.COOKIES.get(cookie_name)

        # 2. Fallback: Extract from Authorization Bearer header (for direct tooling)
        if not raw_token:
            auth_header = request.headers.get("Authorization")
            if auth_header:
                parts = auth_header.split()
                if len(parts) == 2 and parts[0].lower() == "bearer":
                    raw_token = parts[1]

        if not raw_token:
            return None

        is_admin_path = request.path.startswith("/api/v1/admin/") or request.path.startswith("/api/v1/auth/admin/")

        try:
            payload = jwt.decode(
                raw_token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
                options={"require": ["exp", "sub", "is_2fa_verified"]},
            )
        except jwt.ExpiredSignatureError:
            if is_admin_path:
                raise exceptions.AuthenticationFailed("Admin session has expired. Please log in again.")
            return None
        except (jwt.InvalidTokenError, Exception):
            if is_admin_path:
                raise exceptions.AuthenticationFailed("Invalid authentication token.")
            return None

        if not payload.get("is_2fa_verified"):
            if is_admin_path:
                raise exceptions.AuthenticationFailed("2FA verification required.")
            return None

        user_id = payload.get("sub")
        try:
            user = AdminUser.objects.get(id=user_id, is_active=True)
        except AdminUser.DoesNotExist:
            if is_admin_path:
                raise exceptions.AuthenticationFailed("User account not found or inactive.")
            return None

        return user, payload


def generate_customer_jwt_token(customer: Customer) -> str:
    """
    Generate signed JWT for authenticated customer.
    Standard session length: 30 days.
    """
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(days=30)
    payload = {
        "sub": str(customer.id),
        "email": customer.email,
        "type": "customer",
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


class CustomerJWTAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication class for Customer API endpoints.
    Extracts signed JWT from Authorization Bearer header or customer cookie.
    """

    def authenticate(self, request) -> Optional[Tuple[Customer, dict]]:
        raw_token = None

        # 1. Primary: Extract from Authorization Bearer header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                raw_token = parts[1]

        # 2. Fallback: Extract from cookie
        if not raw_token:
            cookie_name = "swiftsats_customer_jwt"
            if cookie_name in request.COOKIES:
                raw_token = request.COOKIES.get(cookie_name)

        if not raw_token:
            return None

        try:
            payload = jwt.decode(
                raw_token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
                options={"require": ["exp", "sub"]},
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
            return None

        if payload.get("type") != "customer":
            return None

        customer_id = payload.get("sub")
        try:
            customer = Customer.objects.get(id=customer_id, is_active=True)
        except Customer.DoesNotExist:
            return None

        return customer, payload
