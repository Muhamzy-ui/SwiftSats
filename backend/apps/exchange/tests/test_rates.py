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
        for r in rates:
            assert Decimal(r["usd_to_ngn_rate"]) == Decimal("1425.00")

    def test_dollar_rate_is_1425(self):
        service = RateService()
        assert service.get_live_usd_to_ngn_rate() == Decimal("1425.00")

    def test_fee_from_100_dollars_upward_is_flat_2_dollars(self):
        service = RateService()
        # 1. Test $100 order: $100 * 1425 + $2 fee (2850) = 145,350 NGN
        res100 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("145350.00")
        )
        assert res100["service_fee_usd"] == Decimal("2.00")
        assert res100["service_fee_ngn"] == Decimal("2850.00")
        assert res100["net_deposit_ngn"] == Decimal("142500.00")
        assert res100["dollar_value"] == Decimal("100.00")

        # 2. Test $500 order: $500 * 1425 + $2 fee (2850) = 715,350 NGN
        res500 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("715350.00")
        )
        assert res500["service_fee_usd"] == Decimal("2.00")
        assert res500["service_fee_ngn"] == Decimal("2850.00")
        assert res500["net_deposit_ngn"] == Decimal("712500.00")
        assert res500["dollar_value"] == Decimal("500.00")

    def test_fee_under_100_dollars_is_flat_1_dollar(self):
        service = RateService()
        # Test $10 order: $10 * 1425 + $1 fee (1425) = 15,675 NGN
        res10 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("15675.00")
        )
        assert res10["service_fee_usd"] == Decimal("1.00")
        assert res10["service_fee_ngn"] == Decimal("1425.00")
        assert res10["net_deposit_ngn"] == Decimal("14250.00")
        assert res10["dollar_value"] == Decimal("10.00")

        # Test $50 order: $50 * 1425 + $1 fee (1425) = 72,675 NGN
        res50 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("72675.00")
        )
        assert res50["service_fee_usd"] == Decimal("1.00")
        assert res50["service_fee_ngn"] == Decimal("1425.00")
        assert res50["net_deposit_ngn"] == Decimal("71250.00")
        assert res50["dollar_value"] == Decimal("50.00")
