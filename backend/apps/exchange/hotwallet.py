"""
Self-Custody Hot Wallet Broadcaster for SwiftSats.
Dispatches BEP-20 (USDT / BNB) payouts directly to blockchain via JSON-RPC.
Zero reliance on third-party exchange APIs (Quidax / Bybit).
"""
import os
import logging
import hashlib
import hmac
import base64
import requests
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple

from web3 import Web3
from eth_account import Account

logger = logging.getLogger(__name__)

# Base58 implementation
B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58encode(b: bytes) -> str:
    n = int.from_bytes(b, "big")
    res = ""
    while n > 0:
        n, r = divmod(n, 58)
        res = B58_ALPHABET[r] + res
    pad = 0
    for byte in b:
        if byte == 0: pad += 1
        else: break
    return "1" * pad + res

def b58decode(s: str) -> bytes:
    n = 0
    for c in s:
        n = n * 58 + B58_ALPHABET.index(c)
    res = []
    while n > 0:
        res.append(n & 0xff)
        n >>= 8
    res = bytes(reversed(res))
    pad = 0
    for c in s:
        if c == '1': pad += 1
        else: break
    return b'\x00' * pad + res

def derive_slip0010_ed25519(seed_bytes: bytes, path: str) -> bytes:
    I = hmac.new(b"ed25519 seed", seed_bytes, hashlib.sha512).digest()
    key, cc = I[:32], I[32:]
    for seg in path.split('/')[1:]:
        hardened = seg.endswith("'")
        index = int(seg[:-1]) if hardened else int(seg)
        if hardened:
            index += 0x80000000
        data = b"\x00" + key + index.to_bytes(4, 'big')
        I = hmac.new(cc, data, hashlib.sha512).digest()
        key, cc = I[:32], I[32:]
    return key

# Bitcoin helpers (Bech32, scriptPubKey, VarInt)
def bech32_polymod(values):
    GEN = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    chk = 1
    for v in values:
        b = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ v
        for i in range(5):
            chk ^= GEN[i] if ((b >> i) & 1) else 0
    return chk

