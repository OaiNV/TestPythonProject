"""
Task Registration message schema for MQTT topic.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class TaskRegistrationMessage(BaseModel):
    """
    Message schema for /docifycode/TaskRegistration/{processing_history_id} topic.

    Attributes:
        processing_history_id: Processing history ID used in the topic
        project_id: Project ID
        generation_target: Type of document to generate (business description, can be Japanese/Vietnamese)
        generation_target_ids: Optional array of IDs for the generation targets.
            If not provided or empty, all files from source collection will be used.
    """

    processing_history_id: Optional[str] = Field(
        default=None, description="Processing history ID (extracted from topic)"
    )
    project_id: str = Field(..., description="Project ID")
    origin_type: str = Field(..., description="Origin type (e.g., requirement)")
    target_type: str = Field(..., description="Target type (e.g., basic_design)")
    generation_target: Optional[str] = Field(
        default=None,
        description="Generation target (mapped from target_type)",
    )
    generation_target_ids: Optional[List[str]] = Field(
        default=None,
        description=(
            "Optional array of generation target IDs. "
            "If not provided or empty, all files from source collection will be used."
        ),
    )
