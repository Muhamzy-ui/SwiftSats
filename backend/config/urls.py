"""
URL Configuration for SwiftSats.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check_view(request):
    """
    Health check endpoint for Render/uptime monitors.
    """
    return JsonResponse({
        "status": "healthy",
        "service": "SwiftSats Backend API",
        "version": "1.0.0"
    })


urlpatterns = [
    # Built-in admin kept quietly for emergency database recovery only
    path("system-control-internal/", admin.site.urls),

    # Health check
    path("health/", health_check_view, name="health-check"),

    # Public APIs
    path("api/v1/orders/", include("apps.orders.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/exchange/", include("apps.exchange.urls")),

    # Admin Protected APIs & Auth
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/admin/", include("apps.admin_api.urls")),
]
