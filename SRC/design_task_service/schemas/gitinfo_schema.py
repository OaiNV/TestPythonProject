"""
GitInfo message schema for MQTT topic.
"""

from pydantic import BaseModel, Field


class ProjectInfoMessage(BaseModel):
    """
    Message schema for /docifycode/gitinfo/{project_id} topic.

    Attributes:
        project_id: Project ID
        status: Status from screen instruction (新規/更新/削除)
        info: Additional information (TBD)
    """

    project_id: str = Field(..., description="Project ID")
    status: str = Field(..., description="Status: new/update/delete")
    # Note: Additional fields TBD according to requirements
