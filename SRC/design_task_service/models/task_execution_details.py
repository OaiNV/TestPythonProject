"""
Task Execution Details model for MongoDB
"""

import logging
from typing import List, Optional
from pydantic import Field, BaseModel
from design_task_service.models.base import BaseDocument

logger = logging.getLogger(__name__)


# ===================== Constants & Config =====================
# Status constants
STATUS_GENERATING = "generating"
STATUS_COMPLETED = "completed"
STATUS_ERROR = "error"

# Log type constants
LOG_TYPE_INFO = "info"
LOG_TYPE_ERROR = "error"


# ===================== Nested Models =====================
class LogEntry(BaseModel):
    """Log entry for AI log or Error log"""

    timestamp: str = Field(..., description="Log timestamp (YYYY-MM-DDTHH:mm:ssZ)")
    message: str = Field(..., description="Log message")
    type: str = Field(default=LOG_TYPE_INFO, description="Log type (info/error)")


# ===================== Main Model =====================
class TaskExecutionDetails(BaseDocument):
    """Task execution details model for MongoDB collection"""

    task_execution_history_id: str = Field(
        ...,
        description="Task execution history ID. Specify ID for task execution history details",
    )
    status: str = Field(
        default=STATUS_GENERATING,
        description="Status (generating/completed/error)",
    )
    project_id: str = Field(..., description="Project ID")
    logs: List[LogEntry] = Field(
        default_factory=list,
        description="Execution logs. AI log/Error log. Save log each time execution occurs",
    )

    class Config:
        collection_name = "task_execution_details"
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "task_execution_history_id": "history_123",
                "status": "generating",
                "project_id": "project_456",
                "logs": [
                    {
                        "timestamp": "2025-01-08T10:00:00Z",
                        "message": "Starting code generation",
                        "type": "info",
                    },
                    {
                        "timestamp": "2025-01-08T10:01:00Z",
                        "message": "Generation completed successfully",
                        "type": "info",
                    },
                ],
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:01:00Z",
                "deleted_at": None,
            }
        }
