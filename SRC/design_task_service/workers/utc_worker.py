"""
UTC Worker - Handles utc (Unit Test Code only) generation tasks.

This worker processes UTC generation by:
1. Fetching input data (unit test design)
2. Generating unit test code only (fake for now)
3. Saving result to database
"""

import asyncio
import logging
from datetime import datetime, timezone

from .base_worker import BaseWorker
from ..core.database import get_database

logger = logging.getLogger(__name__)


class UTCWorker(BaseWorker):
    """Worker for utc tasks (generates UTC only from existing UTD)."""
    
    async def execute(self, task_doc: dict):
        """
        Execute UTC task.
        
        Args:
            task_doc: Task execution history document
        """
        task_id = str(task_doc["_id"])
        project_id = task_doc["project_id"]
        gen_mgmt_id = task_doc["generation_management"]["id"]
        
        logger.info(
            f"[UTCWorker] Executing task {task_id} "
            f"for project {project_id}"
        )
        
        try:
            # Simulate processing
            await asyncio.sleep(2)
            
            # Insert fake UTC
            await self._insert_fake_utc(task_id, project_id, gen_mgmt_id)
            
            # Mark completed
            await self._mark_completed(task_id)
            
            logger.info(f"[UTCWorker] Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(
                f"[UTCWorker] Task {task_id} failed: {e}",
                exc_info=True
            )
            await self._handle_error(task_id, e)
    
    async def _insert_fake_utc(
        self, task_id: str, project_id: str, gen_mgmt_id: str
    ):
        """Insert fake UTC document."""
        db = await get_database()
        collection = db.get_collection("unit_test_code")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        fake_doc = {
            "task_id": task_id,
            "project_id": project_id,
            "unit_test_design_id": gen_mgmt_id,
            "test_code": """
# Fake generated UTC from UTD
import unittest

class TestExample(unittest.TestCase):
    def test_example(self):
        self.assertTrue(True)
""",
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(fake_doc)
        logger.info(f"[UTCWorker] Inserted fake UTC with ID {result.inserted_id}")
