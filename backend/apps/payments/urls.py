"""
URL Routing for Payments & Webhooks.
"""
from django.urls import path
from .webhooks import PaystackWebhookView, SimulatePaymentView
from .nomba import NombaWebhookView, SubmitReceiptProofView

urlpatterns = [
    path("webhook/nomba/", NombaWebhookView.as_view(), name="nomba-webhook"),
    path("submit-receipt/", SubmitReceiptProofView.as_view(), name="submit-receipt"),
    path("webhook/paystack/", PaystackWebhookView.as_view(), name="paystack-webhook"),
    path("simulate-payment/", SimulatePaymentView.as_view(), name="simulate-payment"),
]
