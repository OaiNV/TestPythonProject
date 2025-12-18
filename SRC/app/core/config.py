"""
Config accessor for the new app.

This module provides a single entrypoint `get_config()` that returns the
configuration object sourced from `new_app/config_gateway.py`.
"""

from typing import Any

# Import the unified Config (environment-resolved) from config_gateway
from config_gateway import Config as GatewayConfig

_cached_config: Any = None


def get_config() -> Any:
    """Return the resolved configuration object from config_gateway.

    We cache the result to avoid repeated imports/initialization. The returned
    object is the `Config` class from `config_gateway` (already resolved to the
    proper environment), which exposes configuration values as class attributes.
    """
    global _cached_config
    if _cached_config is None:
        _cached_config = GatewayConfig
    return _cached_config


