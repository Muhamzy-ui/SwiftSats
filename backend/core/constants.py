"""
Named Constants and Choices for SwiftSats.
Strictly eliminates magic numbers and strings across the backend.
"""
from decimal import Decimal
from django.db import models


class OrderStatus(models.TextChoices):
    """
    State machine states for cryptocurrency buy orders.
    Strictly enforced by OrderStateMachine.
    """
    QUOTE_LOCKED = "QUOTE_LOCKED", "Quote Locked"
    AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting Payment"
    VERIFYING = "VERIFYING", "Verifying Payment"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED", "Payment Confirmed"
    PAYOUT_PROCESSING = "PAYOUT_PROCESSING", "Payout Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"
    CANCELLED = "CANCELLED", "Cancelled"


NOMBA_DEFAULT_BANK_NAME = "Nomba MFB"
NOMBA_DEFAULT_ACCOUNT_NAME = "SwiftSats Settlement"
NOMBA_DEFAULT_ACCOUNT_NUMBER = "6010450034"


class SupportedCoin(models.TextChoices):
    """
    Supported cryptocurrencies and payment options on SwiftSats.
    """
    BTC = "BTC", "Bitcoin (BTC)"
    USDC = "USDC", "USD Coin (USDC)"
    BNB = "BNB", "BNB Chain (BEP-20)"
    USDT_ERC20 = "USDT_ERC20", "ERC20 Tether"
    USDT_TRC20 = "USDT_TRC20", "TRC20 Tether"
    SOL = "SOL", "Solana (SOL)"
    USDT_BEP20 = "USDT_BEP20", "BEP20 Tether"
    ETH = "ETH", "Ethereum (ETH)"
    BCH = "BCH", "Bitcoin Cash (BCH)"
    TRX = "TRX", "Tron (TRX)"
    DOGE = "DOGE", "Dogecoin (DOGE)"
    POL = "POL", "Polygon (POL)"
    SHIB = "SHIB", "Shiba Inu (SHIB)"
    XLM = "XLM", "Stellar (XLM)"
    USDC_BASE = "USDC_BASE", "USD Coin (Base)"


class BlockchainNetwork(models.TextChoices):
    """
    Underlying blockchain networks for crypto payout.
    """
    BITCOIN = "BITCOIN", "Bitcoin Network"
    ERC20 = "ERC20", "Ethereum (ERC-20)"
    TRC20 = "TRC20", "Tron (TRC-20)"
    SOLANA = "SOLANA", "Solana"
    BEP20 = "BEP20", "BNB Smart Chain (BEP-20)"
    BASE = "BASE", "Base Network"
    BCH = "BCH", "Bitcoin Cash Network"
    DOGE = "DOGE", "Dogecoin Network"
    POLYGON = "POLYGON", "Polygon Network"
    STELLAR = "STELLAR", "Stellar Network"


