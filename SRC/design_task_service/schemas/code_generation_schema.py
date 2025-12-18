"""
Code Generation message schema for MQTT topic.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CodeGenerationMessage(BaseModel):
    """
    Message schema for /docifycode/code/{processing_history_id} topic.

    Attributes:
        processing_history_id: Processing history ID used in topic
        project_id: Project ID
        branch_name: Branch name for source code generation
        type: Generation type (一括/個別/ソースコード)
        detail_design_document_ids: Detail design document IDs (when type is detail design)
        source_code_ids: Source code IDs (when type is source code)
        issue: Issued content
    """

    processing_history_id: str = Field(
        ..., description="Processing history ID used in topic"
    )
    project_id: str = Field(..., description="Project ID")
    branch_name: str = Field(..., description="Branch name for source code generation")
    type: str = Field(
        ...,
        description=(
            "Generation type: "
            "batch (一括) / individual (個別) / source_code (ソースコード)"
        ),
    )
    detail_design_document_ids: Optional[List[str]] = Field(
        None, description="Detail design document IDs (for detail design generation)"
    )
    source_code_ids: Optional[List[str]] = Field(
        None, description="Source code IDs (for source code modification)"
    )
    issue: Optional[str] = Field(None, description="Issue content")
