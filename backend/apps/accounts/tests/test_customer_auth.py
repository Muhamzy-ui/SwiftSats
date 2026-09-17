import json
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import Customer
from apps.orders.models import Order
from core.constants import OrderStatus, SupportedCoin, BlockchainNetwork


class CustomerAuthTests(APITestCase):
    def test_customer_register_and_login_flow(self):
        # 1. Register customer
        register_url = "/api/v1/auth/customer/register/"
        payload = {
            "email": "buyer@example.com",
            "password": "SecurePassword123!",
            "full_name": "Satoshi Nakamoto",
            "phone": "+2348012345678",
        }
        res = self.client.post(register_url, data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "buyer@example.com")
        self.assertEqual(data["user"]["full_name"], "Satoshi Nakamoto")
        token = data["token"]

        # 2. Cannot register with duplicate email
        dup_res = self.client.post(register_url, data=payload, format="json")
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Login with valid credentials
        login_url = "/api/v1/auth/customer/login/"
        login_payload = {
            "email": "buyer@example.com",
            "password": "SecurePassword123!",
        }
        login_res = self.client.post(login_url, data=login_payload, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        login_data = login_res.json()
        self.assertTrue(login_data["success"])
        self.assertIn("token", login_data)

        # 4. Login with invalid password fails
        bad_login = self.client.post(login_url, data={"email": "buyer@example.com", "password": "wrongpassword"}, format="json")
        self.assertEqual(bad_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5. Access profile /api/v1/auth/customer/me/ with token
        # First create an order for this email
        order = Order.objects.create(
            coin=SupportedCoin.USDT_TRC20,
            network=BlockchainNetwork.TRC20,
            fiat_amount_ngn=Decimal("50000.00"),
            crypto_amount=Decimal("31.25"),
            quote_rate=Decimal("1600.00"),
            wallet_address="TJv1xyz1234567890abcdef1234567890",
            user_email="buyer@example.com",
            status=OrderStatus.COMPLETED,
            quote_expires_at=timezone.now(),
        )

        me_url = "/api/v1/auth/customer/me/"
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me_res = self.client.get(me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        me_data = me_res.json()
        self.assertTrue(me_data["success"])
        self.assertEqual(me_data["user"]["email"], "buyer@example.com")
        self.assertEqual(me_data["metrics"]["total_orders"], 1)
        self.assertEqual(len(me_data["orders"]), 1)
        self.assertEqual(me_data["orders"][0]["order_reference"], order.order_reference)

        # 6. Logout
        logout_url = "/api/v1/auth/customer/logout/"
        logout_res = self.client.post(logout_url)
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

    def test_order_cannot_be_locked_without_signup(self):
        from datetime import timedelta
        # Create quote
        quote_order = Order.objects.create(
            coin=SupportedCoin.BNB,
            network=BlockchainNetwork.BEP20,
            fiat_amount_ngn=Decimal("20000.00"),
            crypto_amount=Decimal("0.02"),
            quote_rate=Decimal("1000000.00"),
            wallet_address="PENDING_WALLET_SUBMISSION",
            status=OrderStatus.QUOTE_LOCKED,
            quote_expires_at=timezone.now() + timedelta(minutes=15),
        )

        valid_wallet = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
        lock_url = "/api/v1/orders/create/"
        unregistered_payload = {
            "order_reference": quote_order.order_reference,
            "wallet_address": valid_wallet,
            "user_email": "unregistered_stranger@example.com",
        }

        # 1. Unauthenticated request without registered account fails with 401
        self.client.credentials()  # Clear credentials
        res = self.client.post(lock_url, data=unregistered_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.json()["error"]["code"], "AUTH_REQUIRED")

        # 2. Authenticated customer request succeeds
        customer = Customer.objects.create(email="registered_user@example.com", full_name="John Doe")
        customer.set_password("SecurePass123!")
        customer.save()

        from apps.accounts.authentication import generate_customer_jwt_token
        cust_token = generate_customer_jwt_token(customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {cust_token}")

        registered_payload = {
            "order_reference": quote_order.order_reference,
            "wallet_address": valid_wallet,
            "user_email": "registered_user@example.com",
        }
        success_res = self.client.post(lock_url, data=registered_payload, format="json")
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.assertTrue(success_res.json()["success"])

        # Verify order in DB is bound to registered customer
        quote_order.refresh_from_db()
        self.assertEqual(quote_order.customer, customer)
        self.assertEqual(quote_order.user_email, "registered_user@example.com")
        self.assertEqual(quote_order.status, OrderStatus.AWAITING_PAYMENT)
