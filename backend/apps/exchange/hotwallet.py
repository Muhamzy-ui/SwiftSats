"""
Self-Custody Hot Wallet Broadcaster for SwiftSats.
Dispatches BEP-20 (USDT / BNB) payouts directly to blockchain via JSON-RPC.
Zero reliance on third-party exchange APIs (Quidax / Bybit).
"""
import os
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from web3 import Web3
from eth_account import Account

logger = logging.getLogger(__name__)

# Standard USDT Contract on BNB Smart Chain (BSC Mainnet)
BSC_USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"
BSC_RPC_FALLBACKS = [
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",
    "https://1rpc.io/bnb",
]

# Minimal ERC-20 ABI for transfer and balance
ERC20_MINIMAL_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
]


class HotWalletService:
    """
    Automated blockchain transaction dispatcher.
    """

    def __init__(self, rpc_url: Optional[str] = None):
        self.w3 = None
        custom_rpc = rpc_url or os.getenv("BSC_RPC_URL")
        endpoints = [custom_rpc] if custom_rpc else BSC_RPC_FALLBACKS

        for url in endpoints:
            if not url:
                continue
            try:
                provider = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": 6}))
                if provider.is_connected():
                    self.w3 = provider
                    self.rpc_url = url
                    break
            except Exception:
                continue

        if not self.w3:
            # Fallback to default
            self.rpc_url = "https://bsc-dataseed.binance.org/"
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

    def get_configured_account(self) -> Optional[Any]:
        """
        Derive account from private key or seed phrase in environment.
        """
        raw_key = os.getenv("HOT_WALLET_PRIVATE_KEY", "").strip()
        seed_phrase = os.getenv("HOT_WALLET_SEED_PHRASE", "").strip()

        if raw_key:
            if not raw_key.startswith("0x"):
                raw_key = "0x" + raw_key
            try:
                return Account.from_key(raw_key)
            except Exception as e:
                logger.error("Failed to parse HOT_WALLET_PRIVATE_KEY: %s", e)

        if seed_phrase:
            try:
                Account.enable_unaudited_hdwallet_features()
                return Account.from_mnemonic(seed_phrase)
            except Exception as e:
                logger.error("Failed to parse HOT_WALLET_SEED_PHRASE: %s", e)

        return None

    def send_usdt_bep20(
        self,
        destination_address: str,
        amount_usdt: Decimal,
        order_reference: str,
    ) -> Dict[str, Any]:
        """
        Broadcast BEP-20 USDT transfer from hot wallet to customer wallet.
        """
        account = self.get_configured_account()
        if not account:
            return {
                "success": False,
                "requires_manual": True,
                "message": "HOT_WALLET_PRIVATE_KEY not configured in environment. Queued for 1-tap manual release.",
            }

        if not self.w3.is_connected():
            return {
                "success": False,
                "requires_manual": True,
                "message": "Unable to connect to BSC RPC node. Queued for 1-tap manual release.",
            }

        try:
            dest_checksum = Web3.to_checksum_address(destination_address.strip())
            sender_address = account.address
            contract_address = Web3.to_checksum_address(BSC_USDT_CONTRACT_ADDRESS)

            contract = self.w3.eth.contract(address=contract_address, abi=ERC20_MINIMAL_ABI)

            # USDT on BSC has 18 decimals
            amount_wei = int(Decimal(str(amount_usdt)) * Decimal(10**18))

            nonce = self.w3.eth.get_transaction_count(sender_address)
            gas_price = self.w3.eth.gas_price

            # Build ERC-20 transfer transaction
            tx = contract.functions.transfer(dest_checksum, amount_wei).build_transaction({
                "chainId": 56,  # BSC Mainnet
                "gas": 80000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "from": sender_address,
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=account.key)
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = self.w3.to_hex(tx_hash_bytes)

            logger.info(
                "Dispatched BEP-20 USDT payout for order %s: tx=%s to=%s amount=%s",
                order_reference, tx_hash, dest_checksum, amount_usdt
            )

            return {
                "success": True,
                "requires_manual": False,
                "tx_hash": tx_hash,
                "explorer_url": f"https://bscscan.com/tx/{tx_hash}",
                "sender_address": sender_address,
                "destination_address": dest_checksum,
                "amount": str(amount_usdt),
            }

        except Exception as exc:
            logger.error("Hot wallet payout failed for %s: %s", order_reference, exc)
            return {
                "success": False,
                "requires_manual": True,
                "error": str(exc),
                "message": f"Blockchain broadcast error: {str(exc)}",
            }
