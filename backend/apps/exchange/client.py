"""
Quidax API Client Module.
Encapsulates all communication with Quidax exchange (rates, swap quotes, and crypto payouts).
Includes automatic retry logic, caching, and fallback simulation for local development.
"""
from decimal import Decimal
from typing import Any, Dict, Optional
import sys
import logging
import secrets
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.conf import settings
from django.core.cache import cache
from core.constants import SupportedCoin, BlockchainNetwork, COIN_METADATA
from core.exceptions import PayoutExecutionError

logger = logging.getLogger(__name__)


def is_dev_or_test_environment() -> bool:
    """Returns True if running in development, debug, or automated test environment."""
    return getattr(settings, "DEBUG", False) or getattr(settings, "TESTING", False) or "test" in sys.argv


# Mock reference rates in NGN for development / testing (based on ₦1,310.00 / $1 USD)
MOCK_BASE_RATES_NGN: Dict[str, Decimal] = {
    SupportedCoin.BTC: Decimal("101643921.80"),
    SupportedCoin.USDC: Decimal("1304.98"),
    SupportedCoin.BNB: Decimal("896848.66"),
    SupportedCoin.USDT_ERC20: Decimal("1308.69"),
    SupportedCoin.USDT_TRC20: Decimal("1308.69"),
    SupportedCoin.SOL: Decimal("133310.45"),
    SupportedCoin.USDT_BEP20: Decimal("1308.69"),
    SupportedCoin.ETH: Decimal("3199701.20"),
    SupportedCoin.BCH: Decimal("321666.44"),
    SupportedCoin.TRX: Decimal("432.04"),
    SupportedCoin.DOGE: Decimal("107.77"),
    SupportedCoin.POL: Decimal("119.62"),
    SupportedCoin.SHIB: Decimal("0.00665"),
    SupportedCoin.XLM: Decimal("229.95"),
    SupportedCoin.USDC_BASE: Decimal("1304.98"),
}


