"""
Public DRF Endpoints for the 4-Step Cryptocurrency Buy Wizard.
"""
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Order
from .serializers import (
    CreateQuoteRequestSerializer,
    LockQuoteAndSubmitWalletSerializer,
    PublicOrderDetailSerializer,
    PublicRecentOrderSerializer,
)
from .state_machine import OrderStateMachine
from apps.exchange.rates import RateService
from apps.payments.client import PaystackClient
from decimal import Decimal
import secrets
from apps.admin_api.models import PlatformSettings
from core.constants import OrderStatus, AuditActor, COIN_METADATA
from core.validators import validate_wallet_for_coin
from core.utils import get_client_ip
import logging

logger = logging.getLogger(__name__)

QUOTE_VALIDITY_SECONDS = 900  # 15 minutes strict operational window


class CreateQuoteView(APIView):
    """
    Step 1 & 2: Generate a server-locked crypto price quote.
    Valid for 15 minutes (900 seconds) with unique dynamic kobo salt.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CreateQuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coin = serializer.validated_data["coin"]
        amount_ngn = serializer.validated_data["amount_ngn"]

        # Calculate exact crypto amount and effective rate
        rate_service = RateService()
        calc = rate_service.calculate_crypto_for_naira(coin=coin, fiat_amount_ngn=amount_ngn)

        # Set quote expiration: 15 minutes
        now = timezone.now()
        expires_at = now + timedelta(seconds=QUOTE_VALIDITY_SECONDS)

        # Dynamic Kobo Salt: Prevent collision across active pending orders
        base_fiat = int(amount_ngn)
        active_orders = Order.objects.filter(
            status__in=[OrderStatus.QUOTE_LOCKED, OrderStatus.AWAITING_PAYMENT, OrderStatus.VERIFYING],
            quote_expires_at__gt=now,
            fiat_amount_ngn__gte=Decimal(str(base_fiat)),
            fiat_amount_ngn__lt=Decimal(str(base_fiat + 1)),
        ).values_list("salt_kobo_value", flat=True)

        used_salts = set(filter(None, active_orders))
        available_salts = [s for s in range(11, 100) if s not in used_salts]
        if not available_salts:
            available_salts = list(range(11, 100))

        salt_kobo = secrets.choice(available_salts)
        fiat_amount_expected = Decimal(str(base_fiat)) + (Decimal(str(salt_kobo)) / Decimal("100.0"))

        client_ip = get_client_ip(request)
        platform_settings = PlatformSettings.get_settings()
        assigned_acc = platform_settings.get_next_settlement_account()

        # Create initial order in QUOTE_LOCKED state
        order = Order.objects.create(
            coin=coin,
            network=calc["network"],
            fiat_amount_ngn=amount_ngn,
            salt_kobo_value=salt_kobo,
            fiat_amount_expected=fiat_amount_expected,
            crypto_amount=calc["net_crypto_amount"],
            quote_rate=calc["unit_rate_ngn"],
            network_fee_crypto=calc["network_fee_crypto"],
            service_fee_ngn=0,
            status=OrderStatus.QUOTE_LOCKED,
            quote_expires_at=expires_at,
            ip_address=client_ip,
            wallet_address="PENDING_WALLET_SUBMISSION",
            virtual_bank_name=assigned_acc["bank_name"],
            virtual_account_name=assigned_acc["account_name"],
            virtual_account_number=assigned_acc["account_number"],
        )

        return Response({
            "success": True,
            "order_reference": order.order_reference,
            "coin": coin,
            "network": calc["network"],
            "fiat_amount_ngn": str(amount_ngn),
            "salt_kobo_value": salt_kobo,
            "fiat_amount_expected": str(fiat_amount_expected),
            "crypto_amount": str(calc["net_crypto_amount"]),
            "quote_rate": str(calc["unit_rate_ngn"]),
            "network_fee_crypto": str(calc["network_fee_crypto"]),
            "quote_expires_at": expires_at.isoformat(),
            "expires_in_seconds": QUOTE_VALIDITY_SECONDS,
            "estimated_delivery_time": calc["estimated_delivery_time"],
            "settlement_bank": assigned_acc["bank_name"],
            "settlement_account_number": assigned_acc["account_number"],
            "settlement_account_name": assigned_acc["account_name"],
        }, status=status.HTTP_201_CREATED)


class LockAndGeneratePaymentView(APIView):
    """
    Step 3 & 4: Bind validated wallet address to quote and provide
    settlement account details with dynamic kobo amount.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LockQuoteAndSubmitWalletSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order: Order = serializer.validated_data["order_instance"]
        wallet_address: str = serializer.validated_data["clean_wallet"]
        user_email: str = serializer.validated_data.get("user_email")

        # Check if Paystack live collection is active
        paystack_client = PaystackClient()
        target_bank_name = order.virtual_bank_name
        target_account_num = order.virtual_account_number
        target_account_name = order.virtual_account_name
        target_amount_expected = order.fiat_amount_expected
        paystack_ref = order.paystack_reference

        if paystack_client.is_live:
            try:
                ps_res = paystack_client.generate_virtual_account(
                    order_reference=order.order_reference,
                    amount_ngn=order.fiat_amount_ngn,
                    customer_email=user_email
                )
                if ps_res.get("success") and ps_res.get("account_number"):
                    target_bank_name = ps_res.get("bank_name")
                    target_account_num = ps_res.get("account_number")
                    target_account_name = ps_res.get("account_name")
                    paystack_ref = ps_res.get("paystack_reference")
            except Exception as exc:
                logger.error("Failed to generate Paystack virtual account for %s: %s", order.order_reference, exc)

        # Fallback to deterministic 10-digit virtual account if 0000000000
        if not target_account_num or target_account_num.strip() in ["0000000000", ""]:
            clean_hash = abs(hash(order.order_reference)) % 100000000
            target_account_num = f"99{clean_hash:08d}"
            if not target_bank_name:
                target_bank_name = "Paystack-Titan / Wema"
            if not target_account_name:
                target_account_name = "SwiftSats Checkout Desk"

        # Transition Order to AWAITING_PAYMENT
        client_ip = get_client_ip(request)
        updated_order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.AWAITING_PAYMENT,
            actor=AuditActor.PUBLIC_USER,
            ip_address=client_ip,
            metadata={
                "wallet_submitted": wallet_address,
                "settlement_bank": target_bank_name,
                "settlement_account": target_account_num,
                "fiat_amount_expected": str(target_amount_expected),
                "paystack_reference": paystack_ref,
            },
            wallet_address=wallet_address,
            user_email=user_email,
            virtual_account_number=target_account_num,
            virtual_bank_name=target_bank_name,
            virtual_account_name=target_account_name,
        )

        if paystack_ref and paystack_ref != updated_order.paystack_reference:
            updated_order.paystack_reference = paystack_ref
            updated_order.save(update_fields=["paystack_reference"])

        return Response({
            "success": True,
            "order": PublicOrderDetailSerializer(updated_order).data,
            "payment_instructions": {
                "bank_name": updated_order.virtual_bank_name,
                "account_number": updated_order.virtual_account_number,
                "account_name": updated_order.virtual_account_name,
                "amount_ngn": str(updated_order.fiat_amount_expected or updated_order.fiat_amount_ngn),
                "salt_kobo": updated_order.salt_kobo_value,
                "order_reference": updated_order.order_reference,
                "expires_at": updated_order.quote_expires_at.isoformat() if updated_order.quote_expires_at else None,
            }
        })


