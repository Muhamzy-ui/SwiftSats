"""
Telegram Bot Notification Hub for SwiftSats.
Dispatches real-time push alerts to Admin's iPhone/phone on payments, payouts, and anomalies.
"""
import os
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")


def send_telegram_alert(message: str, reply_markup: Optional[Dict[str, Any]] = None) -> bool:
    """
    Send an HTML-formatted instant push notification to the Admin's Telegram.
    Returns True if delivered, False otherwise.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", TELEGRAM_ADMIN_CHAT_ID)

    if not token or not chat_id:
        logger.info("[TELEGRAM NOTIFICATION] (Bot token/Chat ID not set - logging locally):\n%s", message)
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        response = requests.post(url, json=payload, timeout=4.0)
        if response.status_code == 200:
            logger.info("Telegram notification delivered successfully.")
            return True
        else:
            logger.warning("Telegram delivery returned status %d: %s", response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Failed to send Telegram alert: %s", str(e))
        return False
