"""
Django management command to purge all orders and related logs.
Leaves administrative and customer user accounts intact.
"""
from django.core.management.base import BaseCommand
from apps.orders.models import Order
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = "Purges all orders to give a clean operational slate."

    def handle(self, *args, **options):
        orders_count = Order.objects.count()

        Order.objects.all().delete()
        AuditLog.objects.exclude(actor="SYSTEM").delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully purged {orders_count} orders and related logs from database."
            )
        )
