"""
MongoDB database connection and configuration
Application-specific initialization logic
"""

import logging
import os
from config_gateway import Config
from app.schemas.access_right import AccessUserCreate

# Set environment variables from Config BEFORE importing CEC_DocifyCode_Common
# This ensures the Database instance reads the correct config
os.environ.setdefault("MONGODB_URL", Config.MONGODB_URL)
os.environ.setdefault("MONGODB_DATABASE", Config.MONGODB_DATABASE)

from CEC_DocifyCode_Common.database import get_database as get_common_database

logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database connection and create default user if needed"""
    logger.info("[init_database] Initializing database")
    try:
        database = await get_common_database()
        await database.connect()
        logger.info("[init_database] Database connected successfully")

        # Initialize default local login if needed
        await _initialize_default_local_login()

        logger.info("[init_database] Database initialized successfully")
    except Exception as e:
        logger.error(f"[init_database] Error initializing database: {e}")
        raise


async def _initialize_default_local_login():
    """Initialize default local login if no logins exist"""
    logger.info(
        "[_initialize_default_local_login] Starting default local login initialization"
    )
    try:
        from app.services.local_login_service import local_login_service
        from app.services.access_right_service import access_right_service

        # Initialize default local login
        success = await local_login_service.initialize_default_local_login()
        data: AccessUserCreate = AccessUserCreate(
            login_id=Config.DEFAULT_USER_EMAIL, permissions=Config.DEFAULT_USER_ROLE
        )
        success_role = await access_right_service.create_access_user(data)

        # logger.info(f"[_access_right_service_init]={success_role}")

        if success and success_role:
            logger.info(
                "[_initialize_default_local_login] Default local login initialization completed"
            )

            # Import mock data after successful local login initialization
            await _import_mock_data()
        else:
            logger.warning(
                "[_initialize_default_local_login] The default user has been created."
            )

    except Exception as e:
        logger.error(
            f"[_initialize_default_local_login] Error during default local login initialization: {e}"
        )
        # Don't raise here to avoid breaking the app startup
        # The app can still run without the default local login


async def _import_mock_data():
    """Import mock data if collections are empty"""
    logger.info("[_import_mock_data] Starting mock data import")
    try:
        from app.services.mock_data_service import mock_data_service

        # Import project mock data
        project_success = await mock_data_service.import_project_mock_data()
        if project_success:
            logger.info(
                "[_import_mock_data] Project mock data import completed successfully"
            )
        else:
            logger.warning("[_import_mock_data] Project mock data import failed")

        # Import user mock data
        user_success = await mock_data_service.import_user_mock_data()
        if user_success:
            logger.info(
                "[_import_mock_data] User mock data import completed successfully"
            )
        else:
            logger.warning("[_import_mock_data] User mock data import failed")

        if project_success and user_success:
            logger.info(
                "[_import_mock_data] All mock data import completed successfully"
            )
        else:
            logger.warning("[_import_mock_data] Some mock data import failed")

    except Exception as e:
        logger.error(f"[_import_mock_data] Error during mock data import: {e}")
        # Don't raise here to avoid breaking the app startup
        # The app can still run without the mock data


async def get_database():
    """Get database instance"""
    logger.debug(
        "[get_database] Returning database instance from CEC_DocifyCode_Common"
    )
    return await get_common_database()
