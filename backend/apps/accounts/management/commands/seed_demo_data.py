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

        # 2. Fake orders are no longer auto-generated to keep admin dashboard pure and accurate to live frontend orders.
        self.stdout.write(self.style.SUCCESS("Admin user ready. Database is configured for real transactions."))