def bech32_encode(hrp, data):
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    combined = data + [0, 0, 0, 0, 0, 0]
    polymod = bech32_polymod([ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp] + combined) ^ 1
    checksum = [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join([CHARSET[d] for d in data + checksum])

def convertbits(data, frombits, tobits, pad=True):
    acc, bits, ret, maxv = 0, 0, [], (1 << tobits) - 1
    for value in data:
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad and bits:
        ret.append((acc << (tobits - bits)) & maxv)
    return ret

def bech32_decode(bech):
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    pos = bech.rfind("1")
    if pos == -1:
        raise ValueError(f"Invalid bech32 address: {bech}")
    hrp = bech[:pos]
    data = [CHARSET.index(x) for x in bech[pos + 1 :]]
    witver = data[0]
    data_5 = data[1:-6]
    acc, bits, ret, maxv = 0, 0, [], 255
    for value in data_5:
        acc = (acc << 5) | value
        bits += 5
        while bits >= 8:
            bits -= 8
            ret.append((acc >> bits) & maxv)
    return witver, bytes(ret)

def addr_to_script_pubkey(addr: str) -> bytes:
    addr = addr.strip()
    if addr.startswith("bc1q"):
        ver, prog = bech32_decode(addr)
        return bytes([ver, len(prog)]) + prog
    elif addr.startswith("1"):
        raw = b58decode(addr)[:-4]
        return b"\x76\xa9\x14" + raw[1:] + b"\x88\xac"
    elif addr.startswith("3"):
        raw = b58decode(addr)[:-4]
        return b"\xa9\x14" + raw[1:] + b"\x87"
    raise ValueError(f"Unsupported BTC address format: {addr}")

def btc_varint(n: int) -> bytes:
    if n < 0xFD:
        return bytes([n])
    elif n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    elif n <= 0xFFFFFFFF:
        return b"\xfe" + n.to_bytes(4, "little")
    else:
        return b"\xff" + n.to_bytes(8, "little")

def dsha256(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

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

    def get_dispatch_address(self, coin: str = "USDT_BEP20", network: Optional[str] = None) -> str:
        """
        Resolve platform dispatch wallet address for any cryptocurrency and blockchain network.
        Supports EVM (BEP-20 / ERC-20), Tron (TRC-20), Bitcoin, and Solana.
        """
        coin_upper = (coin or "").upper()
        net_upper = (network or "").upper()

        # 1. TRON (TRC-20 USDT / TRX)
        if "TRC" in coin_upper or "TRON" in net_upper or coin_upper in ["TRX", "USDT_TRC20"]:
            env_tron = os.getenv("HOT_WALLET_ADDRESS_TRON", "").strip()
            if env_tron:
                return env_tron
            try:
                from apps.admin_api.models import PlatformSettings
                ps = PlatformSettings.get_settings()
                if ps and getattr(ps, "hot_wallet_address_tron", None):
                    return ps.hot_wallet_address_tron.strip()
            except Exception:
                pass
            return "TRwHndDNkm2vpE6SiszKjowv6aKaKD7RZT"

        # 2. BITCOIN (BTC)
        if "BTC" in coin_upper or "BITCOIN" in net_upper:
            env_btc = os.getenv("HOT_WALLET_ADDRESS_BITCOIN", "").strip()
            if env_btc:
                return env_btc
            try:
                from apps.admin_api.models import PlatformSettings
                ps = PlatformSettings.get_settings()
                if ps and getattr(ps, "hot_wallet_address_bitcoin", None):
                    return ps.hot_wallet_address_bitcoin.strip()
            except Exception:
                pass
            try:
                btc_acc = self.get_bitcoin_account()
                if btc_acc:
                    return btc_acc[3]
            except Exception:
                pass
            return "bc1q6eqe0nn04k4k78ll6gmdr3wqctgk8daayrtryl"

        # 3. SOLANA (SOL / SPL)
        if "SOL" in coin_upper or "SOLANA" in net_upper:
            env_sol = os.getenv("HOT_WALLET_ADDRESS_SOLANA", "").strip()
            if env_sol:
                return env_sol
            try:
                from apps.admin_api.models import PlatformSettings
                ps = PlatformSettings.get_settings()
                if ps and getattr(ps, "hot_wallet_address_solana", None):
                    return ps.hot_wallet_address_solana.strip()
            except Exception:
                pass
            return "4F7JuhSiALdZNwDi14x7mVa3T8Pie9QmgBGUPDk32jWC"

        # 4. EVM / BSC / ETHEREUM / BASE / POLYGON
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

        return "0x36b25000587762425F2682d721A57eD7d74671F0"

    def get_wallet_balance(self, coin: str = "USDT_BEP20", address: Optional[str] = None) -> Dict[str, Any]:
        """
        Query real-time on-chain token balance and native gas balance for the platform wallet.
        Supports BSC (BEP-20), Tron (TRC-20), Bitcoin, and Solana.
        """
        import requests
        target_addr = (address or self.get_dispatch_address(coin=coin)).strip()
        if not target_addr:
            return {
                "wallet_address": "",
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "BNB",
                "has_gas": False,
                "is_configured": False,
                "coin": coin,
                "network": "Unknown",
            }

        # 1. TRON (TRC-20 / TRX)
        if target_addr.startswith("T") or "TRC" in coin.upper() or coin.upper() == "TRX":
            try:
                r = requests.get(f"https://api.trongrid.io/v1/accounts/{target_addr}", timeout=4.0)
                if r.status_code == 200:
                    items = r.json().get("data", [])
                    if items:
                        d = items[0]
                        trx_sun = d.get("balance", 0)
                        trx_bal = Decimal(str(trx_sun)) / Decimal(10**6)
                        token_bal = trx_bal if coin.upper() == "TRX" else Decimal("0.00")
                        if coin.upper() != "TRX":
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
                            "network": "Tron (TRC-20)",
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
                "network": "Tron (TRC-20)",
            }

        # 2. BITCOIN (BTC)
        if target_addr.startswith("bc1") or target_addr.startswith("1") or target_addr.startswith("3") or "BTC" in coin.upper():
            try:
                r = requests.get(f"https://blockstream.info/api/address/{target_addr}", timeout=4.0)
                if r.status_code == 200:
                    d = r.json()
                    stats = d.get("chain_stats", {})
                    sats = stats.get("funded_txo_sum", 0) - stats.get("spent_txo_sum", 0)
                    btc_bal = Decimal(str(max(0, sats))) / Decimal(10**8)
                    return {
                        "wallet_address": target_addr,
                        "token_balance": btc_bal,
                        "gas_balance": btc_bal,
                        "gas_symbol": "BTC",
                        "has_gas": btc_bal > Decimal("0.00001"),
                        "is_configured": True,
                        "coin": coin,
                        "network": "Bitcoin Network",
                    }
            except Exception as ex:
                logger.warning("Bitcoin on-chain query exception for %s: %s", target_addr, ex)
            return {
                "wallet_address": target_addr,
                "token_balance": Decimal("0.00"),
                "gas_balance": Decimal("0.00"),
                "gas_symbol": "BTC",
                "has_gas": False,
                "is_configured": True,
                "coin": coin,
                "network": "Bitcoin Network",
            }

        # 3. SOLANA (SPL / SOL)
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
                        "network": "Solana Network",
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
                "network": "Solana Network",
            }

        # 4. EVM / BNB SMART CHAIN (BEP-20) / ETHEREUM
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
                "network": "BNB Smart Chain (BEP-20)",
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
                "network": "BNB Smart Chain (BEP-20)",
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

    @staticmethod
    def _clean_secret(val: Optional[str]) -> str:
        if not val:
            return ""
        s = str(val).strip()
        if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
            s = s[1:-1].strip()
        return s

    def get_seed_phrase(self) -> str:
        val = ""
        try:
            from django.conf import settings
            val = getattr(settings, "HOT_WALLET_SEED_PHRASE", "") or os.getenv("HOT_WALLET_SEED_PHRASE", "")
        except Exception:
            val = os.getenv("HOT_WALLET_SEED_PHRASE", "")
        if not val:
            try:
                from apps.admin_api.models import PlatformSettings
                ps = PlatformSettings.get_settings()
                val = getattr(ps, "hot_wallet_seed_phrase", "")
            except Exception:
                pass
        return self._clean_secret(val)

    def get_raw_private_key(self) -> str:
        val = ""
        try:
            from django.conf import settings
            val = getattr(settings, "HOT_WALLET_PRIVATE_KEY", "") or os.getenv("HOT_WALLET_PRIVATE_KEY", "")
        except Exception:
            val = os.getenv("HOT_WALLET_PRIVATE_KEY", "")
        if not val:
            try:
                from apps.admin_api.models import PlatformSettings
                ps = PlatformSettings.get_settings()
                val = getattr(ps, "hot_wallet_private_key", "")
            except Exception:
                pass
        return self._clean_secret(val)

    def has_credentials(self) -> bool:
        """
        Check if any hot wallet private key or master seed phrase is configured.
        """
        return bool(
            self.get_raw_private_key()
            or self.get_seed_phrase()
            or self._clean_secret(os.getenv("HOT_WALLET_PRIVATE_KEY_TRON", ""))
            or self._clean_secret(os.getenv("HOT_WALLET_PRIVATE_KEY_SOLANA", ""))
            or self._clean_secret(os.getenv("HOT_WALLET_PRIVATE_KEY_BITCOIN", ""))
        )

    def get_configured_account(self) -> Optional[Any]:
        """
        Derive account from private key or seed phrase in environment.
        """
        raw_key = self.get_raw_private_key()
        seed_phrase = self.get_seed_phrase()

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
                "payout_channel": "HOT_WALLET_BEP20",
            }

        except Exception as exc:
            logger.error("Hot wallet payout failed for %s: %s", order_reference, exc)
            return {
                "success": False,
                "requires_manual": True,
                "error": str(exc),
                "message": f"Blockchain broadcast error: {str(exc)}",
            }

    def send_bnb(
        self,
        destination_address: str,
        amount_bnb: Decimal,
        order_reference: str = "",
    ) -> Dict[str, Any]:
        """
        Broadcast native BNB transfer from hot wallet to customer wallet.
        """
        account = self.get_configured_account()
        if not account:
            return {
                "success": False,
                "requires_manual": True,
                "message": "HOT_WALLET_PRIVATE_KEY not configured in environment.",
            }

        try:
            dest_checksum = Web3.to_checksum_address(destination_address.strip())
            sender_address = account.address
            amount_wei = int(Decimal(str(amount_bnb)) * Decimal(10**18))
            nonce = self.w3.eth.get_transaction_count(sender_address)
            gas_price = self.w3.eth.gas_price

            tx = {
                "chainId": 56,
                "gas": 21000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "from": sender_address,
                "to": dest_checksum,
                "value": amount_wei,
            }

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=account.key)
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = self.w3.to_hex(tx_hash_bytes)

            logger.info("Dispatched native BNB payout for %s: %s -> %s", order_reference, tx_hash, dest_checksum)
            return {
                "success": True,
                "requires_manual": False,
                "tx_hash": tx_hash,
                "explorer_url": f"https://bscscan.com/tx/{tx_hash}",
                "sender_address": sender_address,
                "destination_address": dest_checksum,
                "amount": str(amount_bnb),
                "payout_channel": "HOT_WALLET_BNB",
            }
        except Exception as exc:
            logger.error("Hot wallet BNB payout error for %s: %s", order_reference, exc)
            return {"success": False, "requires_manual": True, "error": str(exc), "message": str(exc)}

    def get_tron_account(self) -> Optional[Tuple[Any, str]]:
        """
        Derive Tron private key and Base58 address from HOT_WALLET_PRIVATE_KEY_TRON
        or from the master HOT_WALLET_SEED_PHRASE (BIP-44 path m/44'/195'/0'/0/0).
        """
        raw_tron_key = os.getenv("HOT_WALLET_PRIVATE_KEY_TRON", "").strip()
        if raw_tron_key:
            if not raw_tron_key.startswith("0x"):
                raw_tron_key = "0x" + raw_tron_key
            try:
                acct = Account.from_key(raw_tron_key)
                tron_raw = b"\x41" + bytes.fromhex(acct.address[2:])
                chk = hashlib.sha256(hashlib.sha256(tron_raw).digest()).digest()[:4]
                return acct, b58encode(tron_raw + chk)
            except Exception as e:
                logger.error("Failed to parse HOT_WALLET_PRIVATE_KEY_TRON: %s", e)

        seed_phrase = self.get_seed_phrase()
        if seed_phrase:
            try:
                Account.enable_unaudited_hdwallet_features()
                acct = Account.from_mnemonic(seed_phrase, account_path="m/44'/195'/0'/0/0")
                tron_raw = b"\x41" + bytes.fromhex(acct.address[2:])
                chk = hashlib.sha256(hashlib.sha256(tron_raw).digest()).digest()[:4]
                return acct, b58encode(tron_raw + chk)
            except Exception as e:
                logger.error("Failed to derive Tron from HOT_WALLET_SEED_PHRASE: %s", e)

        return None

    def send_tron(
        self,
        destination_address: str,
        amount: Decimal,
        coin: str = "USDT_TRC20",
        order_reference: str = "",
    ) -> Dict[str, Any]:
        """
        Broadcast TRC-20 USDT or native TRX payout directly on Tron blockchain.
        """
        tron_info = self.get_tron_account()
        if not tron_info:
            return {
                "success": False,
                "requires_manual": True,
                "message": "Tron private key / seed phrase not configured.",
            }

        acct, owner_b58 = tron_info
        clean_dest = destination_address.strip()
        try:
            owner_raw = b58decode(owner_b58)[:-4]
            dest_raw = b58decode(clean_dest)[:-4]
            coin_norm = (coin or "").upper()

            if coin_norm in ["TRX", "TRON"]:
                # Native TRX Transfer
                amount_sun = int(Decimal(str(amount)) * Decimal(10**6))
                payload = {
                    "to_address": dest_raw.hex(),
                    "owner_address": owner_raw.hex(),
                    "amount": amount_sun,
                }
                r = requests.post("https://api.trongrid.io/wallet/createtransaction", json=payload, timeout=8.0)
                tx_data = r.json()
            else:
                # TRC-20 USDT Contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t (41a614f803b6fd780986a42c78ec9c7f77e6ded13c)
                amount_sun = int(Decimal(str(amount)) * Decimal(10**6))
                dest_param = dest_raw[1:].hex().zfill(64)
                amount_param = hex(amount_sun)[2:].zfill(64)
                param_data = dest_param + amount_param

                payload = {
                    "owner_address": owner_raw.hex(),
                    "contract_address": "41a614f803b6fd780986a42c78ec9c7f77e6ded13c",
                    "function_selector": "transfer(address,uint256)",
                    "parameter": param_data,
                    "fee_limit": 15000000,
                }
                r = requests.post("https://api.trongrid.io/wallet/triggersmartcontract", json=payload, timeout=8.0)
                res_obj = r.json()
                tx_data = res_obj.get("transaction", {})

            tx_id = tx_data.get("txID", "")
            if not tx_id:
                return {
                    "success": False,
                    "requires_manual": True,
                    "message": f"Tron node failed to create tx: {tx_data.get('Error', 'Unknown error')}",
                }

            # Sign raw transaction hash with Tron secp256k1 key
            sig = Account._sign_hash(bytes.fromhex(tx_id), acct.key).signature.hex()
            tx_data["signature"] = [sig]

            # Broadcast to Tron Mainnet
            b_res = requests.post("https://api.trongrid.io/wallet/broadcasttransaction", json=tx_data, timeout=8.0).json()
            if b_res.get("result") is True:
                logger.info("Tron payout broadcasted successfully for %s: tx=%s", order_reference, tx_id)
                return {
                    "success": True,
                    "requires_manual": False,
                    "tx_hash": tx_id,
                    "explorer_url": f"https://tronscan.org/#/transaction/{tx_id}",
                    "sender_address": owner_b58,
                    "destination_address": clean_dest,
                    "amount": str(amount),
                    "payout_channel": "HOT_WALLET_TRON",
                }
            else:
                err_code = b_res.get("code") or b_res.get("message") or "Broadcast rejected"
                return {"success": False, "requires_manual": True, "message": f"Tron broadcast: {err_code}"}

        except Exception as exc:
            logger.error("Tron dispatch error for %s: %s", order_reference, exc)
            return {"success": False, "requires_manual": True, "error": str(exc), "message": str(exc)}

    def get_solana_keypair(self) -> Optional[Tuple[Any, str]]:
        """
        Derive Solana Ed25519 keypair and Base58 address from HOT_WALLET_PRIVATE_KEY_SOLANA
        or master HOT_WALLET_SEED_PHRASE (SLIP-0010 path m/44'/501'/0'/0').
        """
        raw_sol_key = self._clean_secret(os.getenv("HOT_WALLET_PRIVATE_KEY_SOLANA", ""))
        seed_phrase = self.get_seed_phrase()

        try:
            from cryptography.hazmat.primitives.asymmetric import ed25519
            from mnemonic import Mnemonic

            if raw_sol_key:
                sol_bytes = bytes.fromhex(raw_sol_key) if len(raw_sol_key) == 64 else b58decode(raw_sol_key)[:32]
                priv = ed25519.Ed25519PrivateKey.from_private_bytes(sol_bytes)
                pub_b58 = b58encode(priv.public_key().public_bytes_raw())
                return priv, pub_b58

            if seed_phrase:
                seed = Mnemonic("english").to_seed(seed_phrase)
                sol_priv_bytes = derive_slip0010_ed25519(seed, "m/44'/501'/0'/0'")
                priv = ed25519.Ed25519PrivateKey.from_private_bytes(sol_priv_bytes)
                pub_b58 = b58encode(priv.public_key().public_bytes_raw())
                return priv, pub_b58
        except Exception as e:
            logger.error("Failed to derive Solana keypair: %s", e)

        return None

    def send_solana(
        self,
        destination_address: str,
        amount_sol: Decimal,
        order_reference: str = "",
    ) -> Dict[str, Any]:
        """
        Broadcast native SOL payout directly on Solana Mainnet via JSON-RPC.
        """
        sol_info = self.get_solana_keypair()
        if not sol_info:
            return {"success": False, "requires_manual": True, "message": "Solana keypair not configured."}

        priv_obj, owner_b58 = sol_info
        clean_dest = destination_address.strip()
        try:
            sender_pub = priv_obj.public_key().public_bytes_raw()
            recipient_pub = b58decode(clean_dest)
            if len(recipient_pub) != 32:
                return {"success": False, "requires_manual": True, "message": "Invalid Solana recipient address."}

            system_prog = bytes(32)

            # 1. Fetch latest finalized blockhash
            r = requests.post("https://api.mainnet-beta.solana.com", json={
                "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "finalized"}]
            }, timeout=6.0)
            bh_b58 = r.json().get("result", {}).get("value", {}).get("blockhash", "")
            if not bh_b58:
                return {"success": False, "requires_manual": True, "message": "Failed to fetch Solana blockhash."}
            bh_bytes = b58decode(bh_b58)

            # 2. Build Transfer Instruction (System Program index 2: 4-byte LE uint32 + 8-byte LE lamports)
            lamports = int(Decimal(str(amount_sol)) * Decimal(10**9))
            inst_data = (2).to_bytes(4, "little") + lamports.to_bytes(8, "little")

            header = bytes([1, 0, 1])
            accounts_bytes = bytes([3]) + sender_pub + recipient_pub + system_prog
            instructions_bytes = bytes([1, 2, 2, 0, 1, len(inst_data)]) + inst_data
            msg = header + accounts_bytes + bh_bytes + instructions_bytes

            # 3. Sign with Ed25519
            sig = priv_obj.sign(msg)
            tx_bytes = bytes([1]) + sig + msg
            tx_b64 = base64.b64encode(tx_bytes).decode("ascii")

            # 4. Broadcast via sendTransaction
            b_res = requests.post("https://api.mainnet-beta.solana.com", json={
                "jsonrpc": "2.0", "id": 1, "method": "sendTransaction", "params": [tx_b64, {"encoding": "base64"}]
            }, timeout=8.0).json()

            tx_sig = b_res.get("result", "")
            if tx_sig:
                logger.info("Solana payout broadcasted for %s: sig=%s", order_reference, tx_sig)
                return {
                    "success": True,
                    "requires_manual": False,
                    "tx_hash": tx_sig,
                    "explorer_url": f"https://solscan.io/tx/{tx_sig}",
                    "sender_address": owner_b58,
                    "destination_address": clean_dest,
                    "amount": str(amount_sol),
                    "payout_channel": "HOT_WALLET_SOLANA",
                }
            else:
                err_msg = str(b_res.get("error", {}).get("message", "Solana broadcast error"))
                return {"success": False, "requires_manual": True, "message": f"Solana node: {err_msg}"}

        except Exception as exc:
            logger.error("Solana dispatch error for %s: %s", order_reference, exc)
            return {"success": False, "requires_manual": True, "error": str(exc), "message": str(exc)}

    def get_bitcoin_account(self) -> Optional[Tuple[int, Any, bytes, str]]:
        """
        Derive Bitcoin Native Segwit (BIP-84, bech32) account from HOT_WALLET_PRIVATE_KEY_BITCOIN
        or master HOT_WALLET_SEED_PHRASE (path m/84'/0'/0'/0/0).
        Returns (priv_key_int, priv_key_ec_obj, compressed_pubkey_bytes, bech32_address).
        """
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
        from cryptography.hazmat.backends import default_backend
        from mnemonic import Mnemonic

        raw_btc_key = self._clean_secret(os.getenv("HOT_WALLET_PRIVATE_KEY_BITCOIN", ""))
        seed_phrase = self.get_seed_phrase()
        ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BB5BF589844492441

        try:
            if raw_btc_key:
                k_int = int(raw_btc_key, 16) if not raw_btc_key.startswith("0x") else int(raw_btc_key[2:], 16)
                priv_ec = ec.derive_private_key(k_int, ec.SECP256K1(), default_backend())
                pub = priv_ec.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint)
                h256 = hashlib.sha256(pub).digest()
                r160 = hashlib.new("ripemd160", h256).digest()
                bech = bech32_encode("bc", [0] + convertbits(r160, 8, 5))
                return k_int, priv_ec, pub, bech

            if seed_phrase:
                seed = Mnemonic("english").to_seed(seed_phrase)
                I = hmac.new(b"Bitcoin seed", seed, hashlib.sha512).digest()
                k, c = int.from_bytes(I[:32], "big"), I[32:]
                for seg in "m/84'/0'/0'/0/0".split("/")[1:]:
                    h = seg.endswith("'")
                    idx = int(seg[:-1]) if h else int(seg)
                    if h:
                        data = b"\x00" + k.to_bytes(32, "big") + (idx + 0x80000000).to_bytes(4, "big")
                    else:
                        priv_tmp = ec.derive_private_key(k, ec.SECP256K1(), default_backend())
                        pub_tmp = priv_tmp.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint)
                        data = pub_tmp + idx.to_bytes(4, "big")
                    I = hmac.new(c, data, hashlib.sha512).digest()
                    k = (int.from_bytes(I[:32], "big") + k) % ORDER
                    c = I[32:]
                priv_ec = ec.derive_private_key(k, ec.SECP256K1(), default_backend())
                pub = priv_ec.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint)
                h256 = hashlib.sha256(pub).digest()
                r160 = hashlib.new("ripemd160", h256).digest()
                bech = bech32_encode("bc", [0] + convertbits(r160, 8, 5))
                return k, priv_ec, pub, bech
        except Exception as e:
            logger.error("Failed to derive Bitcoin account: %s", e)

        return None

    def send_bitcoin(
        self,
        destination_address: str,
        amount_btc: Decimal,
        order_reference: str = "",
    ) -> Dict[str, Any]:
        """
        Broadcast Native SegWit (BIP-84) Bitcoin payout directly to Bitcoin network.
        Uses Blockstream / mempool.space API to query UTXOs and broadcast signed transaction.
        """
        btc_acc = self.get_bitcoin_account()
        if not btc_acc:
            return {
                "success": False,
                "requires_manual": True,
                "message": "Bitcoin private key / master seed phrase not configured.",
            }

        k_int, priv_ec, pub_bytes, owner_addr = btc_acc
        clean_dest = destination_address.strip()

        try:
            from cryptography.hazmat.primitives.asymmetric import ec, utils
            from cryptography.hazmat.primitives import hashes

            # 1. Fetch unspent UTXOs for platform wallet
            r = requests.get(f"https://blockstream.info/api/address/{owner_addr}/utxo", timeout=6.0)
            if r.status_code != 200:
                return {
                    "success": False,
                    "requires_manual": True,
                    "message": f"Blockstream API error: {r.status_code} {r.text}",
                }
            utxos = r.json()
            if not utxos:
                return {
                    "success": False,
                    "requires_manual": True,
                    "message": f"Platform Bitcoin wallet ({owner_addr}) has 0 UTXOs (0.00 BTC).",
                }

            # 2. Select UTXOs to cover amount + estimated fee (e.g. 3500 sats fee)
            target_sats = int(Decimal(str(amount_btc)) * Decimal(10**8))
            fee_sats = 3500  # Standard SegWit tx fee (~140 vbytes * 25 sat/vB)
            total_needed = target_sats + fee_sats

            selected_utxos = []
            accumulated_sats = 0
            for u in sorted(utxos, key=lambda x: x.get("value", 0), reverse=True):
                selected_utxos.append(u)
                accumulated_sats += u.get("value", 0)
                if accumulated_sats >= total_needed:
                    break

            if accumulated_sats < total_needed:
                shortage = (Decimal(total_needed - accumulated_sats)) / Decimal(10**8)
                return {
                    "success": False,
                    "requires_manual": True,
                    "message": f"Insufficient Bitcoin funds! Needed {total_needed / 10**8:.8f} BTC, wallet has {accumulated_sats / 10**8:.8f} BTC (Shortage: {shortage:.8f} BTC).",
                }

            # 3. Construct Outputs
            dest_spk = addr_to_script_pubkey(clean_dest)
            outputs_bytes = target_sats.to_bytes(8, "little") + btc_varint(len(dest_spk)) + dest_spk
            num_outputs = 1

            change_sats = accumulated_sats - total_needed
            if change_sats > 1000:  # Dust threshold
                owner_spk = addr_to_script_pubkey(owner_addr)
                outputs_bytes += change_sats.to_bytes(8, "little") + btc_varint(len(owner_spk)) + owner_spk
                num_outputs += 1

            # 4. BIP-143 Preimages and Signatures
            version = (2).to_bytes(4, "little")
            locktime = (0).to_bytes(4, "little")

            all_outpoints = b"".join([
                bytes.fromhex(u["txid"])[::-1] + int(u["vout"]).to_bytes(4, "little")
                for u in selected_utxos
            ])
            hashPrevouts = dsha256(all_outpoints)
            hashSequence = dsha256(b"\xff\xff\xff\xff" * len(selected_utxos))
            hashOutputs = dsha256(outputs_bytes)

            pub_h160 = hashlib.new("ripemd160", hashlib.sha256(pub_bytes).digest()).digest()
            scriptCode = btc_varint(25) + b"\x76\xa9\x14" + pub_h160 + b"\x88\xac"

            ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BB5BF589844492441
            witness_list = []

            for u in selected_utxos:
                cur_outpoint = bytes.fromhex(u["txid"])[::-1] + int(u["vout"]).to_bytes(4, "little")
                u_val = int(u["value"]).to_bytes(8, "little")
                sighash_preimage = (
                    version
                    + hashPrevouts
                    + hashSequence
                    + cur_outpoint
                    + scriptCode
                    + u_val
                    + b"\xff\xff\xff\xff"
                    + hashOutputs
                    + locktime
                    + (1).to_bytes(4, "little")
                )
                sighash = dsha256(sighash_preimage)

                der = priv_ec.sign(sighash, ec.ECDSA(utils.Prehashed(hashes.SHA256())))
                r_sig, s_sig = utils.decode_dss_signature(der)
                if s_sig > ORDER // 2:
                    s_sig = ORDER - s_sig
                low_der = utils.encode_dss_signature(r_sig, s_sig) + b"\x01"

                # Witness for SegWit P2WPKH: count=2, signature, pubkey
                w_item = (
                    btc_varint(2)
                    + btc_varint(len(low_der))
                    + low_der
                    + btc_varint(len(pub_bytes))
                    + pub_bytes
                )
                witness_list.append(w_item)

            # 5. Assemble Raw SegWit Transaction
            inputs_bytes = b"".join([
                bytes.fromhex(u["txid"])[::-1]
                + int(u["vout"]).to_bytes(4, "little")
                + b"\x00"  # scriptSig is empty for SegWit
                + b"\xff\xff\xff\xff"
                for u in selected_utxos
            ])

            raw_tx = (
                version
                + b"\x00\x01"  # SegWit marker and flag
                + btc_varint(len(selected_utxos))
                + inputs_bytes
                + btc_varint(num_outputs)
                + outputs_bytes
                + b"".join(witness_list)
                + locktime
            )
            raw_tx_hex = raw_tx.hex()

            # 6. Broadcast raw transaction to Blockstream / mempool.space API
            b_res = requests.post(
                "https://blockstream.info/api/tx",
                data=raw_tx_hex,
                headers={"Content-Type": "text/plain"},
                timeout=10.0,
            )

            if b_res.status_code == 200 and len(b_res.text.strip()) == 64:
                tx_id = b_res.text.strip()
                logger.info("Bitcoin payout broadcasted successfully for %s: tx=%s", order_reference, tx_id)
                return {
                    "success": True,
                    "requires_manual": False,
                    "tx_hash": tx_id,
                    "explorer_url": f"https://mempool.space/tx/{tx_id}",
                    "sender_address": owner_addr,
                    "destination_address": clean_dest,
                    "amount": str(amount_btc),
                    "payout_channel": "HOT_WALLET_BITCOIN",
                }
            else:
                err_text = b_res.text.strip()
                logger.error("Bitcoin broadcast failed for %s: %s", order_reference, err_text)
                return {
                    "success": False,
                    "requires_manual": True,
                    "message": f"Bitcoin broadcast: {err_text}",
                }

        except Exception as exc:
            logger.error("Bitcoin dispatch exception for %s: %s", order_reference, exc)
            return {
                "success": False,
                "requires_manual": True,
                "error": str(exc),
                "message": str(exc),
            }

    def send_crypto(
        self,
        coin: str,
        destination_address: str,
        amount: Decimal,
        order_reference: str = "",
    ) -> Dict[str, Any]:
        """
        Unified multi-blockchain transaction dispatcher.
        Intelligently routes to BSC, Tron, Solana, or Bitcoin.
        """
        coin_upper = (coin or "").upper()
        dest_clean = destination_address.strip()

        # 1. TRON (TRC-20 USDT / TRX)
        if "TRC" in coin_upper or coin_upper in ["TRX", "USDT_TRC20"] or dest_clean.startswith("T"):
            return self.send_tron(dest_clean, amount, coin_upper, order_reference)

        # 2. SOLANA (SOL)
        if "SOL" in coin_upper or (len(dest_clean) in [43, 44] and not dest_clean.startswith("0x") and not dest_clean.startswith("1") and not dest_clean.startswith("3")):
            return self.send_solana(dest_clean, amount, order_reference)

        # 3. BITCOIN (BTC)
        if "BTC" in coin_upper or dest_clean.startswith("bc1") or dest_clean.startswith("1") or dest_clean.startswith("3"):
            return self.send_bitcoin(dest_clean, amount, order_reference)

        # 4. BNB Smart Chain (Native BNB)
        if coin_upper in ["BNB", "BSC"]:
            return self.send_bnb(dest_clean, amount, order_reference)

        # 5. BNB Smart Chain (BEP-20 USDT)
        return self.send_usdt_bep20(dest_clean, amount, order_reference)