# Coin Metadata: Network mapping, USD prices, speeds, $5 minimum amounts, network fees
COIN_METADATA = {
    SupportedCoin.BTC: {
        "name": "Bitcoin",
        "symbol": "BTC",
        "network": BlockchainNetwork.BITCOIN,
        "is_featured": True,
        "price_usd": Decimal("77590.78"),
        "speed_category": "Standard",
        "estimated_delivery_time": "Instant (~10 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "btc",
        "quidax_network": "bitcoin",
        "network_fee_crypto": Decimal("0.00005"),
        "explorer_url": "https://mempool.space/tx/{tx_hash}",
    },
    SupportedCoin.USDC: {
        "name": "USDC",
        "symbol": "USDC",
        "network": BlockchainNetwork.BASE,
        "is_featured": True,
        "price_usd": Decimal("0.99617"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~15 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "usdc",
        "quidax_network": "base",
        "network_fee_crypto": Decimal("0.5"),
        "explorer_url": "https://basescan.org/tx/{tx_hash}",
    },
    SupportedCoin.BNB: {
        "name": "BNB",
        "symbol": "BNB",
        "network": BlockchainNetwork.BEP20,
        "is_featured": True,
        "price_usd": Decimal("684.6173"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~20 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "bnb",
        "quidax_network": "bep20",
        "network_fee_crypto": Decimal("0.001"),
        "explorer_url": "https://bscscan.com/tx/{tx_hash}",
    },
    SupportedCoin.USDT_ERC20: {
        "name": "ERC20",
        "symbol": "USDT",
        "network": BlockchainNetwork.ERC20,
        "is_featured": True,
        "price_usd": Decimal("0.999"),
        "speed_category": "Standard",
        "estimated_delivery_time": "Instant (~1 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "usdt",
        "quidax_network": "erc20",
        "network_fee_crypto": Decimal("2.0"),
        "explorer_url": "https://etherscan.io/tx/{tx_hash}",
    },
    SupportedCoin.USDT_TRC20: {
        "name": "TRC20",
        "symbol": "USDT",
        "network": BlockchainNetwork.TRC20,
        "is_featured": True,
        "price_usd": Decimal("0.999"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~30 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "usdt",
        "quidax_network": "trc20",
        "network_fee_crypto": Decimal("1.0"),
        "explorer_url": "https://tronscan.org/#/transaction/{tx_hash}",
    },
    SupportedCoin.SOL: {
        "name": "SOL",
        "symbol": "SOL",
        "network": BlockchainNetwork.SOLANA,
        "is_featured": True,
        "price_usd": Decimal("101.7637"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~15 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "sol",
        "quidax_network": "solana",
        "network_fee_crypto": Decimal("0.005"),
        "explorer_url": "https://solscan.io/tx/{tx_hash}",
    },
    SupportedCoin.USDT_BEP20: {
        "name": "BEP20",
        "symbol": "USDT",
        "network": BlockchainNetwork.BEP20,
        "is_featured": True,
        "price_usd": Decimal("0.999"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~20 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "usdt",
        "quidax_network": "bep20",
        "network_fee_crypto": Decimal("0.5"),
        "explorer_url": "https://bscscan.com/tx/{tx_hash}",
    },
    SupportedCoin.ETH: {
        "name": "ETH",
        "symbol": "ETH",
        "network": BlockchainNetwork.ERC20,
        "is_featured": True,
        "price_usd": Decimal("2442.52"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~1 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "eth",
        "quidax_network": "erc20",
        "network_fee_crypto": Decimal("0.0005"),
        "explorer_url": "https://etherscan.io/tx/{tx_hash}",
    },
    SupportedCoin.BCH: {
        "name": "BCH",
        "symbol": "BCH",
        "network": BlockchainNetwork.BCH,
        "is_featured": False,
        "price_usd": Decimal("245.5469"),
        "speed_category": "Standard",
        "estimated_delivery_time": "Instant (~5 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "bch",
        "quidax_network": "bch",
        "network_fee_crypto": Decimal("0.001"),
        "explorer_url": "https://blockchair.com/bitcoin-cash/transaction/{tx_hash}",
    },
    SupportedCoin.TRX: {
        "name": "Tron",
        "symbol": "TRX",
        "network": BlockchainNetwork.TRC20,
        "is_featured": False,
        "price_usd": Decimal("0.329799"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~30 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "trx",
        "quidax_network": "trc20",
        "network_fee_crypto": Decimal("1.0"),
        "explorer_url": "https://tronscan.org/#/transaction/{tx_hash}",
    },
    SupportedCoin.DOGE: {
        "name": "Dogecoin",
        "symbol": "DOGE",
        "network": BlockchainNetwork.DOGE,
        "is_featured": False,
        "price_usd": Decimal("0.082264"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~1 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "doge",
        "quidax_network": "doge",
        "network_fee_crypto": Decimal("2.0"),
        "explorer_url": "https://dogechain.info/tx/{tx_hash}",
    },
    SupportedCoin.POL: {
        "name": "Polygon",
        "symbol": "POL",
        "network": BlockchainNetwork.POLYGON,
        "is_featured": False,
        "price_usd": Decimal("0.091312"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~15 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "pol",
        "quidax_network": "polygon",
        "network_fee_crypto": Decimal("0.1"),
        "explorer_url": "https://polygonscan.com/tx/{tx_hash}",
    },
    SupportedCoin.SHIB: {
        "name": "Shiba Inu",
        "symbol": "SHIB",
        "network": BlockchainNetwork.ERC20,
        "is_featured": False,
        "price_usd": Decimal("0.00000508"),
        "speed_category": "Standard",
        "estimated_delivery_time": "Instant (~1 min)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "shib",
        "quidax_network": "erc20",
        "network_fee_crypto": Decimal("100000.0"),
        "explorer_url": "https://etherscan.io/tx/{tx_hash}",
    },
    SupportedCoin.XLM: {
        "name": "Stellar",
        "symbol": "XLM",
        "network": BlockchainNetwork.STELLAR,
        "is_featured": False,
        "price_usd": Decimal("0.175534"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~5 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "xlm",
        "quidax_network": "stellar",
        "network_fee_crypto": Decimal("0.1"),
        "explorer_url": "https://stellar.expert/explorer/public/tx/{tx_hash}",
    },
    SupportedCoin.USDC_BASE: {
        "name": "USD Coin",
        "symbol": "USDC",
        "network": BlockchainNetwork.BASE,
        "is_featured": False,
        "price_usd": Decimal("0.99617"),
        "speed_category": "Fastest",
        "estimated_delivery_time": "Instant (~15 sec)",
        "min_amount_usd": Decimal("5.00"),
        "min_amount_ngn": Decimal("7000.00"),
        "max_amount_ngn": Decimal("5000000.00"),
        "quidax_currency": "usdc",
        "quidax_network": "base",
        "network_fee_crypto": Decimal("0.5"),
        "explorer_url": "https://basescan.org/tx/{tx_hash}",
    },
}

# Standard NGN per USD base exchange rate (above Quidax ₦1,373 wholesale for guaranteed profit)
BASE_USD_TO_NGN_RATE = Decimal("1410.65")

# Fixed Service Fee: Discounted to exactly ₦1,310.00 (₦100 removed from ₦1,410.65)
SERVICE_FEE_NGN = Decimal("1310.00")
SERVICE_FEE_USD = Decimal("0.93")


class AdminRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Administrator"
    OPERATOR = "OPERATOR", "Operator"
    AUDITOR = "AUDITOR", "Compliance Auditor"
    SUPPORT = "SUPPORT", "Customer Support"


class AuditActor(models.TextChoices):
    SYSTEM_WEBHOOK = "SYSTEM_WEBHOOK", "Paystack Webhook Handler"
    CELERY_WORKER = "CELERY_WORKER", "Celery Async Worker"
    ADMIN = "ADMIN", "Admin User"
    PUBLIC_USER = "PUBLIC_USER", "Public User Session"
    CRON_CLEANUP = "CRON_CLEANUP", "Automated Expiry Service"