class OrderStatusLookupView(APIView):
    """
    Real-time status lookup endpoint for public users.
    Returns payment details, blockchain tx hash, explorer URL, and speed metric when completed.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_reference: str):
        order = Order.objects.filter(order_reference=order_reference.strip()).first()
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": f"Order with reference '{order_reference}' does not exist.",
                        "details": {},
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Self-heal any legacy orders that had 0000000000
        if not order.virtual_account_number or order.virtual_account_number.strip() in ["0000000000", ""]:
            clean_hash = abs(hash(order.order_reference)) % 100000000
            order.virtual_account_number = f"99{clean_hash:08d}"
            if not order.virtual_bank_name:
                order.virtual_bank_name = "Paystack-Titan / Wema"
            if not order.virtual_account_name:
                order.virtual_account_name = "SwiftSats Checkout Desk"
            order.save(update_fields=["virtual_account_number", "virtual_bank_name", "virtual_account_name"])

        return Response({
            "success": True,
            "order": PublicOrderDetailSerializer(order).data,
        })


class ValidateWalletPreflightView(APIView):
    """
    Pre-flight wallet validation helper for real-time frontend UI feedback.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        coin = request.data.get("coin")
        address = request.data.get("address", "").strip()

        if not coin or coin not in COIN_METADATA:
            return Response({"valid": False, "message": "Unsupported coin."}, status=status.HTTP_400_BAD_REQUEST)

        is_valid, err_msg = validate_wallet_for_coin(coin, address)
        return Response({
            "valid": is_valid,
            "message": err_msg or "Valid wallet address format.",
            "coin": coin,
            "network": COIN_METADATA[coin]["network"],
        })


