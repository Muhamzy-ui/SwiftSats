"""
URL Configuration for SwiftSats.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check_view(request):
    """
    Health check endpoint for Render/uptime monitors and wallet status diagnostics.
    """
    import os
    from apps.exchange.hotwallet import HotWalletService
    hw = HotWalletService()
    has_creds = hw.has_credentials()
    keys_found = [k for k in os.environ.keys() if "HOT_WALLET" in k or "SEED" in k or "PRIVATE" in k]
    return JsonResponse({
        "status": "healthy",
        "service": "SwiftSats Backend API",
        "version": "1.0.4-diagnostics",
        "hot_wallet_configured": has_creds,
        "keys_found": keys_found,
        "seed_len": len(hw.get_seed_phrase()),
        "key_len": len(hw.get_raw_private_key()),
        "dispatch_address": hw.get_dispatch_address("USDT_BEP20") if has_creds else "",
    })


urlpatterns = [
    # Built-in admin kept quietly for emergency database recovery only
    path("system-control-internal/", admin.site.urls),

    # Root API info & Health check
    path("", health_check_view, name="root-health"),
    path("health/", health_check_view, name="health-check"),

    # Public APIs
    path("api/orders/", include("apps.orders.urls")),
    path("api/v1/orders/", include("apps.orders.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/exchange/", include("apps.exchange.urls")),

    # Admin Protected APIs & Auth
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/admin/", include("apps.admin_api.urls")),
]
