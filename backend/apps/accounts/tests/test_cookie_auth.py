import pyotp
import pytest
from django.urls import reverse
from rest_framework.test import APITestCase
from apps.accounts.models import AdminUser

class TestAdminCookieAuthentication(APITestCase):
    def setUp(self):
        self.admin = AdminUser.objects.create(
            email="superadmin@swiftsats.com",
            first_name="Super",
            last_name="Admin",
            role="SUPER_ADMIN",
            is_active=True,
        )
        self.admin.set_password("AdminSecurePassword2026!")
        self.admin.two_factor_secret = pyotp.random_base32()
        self.admin.save()

    def test_2fa_verification_sets_httponly_cookie(self):
        # Step 1: Login Init
        init_res = self.client.post(
            reverse("admin-login-init"),
            {"email": "superadmin@swiftsats.com", "password": "AdminSecurePassword2026!"},
            format="json"
        )
        assert init_res.status_code == 200
        temp_token = init_res.data["temp_session_token"]

        # Step 2: 2FA Verify with real TOTP code
        totp = pyotp.TOTP(self.admin.two_factor_secret)
        current_code = totp.now()

        verify_res = self.client.post(
            reverse("admin-login-verify-2fa"),
            {
                "email": "superadmin@swiftsats.com",
                "temp_session_token": temp_token,
                "totp_code": current_code
            },
            format="json"
        )
        assert verify_res.status_code == 200
        assert "swiftsats_admin_jwt" in verify_res.cookies
        cookie = verify_res.cookies["swiftsats_admin_jwt"]
        assert cookie["httponly"] is True
        assert cookie["samesite"] == "Lax"

        # Step 3: Access protected profile using the cookie
        profile_res = self.client.get(reverse("admin-profile"))
        assert profile_res.status_code == 200
        assert profile_res.data["user"]["email"] == "superadmin@swiftsats.com"

        # Step 4: Logout clears the cookie
        logout_res = self.client.post(reverse("admin-logout"))
        assert logout_res.status_code == 200
        assert logout_res.cookies["swiftsats_admin_jwt"].value == ""
