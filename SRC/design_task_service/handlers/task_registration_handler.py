"""
Task Registration message handler for MQTT topic /docifycode/TaskRegistration/{processing_history_id}.
"""

import asyncio
import logging
from datetime import datetime, timezone

from ..schemas.task_registration_schema import TaskRegistrationMessage
from ..schemas.status_schema import StatusMessage
from ..models.task_execution_history import (
    TaskExecutionHistory,
    GenerationManagement,
    STATUS_GENERATING,
    FINAL_STATUS_NOT_PROCESSED,
)
from ..core.database import get_database
from ..mqtt_service import mqtt_service
from ..event_loop import get_event_loop

logger = logging.getLogger(__name__)


def handle_task_registration_message(topic: str, data: dict) -> None:
    """
    Handle task registration from /docifycode/TaskRegistration/{processing_history_id}.

    Registered: When generation instruction is received from screen
    Updated: When canceled from screen

    Flow:
    1. Validate input message
    2. Create TaskExecutionHistory document
    3. Save to MongoDB collection task_execution_history
    4. Publish status message "generating" with retention

    Args:
        topic: MQTT topic
        data: Parsed JSON message data
    """
    logger.info(f"[handle_task_registration_message] Start - topic={topic}")

    try:
        # Validate and parse message
        message = TaskRegistrationMessage(**data)
        
        # Extract processing_history_id from topic
        # Topic format: /docifycode/TaskRegistration/{processing_history_id}
        try:
            message.processing_history_id = topic.split("/")[-1]
        except IndexError:
            logger.error(f"Invalid topic format: {topic}")
            return

        # Map target_type to generation_target
        message.generation_target = message.target_type

        logger.info(
            f"[handle_task_registration_message] Message parsed - "
            f"processing_history_id={message.processing_history_id}, "
            f"project_id={message.project_id}, "
            f"origin_type={message.origin_type}, "
            f"target_type={message.target_type}, "
            f"generation_target={message.generation_target}, "
            f"generation_target_ids={message.generation_target_ids}"
        )

        # Get the event loop from the service
        # The event loop is created once when the service starts
        loop = get_event_loop()
        if loop is None:
            logger.error("[handle_task_registration_message] No event loop available")
            return

        # Submit the async task to the existing event loop
        # This allows concurrent processing of multiple messages without blocking
        asyncio.run_coroutine_threadsafe(_process_task_registration(message), loop)

        logger.info(
            f"[handle_task_registration_message] Task submitted - "
            f"processing_history_id={message.processing_history_id}"
        )

    except Exception as e:
        logger.error(
            f"[handle_task_registration_message] Error - topic={topic}: {e}",
            exc_info=True,
        )


async def _process_task_registration(message: TaskRegistrationMessage) -> None:
    """
    Process task registration asynchronously.

    Args:
        message: Parsed task registration message
    """
    logger.info(
        f"[_process_task_registration] Start - "
        f"processing_history_id={message.processing_history_id}"
    )

    try:
        # Validate generation_target mapping

        # Get database instance and ensure connection
        db = await get_database()
        if db.database is None:
            logger.warning(
                "[_process_task_registration] Database not connected, connecting now"
            )
            await db.connect()

        # Create GenerationManagement object
        # Use processing_history_id as temporary id (will be updated when generation starts)
        # All timestamps are in UTC timezone
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        generation_management = GenerationManagement(
            id=message.processing_history_id,  # Temporary, will be updated later
            execute_count=0,
            final_status=FINAL_STATUS_NOT_PROCESSED,
            thread_id=None,
            execution_detail_ids=[],
            executed_at=None,
            completed_at=None,
            created_at=now_iso,
            updated_at=now_iso,
            deleted_at=None,
        )

        # Create TaskExecutionHistory document
        task_history = TaskExecutionHistory(
            project_id=message.project_id,
            status=STATUS_GENERATING,
            generation_target=message.generation_target,  # Keep original business description
            generation_management=generation_management,
        )

        # Save to MongoDB
        collection = db.get_collection(TaskExecutionHistory.Config.collection_name)
        task_dict = task_history.to_dict()

        # Insert document
        result = await collection.insert_one(task_dict)
        logger.info(
            f"[_process_task_registration] Document inserted - "
            f"processing_history_id={message.processing_history_id}, "
            f"inserted_id={result.inserted_id}"
        )

        # Publish status message with retention
        await _publish_status_message(
            project_id=message.project_id,
            processing_history_id=message.processing_history_id,
            status="generating",
        )

        logger.info(
            f"[_process_task_registration] Success - "
            f"processing_history_id={message.processing_history_id}"
        )

    except Exception as e:
        logger.error(
            f"[_process_task_registration] Error - "
            f"processing_history_id={message.processing_history_id}: {e}",
            exc_info=True,
        )
        raise


async def _publish_status_message(
    project_id: str, processing_history_id: str, status: str
) -> None:
    """
    Publish status message to MQTT topic with retention.

    Args:
        project_id: Project ID
        processing_history_id: Processing history ID
        status: Status value (e.g., "generating")
    """
    logger.info(
        f"[_publish_status_message] Start - "
        f"processing_history_id={processing_history_id}, status={status}"
    )

    try:
        # Create status message
        status_message = StatusMessage(
            project_id=project_id,
            processing_history_id=processing_history_id,
            status=status,
        )

        # Build topic
        topic = f"/docifycode/status/{processing_history_id}"

        # Get MQTT client and publish with retention
        mqtt_client = mqtt_service.get_client()
        success = mqtt_client.publish(
            topic=topic,
            message=status_message.model_dump(),
            qos=2,
            retain=True,  # Retain message on broker
        )

        if success:
            logger.info(
                f"[_publish_status_message] Success - "
                f"topic={topic}, status={status}"
            )
        else:
            logger.error(
                f"[_publish_status_message] Failed to publish - "
                f"topic={topic}, status={status}"
            )
            raise RuntimeError(f"Failed to publish status message to {topic}")

    except Exception as e:
        logger.error(
            f"[_publish_status_message] Error - "
            f"processing_history_id={processing_history_id}: {e}",
            exc_info=True,
        )
        raise