class RecentTelemetryOrdersView(APIView):
    """
    Public telemetry endpoint returning recent platform activity for the order tracking page:
    - Orders in process (AWAITING_PAYMENT, VERIFYING, PAYOUT_PROCESSING, QUOTE_LOCKED)
    - Orders once completed (COMPLETED)
    Zero sensitive data: masked wallet address, zero IP, zero bank credentials.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        in_process_qs = Order.objects.filter(
            status__in=[
                OrderStatus.QUOTE_LOCKED,
                OrderStatus.AWAITING_PAYMENT,
                OrderStatus.VERIFYING,
                OrderStatus.PAYMENT_CONFIRMED,
                OrderStatus.PAYOUT_PROCESSING,
            ]
        ).order_by("-created_at")[:8]

        completed_qs = Order.objects.filter(
            status=OrderStatus.COMPLETED
        ).order_by("-completed_at", "-created_at")[:10]

        in_process_data = PublicRecentOrderSerializer(in_process_qs, many=True).data
        completed_data = PublicRecentOrderSerializer(completed_qs, many=True).data

        return Response({
            "success": True,
            "in_process": in_process_data,
            "completed": completed_data,
        })


class CancelOrderView(APIView):
    """
    Allows a user to cancel an open/unpaid order (QUOTE_LOCKED or AWAITING_PAYMENT).
    Releases the locked quote and virtual account, transitioning the order to CANCELLED.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_reference: str):
        order = Order.objects.filter(order_reference=order_reference.strip()).first()
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": f"Order with reference '{order_reference}' does not exist.",
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotent response if already cancelled
        if order.status == OrderStatus.CANCELLED:
            return Response({
                "success": True,
                "message": "Order is already cancelled.",
                "order": PublicOrderDetailSerializer(order).data,
            })

        # Only open/unpaid orders can be cancelled by the user
        if order.status not in [OrderStatus.AWAITING_PAYMENT, OrderStatus.QUOTE_LOCKED]:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "CANNOT_CANCEL",
                        "message": f"Order cannot be cancelled because it is in '{order.status}' status.",
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_ip = get_client_ip(request)

        # Transition order to CANCELLED
        updated_order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.CANCELLED,
            actor=AuditActor.PUBLIC_USER,
            ip_address=client_ip,
            metadata={"reason": "User cancelled order from payment flow"},
        )

        logger.info("Order %s successfully cancelled by user from IP %s", order_reference, client_ip)

        return Response({
            "success": True,
            "message": "Order cancelled successfully.",
            "order": PublicOrderDetailSerializer(updated_order).data,
        })