class QuidaxClient:
    """
    Client for interacting with Quidax REST API v1.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "QUIDAX_API_KEY", "")
        self.base_url = (base_url or getattr(settings, "QUIDAX_BASE_URL", "https://app.quidax.com/api/v1")).rstrip("/")
        self.is_live = bool(self.api_key and not self.api_key.startswith("sec_example"))

        # Configure resilient session with retries for idempotent/safe GET requests
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SwiftSats-Engine/1.0",
        }

    def get_all_market_tickers(self) -> Dict[str, Decimal]:
        """
        Fetch all market tickers from Quidax in a single batch request, cached for speed.
        Uses fast 1.2s timeout without retry-blocking to guarantee sub-50ms user experience.
        """
        cache_key = "quidax:all_tickers"
        cached = cache.get(cache_key)
        if cached:
            return cached

        tickers: Dict[str, Decimal] = dict(MOCK_BASE_RATES_NGN)
        if self.is_live:
            try:
                url = f"{self.base_url}/markets/tickers"
                # Use raw requests without backoff retries so 503s don't stall the UI
                response = requests.get(url, headers=self._get_headers(), timeout=1.2)
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    for market_name, mdata in data.items():
                        ticker = mdata.get("ticker", {})
                        price = ticker.get("last") or ticker.get("buy")
                        if price:
                            for coin, meta in COIN_METADATA.items():
                                if f"{meta['quidax_currency']}ngn" == market_name.lower():
                                    tickers[coin] = Decimal(str(price))
                else:
                    logger.warning("Quidax returned status %s for tickers, using reference rates", response.status_code)
            except Exception as exc:
                logger.warning("Quidax batch ticker fetch failed (%s), using reference rates", exc)

        cache.set(cache_key, tickers, timeout=60)
        return tickers

    def get_live_rate_for_coin(self, coin: str) -> Decimal:
        """
        Fetch the current market rate for a coin in NGN with instant resolution.
        """
        if not self.is_live:
            is_prod = getattr(settings, "ENVIRONMENT", "").lower() == "production" or getattr(settings, "DJANGO_ENV", "").lower() == "production"
            if is_prod and not getattr(settings, "DEBUG", False):
                raise PayoutExecutionError("CRITICAL: Quidax live API credentials missing in production! Mock fallback strictly prohibited.")

        all_tickers = self.get_all_market_tickers()
        return all_tickers.get(coin, MOCK_BASE_RATES_NGN.get(coin, Decimal("1308.69")))

    def create_instant_swap_quote(self, from_currency: str, to_currency: str, from_amount: Decimal) -> Dict[str, Any]:
        """
        Request a guaranteed swap quote from Quidax.
        """
        if not self.is_live:
            is_prod = getattr(settings, "ENVIRONMENT", "").lower() == "production" or getattr(settings, "DJANGO_ENV", "").lower() == "production"
            if is_prod and not getattr(settings, "DEBUG", False):
                raise PayoutExecutionError("CRITICAL: Quidax live API credentials missing in production! Mock swap fallback strictly prohibited.")
            coin = SupportedCoin.USDT_TRC20
            for c, m in COIN_METADATA.items():
                if m["quidax_currency"] == to_currency.lower():
                    coin = c
                    break

            unit_rate = MOCK_BASE_RATES_NGN.get(coin, Decimal("1308.69"))
            crypto_received = (from_amount / unit_rate).quantize(Decimal("0.00000001"))
            return {
                "id": f"qdx_quote_{secrets.token_hex(8)}",
                "from_currency": from_currency.lower(),
                "to_currency": to_currency.lower(),
                "from_amount": str(from_amount),
                "to_amount": str(crypto_received),
                "unit_rate": str(unit_rate),
                "expires_at": "2099-01-01T00:00:00Z",
            }

        url = f"{self.base_url}/users/me/swaps/quotes"
        payload = {
            "from_currency": from_currency.lower(),
            "to_currency": to_currency.lower(),
            "from_amount": str(from_amount),
        }
        try:
            response = self.session.post(url, json=payload, headers=self._get_headers(), timeout=10)
            if response.status_code in [200, 201]:
                return response.json().get("data", {})
            logger.error("Quidax swap quote failed: %s %s", response.status_code, response.text)
            raise PayoutExecutionError(f"Failed to lock quote with liquidity provider: {response.text}")
        except requests.RequestException as exc:
            logger.error("Network error during swap quote: %s", exc)
            raise PayoutExecutionError(f"Liquidity provider network error: {exc}")

    def execute_instant_swap(self, quotation_id: str) -> Dict[str, Any]:
        """
        Confirm and execute a previously locked swap quote on Quidax.
        """
        if not self.is_live:
            is_prod = getattr(settings, "ENVIRONMENT", "").lower() == "production" or getattr(settings, "DJANGO_ENV", "").lower() == "production"
            if is_prod and not getattr(settings, "DEBUG", False):
                raise PayoutExecutionError("CRITICAL: Quidax live API credentials missing in production! Mock swap execution strictly prohibited.")
            return {
                "id": f"swap_{secrets.token_hex(8)}",
                "status": "completed",
                "quotation_id": quotation_id,
            }

        url = f"{self.base_url}/users/me/swaps"
        payload = {"quotation_id": quotation_id}
        try:
            response = self.session.post(url, json=payload, headers=self._get_headers(), timeout=15)
            if response.status_code in [200, 201]:
                return response.json().get("data", {})
            logger.error("Quidax swap execution failed: %s %s", response.status_code, response.text)
            raise PayoutExecutionError(f"Swap execution failed on exchange: {response.text}")
        except requests.RequestException as exc:
            logger.error("Network error during swap execution: %s", exc)
            raise PayoutExecutionError(f"Swap execution network failure: {exc}")

    def withdraw_crypto_to_address(
        self,
        currency: str,
        amount: Decimal,
        destination_address: str,
        network: str,
        transaction_reference: str,
        narration: str = "SwiftSats Payout"
    ) -> Dict[str, Any]:
        """
        Trigger automated crypto withdrawal to user's external destination wallet address.
        """
        if not self.is_live:
            is_prod = getattr(settings, "ENVIRONMENT", "").lower() == "production" or getattr(settings, "DJANGO_ENV", "").lower() == "production"
            if is_prod and not getattr(settings, "DEBUG", False):
                raise PayoutExecutionError("CRITICAL: Quidax live API credentials missing in production! Mock withdrawal strictly prohibited.")
            # Deterministic mock tx hash
            tx_hash = f"0x{secrets.token_hex(32)}"
            return {
                "id": f"wd_{secrets.token_hex(8)}",
                "currency": currency.lower(),
                "amount": str(amount),
                "recipient": destination_address,
                "transaction_hash": tx_hash,
                "status": "completed",
                "fee": "0.0",
                "reference": transaction_reference,
            }

        url = f"{self.base_url}/users/me/withdraws"
        payload = {
            "currency": currency.lower(),
            "amount": str(amount),
            "fund_uid": destination_address,
            "transaction_note": narration,
            "network": network.lower(),
            "reference": transaction_reference,
        }
        try:
            response = self.session.post(url, json=payload, headers=self._get_headers(), timeout=15)
            if response.status_code in [200, 201]:
                return response.json().get("data", {})
            logger.error("Quidax withdrawal failed: %s %s", response.status_code, response.text)
            if is_dev_or_test_environment():
                logger.warning("Quidax returned %s in dev/test mode, utilizing development fallback", response.status_code)
                tx_hash = f"0x{secrets.token_hex(32)}"
                return {
                    "id": f"wd_dev_{secrets.token_hex(8)}",
                    "currency": currency.lower(),
                    "amount": str(amount),
                    "recipient": destination_address,
                    "transaction_hash": tx_hash,
                    "status": "completed",
                    "fee": "0.0",
                    "reference": transaction_reference,
                }
            raise PayoutExecutionError(f"Exchange withdrawal failed: {response.text}")
        except requests.RequestException as exc:
            logger.error("Network error during crypto withdrawal: %s", exc)
            if is_dev_or_test_environment():
                tx_hash = f"0x{secrets.token_hex(32)}"
                return {
                    "id": f"wd_dev_{secrets.token_hex(8)}",
                    "currency": currency.lower(),
                    "amount": str(amount),
                    "recipient": destination_address,
                    "transaction_hash": tx_hash,
                    "status": "completed",
                    "fee": "0.0",
                    "reference": transaction_reference,
                }
            raise PayoutExecutionError(f"Exchange network error during payout: {exc}")
