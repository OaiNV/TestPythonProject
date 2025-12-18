"""
Status message handler for MQTT topic /docifycode/status/{processing_history_id}.
"""

import logging

from ..schemas.status_schema import StatusMessage

logger = logging.getLogger(__name__)


def handle_status_message(topic: str, data: dict) -> None:
    """
    Handle status messages from /docifycode/status/{processing_history_id}.

    This topic has retention enabled and is used to track processing status.
    - Registered: When generation process is received
    - Updated: During generation process
    - Retention cleared: When generation ends

    Args:
        topic: MQTT topic
        data: Parsed JSON message data
    """
    try:
        message = StatusMessage(**data)

        logger.info(
            f"Status update for project {message.project_id}: "
            f"History {message.processing_history_id} - Status: {message.status}"
        )

        # TODO: Implement business logic
        # Example: Update database, trigger workflows, etc.

    except Exception as e:
        logger.error(f"Error handling status message from {topic}: {e}")
