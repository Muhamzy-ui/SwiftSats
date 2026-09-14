"""
Tests for Exchange Rate Calculations and Spread.
"""
from decimal import Decimal
from apps.exchange.rates import RateService
from core.constants import SupportedCoin


class TestRateService:
    """Test suite for live rate caching and calculations."""

    def test_calculate_crypto_for_naira(self):
        service = RateService()
        result = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("50000.00")
        )

        assert result["coin"] == SupportedCoin.USDT_TRC20
        assert result["fiat_amount_ngn"] == Decimal("50000.00")
        assert result["net_crypto_amount"] > 0
        assert result["network"] == "TRC20"
        assert result["speed_category"] == "Fastest"

    def test_all_supported_rates_available(self):
        service = RateService()
        rates = service.get_all_supported_rates()
        assert len(rates) >= 4
        coins = [r["coin"] for r in rates]
        assert SupportedCoin.USDT_TRC20 in coins
        assert SupportedCoin.SOL in coins
        assert SupportedCoin.BNB in coins
        assert SupportedCoin.BTC in coins
