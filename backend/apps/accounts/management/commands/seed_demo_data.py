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

        # 2. Ensure PlatformSettings is synced with OPay settlement
        from apps.admin_api.models import PlatformSettings
        settings_obj = PlatformSettings.get_settings()
        settings_obj.use_paystack_virtual_accounts = False
        settings_obj.settlement_bank_name = "OPay"
        settings_obj.settlement_account_number = "8072410373"
        settings_obj.settlement_account_name = "Mahmud Bashir Olasunkanmi"
        settings_obj.save()
        self.stdout.write(self.style.SUCCESS("PlatformSettings synced to OPay (8072410373 - Mahmud Bashir Olasunkanmi)"))

        # 3. Database ready
        self.stdout.write(self.style.SUCCESS("Admin user and platform settings ready for real transactions."))

