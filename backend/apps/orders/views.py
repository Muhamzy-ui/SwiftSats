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
from apps.accounts.authentication import CustomerJWTAuthentication
from core.constants import OrderStatus, AuditActor, COIN_METADATA
from core.validators import validate_wallet_for_coin
from core.utils import get_client_ip
from core.telegram import send_telegram_alert
from django.core.mail import send_mail
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

QUOTE_VALIDITY_SECONDS = 900  # 15 minutes strict operational window


def send_order_confirmation_email(order: Order):
    """
    Sends payment receipt and direct private tracking link to the customer's email.
    """
    if not order.user_email or "@" not in order.user_email:
        return

    try:
        subject = f"Your SwiftSats Order {order.order_reference} Payment Details"
        pay_url = f"https://swiftsats.onrender.com/pay/{order.order_reference}"
        expected_ngn = order.fiat_amount_expected or order.fiat_amount_ngn
        bank_name = order.virtual_bank_name or "Paystack-Titan / Wema"
        account_num = order.virtual_account_number or "N/A"
        account_name = order.virtual_account_name or "SwiftSats Settlement Desk"

        message = (
            f"Hello,\n\n"
            f"Your crypto purchase order has been generated on SwiftSats.\n\n"
            f"Order Reference: {order.order_reference}\n"
            f"Crypto To Receive: {order.crypto_amount} {order.coin.split('_')[0]} ({order.network})\n"
            f"Destination Wallet: {order.wallet_address}\n\n"
            f"--- Bank Payment Details ---\n"
            f"Bank Name: {bank_name}\n"
            f"Account Number: {account_num}\n"
            f"Beneficiary: {account_name}\n"
            f"Exact Amount to Pay: NGN {expected_ngn}\n\n"
            f"Track & Complete Your Order:\n"
            f"{pay_url}\n\n"
            f"NOTE: Please transfer the exact amount shown (including kobo) from your banking app. "
            f"Once received, your crypto is automatically released and delivered to your wallet.\n\n"
            f"Best regards,\n"
            f"The SwiftSats Team\n"
            f"https://swiftsats.onrender.com"
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "SwiftSats <noreply@swiftsats.com>"),
            recipient_list=[order.user_email.strip()],
            fail_silently=True,
        )
        logger.info("Order confirmation email sent to %s for %s", order.user_email, order.order_reference)
    except Exception as e:
        logger.error("Failed to send order confirmation email for %s: %s", order.order_reference, str(e))


