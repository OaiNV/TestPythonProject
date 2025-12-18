"""
Event loop management for the service.

This module provides a global event loop reference that can be accessed
by handlers without causing circular imports.
"""

import asyncio
from typing import Optional

# Global event loop reference for the service
_event_loop: Optional[asyncio.AbstractEventLoop] = None


def get_event_loop() -> Optional[asyncio.AbstractEventLoop]:
    """
    Get the global event loop for the service.

    Returns:
        Optional[asyncio.AbstractEventLoop]: The event loop instance or None
    """
    return _event_loop


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """
    Set the global event loop reference.

    This should be called once when the service starts.

    Args:
        loop: The event loop instance to store globally
    """
    global _event_loop
    _event_loop = loop
