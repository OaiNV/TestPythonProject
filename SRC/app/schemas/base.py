"""
Base schemas - Re-exports from CEC_DocifyCode_Common
"""

# Import all base schemas from Common package
from CEC_DocifyCode_Common.schemas.base import (
    BaseResponse,
    ErrorResponse,
    PaginationResponse,
    DeleteResponse,
    ConflictFileInfo,
    ConflictResponse,
)

__all__ = [
    "BaseResponse",
    "ErrorResponse",
    "PaginationResponse",
    "DeleteResponse",
    "ConflictFileInfo",
    "ConflictResponse",
]

