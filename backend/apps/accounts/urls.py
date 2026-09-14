"""
URL Routing for Admin Authentication and 2FA.
"""
from django.urls import path
from .views import AdminLoginInitView, Admin2FAVerifyView, AdminProfileView, AdminLogoutView

urlpatterns = [
    path("login/init/", AdminLoginInitView.as_view(), name="admin-login-init"),
    path("login/verify-2fa/", Admin2FAVerifyView.as_view(), name="admin-login-verify-2fa"),
    path("logout/", AdminLogoutView.as_view(), name="admin-logout"),
    path("profile/", AdminProfileView.as_view(), name="admin-profile"),
]
