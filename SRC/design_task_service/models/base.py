"""
Base model class for MongoDB documents
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId

logger = logging.getLogger(__name__)


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return ObjectId(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, handler):
        return {"type": "string"}


class BaseDocument(BaseModel):
    """Base document model for MongoDB"""

    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        use_enum_values = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        logger.debug(f"[to_dict] Converting {self.__class__.__name__} to dict")
        try:
            data = self.model_dump(by_alias=True, exclude_none=True)
            if "_id" in data and data["_id"] is None:
                del data["_id"]
            return data
        except Exception as e:
            logger.error(f"[to_dict] Error converting to dict: {e}")
            raise

    def update_timestamp(self):
        """Update the updated_at timestamp"""
        logger.debug(
            f"[update_timestamp] Updating timestamp for {self.__class__.__name__}"
        )
        self.updated_at = datetime.now(timezone.utc)

