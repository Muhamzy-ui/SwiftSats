import pytest
from django.test import TestCase, override_settings
from django.core.exceptions import ImproperlyConfigured
from config.settings.production import validate_production_configuration
from apps.exchange.client import QuidaxClient
from core.exceptions import PayoutExecutionError

class TestProductionSafeguards(TestCase):
    def test_production_startup_validation_hard_fails_without_credentials(self):
        """Verify that validating production settings without keys hard-fails immediately."""
        with override_settings(
            QUIDAX_API_KEY="sec_example_mock",
            PAYSTACK_SECRET_KEY="sk_test_example_mock",
            SECRET_KEY="insecure-key-123"
        ):
            with pytest.raises(ImproperlyConfigured) as exc_info:
                validate_production_configuration()
            assert "FATAL CONFIGURATION ERROR - STARTUP BLOCKED" in str(exc_info.value)
            assert "QUIDAX_API_KEY is missing" in str(exc_info.value)
            assert "PAYSTACK_SECRET_KEY is missing" in str(exc_info.value)

    def test_quidax_mock_raises_error_in_production_environment(self):
        """Verify that QuidaxClient refuses to run in mock mode when in production."""
        client = QuidaxClient(api_key="sec_example_mock")
        with override_settings(ENVIRONMENT="production", DEBUG=False):
            with pytest.raises(PayoutExecutionError) as exc_info:
                client.get_live_rate_for_coin("USDT_TRC20")
            assert "Mock fallback strictly prohibited" in str(exc_info.value)
