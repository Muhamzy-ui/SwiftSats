"""
Platform configuration and runtime controls for SwiftSats.
Stores 24/7 automation mode, settlement account details, and fee settings.
"""
from django.db import models


class PlatformSettings(models.Model):
    """
    Singleton runtime platform configuration.
    """
    class PayoutMode(models.TextChoices):
        AUTOMATED = "AUTOMATED", "24/7 Fully Automated (Nomba Webhook)"
        MANUAL = "MANUAL", "Manual Admin Approval"

    payout_mode = models.CharField(
        max_length=20,
        choices=PayoutMode.choices,
        default=PayoutMode.AUTOMATED,
        help_text="24/7 automated instant payout vs manual 1-tap admin approval"
    )
    # Primary Settlement Account
    settlement_bank_name = models.CharField(
        max_length=64,
        default="Paystack-Titan / Wema",
        help_text="Primary virtual bank partner"
    )
    settlement_account_name = models.CharField(
        max_length=128,
        default="SwiftSats Settlement Desk",
        help_text="Primary settlement desk account name"
    )
    settlement_account_number = models.CharField(
        max_length=32,
        default="9938210492",
        help_text="Primary virtual account number"
    )

    # Secondary Settlement Account
    settlement_bank_name_2 = models.CharField(
        max_length=64,
        default="Paystack-Titan / Providus",
        help_text="Secondary virtual bank partner"
    )
    settlement_account_name_2 = models.CharField(
        max_length=128,
        default="SwiftSats Checkout Desk",
        help_text="Secondary settlement desk account name"
    )
    settlement_account_number_2 = models.CharField(
        max_length=32,
        default="8029314810",
        help_text="Secondary virtual account number"
    )

    rotate_accounts = models.BooleanField(
        default=True,
        help_text="Automatically alternate between Moniepoint and Nomba for each incoming order"
    )
    rotation_counter = models.IntegerField(
        default=0,
        help_text="Internal counter tracking account round-robin rotation"
    )

    telegram_alerts_enabled = models.BooleanField(
        default=True,
        help_text="Dispatch instant alerts to Telegram bot"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_settings"
        verbose_name = "Platform Setting"
        verbose_name_plural = "Platform Settings"

    @classmethod
    def get_settings(cls) -> "PlatformSettings":
        settings_obj, _ = cls.objects.get_or_create(id=1)
        return settings_obj

    def get_next_settlement_account(self) -> dict:
        """
        Cycles between Account 1 (Moniepoint) and Account 2 (Nomba) if rotation is enabled.
        Returns a dict: {"bank_name": ..., "account_number": ..., "account_name": ...}
        """
        if not self.rotate_accounts or not self.settlement_account_number_2:
            return {
                "bank_name": self.settlement_bank_name,
                "account_number": self.settlement_account_number,
                "account_name": self.settlement_account_name,
            }

        self.rotation_counter = (self.rotation_counter + 1) % 1000000
        self.save(update_fields=["rotation_counter"])

        if self.rotation_counter % 2 == 0:
            return {
                "bank_name": self.settlement_bank_name,
                "account_number": self.settlement_account_number,
                "account_name": self.settlement_account_name,
            }
        else:
            return {
                "bank_name": self.settlement_bank_name_2,
                "account_number": self.settlement_account_number_2,
                "account_name": self.settlement_account_name_2,
            }
