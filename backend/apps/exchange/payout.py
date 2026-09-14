"""
Crypto Payout Execution Service.
Dispatches blockchain withdrawals via Quidax with telemetry and safety checks.
"""
from decimal import Decimal
from typing import Any, Dict, Optional
import logging
from django.utils import timezone
from .client import QuidaxClient
from core.constants import COIN_METADATA, SupportedCoin
from core.exceptions import PayoutExecutionError

logger = logging.getLogger(__name__)


class PayoutService:
    """
    Dedicated service for executing and recording crypto payouts.
    """

    def __init__(self, client: Optional[QuidaxClient] = None):
        self.client = client or QuidaxClient()

    def execute_payout(
        self,
        coin: str,
        amount: Decimal,
        destination_address: str,
        order_reference: str,
    ) -> Dict[str, Any]:
        """
        Execute crypto withdrawal to user wallet.
        If user bought a non-USDT coin (SOL, BTC, ETH, etc.), automatically swaps
        from the USDT master liquidity float before broadcasting the payout.
        """
        meta = COIN_METADATA.get(coin)
        if not meta:
            raise PayoutExecutionError(message=f"Unsupported coin for payout: {coin}")

        currency = meta["quidax_currency"]
        network = meta["quidax_network"]
        swap_id = None

        # Auto-Swap from USDT Master Float if user requested a non-USDT asset
        is_usdt_variant = coin in [
            SupportedCoin.USDT_TRC20,
            SupportedCoin.USDT_BEP20,
            SupportedCoin.USDT_ERC20,
        ]

        if not is_usdt_variant:
            logger.info(
                "Initiating USDT Auto-Swap for order %s: converting USDT -> %s (%s)",
                order_reference,
                currency,
                amount
            )
            try:
                # Estimate USDT required: amount * coin_usd_price
                coin_usd = meta.get("current_usd_price", Decimal("1.0"))
                usdt_required = (amount * coin_usd).quantize(Decimal("0.01"))

                quote = self.client.create_instant_swap_quote(
                    from_currency="usdt",
                    to_currency=currency,
                    from_amount=usdt_required,
                )
                swap_res = self.client.execute_instant_swap(quotation_id=quote["id"])
                swap_id = swap_res.get("id")
                logger.info("USDT Auto-Swap successful for order %s: swap_id=%s", order_reference, swap_id)
            except Exception as swap_err:
                logger.warning("Auto-swap warning for order %s: %s (proceeding to withdrawal)", order_reference, swap_err)

        logger.info(
            "Executing Quidax crypto payout: order=%s coin=%s amount=%s address=%s network=%s",
            order_reference,
            coin,
            amount,
            destination_address,
            network
        )

        result = self.client.withdraw_crypto_to_address(
            currency=currency,
            amount=amount,
            destination_address=destination_address,
            network=network,
            transaction_reference=order_reference,
        )

        if swap_id:
            result["swap_id"] = swap_id

        return result
