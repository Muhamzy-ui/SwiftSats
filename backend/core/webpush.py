"""
Native Web Push Notification Hub for SwiftSats.
Dispatches real-time W3C Push notifications (via Google FCM / Apple APNs)
directly to the Admin's phone and desktop even when the browser or app is closed.
"""
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def send_admin_webpush(
    title: str,
    body: str,
    url: str = "/admin/orders",
    tag: str = "swiftsats-alert",
    badge: str = "/apple-touch-icon.png",
    icon: str = "/logo192.png"
) -> int:
    """
    Broadcasts a native lockscreen push notification to all subscribed Admin devices.
    Returns the count of successfully notified devices.
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("[WEBPUSH] pywebpush library not installed.")
        return 0

    try:
        from apps.admin_api.models import PlatformSettings, AdminPushSubscription
    except Exception as e:
        logger.error("[WEBPUSH] Could not import admin models: %s", str(e))
        return 0

    try:
        settings_obj = PlatformSettings.get_settings()
        pub_key, priv_key = settings_obj.get_or_create_vapid_keys()
    except Exception as e:
        logger.error("[WEBPUSH] Failed to get VAPID keys: %s", str(e))
        return 0

    if not priv_key or not pub_key:
        logger.warning("[WEBPUSH] VAPID keys could not be generated.")
        return 0

    subscriptions = AdminPushSubscription.objects.filter(is_active=True)
    if not subscriptions.exists():
        logger.info("[WEBPUSH] No active push devices registered. Skipping web push.")
        return 0

    payload = json.dumps({
        "title": title,
        "body": body,
        "message": body,
        "url": url,
        "link_url": url,
        "tag": tag,
        "badge": badge,
        "icon": icon,
    })

    claims = {
        "sub": "mailto:admin@swiftsats.com"
    }

    success_count = 0
    stale_subscriptions = []

    for sub in subscriptions:
        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            }
        }
        try:
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=priv_key,
                vapid_claims=claims,
                ttl=86400  # 24 hours delivery window
            )
            success_count += 1
            logger.info("[WEBPUSH] Delivered native push alert to device: %s", sub.device_info or sub.endpoint[:30])
        except WebPushException as ex:
            logger.warning("[WEBPUSH] Failed to deliver to %s: %s", sub.endpoint[:30], str(ex))
            # If the device unregistered, unsubscribed, or token expired (404 Not Found or 410 Gone)
            if hasattr(ex, "response") and ex.response is not None and ex.response.status_code in (404, 410):
                stale_subscriptions.append(sub.id)
        except Exception as e:
            logger.error("[WEBPUSH] Unexpected error sending to %s: %s", sub.endpoint[:30], str(e))

    if stale_subscriptions:
        AdminPushSubscription.objects.filter(id__in=stale_subscriptions).delete()
        logger.info("[WEBPUSH] Cleaned up %d expired device subscriptions.", len(stale_subscriptions))

    return success_count
