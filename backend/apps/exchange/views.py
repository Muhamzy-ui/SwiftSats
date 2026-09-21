"""
Exchange API Views for live rates and calculations.
"""
from decimal import Decimal, InvalidOperation
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .rates import RateService
from core.constants import COIN_METADATA


class LiveRatesView(APIView):
    """
    Public endpoint returning real-time cryptocurrency rates in NGN.
    Cached with short TTL in Redis.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        service = RateService()
        rates = service.get_all_supported_rates()
        return Response({
            "success": True,
            "rates": rates,
        })


class CalculateQuoteView(APIView):
    """
    Public endpoint calculating estimated crypto received for input Naira amount.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        coin = request.query_params.get("coin")
        raw_amount = request.query_params.get("amount_ngn")

        if not coin or coin not in COIN_METADATA:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_COIN",
                        "message": f"Please specify a valid supported coin: {list(COIN_METADATA.keys())}",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not raw_amount:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "AMOUNT_REQUIRED",
                        "message": "Parameter 'amount_ngn' is required.",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount_ngn = Decimal(str(raw_amount))
            if amount_ngn <= 0:
                raise ValueError()
        except (InvalidOperation, ValueError):
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_AMOUNT",
                        "message": "Parameter 'amount_ngn' must be a positive decimal number.",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = RateService()
        calc = service.calculate_crypto_for_naira(coin=coin, fiat_amount_ngn=amount_ngn)

        return Response({
            "success": True,
            "data": {
                "coin": calc["coin"],
                "fiat_amount_ngn": str(calc["fiat_amount_ngn"]),
                "unit_rate_ngn": str(calc["unit_rate_ngn"]),
                "network_fee_crypto": str(calc["network_fee_crypto"]),
                "net_crypto_amount": str(calc["net_crypto_amount"]),
                "network": calc["network"],
                "speed_category": calc["speed_category"],
                "estimated_delivery_time": calc["estimated_delivery_time"],
            }
        })
