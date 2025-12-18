"""
Task Poller - Infinite loop to poll and dispatch tasks from database.

This module implements the polling mechanism that:
1. Continuously queries DB for pending tasks
2. Locks tasks using dual-status mechanism
3. Dispatches tasks to appropriate workers
4. Manages concurrent worker execution
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

from .database import get_database
from ..models.task_execution_history import (
    STATUS_GENERATING,
    FINAL_STATUS_NOT_PROCESSED,
)
from ..config import (
    TASK_POLL_INTERVAL,
    TASK_POLL_BATCH_SIZE,
    ERROR_RETRY_DELAY,
    TASK_CONCURRENT_LIMIT,
)

logger = logging.getLogger(__name__)


class TaskPoller:
    """
    Infinite loop to poll tasks from DB and dispatch to workers.
    
    Features:
    - Infinite polling loop
    - Dual-status locking (status + final_status)
    - Concurrent worker execution with semaphore
    - Automatic task dispatch based on generation_target
    """
    
    def __init__(self):
        """Initialize TaskPoller."""
        self.is_running = False
        self.active_workers: Dict[str, asyncio.Task] = {}
        self.semaphore = asyncio.Semaphore(TASK_CONCURRENT_LIMIT)
        self._polling_task: Optional[asyncio.Task] = None
        
        logger.info(
            f"[TaskPoller] Initialized with concurrent_limit={TASK_CONCURRENT_LIMIT}"
        )
    
    async def start(self):
        """Start polling loop."""
        self.is_running = True
        self._polling_task = asyncio.current_task()
        logger.info("[TaskPoller] Started")
        
        try:
            while self.is_running:
                try:
                    await self._poll_and_dispatch()
                    await asyncio.sleep(TASK_POLL_INTERVAL)
                except asyncio.CancelledError:
                    logger.info("[TaskPoller] Polling loop cancelled")
                    break
                except Exception as e:
                    logger.error(f"[TaskPoller] Error in polling loop: {e}", exc_info=True)
                    await asyncio.sleep(ERROR_RETRY_DELAY)
        finally:
            self.is_running = False
            logger.info("[TaskPoller] Polling loop finished")
    
    async def stop(self):
        """Stop polling loop gracefully."""
        logger.info("[TaskPoller] Stopping...")
        self.is_running = False
        
        # Cancel polling task if it's sleeping
        if self._polling_task and not self._polling_task.done():
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
        
        # Wait for active workers to complete
        if self.active_workers:
            logger.info(f"[TaskPoller] Waiting for {len(self.active_workers)} active workers...")
            await asyncio.gather(*self.active_workers.values(), return_exceptions=True)
        
        logger.info("[TaskPoller] Stopped")
    
    async def _poll_and_dispatch(self):
        """Poll DB and dispatch tasks to workers."""
        # Fetch pending tasks
        tasks = await self._fetch_pending_tasks()
        
        if tasks:
            logger.info(f"[TaskPoller] Found {len(tasks)} pending tasks")
        
        for task_doc in tasks:
            task_id = str(task_doc["_id"])
            
            # Skip if already processing
            if task_id in self.active_workers:
                logger.debug(f"[TaskPoller] Task {task_id} already processing, skipping")
                continue
            
            # Check semaphore (worker limit)
            if self.semaphore.locked():
                logger.debug("[TaskPoller] Worker limit reached, will retry next poll")
                break
            
            # Lock task in DB
            locked = await self._lock_task(task_id)
            if not locked:
                logger.debug(f"[TaskPoller] Failed to lock task {task_id}, skipping")
                continue
            
            # Dispatch to worker
            worker_task = asyncio.create_task(
                self._execute_with_semaphore(task_doc)
            )
            self.active_workers[task_id] = worker_task
            
            # Cleanup when done
            worker_task.add_done_callback(
                lambda t, tid=task_id: self.active_workers.pop(tid, None)
            )
    
    async def _fetch_pending_tasks(self):
        """
        Query DB for tasks that need processing.
        
        Conditions:
        - status = generating
        - final_status = not_processed
        
        Returns:
            List of task documents
        """
        db = await get_database()
        collection = db.get_collection("task_execution_history")
        
        return await collection.find({
            "status": STATUS_GENERATING,
            "generation_management.final_status": FINAL_STATUS_NOT_PROCESSED
        }).to_list(length=TASK_POLL_BATCH_SIZE)
    
    async def _lock_task(self, task_id: str) -> bool:
        """
        Lock task by updating final_status = processing.
        
        Uses atomic update to prevent race conditions.
        
        Args:
            task_id: Task execution history ID
            
        Returns:
            True if locked successfully, False if task was already locked
        """
        db = await get_database()
        collection = db.get_collection("task_execution_history")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        result = await collection.update_one(
            {
                "_id": task_id,
                "generation_management.final_status": FINAL_STATUS_NOT_PROCESSED
            },
            {
                "$set": {
                    "generation_management.final_status": "processing",
                    "updated_at": now
                }
            }
        )
        
        success = result.modified_count > 0
        if success:
            logger.info(f"[TaskPoller] Locked task {task_id}")
        
        return success
    
    async def _execute_with_semaphore(self, task_doc: dict):
        """Execute task với semaphore để limit concurrency."""
        async with self.semaphore:
            await self._dispatch_to_worker(task_doc)
    
    async def _dispatch_to_worker(self, task_doc: dict):
        """
        Dispatch task đến worker tương ứng.
        
        Args:
            task_doc: Task execution history document
        """
        generation_target = task_doc["generation_target"]
        task_id = str(task_doc["_id"])
        
        logger.info(
            f"[TaskPoller] Dispatching task {task_id} "
            f"to {generation_target} worker"
        )
        
        # Import worker registry here to avoid circular imports
        from ..workers import WORKER_REGISTRY
        
        # Get worker class
        worker_class = WORKER_REGISTRY.get(generation_target)
        if not worker_class:
            logger.error(
                f"[TaskPoller] No worker registered for '{generation_target}'"
            )
            return
        
        # Create worker instance and execute
        worker = worker_class()
        
        try:
            await worker.execute_wrapper(task_doc)
        except Exception as e:
            logger.error(
                f"[TaskPoller] Worker execution failed for task {task_id}: {e}",
                exc_info=True
            )


# Global task poller instance
_task_poller = None


async def get_task_poller() -> TaskPoller:
    """
    Get the global TaskPoller instance.
    
    Returns:
        TaskPoller instance
    """
    global _task_poller
    
    if _task_poller is None:
        _task_poller = TaskPoller()
    
    return _task_poller
