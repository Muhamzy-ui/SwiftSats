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

    def get_dispatch_address(self) -> str:
        """
        Resolve platform dispatch wallet address from account, settings, or environment.
        """
        account = self.get_configured_account()
        if account:
            return account.address

        try:
            from apps.admin_api.models import PlatformSettings
            ps = PlatformSettings.get_settings()
            if ps and ps.hot_wallet_address:
                return ps.hot_wallet_address.strip()
        except Exception:
            pass

        env_addr = os.getenv("HOT_WALLET_ADDRESS", "").strip()
        if env_addr:
            return env_addr

        # Fallback to primary vault address if defined
        return "0x36b25000587762425F2682d721A57eD7d74671F0"

    def get_wallet_balance(self, coin: str = "USDT_BEP20", address: Optional[str] = None) -> Dict[str, Any]:
        """
        Query real-time on-chain token balance and native gas balance for the platform wallet.
        """
        import requests
        target_addr = (address or self.get_dispatch_address()).strip()
        if not target_addr:
            return {
                "wallet_address": "",
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "BNB",
                "has_gas": False,
                "is_configured": False,
                "coin": coin,
            }

        # 1. TRON (TRC-20)
        if target_addr.startswith("T") or "TRC" in coin.upper():
            try:
                r = requests.get(f"https://api.trongrid.io/v1/accounts/{target_addr}", timeout=4.0)
                if r.status_code == 200:
                    items = r.json().get("data", [])
                    if items:
                        d = items[0]
                        trx_sun = d.get("balance", 0)
                        trx_bal = Decimal(str(trx_sun)) / Decimal(10**6)
                        token_bal = Decimal("0.00")
                        for t_entry in d.get("trc20", []):
                            if "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" in t_entry:
                                token_bal = Decimal(str(t_entry["TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"])) / Decimal(10**6)
                        return {
                            "wallet_address": target_addr,
                            "token_balance": token_bal,
                            "gas_balance": trx_bal,
                            "gas_symbol": "TRX",
                            "has_gas": trx_bal >= Decimal("15.0"),
                            "is_configured": True,
                            "coin": coin,
                        }
            except Exception as ex:
                logger.warning("Tron on-chain query exception for %s: %s", target_addr, ex)
            return {
                "wallet_address": target_addr,
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "TRX",
                "has_gas": False,
                "is_configured": True,
                "coin": coin,
            }

        # 2. SOLANA (SPL)
        if len(target_addr) in [43, 44] and not target_addr.startswith("0x"):
            try:
                payload = {"jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [target_addr]}
                r = requests.post("https://api.mainnet-beta.solana.com", json=payload, timeout=4.0)
                if r.status_code == 200:
                    lamports = r.json().get("result", {}).get("value", 0)
                    sol_bal = Decimal(str(lamports)) / Decimal(10**9)
                    return {
                        "wallet_address": target_addr,
                        "token_balance": sol_bal,
                        "gas_balance": sol_bal,
                        "gas_symbol": "SOL",
                        "has_gas": sol_bal >= Decimal("0.005"),
                        "is_configured": True,
                        "coin": coin,
                    }
            except Exception as ex:
                logger.warning("Solana on-chain query exception for %s: %s", target_addr, ex)
            return {
                "wallet_address": target_addr,
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "SOL",
                "has_gas": False,
                "is_configured": True,
                "coin": coin,
            }

        # 3. EVM / BNB SMART CHAIN (BEP-20)
        try:
            chk_addr = Web3.to_checksum_address(target_addr)
            bnb_wei = self.w3.eth.get_balance(chk_addr)
            bnb_bal = Decimal(str(bnb_wei)) / Decimal(10**18)

            coin_norm = (coin or "").upper()
            if coin_norm in ["BNB", "BSC"]:
                token_bal = bnb_bal
            else:
                contract_addr = Web3.to_checksum_address(BSC_USDT_CONTRACT_ADDRESS)
                contract = self.w3.eth.contract(address=contract_addr, abi=ERC20_MINIMAL_ABI)
                usdt_wei = contract.functions.balanceOf(chk_addr).call()
                token_bal = Decimal(str(usdt_wei)) / Decimal(10**18)

            return {
                "wallet_address": chk_addr,
                "token_balance": token_bal,
                "gas_balance": bnb_bal,
                "gas_symbol": "BNB",
                "has_gas": bnb_bal >= Decimal("0.001"),
                "is_configured": True,
                "coin": coin,
            }
        except Exception as ex:
            logger.warning("BSC on-chain query exception for %s: %s", target_addr, ex)
            return {
                "wallet_address": target_addr,
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "BNB",
                "has_gas": False,
                "is_configured": True,
                "coin": coin,
            }

    def check_sufficient_funds(
        self,
        coin: str,
        required_amount: Decimal,
        destination_network: Optional[str] = None,
        address: Optional[str] = None,
    ) -> tuple[bool, str, Dict[str, Any]]:
        """
        Strict pre-flight validation: verifies on-chain that the platform wallet has
        both sufficient crypto balance and gas fees to fulfill the order.
        """
        bal_info = self.get_wallet_balance(coin=coin, address=address)
        if not bal_info.get("is_configured") or not bal_info.get("wallet_address"):
            return (
                False,
                "Platform dispatch wallet address is not configured. Please set your wallet address in Admin Settings.",
                bal_info,
            )

        token_bal = bal_info.get("token_balance", Decimal("0.00"))
        gas_bal = bal_info.get("gas_balance", Decimal("0.00"))
        gas_symbol = bal_info.get("gas_symbol", "BNB")
        wallet_addr = bal_info.get("wallet_address", "")

        if token_bal < required_amount:
            shortage = required_amount - token_bal
            return (
                False,
                f"❌ Insufficient Funds in Platform Wallet! Required: {required_amount} {coin}, but wallet ({wallet_addr}) only has {token_bal:.4f} {coin} (Shortage: {shortage:.4f} {coin}). Please deposit crypto to your platform wallet before releasing.",
                bal_info,
            )

        if not bal_info.get("has_gas", True):
            return (
                False,
                f"❌ Insufficient Network Gas Fee! Platform wallet has {token_bal:.4f} {coin}, but 0.00 {gas_symbol} for blockchain transaction fees. Please deposit at least 0.005 {gas_symbol} to cover gas fees.",
                bal_info,
            )

        return (True, "Sufficient on-chain balance and gas fee verified.", bal_info)

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
