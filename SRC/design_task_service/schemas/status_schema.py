"""
Status message schema for MQTT topic.
"""

from pydantic import BaseModel, Field


class StatusMessage(BaseModel):
    """
    Message schema for /docifycode/status/{processing_history_id} topic.

    Attributes:
        project_id: Project ID
        processing_history_id: Processing history ID
        status: Processing status (未実行/生成中/キャンセル中/完了)
    """

    project_id: str = Field(..., description="Project ID")
    processing_history_id: str = Field(..., description="Processing history ID")
    status: str = Field(
        ..., description="Processing status: unexecuted/generating/canceling/completed"
    )
