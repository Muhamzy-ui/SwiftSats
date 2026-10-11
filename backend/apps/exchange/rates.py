"""
Rate Caching and Calculation Service.
Maintains high-performance, short-TTL rate caches in Redis and computes fair spread pricing.
"""
from decimal import Decimal, ROUND_DOWN
from typing import Any, Dict, List, Optional
import logging
from django.core.cache import cache
from django.conf import settings
from .client import QuidaxClient
from core.constants import SupportedCoin, COIN_METADATA, BASE_USD_TO_NGN_RATE, SERVICE_FEE_NGN

logger = logging.getLogger(__name__)

RATE_CACHE_TTL_SECONDS = 300


class RateService:
    """
    Service for retrieving and computing cryptocurrency exchange rates.
    """

    def __init__(self, client: Optional[QuidaxClient] = None):
        self.client = client or QuidaxClient()
        self.spread_pct = getattr(settings, "QUIDAX_RATE_SPREAD_PERCENTAGE", Decimal("1.5"))

    def get_effective_rate_ngn(self, coin: str) -> Decimal:
        """
        Get the current effective rate for buying a coin with NGN (includes spread margin).
        Rate represents: NGN per 1 unit of Crypto.
        Cached in Redis with short TTL.
        """
        cache_key = f"swiftsats:rate:{coin}"
        cached_rate = cache.get(cache_key)
        if cached_rate:
            return Decimal(str(cached_rate))

        base_rate = self.client.get_live_rate_for_coin(coin)
        spread_multiplier = Decimal("1.0") + (self.spread_pct / Decimal("100.0"))
        effective_rate = (base_rate * spread_multiplier).quantize(Decimal("0.01"))

        cache.set(cache_key, str(effective_rate), timeout=RATE_CACHE_TTL_SECONDS)
        return effective_rate

    def get_live_usd_to_ngn_rate(self) -> Decimal:
        """
        Get the standard wholesale USD/NGN exchange rate for SwiftSats (fixed at ₦1,425.00).
        """
        return BASE_USD_TO_NGN_RATE

    def calculate_crypto_for_naira(
        self,
        coin: str,
        fiat_amount_ngn: Decimal
    ) -> Dict[str, Any]:
        """
        Compute how much crypto the user receives for a given Naira amount based on live rates.
        Pricing Rule:
        - For >= $100 USD deposit: Flat $2.00 USD service fee (not percentage anymore).
        - For <= $10 USD deposit: Flat $1.00 USD service fee.
        - For $10 - $100 USD deposit: 5% service fee, capped at $2.00 USD max.
        """
        if coin not in COIN_METADATA:
            raise ValueError(f"Unsupported coin: {coin}")

        meta = COIN_METADATA[coin]
        usd_to_ngn_rate = self.get_live_usd_to_ngn_rate()

        all_tickers = self.client.get_all_market_tickers()
        wholesale_rate = all_tickers.get(coin) or self.client.get_live_rate_for_coin(coin)
        usd_price = (wholesale_rate / usd_to_ngn_rate).quantize(Decimal("0.0001"))
        network_fee_crypto = meta["network_fee_crypto"]

        two_dollars_ngn = (Decimal("2.0") * usd_to_ngn_rate).quantize(Decimal("0.01"))
        approx_usd = fiat_amount_ngn / usd_to_ngn_rate

        # Pricing rules:
        # 1. From $100 USD upward: flat $2.00 USD service fee
        # 2. Below $100 USD (including $10 - $100): flat $1.00 USD service fee
        if approx_usd >= Decimal("100.0"):
            service_fee_usd = Decimal("2.00")
            service_fee_ngn = two_dollars_ngn
            net_deposit_ngn = max(Decimal("0.01"), fiat_amount_ngn - service_fee_ngn)
        else:
            service_fee_usd = Decimal("1.00")
            service_fee_ngn = usd_to_ngn_rate
            net_deposit_ngn = max(Decimal("0.01"), fiat_amount_ngn - service_fee_ngn)

        dollar_value = (net_deposit_ngn / usd_to_ngn_rate).quantize(Decimal("0.01"))
        gross_crypto = (net_deposit_ngn / wholesale_rate).quantize(Decimal("0.00000001"), rounding=ROUND_DOWN)

        net_crypto = (gross_crypto - network_fee_crypto).quantize(Decimal("0.00000001"), rounding=ROUND_DOWN)
        if net_crypto <= 0:
            net_crypto = gross_crypto

        return {
            "coin": coin,
            "fiat_amount_ngn": fiat_amount_ngn,
            "net_deposit_ngn": net_deposit_ngn,
            "unit_rate_ngn": wholesale_rate,
            "price_usd": usd_price,
            "dollar_value": dollar_value,
            "usd_to_ngn_rate": usd_to_ngn_rate,
            "service_fee_usd": service_fee_usd,
            "service_fee_ngn": service_fee_ngn,
            "network_fee_crypto": network_fee_crypto,
            "gross_crypto": gross_crypto,
            "net_crypto_amount": net_crypto,
            "network": meta["network"],
            "speed_category": meta["speed_category"],
            "estimated_delivery_time": meta["estimated_delivery_time"],
        }

    def get_all_supported_rates(self) -> List[Dict[str, Any]]:
        """
        Get live rate summary for all supported coins on the platform with 100% real Quidax market rates.
        """
        usd_to_ngn_rate = self.get_live_usd_to_ngn_rate()
        all_tickers = self.client.get_all_market_tickers()
        results = []
        for coin, meta in COIN_METADATA.items():
            rate = self.get_effective_rate_ngn(coin)
            wholesale_ngn = all_tickers.get(coin, rate)
            live_usd_price = (wholesale_ngn / usd_to_ngn_rate).quantize(Decimal("0.0001"))
            results.append({
                "coin": coin,
                "name": meta["name"],
                "symbol": meta["symbol"],
                "network": meta["network"],
                "price_usd": str(live_usd_price),
                "usd_to_ngn_rate": str(usd_to_ngn_rate),
                "rate_ngn": str(rate),
                "is_featured": meta["is_featured"],
                "speed_category": meta["speed_category"],
                "estimated_delivery_time": meta["estimated_delivery_time"],
                "min_amount_usd": str(meta.get("min_amount_usd", "5.00")),
                "min_amount_ngn": str(meta["min_amount_ngn"]),
                "max_amount_ngn": str(meta["max_amount_ngn"]),
                "network_fee_crypto": str(meta["network_fee_crypto"]),
            })
        return results
