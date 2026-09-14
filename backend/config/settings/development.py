"""
Development settings for SwiftSats.
"""
from .base import *  # noqa: F403, F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS permissive for dev
CORS_ALLOW_ALL_ORIGINS = True

# In development / test, default to fast in-memory cache unless redis is running
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "swiftsats-dev-cache",
    }
}

# In development, fallback to console email
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery: In development, execute tasks eagerly and synchronously
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Logging for development
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {module}:{lineno} -> {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
