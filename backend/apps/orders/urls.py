"""
URL Routing for Orders API.
"""
from django.urls import path
from .views import (
    CreateQuoteView,
    LockAndGeneratePaymentView,
    OrderStatusLookupView,
    ValidateWalletPreflightView,
)

urlpatterns = [
    path("quote/", CreateQuoteView.as_view(), name="order-create-quote"),
    path("create/", LockAndGeneratePaymentView.as_view(), name="order-lock-and-pay"),
    path("validate-wallet/", ValidateWalletPreflightView.as_view(), name="order-validate-wallet"),
    path("<str:order_reference>/", OrderStatusLookupView.as_view(), name="order-status-lookup"),
]
