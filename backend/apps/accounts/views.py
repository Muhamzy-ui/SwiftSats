"""
Views for Admin Authentication, 2FA Verification and Management.
"""
from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import AdminUser
from .serializers import AdminLoginInitSerializer, Admin2FAVerifySerializer, AdminUserSerializer
from .authentication import generate_admin_jwt_token, AdminJWTAuthentication
from core.exceptions import SwiftSatsBaseException


class AdminLoginInitView(APIView):
    """
    Step 1 of Admin Login: Verify email and password.
    Returns temporary session token for 2FA challenge.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminLoginInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]

        user = AdminUser.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid email or password.",
                        "details": {},
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ACCOUNT_DISABLED",
                        "message": "Your administrator account has been disabled.",
                        "details": {},
                    },
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Create temporary 2FA session token (valid 5 minutes)
        now = datetime.now(timezone.utc)
        temp_payload = {
            "sub": str(user.id),
            "email": user.email,
            "stage": "2fa_pending",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=5)).timestamp()),
        }
        temp_token = jwt.encode(temp_payload, settings.JWT_SECRET_KEY, algorithm="HS256")

        return Response({
            "success": True,
            "message": "Credentials verified. Please submit 2FA code.",
            "requires_2fa": True,
            "temp_session_token": temp_token,
            "user_email": user.email,
        })


class Admin2FAVerifyView(APIView):
    """
    Step 2 of Admin Login: Verify TOTP 6-digit code.
    Returns full JWT bearer token.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = Admin2FAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        temp_token = serializer.validated_data["temp_session_token"]
        totp_code = serializer.validated_data["totp_code"]

        try:
            payload = jwt.decode(
                temp_token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
                options={"require": ["exp", "sub", "stage"]},
            )
            if payload.get("stage") != "2fa_pending":
                raise jwt.InvalidTokenError()
        except jwt.ExpiredSignatureError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "2FA_SESSION_EXPIRED",
                        "message": "2FA verification session expired. Please log in again.",
                        "details": {},
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_2FA_SESSION",
                        "message": "Invalid 2FA session token.",
                        "details": {},
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_id = payload.get("sub")
        user = AdminUser.objects.filter(id=user_id, is_active=True).first()
        if not user:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "Admin user not found.",
                        "details": {},
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # In development/test mode, allow "123456" or valid TOTP
        is_valid = user.verify_totp(totp_code)
        if not is_valid and settings.DEBUG and totp_code == "123456":
            is_valid = True

        if not is_valid:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_2FA_CODE",
                        "message": "Invalid 6-digit verification code. Please check your authenticator app.",
                        "details": {},
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Update last login IP
        client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR"))
        if client_ip:
            user.last_login_ip = client_ip.split(",")[0].strip()
            user.save(update_fields=["last_login_ip"])

        # Generate long-lived Admin JWT
        token = generate_admin_jwt_token(user)

        response = Response({
            "success": True,
            "message": "Authentication successful.",
            "token": token,
            "user": AdminUserSerializer(user).data,
        })

        # Set strict httpOnly, secure, SameSite cookie
        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "swiftsats_admin_jwt")
        cookie_secure = getattr(settings, "JWT_AUTH_COOKIE_SECURE", False)
        cookie_httponly = getattr(settings, "JWT_AUTH_COOKIE_HTTPONLY", True)
        cookie_samesite = getattr(settings, "JWT_AUTH_COOKIE_SAMESITE", "Lax")
        max_age = getattr(settings, "ADMIN_SESSION_TIMEOUT_MINUTES", 60) * 60

        response.set_cookie(
            key=cookie_name,
            value=token,
            max_age=max_age,
            httponly=cookie_httponly,
            secure=cookie_secure,
            samesite=cookie_samesite,
            path="/",
        )

        return response


class AdminLogoutView(APIView):
    """
    Clear admin httpOnly authentication cookie.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = Response({"success": True, "message": "Logged out successfully."})
        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "swiftsats_admin_jwt")
        response.delete_cookie(cookie_name, path="/")
        return response


class AdminProfileView(APIView):
    """
    Get or inspect current authenticated admin profile.
    """
    authentication_classes = [AdminJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            "success": True,
            "user": AdminUserSerializer(request.user).data,
            "totp_uri": request.user.get_totp_uri(),
        })
