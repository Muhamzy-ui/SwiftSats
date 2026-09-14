"""
App configuration for Payments module.
"""
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    verbose_name = "Paystack Naira Virtual Accounts & Webhooks"
