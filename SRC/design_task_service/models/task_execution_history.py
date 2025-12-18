"""
Task Execution History model for MongoDB
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
STATUS_CANCELED = "canceled"

# Generation target constants
# From Detail design document:
GENERATION_TARGET_BASIC_DESIGN = "basic_design"  # Basic design (RE) generation
GENERATION_TARGET_SOURCE_CODE = "source_code"  # Source code generation
GENERATION_TARGET_UNIT_TEST = "unit_test"
GENERATION_TARGET_UTC = "utc"

# From Source code:
GENERATION_TARGET_DETAIL_DESIGN = "detail_design"  # Detail design document generation

# From Unit test specification:
GENERATION_TARGET_UNIT_TEST_CODE = "unit_test"  # Unit test code generation

# Final status constants
FINAL_STATUS_NOT_PROCESSED = "not_processed"
FINAL_STATUS_PROCESSING = "processing"  # New: for locking tasks during execution
FINAL_STATUS_COMPLETED = "completed"
FINAL_STATUS_ERROR = "error"

# Generation object type constants
GENERATION_OBJECT_BASIC_DESIGN = "basic_design"
GENERATION_OBJECT_DETAIL_DESIGN = "detail_design"
GENERATION_OBJECT_SOURCE_CODE = "source_code"
GENERATION_OBJECT_UNIT_TEST = "unit_test"
GENERATION_OBJECT_UTC = "utc"


# ===================== Nested Models =====================
class GenerationManagement(BaseModel):
    """Generation management object"""

    id: str = Field(
        ...,
        description="ID of the generation object. Specify ID below corresponding to generation object: requirement_document, basic_design, detail_design_document, source_code, unit_test",
    )
    execute_count: int = Field(
        default=0,
        description="Number of executions (Number of retries when error occurs)",
    )
    final_status: str = Field(
        default=FINAL_STATUS_NOT_PROCESSED,
        description="Final status (Not processed/Completed/Error)",
    )
    thread_id: Optional[str] = Field(
        None,
        description="Thread ID for generation processing / summary processing",
    )
    execution_detail_ids: List[str] = Field(
        default_factory=list,
        description="IDs for AI log/Error log. Specify when starting thread",
    )
    executed_at: Optional[str] = Field(
        None,
        description="Execution datetime. Specify the latest execution datetime",
    )
    completed_at: Optional[str] = Field(
        None,
        description="Completion datetime. Specify the latest completion datetime (record even when error occurs)",
    )


# ===================== Main Model =====================
class TaskExecutionHistory(BaseDocument):
    """Task execution history model for MongoDB collection"""

    project_id: str = Field(..., description="Project ID")
    status: str = Field(
        default=STATUS_GENERATING,
        description="Processing status of overall (Generating/Completed/Error/Canceled)",
    )
    generation_target: str = Field(
        ...,
        description="Generation target. From Detail design document: basic_design, source_code, unit_test. From Source code: detail_design, unit_test_FE. From Unit test specification: unit_test_code",
    )
    generation_management: GenerationManagement = Field(
        ..., description="Generation management"
    )
    created_at: Optional[str] = Field(
        None, description="Creation date (YYYY-MM-DDTHH:mm:ssZ)"
    )
    updated_at: Optional[str] = Field(
        None, description="Update date (YYYY-MM-DDTHH:mm:ssZ)"
    )
    deleted_at: Optional[str] = Field(
        None, description="Deletion date (YYYY-MM-DDTHH:mm:ssZ)"
    )

    class Config:
        collection_name = "task_execution_history"
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "project_id": "project_123",
                "status": "Generating",
                "generation_target": "basic_design",
                "generation_management": {
                    "id": "basic_design_456",
                    "execute_count": 0,
                    "final_status": "Not processed",
                    "thread_id": None,
                    "execution_detail_ids": [],
                    "executed_at": None,
                    "completed_at": None,
                    "created_at": "2025-01-08T10:00:00Z",
                    "updated_at": "2025-01-08T10:00:00Z",
                    "deleted_at": None,
                },
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z",
                "deleted_at": None,
            }
        }
