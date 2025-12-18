"""
Task Management message handler for MQTT topic /docifycode/TaskManagement/{processing_history_detail_id}.
"""

import logging

from ..schemas.task_management_schema import TaskManagementMessage

logger = logging.getLogger(__name__)


def handle_task_management_message(topic: str, data: dict) -> None:
    """
    Handle task management from /docifycode/TaskManagement/{processing_history_detail_id}.

    Registered: When instructed from each process
    Updated: No updates
    
    Flow:
    1. Parse TaskManagementMessage
    2. Log message (TaskPoller will pick up task from DB automatically)

    Args:
        topic: MQTT topic
        data: Parsed JSON message data
    """
    logger.info(f"[handle_task_management_message] Start - topic={topic}")
    
    try:
        message = TaskManagementMessage(**data)

        logger.info(
            f"[handle_task_management_message] Message parsed - "
            f"processing_history_detail_id={message.processing_history_detail_id}"
        )
        
        # Note: We don't need to explicitly enqueue tasks anymore.
        # The TaskPoller loop will automatically pick up tasks with status="generating"
        # and final_status="not_processed" from the database.
        
        logger.info(
            f"[handle_task_management_message] Task logged - "
            f"Poller will pick up task {message.processing_history_detail_id}"
        )

    except Exception as e:
        logger.error(
            f"[handle_task_management_message] Error - topic={topic}: {e}",
            exc_info=True,
        )


# Removed _enqueue_task function as it is no longer needed
