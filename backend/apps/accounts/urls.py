from django.urls import path
from .views import (
    AdminLoginInitView,
    Admin2FAVerifyView,
    AdminProfileView,
    AdminLogoutView,
    CustomerRegisterView,
    CustomerLoginView,
    CustomerMeView,
    CustomerLogoutView,
)

urlpatterns = [
    # Admin Authentication (2FA)
    path("login/init/", AdminLoginInitView.as_view(), name="admin-login-init"),
    path("login/verify-2fa/", Admin2FAVerifyView.as_view(), name="admin-login-verify-2fa"),
    path("logout/", AdminLogoutView.as_view(), name="admin-logout"),
    path("profile/", AdminProfileView.as_view(), name="admin-profile"),

    # Customer Authentication (Email + Password)
    path("customer/register/", CustomerRegisterView.as_view(), name="customer-register"),
    path("customer/login/", CustomerLoginView.as_view(), name="customer-login"),
    path("customer/me/", CustomerMeView.as_view(), name="customer-me"),
    path("customer/logout/", CustomerLogoutView.as_view(), name="customer-logout"),
]
