"""
Topic routing configuration for MQTT subscriber.

This module defines the mapping between MQTT topics and their handler functions,
as well as subscription settings for each topic.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# ==== MongoDB Configuration ====
# MongoDB connection URL
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")

# MongoDB database name
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "new_app_db")

# ==== Worker Configuration ====
# Number of retry attempts for a worker function when it fails
REGISTER_TASK_MAX_RETRY = int(os.getenv("REGISTER_TASK_MAX_RETRY", "3"))

# Maximum execution time (in seconds) for a worker function before timeout
WORKER_TIMEOUT = int(os.getenv("WORKER_TIMEOUT", "20"))

# ==== Task Polling Configuration ====
# Polling interval in seconds (how often to check for new tasks)
TASK_POLL_INTERVAL = int(os.getenv("TASK_POLL_INTERVAL", "5"))

# Maximum number of tasks to fetch per poll
TASK_POLL_BATCH_SIZE = int(os.getenv("TASK_POLL_BATCH_SIZE", "100"))

# Delay after error in seconds
ERROR_RETRY_DELAY = int(os.getenv("ERROR_RETRY_DELAY", "10"))

# Maximum number of concurrent task executions
TASK_CONCURRENT_LIMIT = int(os.getenv("TASK_CONCURRENT_LIMIT", "5"))

# Maximum number of retry attempts for a failed task
TASK_MAX_RETRY = int(os.getenv("TASK_MAX_RETRY", "3"))


# ==== Handler Imports (after constants to avoid circular imports) ====
# Import handlers using relative import (this module is part of design_task_service package)
from .handlers import (
    handle_status_message,
    handle_project_info_message,
    handle_task_registration_message,
    handle_task_management_message,
    handle_code_generation_message,
)

# Topic routing table: prefix pattern -> handler function
# Used to route incoming messages to the appropriate handler
TOPIC_ROUTES = {
    "/docifycode/status/": handle_status_message,
    "/docifycode/gitinfo/": handle_project_info_message,
    "/docifycode/TaskRegistration/": handle_task_registration_message,
    "/docifycode/TaskManagement/": handle_task_management_message,
    "/docifycode/code/": handle_code_generation_message,
}

# MQTT subscription settings: topic pattern -> settings
# QoS 2 = exactly-once delivery
MQTT_SUBSCRIPTIONS = {
    "/docifycode/status/+": {
        "qos": 2,
        "description": "Processing status updates (with retention)",
    },
    "/docifycode/gitinfo/+": {
        "qos": 2,
        "description": "Project and Git repository information",
    },
    "/docifycode/TaskRegistration/+": {
        "qos": 2,
        "description": "Task registration requests",
    },
    "/docifycode/TaskManagement/+": {
        "qos": 2,
        "description": "Task management commands",
    },
    "/docifycode/code/+": {
        "qos": 2,
        "description": "Code generation requests (with retention)",
    },
}
