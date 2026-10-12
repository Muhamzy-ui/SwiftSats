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
            assert Decimal(r["usd_to_ngn_rate"]) == Decimal("1398.99")

    def test_dollar_rate_is_1398_99(self):
        service = RateService()
        assert service.get_live_usd_to_ngn_rate() == Decimal("1398.99")

    def test_fee_from_100_dollars_upward_is_flat_2_dollars(self):
        service = RateService()
        # 1. Test $100 order: $100 * 1398.99 + $2 fee (2797.98) = 142,696.98 NGN
        res100 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("142696.98")
        )
        assert res100["service_fee_usd"] == Decimal("2.00")
        assert res100["service_fee_ngn"] == Decimal("2797.98")
        assert res100["net_deposit_ngn"] == Decimal("139899.00")
        assert res100["dollar_value"] == Decimal("100.00")

        # 2. Test $500 order: $500 * 1398.99 + $2 fee (2797.98) = 702,292.98 NGN
        res500 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("702292.98")
        )
        assert res500["service_fee_usd"] == Decimal("2.00")
        assert res500["service_fee_ngn"] == Decimal("2797.98")
        assert res500["net_deposit_ngn"] == Decimal("699495.00")
        assert res500["dollar_value"] == Decimal("500.00")

    def test_fee_under_100_dollars_is_flat_1_dollar(self):
        service = RateService()
        # Test $10 order on BEP20 (low fee network): $10 * 1398.99 + $1 fee (1398.99) = 15,388.89 NGN
        res10 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_BEP20,
            fiat_amount_ngn=Decimal("15388.89")
        )
        assert res10["service_fee_usd"] == Decimal("1.00")
        assert res10["service_fee_ngn"] == Decimal("1398.99")
        assert res10["net_deposit_ngn"] == Decimal("13989.90")
        assert res10["dollar_value"] == Decimal("10.00")

        # Test $50 order: $50 * 1398.99 + $1 fee (1398.99) = 71,348.49 NGN
        res50 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_BEP20,
            fiat_amount_ngn=Decimal("71348.49")
        )
        assert res50["service_fee_usd"] == Decimal("1.00")
        assert res50["service_fee_ngn"] == Decimal("1398.99")
        assert res50["net_deposit_ngn"] == Decimal("69949.50")
        assert res50["dollar_value"] == Decimal("50.00")

    def test_fee_for_trc20_is_flat_2_dollars(self):
        service = RateService()
        # Test $10 TRC20 order (covers $1 on-chain Tron gas): $10 * 1398.99 + $2 fee (2797.98) = 16,787.88 NGN
        res10 = service.calculate_crypto_for_naira(
            coin=SupportedCoin.USDT_TRC20,
            fiat_amount_ngn=Decimal("16787.88"),
            partner_code="axiom"
        )
        assert res10["service_fee_usd"] == Decimal("2.00")
        assert res10["service_fee_ngn"] == Decimal("2797.98")
        assert res10["net_deposit_ngn"] == Decimal("13989.90")
        assert res10["dollar_value"] == Decimal("10.00")
