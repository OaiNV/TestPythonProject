# Design Task Service

This service subscribes to MQTT topics for the DocifyCode system and processes messages related to project status, task registration, and code generation.

## Architecture

The service consists of three main components:

1. **Message Schemas** (`schemas/`): Pydantic models defining the structure of JSON messages for each topic
2. **Message Handlers** (`handlers/`): Business logic for processing each message type
3. **Subscriber Service** (`subscriber.py`): Main service that connects to MQTT and routes messages to handlers

## Project Structure

```
design_task_service/
├── __init__.py                          # Package initialization
├── README.md                             # This documentation file
├── config.py                             # Configuration for topic routing and subscriptions
├── mqtt_service.py                       # MQTT service integration
├── subscriber.py                         # Main MQTT subscriber service
│
├── handlers/                             # Message handlers for each topic
│   ├── __init__.py
│   ├── code_generation_handler.py       # Handles code generation requests
│   ├── gitinfo_handler.py               # Handles project and Git info updates
│   ├── status_handler.py                # Handles processing status updates
│   ├── task_management_handler.py       # Handles task execution management
│   └── task_registration_handler.py     # Handles new task registration
│
├── schemas/                              # Pydantic schemas for message validation
│   ├── __init__.py
│   ├── code_generation_schema.py        # Code generation message schema
│   ├── gitinfo_schema.py                # Git info message schema
│   ├── status_schema.py                 # Status message schema
│   ├── task_management_schema.py        # Task management message schema
│   └── task_registration_schema.py      # Task registration message schema
│
└── test_*.py                             # Test files for various functionality
    ├── test_publisher.py                # Test MQTT publisher
    ├── test_routing.py                  # Test message routing
    └── test_status_wildcard.py          # Test wildcard subscriptions
```

### Key Components

- **`config.py`**: Centralizes topic subscription patterns and routing configuration
- **`subscriber.py`**: Main entry point that connects to MQTT broker and dispatches messages
- **`handlers/`**: Contains handler functions for each message type, implementing business logic
- **`schemas/`**: Pydantic models for validating incoming JSON messages
- **`mqtt_service.py`**: Provides MQTT client integration with the rest of the application

## MQTT Topics

The service subscribes to the following topics:

### 1. Status Topic (with retention)
- **Pattern**: `/docifycode/status/{processing_history_id}`
- **Purpose**: Track processing status
- **Events**:
  - Registered: When generation process is received
  - Updated: During generation process
  - Retention cleared: When generation ends

### 2. Project Info Topic
- **Pattern**: `/docifycode/gitinfo/{project_id}`
- **Purpose**: Manage project and Git repository information
- **Events**:
  - Registered: When AI programming account info is registered
  - Updated: When account info is updated, repository changed, or project deleted

### 3. Task Registration Topic
- **Pattern**: `/docifycode/TaskRegistration/{processing_history_id}`
- **Purpose**: Register new generation tasks
- **Events**:
  - Registered: When generation instruction is received from screen
  - Updated: When canceled from screen

### 4. Task Management Topic
- **Pattern**: `/docifycode/TaskManagement/{processing_history_detail_id}`
- **Purpose**: Manage task execution
- **Events**:
  - Registered: When instructed from each process
  - Updated: No updates

### 5. Code Generation Topic (with retention)
- **Pattern**: `/docifycode/code/{processing_history_id}`
- **Purpose**: Handle code generation requests
- **Events**:
  - Registered: When generation process is received
  - Updated: No updates
  - Retention cleared: When generation completed/error/canceled

## Message Schemas

### StatusMessage
```python
{
    "project_id": str,
    "processing_history_id": str,
    "status": str  # unexecuted/generating/canceling/completed
}
```

### ProjectInfoMessage
```python
{
    "project_id": str,
    "status": str  # new/update/delete
}
```

### TaskRegistrationMessage
```python
{
    "processing_history_id": str,
    "generation_target": str,  # basic_design_fe/be, detail_design_fe/be, etc.
    "generation_target_ids": List[str]
}
```

### TaskManagementMessage
```python
{
    "processing_history_detail_id": str
}
```

### CodeGenerationMessage
```python
{
    "processing_history_id": str,
    "project_id": str,
    "branch_name": str,
    "type": str,  # batch/individual/source_code
    "detail_design_document_ids": Optional[List[str]],
    "source_code_ids": Optional[List[str]],
    "issue": Optional[str]
}
```

## Usage

