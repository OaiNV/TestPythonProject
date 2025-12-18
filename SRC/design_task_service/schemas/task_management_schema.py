"""
Task Management message schema for MQTT topic.
"""

from pydantic import BaseModel, Field


class TaskManagementMessage(BaseModel):
    """
    Message schema for /docifycode/TaskManagement/{processing_history_detail_id} topic.

    Attributes:
        processing_history_detail_id: Processing history detail ID
    """

    processing_history_detail_id: str = Field(
        ..., description="Processing history detail ID"
    )
