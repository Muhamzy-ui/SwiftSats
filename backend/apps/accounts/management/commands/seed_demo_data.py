"""
Django Management Command to Seed Admin User and Realistic Demo Orders.
"""
from decimal import Decimal
from datetime import timedelta
import random
import secrets
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import AdminUser
from apps.orders.models import Order
from apps.audit.models import AuditLog
from core.constants import AdminRole, OrderStatus, SupportedCoin, BlockchainNetwork, COIN_METADATA, AuditActor


class Command(BaseCommand):
    help = "Seeds superadmin user and initial operational data for SwiftSats demo."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding SwiftSats admin user..."))

        # 1. Create or update Super Admin User
        admin_email = "admin@swiftsats.com"
        admin_user, created = AdminUser.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Antigravity",
                "last_name": "Admin",
                "role": AdminRole.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "two_factor_secret": "JBSWY3DPEHPK3PXP",  # Standard test base32 TOTP secret
                "is_two_factor_enabled": True,
            }
        )
        admin_user.set_password("SwiftAdmin2026!")
        admin_user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Admin: {admin_email} / SwiftAdmin2026! (TOTP code: 123456 in dev)"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated Admin: {admin_email}"))

        # 2. Seed Realistic Sample Orders if none exist
        if Order.objects.count() < 5:
            self.stdout.write(self.style.NOTICE("Seeding realistic crypto orders..."))

            coins_pool = [
                (SupportedCoin.USDT_TRC20, BlockchainNetwork.TRC20, Decimal("1585.50"), "TRON_T" + secrets.token_hex(16)),
                (SupportedCoin.SOL, BlockchainNetwork.SOLANA, Decimal("237500.00"), secrets.token_urlsafe(32)[:40]),
                (SupportedCoin.BNB, BlockchainNetwork.BEP20, Decimal("985000.00"), "0x" + secrets.token_hex(20)),
                (SupportedCoin.BTC, BlockchainNetwork.BITCOIN, Decimal("142500000.00"), "bc1q" + secrets.token_hex(20)),
            ]

            now = timezone.now()

            # Seed 20 historical completed orders spread over the last 7 days
            for i in range(25):
                coin, network, unit_rate, sample_wallet = random.choice(coins_pool)
                amount_ngn = Decimal(str(random.choice([25000, 50000, 100000, 250000, 500000, 750000, 1200000])))
                crypto_amount = (amount_ngn / unit_rate).quantize(Decimal("0.00000001"))
                created_dt = now - timedelta(days=random.randint(0, 6), hours=random.randint(1, 23), minutes=random.randint(1, 55))
                speed_ms = random.randint(2800, 6800)

                order_ref = f"SATS-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
                order = Order.objects.create(
                    order_reference=order_ref,
                    coin=coin,
                    network=network,
                    fiat_amount_ngn=amount_ngn,
                    crypto_amount=crypto_amount,
                    quote_rate=unit_rate,
                    service_fee_ngn=0,
                    network_fee_crypto=COIN_METADATA[coin]["network_fee_crypto"],
                    wallet_address=sample_wallet,
                    user_email=f"user_{secrets.token_hex(3)}@gmail.com",
                    status=OrderStatus.COMPLETED,
                    quote_expires_at=created_dt + timedelta(seconds=90),
                    virtual_bank_name=random.choice(["Wema Bank", "Sterling Bank", "Providus Bank"]),
                    virtual_account_number=f"99{random.randint(10000000, 99999999)}",
                    virtual_account_name=f"SWIFTSATS / {order_ref}",
                    paystack_reference=f"PSTK_{order_ref}",
                    quidax_payout_id=f"qdx_wd_{secrets.token_hex(6)}",
                    tx_hash="0x" + secrets.token_hex(32) if network != BlockchainNetwork.TRC20 else secrets.token_hex(32),
                    payment_received_at=created_dt + timedelta(seconds=random.randint(15, 45)),
                    payout_initiated_at=created_dt + timedelta(seconds=random.randint(46, 50)),
                    completed_at=created_dt + timedelta(seconds=random.randint(52, 58)),
                    speed_metric_ms=speed_ms,
                    created_at=created_dt,
                )
                # Ensure created_at matches historical date
                Order.objects.filter(id=order.id).update(created_at=created_dt, updated_at=created_dt)

                # Seed Audit Log
                AuditLog.objects.create(
                    order_reference=order_ref,
                    from_state=OrderStatus.PAYOUT_PROCESSING,
                    to_state=OrderStatus.COMPLETED,
                    actor=AuditActor.CELERY_WORKER,
                    metadata={"speed_metric_ms": speed_ms, "tx_hash": order.tx_hash},
                )

            # Seed a few live active orders in various states
            Order.objects.create(
                order_reference=f"SATS-LIVE-0001",
                coin=SupportedCoin.USDT_TRC20,
                network=BlockchainNetwork.TRC20,
                fiat_amount_ngn=Decimal("150000.00"),
                crypto_amount=Decimal("94.60737937"),
                quote_rate=Decimal("1585.50"),
                wallet_address="TXxxLiveTronReceiver98765432100",
                status=OrderStatus.AWAITING_PAYMENT,
                quote_expires_at=now + timedelta(seconds=65),
                virtual_bank_name="Wema Bank",
                virtual_account_number="9981249912",
                virtual_account_name="SWIFTSATS / SATS-LIVE-0001",
                paystack_reference="PSTK_SATS-LIVE-0001",
            )

            Order.objects.create(
                order_reference=f"SATS-LIVE-0002",
                coin=SupportedCoin.SOL,
                network=BlockchainNetwork.SOLANA,
                fiat_amount_ngn=Decimal("500000.00"),
                crypto_amount=Decimal("2.10526315"),
                quote_rate=Decimal("237500.00"),
                wallet_address="8FMfKj14K1mH6u3k1Kj9000000000000000000000",
                status=OrderStatus.PAYMENT_CONFIRMED,
                quote_expires_at=now - timedelta(seconds=20),
                virtual_bank_name="Sterling Bank",
                virtual_account_number="9918237741",
                virtual_account_name="SWIFTSATS / SATS-LIVE-0002",
                paystack_reference="PSTK_SATS-LIVE-0002",
                payment_received_at=now - timedelta(seconds=3),
            )

            self.stdout.write(self.style.SUCCESS("Successfully seeded demo orders."))
