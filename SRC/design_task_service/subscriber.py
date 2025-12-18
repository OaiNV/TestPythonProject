"""
Design Task Subscriber Service.

This service subscribes to all DocifyCode MQTT topics and processes
incoming messages using the appropriate handlers.
"""

import json
import logging

from .mqtt_service import mqtt_service
from .config import TOPIC_ROUTES, MQTT_SUBSCRIPTIONS
from .service_lifecycle import run_service

logger = logging.getLogger(__name__)


class DesignTaskSubscriber:
    """
    Main subscriber service for DocifyCode design tasks.

    Subscribes to all MQTT topics and routes messages to appropriate handlers
    using configuration-based routing table.
    """

    def __init__(self):
        """
        Initialize the subscriber service.

        Uses the singleton mqtt_service for MQTT client management.
        """
        self.mqtt_client = mqtt_service.get_client()
        self.is_running = False

        logger.info("Design Task Subscriber initialized")

    def start(self) -> bool:
        """
        Start the subscriber service.

        Connects to MQTT broker and subscribes to all topics.

        Returns:
            bool: True if started successfully
        """
        try:
            # Connect to MQTT broker with detailed error logging
            if not self.mqtt_client.connect():
                status = self.mqtt_client.get_status()
                logger.error(
                    f"Failed to connect to MQTT broker at "
                    f"{status['broker_host']}:{status['broker_port']}"
                )
                return False

            logger.info("Connected to MQTT broker")

            # Subscribe to all topics
            self._subscribe_all_topics()

            self.is_running = True
            logger.info("Design Task Subscriber started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start subscriber: {e}", exc_info=True)
            return False

    def stop(self) -> None:
        """Stop the subscriber service and disconnect from MQTT broker."""
        try:
            self.is_running = False
            self.mqtt_client.disconnect()
            logger.info("Design Task Subscriber stopped")
        except Exception as e:
            logger.error(f"Error stopping subscriber: {e}")

    def _subscribe_all_topics(self) -> None:
        """Subscribe to all DocifyCode MQTT topics from configuration."""
        for topic, settings in MQTT_SUBSCRIPTIONS.items():
            self.mqtt_client.subscribe(
                topic, callback=self._route_message, qos=settings["qos"]
            )
            logger.info(f"Subscribed to {topic} - {settings.get('description', '')}")

        logger.info(f"Subscribed to {len(MQTT_SUBSCRIPTIONS)} topic patterns")

    def _route_message(self, topic: str, payload: str) -> None:
        """
        Route incoming messages to appropriate handlers using routing table.

        Parses JSON once before routing to ensure consistent handler interface.

        Args:
            topic: MQTT topic the message was received on
            payload: Message payload (JSON string)
        """
        try:
            # Parse JSON once before routing to ensure consistent handler interface
            # This prevents each handler from needing to parse JSON separately
            try:
                data = json.loads(payload)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from topic {topic}: {e}")
                # Log first 200 chars for debugging (truncate long payloads)
                logger.debug(f"Payload: {payload[:200]}...")
                return

            # Find matching handler using routing table
            # Routes are matched by topic prefix (longest match wins)
            handler = None
            for route_prefix, route_handler in TOPIC_ROUTES.items():
                if topic.startswith(route_prefix):
                    handler = route_handler
                    break

            if handler:
                # Call handler with parsed data (handler is synchronous)
                # Handler will submit async tasks to event loop if needed
                handler(topic, data)
            else:
                logger.warning(f"No handler found for topic: {topic}")

        except Exception as e:
            logger.error(f"Error routing message from {topic}: {e}", exc_info=True)

    def get_status(self) -> dict:
        """
        Get the current status of the subscriber service.

        Returns:
            dict: Status information
        """
        mqtt_status = self.mqtt_client.get_status()
        return {
            "is_running": self.is_running,
            "mqtt_connected": mqtt_status["connected"],
            "subscribed_topics": list(MQTT_SUBSCRIPTIONS.keys()),
            "broker_info": {
                "host": mqtt_status["broker_host"],
                "port": mqtt_status["broker_port"],
            },
        }


# #region Public Functions


def main():
    """
    Main entry point - creates event loop once and runs the service.

    This function delegates service lifecycle management to run_service(),
    which handles event loop creation, initialization, and cleanup.
    """
    from .event_loop import set_event_loop

    # Run the service using lifecycle management
    # set_event_loop callback will be used to store the event loop globally
    run_service(DesignTaskSubscriber, set_event_loop)


# #endregion


if __name__ == "__main__":
    main()
