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
        """
        Get or create MQTT client instance.

        Returns:
            MQTTClient: Connected MQTT client instance

        Raises:
            ConnectionError: If failed to connect to MQTT broker
        """
        if self._client is None:
            self._client = MQTTClient(client_id="api_test_publisher")
            if not self._client.connect():
                logger.error("Failed to connect to MQTT broker")
                raise ConnectionError(
                    "Failed to connect to MQTT broker. "
                    "Please check broker configuration and availability."
                )
            logger.info("MQTT client initialized and connected")
        return self._client

    def test_connection(self) -> dict:
        """Test MQTT connection and return status."""
        client = self.get_client()
        status_info = client.get_status()

        return {
            "mqtt_connected": status_info["connected"],
            "broker_host": status_info["broker_host"],
            "broker_port": status_info["broker_port"],
            "message": (
                "MQTT client is ready"
                if status_info["connected"]
                else "MQTT client is not connected"
            ),
        }


# Singleton instance
mqtt_service = MQTTService()
