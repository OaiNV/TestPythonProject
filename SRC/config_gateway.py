"""
API Gateway configuration settings
"""

import os
from dotenv import load_dotenv

# Load .env from parent directory (same as old app)
load_dotenv(override=True)


class DevelopmentConfig:
    """Development configuration"""

    DEBUG = True
    ENVIRONMENT = "development"

    # App settings
    APP_NAME = "New App"
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")
    )  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    )  # 7 days

    # Database settings - MongoDB for new app
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "new_app_db")

    # User settings (reuse from old app)
    IS_LOCAL_USER = os.getenv("IS_LOCAL_USER", "1") == "1"
    IS_ADMIN = os.getenv("IS_ADMIN", "0") == "1"
    USERID = os.getenv("USERID", "local@local")
    USER_NAME = os.getenv("USER_NAME", "Local User")
    USEREMAIL = os.getenv("USEREMAIL", "local@local")
    USER_GROUP = [os.getenv("USER_GROUP", "test")]

    # Default user settings for initial setup
    DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "123456")
    DEFAULT_USER_NAME = os.getenv("DEFAULT_USER_NAME", "Admin")
    DEFAULT_USER_EMAIL = os.getenv("DEFAULT_USER_EMAIL", "admin@admin.com")
    DEFAULT_USER_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "admin123")
    DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "admin")

    # File settings (reuse from old app)
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB in bytes
    MAX_LENGTH_NAME = int(os.getenv("MAX_LENGTH_NAME", 100))
    MAX_LENGTH_EMAIL = int(os.getenv("MAX_LENGTH_EMAIL", 254))
    MAX_LENGTH_PASS = int(os.getenv("MAX_LENGTH_PASS", 64))
    MAX_LENGTH_DESCRIPTION = int(os.getenv("MAX_LENGTH_DESCRIPTION", 1000))
    MAX_LENGTH_COMMENT = int(os.getenv("MAX_LENGTH_COMMENT", 1000))

    # Pagination settings (reuse from old app)
    DEFAULT_PAGE = int(os.getenv("DEFAULT_PAGE", 1))
    DEFAULT_PER_PAGE = int(os.getenv("DEFAULT_PER_PAGE", 20))
    DEFAULT_MAX_PER_PAGE = int(os.getenv("DEFAULT_MAX_PER_PAGE", 100))

    # API Gateway settings
    CORS_ORIGINS = ["*"]
    ALLOWED_HOSTS = ["*"]
    RATE_LIMIT_ENABLED = True
    REQUEST_TIMEOUT = 30
    # Git settings
    GIT_CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", 1))  # Default: 1 minute

    # Java settings for PlantUML
    JAVA_PATH = os.getenv("JAVA_PATH", "")


class ProductionConfig:
    """Production configuration"""

    DEBUG = False
    ENVIRONMENT = "production"

    # App settings
    APP_NAME = "New App"
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")
    )  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    )  # 7 days

    # Database settings - MongoDB for new app
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "new_app_db")

    # User settings (reuse from old app)
    IS_ADMIN = os.getenv("IS_ADMIN", "0") == "1"
    USERID = os.getenv("USERID", "local@local")
    USER_NAME = os.getenv("USER_NAME", "Local User")
    USEREMAIL = os.getenv("USEREMAIL", "local@local")
    USER_GROUP = [os.getenv("USER_GROUP", "test")]

    # Default user settings for initial setup
    DEFAULT_USER_NAME = os.getenv("DEFAULT_USER_NAME", "Admin User")
    DEFAULT_USER_EMAIL = os.getenv("DEFAULT_USER_EMAIL", "admin@local")
    DEFAULT_USER_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "admin123")
    DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "admin")

    # File settings (reuse from old app)
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB in bytes

    MAX_LENGTH_NAME = int(os.getenv("MAX_LENGTH_NAME", 100))
    MAX_LENGTH_EMAIL = int(os.getenv("MAX_LENGTH_EMAIL", 254))
    MAX_LENGTH_PASS = int(os.getenv("MAX_LENGTH_PASS", 64))
    MAX_LENGTH_DESCRIPTION = int(os.getenv("MAX_LENGTH_DESCRIPTION", 1000))
    MAX_LENGTH_COMMENT = int(os.getenv("MAX_LENGTH_COMMENT", 1000))

    # Pagination settings (reuse from old app)
    DEFAULT_PAGE = int(os.getenv("DEFAULT_PAGE", 1))
    DEFAULT_PER_PAGE = int(os.getenv("DEFAULT_PER_PAGE", 20))
    DEFAULT_MAX_PER_PAGE = int(os.getenv("DEFAULT_MAX_PER_PAGE", 100))

    # API Gateway settings
    CORS_ORIGINS = ["*"]
    ALLOWED_HOSTS = ["*"]
    RATE_LIMIT_ENABLED = True
    REQUEST_TIMEOUT = 30

    # Git settings
    GIT_CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", 1))  # Default: 1 minute

    # Java settings for PlantUML
    JAVA_PATH = os.getenv("JAVA_PATH", "")


# Get environment
environment = os.getenv("ENV", "development")
Config = ProductionConfig if environment == "production" else DevelopmentConfig
