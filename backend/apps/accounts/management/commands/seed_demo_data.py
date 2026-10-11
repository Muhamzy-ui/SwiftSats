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

        # 1. Create or update Super Admin User (mahmud129@swiftsats.com)
        mahmud_email = "mahmud129@swiftsats.com"
        mahmud_user, _ = AdminUser.objects.get_or_create(
            email=mahmud_email,
            defaults={
                "first_name": "Mahmud",
                "last_name": "Bashir",
                "role": AdminRole.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "two_factor_secret": "JBSWY3DPEHPK3PXP",
                "is_two_factor_enabled": False,
            }
        )
        mahmud_user.set_password("Mahmud12$$")
        mahmud_user.is_two_factor_enabled = False
        mahmud_user.is_staff = True
        mahmud_user.is_superuser = True
        mahmud_user.role = AdminRole.SUPER_ADMIN
        mahmud_user.save()
        self.stdout.write(self.style.SUCCESS(f"Configured SuperAdmin: {mahmud_email} (2FA Disabled)"))

        # Secondary dev admin
        admin_email = "admin@swiftsats.com"
        admin_user, _ = AdminUser.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Antigravity",
                "last_name": "Admin",
                "role": AdminRole.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "two_factor_secret": "JBSWY3DPEHPK3PXP",
                "is_two_factor_enabled": False,
            }
        )
        admin_user.set_password("SwiftAdmin2026!")
        admin_user.is_two_factor_enabled = False
        admin_user.save()

        # 2. Ensure PlatformSettings is synced with Nomba settlement
        from apps.admin_api.models import PlatformSettings
        settings_obj = PlatformSettings.get_settings()
        settings_obj.use_paystack_virtual_accounts = False
        settings_obj.settlement_bank_name = "Nomba Microfinance Bank"
        settings_obj.settlement_account_number = "1623796514"
        settings_obj.settlement_account_name = "Mbovibe Systems/swiftsats"
        settings_obj.settlement_bank_name_2 = "Nomba Microfinance Bank"
        settings_obj.settlement_account_number_2 = "1623796514"
        settings_obj.settlement_account_name_2 = "Mbovibe Systems/swiftsats"
        settings_obj.rotate_accounts = False
        settings_obj.save()
        self.stdout.write(self.style.SUCCESS("PlatformSettings synced to Nomba (1623796514 - Mbovibe Systems/swiftsats)"))

        # 3. Database ready
        self.stdout.write(self.style.SUCCESS("Admin user and platform settings ready for real transactions."))

