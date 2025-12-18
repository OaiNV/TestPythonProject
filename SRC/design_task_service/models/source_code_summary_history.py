"""
Source Code Summary History model for MongoDB
"""

import logging
from typing import Optional
from pydantic import Field, BaseModel
from design_task_service.models.base import BaseDocument

logger = logging.getLogger(__name__)


# ===================== Constants & Config =====================
# (No constants needed for this model)


# ===================== Nested Models =====================
class SummaryHistory(BaseModel):
    """Summary history information"""

    summary_id: str = Field(..., description="Summary ID")
    created_at: Optional[str] = Field(
        None, description="Creation date (YYYY-MM-DDTHH:mm:ssZ)"
    )
    updated_at: Optional[str] = Field(
        None, description="Update date (YYYY-MM-DDTHH:mm:ssZ)"
    )
    deleted_at: Optional[str] = Field(
        None, description="Deletion date (YYYY-MM-DDTHH:mm:ssZ)"
    )


# ===================== Main Model =====================
class SourceCodeSummaryHistory(BaseDocument):
    """Source code summary history model for MongoDB collection"""

    project_id: str = Field(..., description="Project ID")
    source_code_id: str = Field(..., description="Source code ID")
    summary_history: SummaryHistory = Field(
        ..., description="Summary history information"
    )

    class Config:
        collection_name = "source_code_summary_history"
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "project_id": "project_123",
                "source_code_id": "source_code_456",
                "summary_history": {
                    "summary_id": "summary_789",
                    "created_at": "2025-01-08T10:00:00Z",
                    "updated_at": "2025-01-08T10:00:00Z",
                    "deleted_at": None,
                },
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z",
                "deleted_at": None,
            }
        }

