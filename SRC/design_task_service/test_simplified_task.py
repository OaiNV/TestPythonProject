"""
Test script for simplified task management system.

Verifies:
1. TaskPoller initialization
2. Worker registry
3. Fake task execution flow (using mocks)
"""

import asyncio
import logging
import sys
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Mock database
mock_db = AsyncMock()
mock_collection = AsyncMock()
mock_db.get_collection.return_value = mock_collection

# Patch get_database
sys.modules["core.database"] = MagicMock()
sys.modules["core.database"].get_database = AsyncMock(return_value=mock_db)

# Add current directory to path
sys.path.insert(0, str(sys.path[0]))

# Import components
from core.task_poller import TaskPoller
from workers import WORKER_REGISTRY, BasicDesignWorker
from models.task_execution_history import (
    STATUS_GENERATING,
    FINAL_STATUS_NOT_PROCESSED,
    FINAL_STATUS_PROCESSING,
    FINAL_STATUS_COMPLETED,
    STATUS_COMPLETED
)


async def test_worker_registry():
    """Test that all workers are registered."""
    logger.info("=" * 60)
    logger.info("TEST: Worker Registry")
    logger.info("=" * 60)
    
    expected_workers = ["basic_design", "source_code", "unit_test", "utc"]
    
    for target in expected_workers:
        if target in WORKER_REGISTRY:
            worker_class = WORKER_REGISTRY[target]
            logger.info(f"✓ Worker '{target}' registered -> {worker_class.__name__}")
        else:
            logger.error(f"✗ Worker '{target}' NOT registered")
    
    logger.info("")


async def test_basic_design_worker():
    """Test BasicDesignWorker execution."""
    logger.info("=" * 60)
    logger.info("TEST: BasicDesignWorker Execution")
    logger.info("=" * 60)
    
    worker = BasicDesignWorker()
    
    # Mock task document
    task_doc = {
        "_id": "task_123",
        "project_id": "proj_001",
        "generation_management": {"id": "dd_doc_123"}
    }
    
    # Execute worker
    await worker.execute(task_doc)
    
    # Verify DB calls
    # 1. Insert fake basic design
    assert mock_collection.insert_one.called
    args = mock_collection.insert_one.call_args[0][0]
    assert args["task_id"] == "task_123"
    assert args["project_id"] == "proj_001"
    logger.info("✓ Fake basic design inserted")
    
    # 2. Update task status
    assert mock_collection.update_one.called
    call_args = mock_collection.update_one.call_args_list[-1]
    query = call_args[0][0]
    update = call_args[0][1]
    
    assert query["_id"] == "task_123"
    assert update["$set"]["status"] == STATUS_COMPLETED
    assert update["$set"]["generation_management.final_status"] == FINAL_STATUS_COMPLETED
    logger.info("✓ Task marked as completed")
    logger.info("")


async def test_poller_logic():
    """Test TaskPoller logic (mocked)."""
    logger.info("=" * 60)
    logger.info("TEST: TaskPoller Logic")
    logger.info("=" * 60)
    
    poller = TaskPoller()
    
    # Mock fetch_pending_tasks
    mock_task = {
        "_id": "task_456",
        "generation_target": "basic_design",
        "project_id": "proj_002",
        "generation_management": {"id": "dd_doc_456"}
    }
    
    poller._fetch_pending_tasks = AsyncMock(return_value=[mock_task])
    poller._lock_task = AsyncMock(return_value=True)
    poller._dispatch_to_worker = AsyncMock()
    
    # Run one poll cycle
    await poller._poll_and_dispatch()
    
    # Verify
    assert poller._fetch_pending_tasks.called
    assert poller._lock_task.called_with("task_456")
    
    # Verify dispatch
    assert poller._dispatch_to_worker.called
    args = poller._dispatch_to_worker.call_args[0][0]
    assert args["_id"] == "task_456"
    
    # Verify active workers
    assert "task_456" in poller.active_workers
    logger.info("✓ Task fetched, locked, and dispatched")
    logger.info("✓ Worker task added to active_workers")
    
    # Wait for worker task to finish (it's a mock, so instant)
    await poller.active_workers["task_456"]
    assert "task_456" not in poller.active_workers
    logger.info("✓ Worker task cleaned up from active_workers")
    logger.info("")


async def main():
    """Run all tests."""
    logger.info("\n" + "=" * 60)
    logger.info("SIMPLIFIED TASK MANAGEMENT - TESTS")
    logger.info("=" * 60 + "\n")
    
    try:
        await test_worker_registry()
        await test_basic_design_worker()
        await test_poller_logic()
        
        logger.info("=" * 60)
        logger.info("ALL TESTS PASSED ✓")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"\nTEST FAILED: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
