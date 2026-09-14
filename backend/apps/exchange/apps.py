"""
App configuration for Exchange module.
"""
from django.apps import AppConfig


class ExchangeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.exchange"
    verbose_name = "Quidax Crypto Exchange & Rates"