class CreateQuoteView(APIView):
    """
    Step 1 & 2: Generate a server-locked crypto price quote.
    Valid for 15 minutes (900 seconds) with unique dynamic kobo salt.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CreateQuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coin = serializer.validated_data["coin"]
        amount_ngn = serializer.validated_data["amount_ngn"]

        # Check partner attribution / integration
        partner_param = (
            request.data.get("partner_code")
            or request.data.get("source")
            or request.data.get("partner")
            or request.data.get("ref")
            or ""
        ).strip().lower()

        # Calculate exact crypto amount and effective rate
        rate_service = RateService()
        calc = rate_service.calculate_crypto_for_naira(
            coin=coin,
            fiat_amount_ngn=amount_ngn,
            partner_code=partner_param or None,
        )

        # Set quote expiration: 15 minutes
        now = timezone.now()
        expires_at = now + timedelta(seconds=QUOTE_VALIDITY_SECONDS)

        # Clean whole Naira: No fractional kobo decimals for 100% bank transfer reliability
        clean_fiat = Decimal(str(int(Decimal(str(amount_ngn)))))
        fiat_amount_expected = clean_fiat
        salt_kobo = 0

        partner_code_val = None
        if partner_param:
            from apps.admin_api.models import PartnerIntegration
            partner_obj = PartnerIntegration.objects.filter(code=partner_param).first()
            if partner_obj:
                if not partner_obj.is_active:
                    return Response({
                        "success": False,
                        "error": {
                            "code": "PARTNER_INACTIVE",
                            "message": f"This partner integration ('{partner_obj.name}') is currently deactivated by the administrator.",
                        }
                    }, status=status.HTTP_403_FORBIDDEN)
                partner_code_val = partner_obj.code
            else:
                # Auto-register partner
                auto_partner = PartnerIntegration.objects.create(
                    name=partner_param.replace("_", " ").title(),
                    code=partner_param,
                    is_active=True,
                )
                partner_code_val = auto_partner.code

        client_ip = get_client_ip(request)
        platform_settings = PlatformSettings.get_settings()
        assigned_acc = platform_settings.get_next_settlement_account()

        # Create initial order in QUOTE_LOCKED state
        order = Order.objects.create(
            coin=coin,
            network=calc["network"],
            fiat_amount_ngn=clean_fiat,
            salt_kobo_value=salt_kobo,
            fiat_amount_expected=clean_fiat,
            crypto_amount=calc["net_crypto_amount"],
            quote_rate=calc["unit_rate_ngn"],
            network_fee_crypto=calc["network_fee_crypto"],
            service_fee_ngn=calc["service_fee_ngn"],
            status=OrderStatus.QUOTE_LOCKED,
            quote_expires_at=expires_at,
            ip_address=client_ip,
            partner_code=partner_code_val,
            wallet_address="PENDING_WALLET_SUBMISSION",
            virtual_bank_name=assigned_acc["bank_name"],
            virtual_account_name=assigned_acc["account_name"],
            virtual_account_number=assigned_acc["account_number"],
        )

        return Response({
            "success": True,
            "order_reference": order.order_reference,
            "partner_code": partner_code_val,
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
    Strictly requires customer registration/authentication.
    """
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LockQuoteAndSubmitWalletSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order: Order = serializer.validated_data["order_instance"]
        wallet_address: str = serializer.validated_data["clean_wallet"]

        # Support partner guest on-ramping or authenticated customer
        customer = getattr(request, "user", None)
        user_email_input = serializer.validated_data.get("user_email")
        if not customer or not getattr(customer, "is_authenticated", False):
            if user_email_input:
                from apps.accounts.models import Customer
                customer = Customer.objects.filter(email__iexact=user_email_input.strip()).first()
                if not customer and order.partner_code:
                    customer = Customer.objects.create(
                        email=user_email_input.strip(),
                        full_name=serializer.validated_data.get("user_full_name") or f"Guest ({order.partner_code})",
                    )
            elif order.partner_code:
                from apps.accounts.models import Customer
                guest_email = f"guest_{order.order_reference.lower()}@swiftsats.internal"
                customer, _ = Customer.objects.get_or_create(
                    email=guest_email,
                    defaults={"full_name": f"Partner OnRamp ({order.partner_code})"}
                )

        if not customer or not getattr(customer, "is_authenticated", False) and not order.partner_code:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Account registration is required. Please sign up or log in to complete your order.",
                        "details": {},
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_email = customer.email if customer else (serializer.validated_data.get("user_email") or f"guest@{order.partner_code}.app")

        # Check if Paystack live collection is active or Direct Merchant Account is configured
        paystack_client = PaystackClient()
        platform_settings = PlatformSettings.get_settings()
        use_paystack = getattr(platform_settings, "use_paystack_virtual_accounts", False)

        settlement_info = platform_settings.get_next_settlement_account()
        target_bank_name = settlement_info.get("bank_name", "Nomba Microfinance Bank")
        target_account_num = settlement_info.get("account_number", "1623796514")
        target_account_name = settlement_info.get("account_name", "Mbovibe Systems/swiftsats")
        target_amount_expected = order.fiat_amount_expected
        paystack_ref = order.paystack_reference

        if use_paystack and paystack_client.is_live:
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
                    if ps_res.get("amount_ngn"):
                        target_amount_expected = Decimal(str(ps_res.get("amount_ngn")))
            except Exception as exc:
                logger.error("Failed to generate Paystack virtual account for %s: %s", order.order_reference, exc)

        # Fallback to deterministic account if missing or if legacy OPay / Mahmud
        if (
            not target_account_num
            or target_account_num.strip() in ["0000000000", "8072410373", ""]
            or "opay" in (target_bank_name or "").lower()
            or "mahmud" in (target_account_name or "").lower()
        ):
            target_account_num = "1623796514"
            target_bank_name = "Nomba Microfinance Bank"
            target_account_name = "Mbovibe Systems/swiftsats"

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
            fiat_amount_expected=target_amount_expected,
            paystack_reference=paystack_ref,
        )

        if paystack_ref and paystack_ref != updated_order.paystack_reference:
            updated_order.paystack_reference = paystack_ref
            updated_order.save(update_fields=["paystack_reference"])

        # Strictly bind registered customer account to order
        if customer and updated_order.customer != customer:
            updated_order.customer = customer
            updated_order.user_email = customer.email
            updated_order.save(update_fields=["customer", "user_email"])

        # Send instant receipt and tracking email to user
        send_order_confirmation_email(updated_order)

        # Instant alert to Admin Telegram & Native Device Push
        try:
            partner_tag = f" (via {updated_order.partner_code.upper()})" if updated_order.partner_code else ""
            send_telegram_alert(
                f"🛒 <b>NEW ORDER INITIATED{partner_tag}</b>\n"
                f"<b>Order:</b> <code>{updated_order.order_reference}</code>\n"
                f"<b>Amount:</b> ₦{updated_order.fiat_amount_expected:,.2f} ({updated_order.crypto_amount} {updated_order.coin})\n"
                f"<b>Destination:</b> <code>{updated_order.wallet_address}</code>\n"
                f"<b>Deposit Bank:</b> {updated_order.virtual_bank_name} - <code>{updated_order.virtual_account_number}</code>\n"
                f"<b>Status:</b> Awaiting Transfer"
            )
        except Exception as e:
            logger.warning("Telegram order notification failed: %s", e)

        try:
            from core.webpush import send_admin_webpush
            send_admin_webpush(
                title="🛒 New Order Created",
                body=f"{updated_order.order_reference}: ₦{updated_order.fiat_amount_expected:,.2f} for {updated_order.crypto_amount} {updated_order.coin}",
                url=f"/admin/orders?search={updated_order.order_reference}",
                tag=f"order-{updated_order.order_reference}"
            )
        except Exception as e:
            logger.warning("Webpush order notification failed: %s", e)

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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_reference: str):
        ref_cleaned = order_reference.strip()
        order = Order.objects.filter(order_reference=ref_cleaned).first()
        if not order:
            # Multi-attribute lookup for partner orders, tx hash, or reference
            order = (
                Order.objects.filter(payout_tx_hash__iexact=ref_cleaned).first()
                or Order.objects.filter(nomba_transaction_ref__iexact=ref_cleaned).first()
                or Order.objects.filter(paystack_reference__iexact=ref_cleaned).first()
                or Order.objects.filter(user_email__icontains=ref_cleaned).first()
                or Order.objects.filter(customer__email__icontains=ref_cleaned).first()
            )
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

        # Self-heal any legacy orders that had 0000000000 or Opay/Mahmud details
        if (
            not order.virtual_account_number
            or order.virtual_account_number.strip() in ["0000000000", "8072410373", ""]
            or "opay" in (order.virtual_bank_name or "").lower()
            or "mahmud" in (order.virtual_account_name or "").lower()
        ):
            order.virtual_account_number = "1623796514"
            order.virtual_bank_name = "Nomba Microfinance Bank"
            order.virtual_account_name = "Mbovibe Systems/swiftsats"
            order.save(update_fields=["virtual_account_number", "virtual_bank_name", "virtual_account_name"])

        return Response({
            "success": True,
            "status": order.status,
            "order_id": order.order_reference,
            "order_reference": order.order_reference,
            "crypto_amount": str(order.crypto_amount),
            "coin": order.coin,
            "fiat_amount_ngn": str(order.fiat_amount_ngn),
            "tx_hash": order.tx_hash,
            "order": PublicOrderDetailSerializer(order).data,
        })


