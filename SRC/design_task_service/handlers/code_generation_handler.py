"""
Code Generation message handler for MQTT topic /docifycode/code/{processing_history_id}.
"""

import logging

from ..schemas.code_generation_schema import CodeGenerationMessage

logger = logging.getLogger(__name__)


def handle_code_generation_message(topic: str, data: dict) -> None:
    """
    Handle code generation from /docifycode/code/{processing_history_id}.

    This topic has retention enabled.
    Registered: When generation process is received
    Updated: No updates
    Retention cleared: When generation completed/error/canceled

    Args:
        topic: MQTT topic
        data: Parsed JSON message data
    """
    try:
        message = CodeGenerationMessage(**data)

        logger.info(
            f"Code generation for project {message.project_id}: "
            f"History {message.processing_history_id}, "
            f"Type: {message.type}, Branch: {message.branch_name}"
        )

        # TODO: Implement code generation logic based on type
        if message.type == "batch":
            # Handle batch generation from detail design
            logger.info(f"Batch generation requested")
        elif message.type == "individual":
            # Handle individual detail design generation
            logger.info(
                f"Individual generation for designs: "
                f"{message.detail_design_document_ids}"
            )
        elif message.type == "source_code":
            # Handle source code modification
            logger.info(f"Source code modification for: {message.source_code_ids}")

        if message.issue:
            logger.info(f"Issue content: {message.issue}")

    except Exception as e:
        logger.error(f"Error handling code generation message from {topic}: {e}")
