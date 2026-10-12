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

from typing import Optional, Dict, Any, Tuple


def send_telegram_alert_detailed(
    message: str,
    reply_markup: Optional[Dict[str, Any]] = None,
    custom_token: Optional[str] = None,
    custom_chat_id: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Send an HTML-formatted instant push notification to Telegram.
    Returns (success: bool, error_description: Optional[str]).
    """
    token = custom_token or os.getenv("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN)
    chat_id = custom_chat_id or os.getenv("TELEGRAM_ADMIN_CHAT_ID", TELEGRAM_ADMIN_CHAT_ID)

    if not custom_token or not custom_chat_id:
        try:
            from apps.admin_api.models import PlatformSettings
            ps = PlatformSettings.get_settings()
            if ps:
                if not ps.telegram_alerts_enabled and not (custom_token and custom_chat_id):
                    return False, "Telegram alerts are currently disabled in platform settings."
                if not token and ps.telegram_bot_token:
                    token = ps.telegram_bot_token
                if not chat_id and ps.telegram_admin_chat_id:
                    chat_id = ps.telegram_admin_chat_id
        except Exception:
            pass

    token = str(token).strip() if token else ""
    chat_id = str(chat_id).strip() if chat_id else ""

    if not token:
        logger.info("[TELEGRAM NOTIFICATION] Bot token not set. Message:\n%s", message)
        return False, "Telegram Bot Token is missing."

    if not chat_id:
        logger.info("[TELEGRAM NOTIFICATION] Admin chat ID not set. Message:\n%s", message)
        return False, "Telegram Admin Chat ID is missing."

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
        response = requests.post(url, json=payload, timeout=5.0)
        if response.status_code == 200:
            logger.info("Telegram notification delivered successfully.")
            return True, None
        
        # Parse Telegram's error description
        error_desc = "Unknown Telegram API error."
        try:
            res_json = response.json()
            error_desc = res_json.get("description", response.text)
        except Exception:
            error_desc = response.text

        logger.warning("Telegram delivery failed (%d): %s", response.status_code, error_desc)

        if "chat not found" in error_desc.lower():
            return False, "Chat not found! Please open your bot in Telegram and tap 'START' so it can message you."
        if "unauthorized" in error_desc.lower() or response.status_code == 401:
            return False, "Invalid Bot Token! Please check the token provided by @BotFather."
        if "bot was blocked" in error_desc.lower():
            return False, "Your bot was blocked by the user. Unblock the bot on Telegram and tap 'START'."

        return False, f"Telegram API error ({response.status_code}): {error_desc}"

    except requests.exceptions.Timeout:
        logger.error("Timeout connecting to api.telegram.org")
        return False, "Connection to Telegram API timed out. Please try again."
    except Exception as e:
        logger.error("Failed to send Telegram alert: %s", str(e))
        return False, f"Network error: {str(e)}"


def send_telegram_alert(message: str, reply_markup: Optional[Dict[str, Any]] = None) -> bool:
    """
    Send an HTML-formatted instant push notification to the Admin's Telegram.
    Returns True if delivered, False otherwise.
    """
    success, _ = send_telegram_alert_detailed(message, reply_markup=reply_markup)
    return success
