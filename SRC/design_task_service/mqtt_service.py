"""
MQTT Service - Singleton service for MQTT client management.
"""

import logging
from typing import Optional

from CEC_DocifyCode_Common.mqtt.mqtt_client import MQTTClient

logger = logging.getLogger(__name__)


class MQTTService:
    """Singleton service for managing MQTT client connection."""

    _instance: Optional["MQTTService"] = None
    _client: Optional[MQTTClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> MQTTClient:
        """Get or create MQTT client instance."""
        if self._client is None:
            self._client = MQTTClient(client_id="design_task_subscriber")
            logger.info("MQTT client initialized")
        return self._client


# Singleton instance
mqtt_service = MQTTService()
