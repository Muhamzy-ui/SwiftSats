"""
Production settings for SwiftSats (Render / Cloud deployment).
Strict security headers, SSL enforcement, startup credential validation, and error monitoring.
"""
import os
from django.core.exceptions import ImproperlyConfigured
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from .base import *  # noqa: F403, F401

DEBUG = False

# Security & HTTPS Enforcement (Non-negotiable in Production)
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# HSTS settings (1 year)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Admin JWT Cookie in Production: Strict, Secure, HttpOnly
JWT_AUTH_COOKIE_SECURE = True
JWT_AUTH_COOKIE_HTTPONLY = True
JWT_AUTH_COOKIE_SAMESITE = "Lax"

# WhiteNoise for serving compressed static files
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ==============================================================================
# STARTUP VALIDATION: HARD-FAIL IN PRODUCTION IF CRITICAL SECRETS ARE MISSING
# Prevents accidental silent fallback to mocks when live money/crypto is involved
# ==============================================================================
def validate_production_configuration():
    from django.conf import settings
    errors = []

    # 1. Quidax API Key check
    quidax_key = getattr(settings, "QUIDAX_API_KEY", "")
    if not quidax_key or quidax_key.startswith("sec_example") or quidax_key == "change-me":
        errors.append("QUIDAX_API_KEY is missing or using placeholder in production!")

    # 2. Paystack Secret Key check
    paystack_key = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    if not paystack_key or paystack_key.startswith("sk_test_example") or paystack_key == "change-me":
        errors.append("PAYSTACK_SECRET_KEY is missing or using placeholder in production!")

    # 3. Django Secret Key check
    django_secret = getattr(settings, "SECRET_KEY", "")
    if not django_secret or "insecure" in django_secret or len(django_secret) < 32:
        errors.append("DJANGO_SECRET_KEY must be a secure random secret (min 32 chars) in production!")

    if errors:
        raise ImproperlyConfigured(
            "\n[FATAL CONFIGURATION ERROR - STARTUP BLOCKED]\n" + "\n".join(f" - {e}" for e in errors)
        )

# Run startup safety validation when running production settings
if os.environ.get("DJANGO_SETTINGS_MODULE") == "config.settings.production" or env.bool("ENFORCE_PROD_VALIDATION", default=False):
    validate_production_configuration()

# ==============================================================================
# Sentry Error Tracking - Initialized from Day 1
# ==============================================================================
SENTRY_DSN = env.str("SENTRY_DSN", default="")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.2,
        send_default_pii=False,
        environment=env.str("ENVIRONMENT", default="production"),
    )

# Strict production logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": "{asctime} {levelname} {name} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.security": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
