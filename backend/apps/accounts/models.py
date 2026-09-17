"""
Custom Admin User and 2FA Security Models.
"""
import uuid
import pyotp
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from core.constants import AdminRole


class AdminUserManager(BaseUserManager):
    """Custom manager for AdminUser with email as unique username."""

    def create_user(self, email: str, password: str = None, **extra_fields):
        if not email:
            raise ValueError("Email is mandatory for admin user creation.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", AdminRole.SUPER_ADMIN)
        return self.create_user(email, password, **extra_fields)


class AdminUser(AbstractBaseUser, PermissionsMixin):
    """
    Dedicated Admin User Model with built-in TOTP 2FA secret and role-based permissions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=64, blank=True)
    last_name = models.CharField(max_length=64, blank=True)
    role = models.CharField(
        max_length=32,
        choices=AdminRole.choices,
        default=AdminRole.OPERATOR
    )

    # 2FA Settings
    two_factor_secret = models.CharField(max_length=64, default=pyotp.random_base32)
    is_two_factor_enabled = models.BooleanField(default=True)

    # Status & Audit
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AdminUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "admin_users"
        verbose_name = "Admin User"
        verbose_name_plural = "Admin Users"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self) -> str:
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email

    def verify_totp(self, token: str) -> bool:
        """
        Verify incoming 6-digit TOTP token against secret.
        Allows a 30-second window drift tolerance.
        """
        if not self.two_factor_secret:
            return False
        totp = pyotp.TOTP(self.two_factor_secret)
        return bool(totp.verify(str(token).strip(), valid_window=1))

    def get_totp_uri(self) -> str:
        """Generate otpauth:// URI for QR code scanning in Google Authenticator."""
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.provisioning_uri(name=self.email, issuer_name="SwiftSats Admin")


class Customer(models.Model):
    """
    Public customer account model.
    Allows customer registration and authentication with email and hashed password.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=256, help_text="Securely hashed password")
    full_name = models.CharField(max_length=128, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        name = self.full_name.strip() if self.full_name else "Anonymous"
        return f"{self.email} ({name})"

    def set_password(self, raw_password: str) -> None:
        """Hash and save customer password using Django default hasher."""
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Verify raw password against stored hash."""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False
