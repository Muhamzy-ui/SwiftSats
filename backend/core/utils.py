"""
Core utility functions for SwiftSats.
"""
from typing import Optional


def get_client_ip(request) -> Optional[str]:
    """
    Safely extract a single, valid IP address from request headers.
    Handles multi-IP proxy headers (e.g. Cloudflare, Render, AWS ALB)
    to guarantee valid format for PostgreSQL inet column.
    """
    if not request:
        return None

    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        parts = [p.strip() for p in x_forwarded_for.split(",") if p.strip()]
        if parts:
            return parts[0]

    remote_addr = request.META.get("REMOTE_ADDR")
    if remote_addr:
        return remote_addr.strip()

    return None
