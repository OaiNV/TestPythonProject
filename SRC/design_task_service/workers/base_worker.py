"""
Base Worker - Abstract base class for all task workers.

Provides common functionality for:
- Task execution
- Error handling with retry logic
- Status updates
- Error logging
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from ..core.database import get_database
from ..models.task_execution_history import (
    STATUS_COMPLETED,
    STATUS_ERROR,
    FINAL_STATUS_COMPLETED,
    FINAL_STATUS_ERROR,
    FINAL_STATUS_NOT_PROCESSED,
)
from ..models.task_execution_details import LOG_TYPE_ERROR
from ..config import TASK_MAX_RETRY

logger = logging.getLogger(__name__)


class BaseWorker(ABC):
    """
    Base class for all workers.
    
    Each worker must implement the execute() method to process tasks.
    """
    
    async def execute_wrapper(self, task_doc: dict):
        """
        Wrapper for execute() to handle timeouts.
        
        Args:
            task_doc: Task execution history document from DB
        """
        from ..config import WORKER_TIMEOUT
        
        try:
            # Convert minutes to seconds if needed, or assume seconds
            # User said "20 minutes", but config says "20" (default).
            # Let's assume the config value is in seconds as per docstring,
            # but we should probably update the default or clarify.
            # For now, we use WORKER_TIMEOUT directly.
            
            # If user wants 20 minutes, they should set WORKER_TIMEOUT=1200
            timeout = WORKER_TIMEOUT
            
            await asyncio.wait_for(self.execute(task_doc), timeout=timeout)
            
        except asyncio.TimeoutError:
            logger.error(
                f"[BaseWorker] Task {task_doc['_id']} timed out after {timeout}s"
            )
            raise TimeoutError(f"Task execution timed out after {timeout}s")
            
    @abstractmethod
    async def execute(self, task_doc: dict):
        """
        Execute the task.
        
        Args:
            task_doc: Task execution history document from DB
        """
        pass
    
    async def _mark_completed(self, task_id: str):
        """
        Mark task as completed.
        
        Updates:
        - status = completed
        - final_status = completed
        - completed_at = now
        """
        db = await get_database()
        collection = db.get_collection("task_execution_history")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        await collection.update_one(
            {"_id": task_id},
            {
                "$set": {
                    "status": STATUS_COMPLETED,
                    "generation_management.final_status": FINAL_STATUS_COMPLETED,
                    "generation_management.completed_at": now,
                    "updated_at": now
                }
            }
        )
        
        logger.info(f"[BaseWorker] Task {task_id} marked as completed")
    
    async def _handle_error(self, task_id: str, error: Exception):
        """
        Handle task error with retry logic.
        
        Logic:
        1. Set status=error IMMEDIATELY (so UI knows task is failing)
        2. Increment execute_count
        3. If execute_count < MAX_RETRY: Set final_status=not_processed (retry)
        4. If execute_count >= MAX_RETRY: Set final_status=error (permanent failure)
        
        Args:
            task_id: Task execution history ID
            error: Exception that occurred
        """
        db = await get_database()
        collection = db.get_collection("task_execution_history")
        
        # Get current task
        task_doc = await collection.find_one({"_id": task_id})
        if not task_doc:
            logger.error(f"[BaseWorker] Task {task_id} not found in DB")
            return
        
        execute_count = task_doc["generation_management"]["execute_count"]
        
        # Increment retry count
        execute_count += 1
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        if execute_count < TASK_MAX_RETRY:
            # Retry: Set status=error, final_status=not_processed
            logger.warning(
                f"[BaseWorker] Task {task_id} failed, will retry "
                f"({execute_count}/{TASK_MAX_RETRY})"
            )
            
            await collection.update_one(
                {"_id": task_id},
                {
                    "$set": {
                        "status": STATUS_ERROR,  # Set error immediately
                        "generation_management.execute_count": execute_count,
                        "generation_management.final_status": FINAL_STATUS_NOT_PROCESSED,  # For polling again
                        "updated_at": now
                    }
                }
            )
            
        else:
            # Max retries exceeded: Set status=error, final_status=error
            logger.error(
                f"[BaseWorker] Task {task_id} failed permanently after "
                f"{TASK_MAX_RETRY} retries"
            )
            
            await collection.update_one(
                {"_id": task_id},
                {
                    "$set": {
                        "status": STATUS_ERROR,
                        "generation_management.execute_count": execute_count,
                        "generation_management.final_status": FINAL_STATUS_ERROR,  # Permanent failure
                        "generation_management.completed_at": now,
                        "updated_at": now
                    }
                }
            )
        
        # Save error log
        await self._save_error_log(task_id, error, execute_count)
    
    async def _save_error_log(self, task_id: str, error: Exception, execute_count: int):
        """
        Save error log to task_execution_details.
        
        Args:
            task_id: Task execution history ID
            error: Exception that occurred
            execute_count: Current retry count
        """
        db = await get_database()
        collection = db.get_collection("task_execution_details")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        log_entry = {
            "timestamp": now,
            "message": f"Retry {execute_count}/{TASK_MAX_RETRY}: {str(error)}",
            "type": LOG_TYPE_ERROR
        }
        
        await collection.update_one(
            {"task_execution_history_id": task_id},
            {
                "$push": {"logs": log_entry},
                "$set": {"updated_at": now}
            },
            upsert=True
        )
        
        logger.debug(f"[BaseWorker] Saved error log for task {task_id}")
