"""
GitInfo message handler for MQTT topic /docifycode/gitinfo/{project_id}.
"""

import logging

from ..schemas.gitinfo_schema import ProjectInfoMessage

logger = logging.getLogger(__name__)


def handle_project_info_message(topic: str, data: dict) -> None:
    """
    Handle project info messages from /docifycode/gitinfo/{project_id}.

    Registered: When AI programming account info is registered
    Updated: When account info is updated, repository changed, or project deleted

    Args:
        topic: MQTT topic
        data: Parsed JSON message data
    """
    try:
        message = ProjectInfoMessage(**data)

        logger.info(
            f"Project info update for {message.project_id}: "
            f"Status: {message.status}"
        )

        # TODO: Implement business logic based on status
        if message.status == "new":
            # Handle new project
            pass
        elif message.status == "update":
            # Handle project update
            pass
        elif message.status == "delete":
            # Handle project deletion
            pass

    except Exception as e:
        logger.error(f"Error handling project info message from {topic}: {e}")
