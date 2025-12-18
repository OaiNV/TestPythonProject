"""
Helper utility functions
"""
import logging
import re
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from passlib.context import CryptContext
from fastapi import UploadFile
from fastapi import HTTPException
from app.core.error_messages import get_error_response

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_current_utc_time() -> str:
    """
    Get current UTC timestamp as ISO string
    
    Returns:
        ISO formatted UTC timestamp string
    """
    logger.debug("[get_current_utc_time] Start - Getting current UTC time")
    try:
        current_time = datetime.now(timezone.utc).isoformat()
        logger.debug(f"[get_current_utc_time] Success - {current_time}")
        return current_time
    except Exception as e:
        logger.error(f"[get_current_utc_time] Error: {e}")
        raise

def format_datetime(dt: datetime) -> str:
    """Format datetime to ISO string"""
    logger.debug(f"[format_datetime] Formatting datetime: {dt}")
    try:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        formatted = dt.isoformat()
        logger.debug(f"[format_datetime] Formatted datetime: {formatted}")
        return formatted
    except Exception as e:
        logger.error(f"[format_datetime] Error formatting datetime: {e}")
        raise

def is_valid_email(email: str) -> bool:
    """Validate email format"""
    logger.debug(f"[is_valid_email] Validating email: {email}")
    try:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        is_valid = bool(re.match(pattern, email))
        logger.debug(f"[is_valid_email] Email validation result: {is_valid}")
        return is_valid
    except Exception as e:
        logger.error(f"[is_valid_email] Error validating email: {e}")
        return False

def create_data_id() -> str:
    """Create a unique data ID"""
    logger.debug("[create_data_id] Creating data ID")
    try:
        import uuid
        data_id = str(uuid.uuid4())
        logger.debug(f"[create_data_id] Created data ID: {data_id}")
        return data_id
    except Exception as e:
        logger.error(f"[create_data_id] Error creating data ID: {e}")
        raise

def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
    """Sanitize string input"""
    logger.debug(f"[sanitize_string] Sanitizing string: {text[:50]}...")
    try:
        # Remove extra whitespace
        sanitized = re.sub(r'\s+', ' ', text.strip())
        
        # Truncate if max_length specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
            logger.debug(f"[sanitize_string] Truncated to {max_length} characters")
        
        logger.debug(f"[sanitize_string] Sanitized string: {sanitized[:50]}...")
        return sanitized
    except Exception as e:
        logger.error(f"[sanitize_string] Error sanitizing string: {e}")
        raise

def validate_pagination(page: int, per_page: int, max_per_page: int = 100) -> tuple:
    """Validate and normalize pagination parameters"""
    logger.debug(f"[validate_pagination] Validating pagination - page: {page}, per_page: {per_page}")
    try:
        # Ensure page is at least 1
        page = max(1, page)
        
        # Ensure per_page is within limits
        per_page = max(1, min(per_page, max_per_page))
        
        logger.debug(f"[validate_pagination] Validated pagination - page: {page}, per_page: {per_page}")
        return page, per_page
    except Exception as e:
        logger.error(f"[validate_pagination] Error validating pagination: {e}")
        raise

def create_password_hash(password: str) -> str:
    """
    Create a hashed password using bcrypt
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
    """
    logger.debug("[create_password_hash] Start - Hashing password")
    try:
        if not password:
            logger.error("[create_password_hash] Password is empty")
            raise ValueError("Password cannot be empty")
            
        hashed = pwd_context.hash(password)
        logger.debug("[create_password_hash] Success - Password hashed")
        return hashed
    except Exception as e:
        logger.error(f"[create_password_hash] Error: {e}")
        raise

def check_password_match(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain password matches a hashed password
    
    Args:
        plain_password: Plain text password from user input
        hashed_password: Hashed password to compare against
        
    Returns:
        True if passwords match, False otherwise
    """
    logger.debug("[check_password_match] Start - Checking password match")
    try:
        if not plain_password or not hashed_password:
            logger.warning("[check_password_match] Empty password or hash provided")
            return False
            
        is_valid = pwd_context.verify(plain_password, hashed_password)
        logger.debug(f"[check_password_match] Success - Match result: {is_valid}")
        return is_valid
    except Exception as e:
        logger.error(f"[check_password_match] Error: {e}")
        return False

async def validate_file_size_and_type(file: UploadFile, file_extension: str) -> int:
    """
    Validate file size and type, return file size in bytes
    
    Args:
        file: UploadFile object to validate
        file_extension: File extension (e.g., '.md', '.jpg', '.png')
        
    Returns:
        File size in bytes
        
    Raises:
        HTTPException: If file size exceeds limit or extension is invalid
    """
    logger.info(f"[validate_file_size_and_type] Start - file_name={file.filename}, extension={file_extension}")
    
    try:
        # Get max size based on file extension
        if file_extension == '.md':
            max_size_mb = 15  # 15MB for markdown files
        else:
            max_size_mb = 12  # 12MB for image files (.jpg, .jpeg, .png)
        
        max_size_bytes = max_size_mb * 1024 * 1024
        
        # Check file size using content_length if available, otherwise read and check
        if hasattr(file, 'size') and file.size:
            file_size = file.size
        else:
            # Read file content to get size
            file_content = await file.read()
            file_size = len(file_content)
            # Reset file pointer for service to read again
            await file.seek(0)
        
        if file_size > max_size_bytes:
            logger.warning(f"[validate_file_size_and_type] File too large - size={file_size}, max={max_size_bytes}")
            raise HTTPException(
                status_code=413,
                detail=get_error_response(413, f"ファイルサイズが{max_size_mb}MBを超えています。").dict()
            )
        
        logger.info(f"[validate_file_size_and_type] Success - file_size={file_size}")
        return file_size
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[validate_file_size_and_type] Error: {e}")
        raise HTTPException(status_code=500, detail=get_error_response(500).dict())

def is_valid_file_extension(file_extension: str) -> bool:
    """
    Check if file extension is allowed
    
    Args:
        file_extension: File extension to check (e.g., '.md', '.jpg')
        
    Returns:
        True if extension is allowed, False otherwise
    """
    logger.debug(f"[is_valid_file_extension] Checking extension: {file_extension}")
    
    try:
        allowed_extensions = ['.md', '.jpg', '.jpeg', '.png']
        is_valid = file_extension in allowed_extensions
        
        logger.debug(f"[is_valid_file_extension] Extension {file_extension} valid: {is_valid}")
        return is_valid
        
    except Exception as e:
        logger.error(f"[is_valid_file_extension] Error: {e}")
        return False