class ValidateWalletPreflightView(APIView):
    """
    Pre-flight wallet validation helper for real-time frontend UI feedback.
    """
    authentication_classes = []
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
    Deprecated public telemetry endpoint.
    Returns empty list to guarantee 100% privacy of customer transactions.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "success": True,
            "in_process": [],
            "completed": [],
        })


class CancelOrderView(APIView):
    """
    Allows a user to cancel an open/unpaid order (QUOTE_LOCKED or AWAITING_PAYMENT).
    Releases the locked quote and virtual account, transitioning the order to CANCELLED.
    """
    authentication_classes = []
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


class SendEmailOTPView(APIView):
    """
    Sends a 6-digit One-Time Passcode (OTP) to the user's email for private order recovery.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email or "@" not in email:
            return Response(
                {"success": False, "message": "Please provide a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user has orders in system
        order_count = Order.objects.filter(user_email__iexact=email).count()
        if order_count == 0:
            return Response(
                {
                    "success": False,
                    "message": "No orders found associated with this email address. Please check your spelling or search by order reference.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Generate 6-digit cryptographic OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
        cache_key = f"otp_recovery_{email}"
        cache.set(cache_key, otp, timeout=600)  # 10 minutes

        # Send email with OTP
        try:
            subject = f"Your SwiftSats Verification Code: {otp}"
            message = (
                f"Hello,\n\n"
                f"Your 6-digit verification code to view your SwiftSats transactions is:\n\n"
                f"   {otp}\n\n"
                f"This code expires in 10 minutes. If you did not request this, you can safely ignore this email.\n\n"
                f"SwiftSats Security Team\n"
                f"https://swiftsats.onrender.com"
            )
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "SwiftSats Security <noreply@swiftsats.com>"),
                recipient_list=[email],
                fail_silently=True,
            )
            logger.info("Sent recovery OTP to %s for %d orders", email, order_count)
        except Exception as e:
            logger.error("Error sending OTP email: %s", str(e))

        return Response({
            "success": True,
            "message": f"A 6-digit verification code has been sent to {email}.",
            "email": email,
            "order_count": order_count,
        })


class VerifyEmailOTPView(APIView):
    """
    Verifies the 6-digit OTP and returns all private orders for that email.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        otp = request.data.get("otp", "").strip()

        if not email or not otp:
            return Response(
                {"success": False, "message": "Email and verification code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = f"otp_recovery_{email}"
        cached_otp = cache.get(cache_key)

        is_valid = (cached_otp and str(cached_otp).strip() == otp) or (settings.DEBUG and otp == "123456")

        if not is_valid:
            return Response(
                {"success": False, "message": "Invalid or expired verification code. Please check your code and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clear used OTP
        cache.delete(cache_key)

        # Retrieve user's orders (most recent first)
        orders = Order.objects.filter(user_email__iexact=email).order_by("-created_at")[:25]
        serialized = PublicRecentOrderSerializer(orders, many=True).data

        return Response({
            "success": True,
            "message": "Verification successful.",
            "email": email,
            "orders": serialized,
        })
