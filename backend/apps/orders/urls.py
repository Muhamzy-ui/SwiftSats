"""
URL Routing for Orders API.
"""
from django.urls import path
from .views import (
    CreateQuoteView,
    LockAndGeneratePaymentView,
    OrderStatusLookupView,
    ValidateWalletPreflightView,
    RecentTelemetryOrdersView,
    CancelOrderView,
    SendEmailOTPView,
    VerifyEmailOTPView,
)

urlpatterns = [
    path("quote/", CreateQuoteView.as_view(), name="order-create-quote"),
    path("create/", LockAndGeneratePaymentView.as_view(), name="order-lock-and-pay"),
    path("validate-wallet/", ValidateWalletPreflightView.as_view(), name="order-validate-wallet"),
    path("recent/", RecentTelemetryOrdersView.as_view(), name="order-recent-telemetry"),
    path("auth/send-otp/", SendEmailOTPView.as_view(), name="order-send-otp"),
    path("auth/verify-otp/", VerifyEmailOTPView.as_view(), name="order-verify-otp"),
    path("<str:order_reference>/cancel/", CancelOrderView.as_view(), name="order-cancel"),
    path("<str:order_reference>/", OrderStatusLookupView.as_view(), name="order-status-lookup"),
]
