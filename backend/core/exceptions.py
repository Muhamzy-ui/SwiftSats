"""
Custom DRF exception handler and domain exceptions for SwiftSats.
Provides consistent, structured JSON error responses.
"""
from typing import Any, Dict, Optional
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


class SwiftSatsBaseException(Exception):
    """Base exception for domain business logic errors."""
    default_message = "An error occurred during processing."
    default_code = "SWIFTSATS_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: Optional[str] = None, code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)


class StateTransitionError(SwiftSatsBaseException):
    """Raised when an illegal order state transition is attempted."""
    default_message = "Illegal state transition attempted."
    default_code = "INVALID_STATE_TRANSITION"
    status_code = status.HTTP_409_CONFLICT


class QuoteExpiredError(SwiftSatsBaseException):
    """Raised when a locked quote has passed its expiry window."""
    default_message = "The locked price quote has expired. Please request a new quote."
    default_code = "QUOTE_EXPIRED"
    status_code = status.HTTP_410_GONE


class PayoutExecutionError(SwiftSatsBaseException):
    """Raised when a blockchain payout fails."""
    default_message = "Crypto payout execution failed."
    default_code = "PAYOUT_FAILED"
    status_code = status.HTTP_502_BAD_GATEWAY


class WebhookSignatureVerificationError(SwiftSatsBaseException):
    """Raised when incoming webhook signature check fails."""
    default_message = "Invalid or missing webhook cryptographic signature."
    default_code = "INVALID_WEBHOOK_SIGNATURE"
    status_code = status.HTTP_401_UNAUTHORIZED


def custom_exception_handler(exc: Exception, context: Dict[str, Any]) -> Optional[Response]:
    """
    Standardized DRF exception handler.
    Ensures all error responses conform to:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "details": {...}
        }
    }
    """
    # First handle custom domain exceptions
    if isinstance(exc, SwiftSatsBaseException):
        logger.warning(
            "Domain exception raised: %s (%s) details: %s",
            exc.message,
            exc.code,
            exc.details
        )
        return Response(
            {
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
            status=exc.status_code,
        )

    # Standard DRF exception handling
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "VALIDATION_ERROR" if response.status_code == 400 else "REQUEST_ERROR"
        if response.status_code == 401:
            error_code = "UNAUTHORIZED"
        elif response.status_code == 403:
            error_code = "FORBIDDEN"
        elif response.status_code == 404:
            error_code = "NOT_FOUND"
        elif response.status_code == 429:
            error_code = "RATE_LIMIT_EXCEEDED"

        # Determine human message
        message = "Request validation failed"
        if isinstance(response.data, dict) and "detail" in response.data:
            message = str(response.data["detail"])
        elif isinstance(response.data, list) and response.data:
            message = str(response.data[0])

        formatted_data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": response.data,
            },
        }
        response.data = formatted_data
        return response

    # Unhandled 500 error
    logger.exception("Unhandled server error: %s", exc)
    return Response(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact support.",
                "details": {},
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
