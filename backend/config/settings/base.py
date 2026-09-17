"""
Base settings for SwiftSats project.
All common settings across development and production environments live here.
"""
from pathlib import Path
from decimal import Decimal
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Read .env file from backend directory if it exists
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# Core Security Settings
SECRET_KEY = env.str("DJANGO_SECRET_KEY", default="insecure-dev-key-change-in-production-swiftsats-2026")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = list(set(env.list("DJANGO_ALLOWED_HOSTS", default=["*"]) + ["*", ".onrender.com", "swiftsats.onrender.com", "localhost", "127.0.0.1", "0.0.0.0"]))

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "django_otp",
    "django_otp.plugins.otp_totp",
]

LOCAL_APPS = [
    "apps.audit.apps.AuditConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.payments.apps.PaymentsConfig",
    "apps.exchange.apps.ExchangeConfig",
    "apps.admin_api.apps.AdminApiConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database defaults
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Custom User Model
AUTH_USER_MODEL = "accounts.AdminUser"

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.AdminJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
}

# Redis & Cache Settings (Graceful fallback to in-memory LocMemCache when Redis is not available)
REDIS_URL = env.str("REDIS_URL", default="")
if REDIS_URL and not REDIS_URL.startswith("redis://localhost") and not REDIS_URL.startswith("redis://127.0.0.1"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "swiftsats-cache",
            "TIMEOUT": 300,
        }
    }

# Celery Settings (Synchronous eager execution if no external broker)
CELERY_BROKER_URL = env.str("CELERY_BROKER_URL", default="")
CELERY_RESULT_BACKEND = env.str("CELERY_RESULT_BACKEND", default="")
if not CELERY_BROKER_URL or "localhost" in CELERY_BROKER_URL or "127.0.0.1" in CELERY_BROKER_URL:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    CELERY_TASK_ALWAYS_EAGER = False

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes max

# CORS Settings
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.onrender\.com$",
    r"^https:\/\/.*\.vercel\.app$",
]
CORS_ALLOW_CREDENTIALS = True

# Quidax Integration Settings
QUIDAX_API_KEY = env.str("QUIDAX_API_KEY", default="N01w1Hp-xN0rWxR8gtuiPTwi1uWLcCM2")
QUIDAX_SECRET_KEY = env.str("QUIDAX_SECRET_KEY", default="xigBo_MYVKN-8PeECOxl-Hxurgk_yrrUWPpVsRPSmyo")
QUIDAX_BASE_URL = env.str("QUIDAX_BASE_URL", default="https://openapi.quidax.io/exchange-open-api/api/v1")
QUIDAX_RATE_SPREAD_PERCENTAGE = Decimal(env.str("QUIDAX_RATE_SPREAD_PERCENTAGE", default="1.5"))

# Paystack Integration Settings
PAYSTACK_SECRET_KEY = env.str("PAYSTACK_SECRET_KEY", default="")
PAYSTACK_PUBLIC_KEY = env.str("PAYSTACK_PUBLIC_KEY", default="")
PAYSTACK_WEBHOOK_SECRET = env.str("PAYSTACK_WEBHOOK_SECRET", default="")
PAYSTACK_BASE_URL = env.str("PAYSTACK_BASE_URL", default="https://api.paystack.co")

# Admin Security & Auth
JWT_SECRET_KEY = env.str("JWT_SECRET_KEY", default="swiftsats-jwt-secret-key-replace-in-prod")
ADMIN_SESSION_TIMEOUT_MINUTES = env.int("ADMIN_SESSION_TIMEOUT_MINUTES", default=60)
JWT_AUTH_COOKIE = "swiftsats_admin_jwt"
JWT_AUTH_COOKIE_SECURE = env.bool("JWT_AUTH_COOKIE_SECURE", default=False)
JWT_AUTH_COOKIE_HTTPONLY = True
JWT_AUTH_COOKIE_SAMESITE = "Lax"

# Business Logic Constraints
QUOTE_LOCK_DURATION_SECONDS = 90
MIN_ORDER_AMOUNT_NGN = Decimal("2000.00")
MAX_ORDER_AMOUNT_NGN = Decimal("5000000.00")
