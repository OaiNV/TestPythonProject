"""
Common constants - Re-exports from CEC_DocifyCode_Common
"""

from uuid6 import uuid7

# Import all constants from Common package
from CEC_DocifyCode_Common.utils.constants import (
    FileStatus,
    ContentType,
    ProgrammingLanguages,
    SyncStatus,
    BaseSpecification,
    GitType,
    LanguageType,
    DataManagementType,
    PermissionLevel,
)

# Import collection constants
from CEC_DocifyCode_Common.utils.collection_constants import (
    UNIT_TEST_COLLECTION_MAP,
    DATA_MANAGEMENT_COLLECTION_MAP,
)

# Local constants specific to this project
TASK_REGISTRATION_TOPIC = f"/docifycode/TaskRegistration/{str(uuid7())}"

# Directory names
DOCIFYCODE_DIRECTORY_NAME = "Docifycode"


# HTTP Status Codes - Keep this local as it's project-specific
class HTTPStatus:
    """HTTP status code constants"""

    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500


# Rate Limiting - Keep this local as it's project-specific
class RateLimits:
    """Rate limiting constants"""

    PROJECT_GET = "200/minute"
    PROJECT_CREATE = "10/minute"
    PROJECT_UPDATE = "20/minute"
    PROJECT_DELETE = "10/minute"
    REQUIREMENT_DOC_GET = "200/minute"
    REQUIREMENT_DOC_UPLOAD = "10/minute"
    COMMENT_CREATE = "50/minute"


__all__ = [
    # From Common
    "FileStatus",
    "ContentType",
    "ProgrammingLanguages",
    "SyncStatus",
    "BaseSpecification",
    "GitType",
    "LanguageType",
    "DataManagementType",
    "PermissionLevel",
    "UNIT_TEST_COLLECTION_MAP",
    "DATA_MANAGEMENT_COLLECTION_MAP",
    # Local
    "TASK_REGISTRATION_TOPIC",
    "DOCIFYCODE_DIRECTORY_NAME",
    "HTTPStatus",
    "RateLimits",
]
