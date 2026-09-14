"""
URL routes for Exchange and Rates.
"""
from django.urls import path
from .views import LiveRatesView, CalculateQuoteView

urlpatterns = [
    path("rates/", LiveRatesView.as_view(), name="exchange-live-rates"),
    path("calculate/", CalculateQuoteView.as_view(), name="exchange-calculate-quote"),
]