### Running the Subscriber Service

#### As a standalone script:
```bash
python -m design_task_service.subscriber
```

#### Programmatically:
```python
from design_task_service.subscriber import DesignTaskSubscriber

# Create and start subscriber
subscriber = DesignTaskSubscriber()
subscriber.start()

# Check status
status = subscriber.get_status()
print(status)

# Stop when done
subscriber.stop()
```

### Integrating with Existing Code

```python
from common.mqtt.mqtt_client import MQTTClient
from design_task_service.subscriber import DesignTaskSubscriber

# Use existing MQTT client
mqtt_client = MQTTClient()
subscriber = DesignTaskSubscriber(mqtt_client=mqtt_client)
subscriber.start()
```

## Configuration

The service uses the same MQTT configuration as the rest of the application, defined in `.env`:

```env
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_KEEPALIVE=60
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_QOS=2
```

### Worker Configuration

The service includes retry and timeout settings for worker functions:

```env
# Number of retry attempts for a worker function when it fails
REGISTER_TASK_MAX_RETRY=3

# Maximum execution time (in seconds) for a worker function before timeout
WORKER_TIMEOUT=20
```

**Configuration Details:**
- **REGISTER_TASK_MAX_RETRY**: Controls how many times a failed task will be retried (default: 3)
- **WORKER_TIMEOUT**: Maximum execution time in seconds before a worker is terminated (default: 20)

See [WORKER_CONFIG.md](./WORKER_CONFIG.md) for detailed documentation on worker configuration.

## Implementation Notes

1. **QoS Level**: All subscriptions use QoS 2 (exactly-once delivery) to ensure messages are delivered exactly once
2. **Wildcards**: Topics use MQTT single-level wildcards (`+`) to match any value in the ID position
3. **Retention**: Status and Code Generation topics support message retention for new subscribers
4. **Error Handling**: All handlers include try-catch blocks and logging for debugging
5. **Validation**: Pydantic models automatically validate incoming JSON messages

## Task Management Architecture

The service implements a robust task management system based on infinite polling and concurrent workers.

### 1. Architecture Flow

1.  **Registration**:
    -   MQTT message received on `/docifycode/TaskRegistration/{id}`
    -   Task inserted into MongoDB with `status="generating"` and `final_status="not_processed"`

2.  **Polling Loop (`TaskPoller`)**:
    -   Continuously polls the database (every `TASK_POLL_INTERVAL` seconds)
    -   Queries for tasks where `status="generating"` AND `final_status="not_processed"`
    -   **Dual-Status Locking**: Locks the task by setting `final_status="processing"` to prevent duplicate processing

3.  **Worker Execution**:
    -   Dispatches the task to a specific worker based on `generation_target`
    -   Workers run concurrently, limited by `TASK_CONCURRENT_LIMIT`
    -   **Workers**:
        -   `BasicDesignWorker`: Generates basic design
        -   `SourceCodeWorker`: Generates source code
        -   `UnitTestWorker`: Generates Unit Test Design (UTD) and Unit Test Code (UTC)
        -   `UTCWorker`: Generates Unit Test Code (UTC) only

4.  **Completion**:
    -   Worker inserts generated data into the appropriate collection
    -   Updates task status to `status="completed"` and `final_status="completed"`

5.  **Error Handling & Retry**:
    -   If a worker fails:
        -   Sets `status="error"` **immediately** (for UI feedback)
        -   Increments `execute_count`
        -   If `execute_count < TASK_MAX_RETRY`: Sets `final_status="not_processed"` (to be polled again)
        -   If `execute_count >= TASK_MAX_RETRY`: Sets `final_status="error"` (permanent failure)

### 2. Configuration

New configuration variables in `.env`:

```env
# Task Polling
TASK_POLL_INTERVAL=5        # Poll every 5 seconds
TASK_POLL_BATCH_SIZE=100    # Fetch max 100 tasks per poll
ERROR_RETRY_DELAY=10        # Wait 10s after error in polling loop

# Worker Execution
TASK_CONCURRENT_LIMIT=5     # Max 5 concurrent workers
TASK_MAX_RETRY=3            # Retry failed tasks 3 times
```

## TODO

The message handlers currently log received messages but do not implement the business logic. You should:

1. Implement database operations for persisting message data
2. Add workflow triggers based on message types
3. Implement error handling and retry logic
4. Add metrics and monitoring
5. Complete the ProjectInfoMessage schema (currently TBD)
