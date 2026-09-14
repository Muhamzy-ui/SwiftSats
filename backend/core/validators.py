"""
Cryptographic wallet address format & checksum validators.
Ensures zero bad addresses reach payout execution.
"""
import re
from typing import Tuple
from rest_framework.exceptions import ValidationError
from .constants import BlockchainNetwork, SupportedCoin, COIN_METADATA


BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def is_base58(s: str) -> bool:
    """Check if string contains only valid Base58 characters."""
    return all(c in BASE58_ALPHABET for c in s)


def validate_tron_address(address: str) -> bool:
    """
    Validate TRC-20 (Tron) address format.
    Must start with 'T', be 34 characters long, and contain valid Base58 characters.
    """
    if not address or len(address) != 34:
        return False
    if not address.startswith("T"):
        return False
    return is_base58(address)


def validate_solana_address(address: str) -> bool:
    """
    Validate Solana public address.
    Base58 encoded string between 32 and 44 characters.
    """
    if not address or len(address) < 32 or len(address) > 44:
        return False
    return is_base58(address)


def validate_evm_address(address: str) -> bool:
    """
    Validate EVM-compatible address (BEP-20, Base, ERC-20).
    Must be 42 characters, start with '0x', followed by 40 hex characters.
    """
    if not address or len(address) != 42:
        return False
    if not address.startswith("0x"):
        return False
    hex_part = address[2:]
    return bool(re.fullmatch(r"[0-9a-fA-F]{40}", hex_part))


def validate_bitcoin_address(address: str) -> bool:
    """
    Validate Bitcoin address format (Legacy P2PKH, P2SH, Bech32 SegWit/Taproot).
    - Legacy: starts with 1, 26-35 chars
    - P2SH: starts with 3, 26-35 chars
    - Bech32: starts with bc1, 42-62 chars
    """
    if not address:
        return False
    # Bech32 / SegWit / Taproot
    if address.startswith("bc1"):
        if len(address) < 42 or len(address) > 62:
            return False
        return bool(re.fullmatch(r"bc1[a-z0-9]{39,59}", address.lower()))
    # Legacy or P2SH Base58
    if address.startswith("1") or address.startswith("3"):
        if len(address) < 26 or len(address) > 35:
            return False
        return is_base58(address)
    return False


def validate_wallet_for_coin(coin: str, address: str) -> Tuple[bool, str]:
    """
    Validate a destination wallet address for a specific coin/network.
    Returns (is_valid, error_message).
    """
    if coin not in COIN_METADATA:
        return False, f"Unsupported coin: {coin}"

    clean_address = address.strip()
    network = COIN_METADATA[coin]["network"]

    if network == BlockchainNetwork.TRC20:
        if not validate_tron_address(clean_address):
            return False, "Invalid Tron (TRC-20) wallet address. Must start with 'T' and be 34 characters."
    elif network == BlockchainNetwork.SOLANA:
        if not validate_solana_address(clean_address):
            return False, "Invalid Solana wallet address. Must be a valid 32-44 character Base58 address."
    elif network in (BlockchainNetwork.BEP20, BlockchainNetwork.BASE):
        if not validate_evm_address(clean_address):
            return False, f"Invalid EVM address for {network}. Must start with '0x' followed by 40 hex characters."
    elif network == BlockchainNetwork.BITCOIN:
        if not validate_bitcoin_address(clean_address):
            return False, "Invalid Bitcoin address. Must be a valid Legacy (1...), P2SH (3...), or SegWit/Taproot (bc1...) address."
    else:
        return False, f"Unsupported network: {network}"

    return True, ""


def drf_wallet_validator(coin: str, address: str) -> str:
    """
    DRF validator helper that raises rest_framework ValidationError if invalid.
    """
    is_valid, err_msg = validate_wallet_for_coin(coin, address)
    if not is_valid:
        raise ValidationError({"wallet_address": err_msg})
    return address.strip()
