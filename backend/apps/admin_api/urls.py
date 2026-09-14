"""
URL Routing for Admin API.
"""
from django.urls import path
from .views import (
    AdminDashboardView,
    AdminOrdersListView,
    AdminOrderDetailView,
    AdminPaymentMonitorView,
    AdminPayoutsView,
    AdminDisputesView,
    AdminAnalyticsView,
    AdminReportsView,
    AdminSettingsHealthView,
    AdminPayoutModeSettingsView,
    AdminManualOrderReleaseView,
)

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("orders/", AdminOrdersListView.as_view(), name="admin-orders-list"),
    path("orders/<str:order_id>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("orders/<str:order_reference>/release/", AdminManualOrderReleaseView.as_view(), name="admin-order-release"),
    path("payment-monitor/", AdminPaymentMonitorView.as_view(), name="admin-payment-monitor"),
    path("payouts/", AdminPayoutsView.as_view(), name="admin-payouts"),
    path("disputes/", AdminDisputesView.as_view(), name="admin-disputes-list"),
    path("disputes/<str:order_id>/action/", AdminDisputesView.as_view(), name="admin-dispute-action"),
    path("analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("settings/", AdminSettingsHealthView.as_view(), name="admin-settings-health"),
    path("settings/payout-mode/", AdminPayoutModeSettingsView.as_view(), name="admin-payout-mode"),
]
