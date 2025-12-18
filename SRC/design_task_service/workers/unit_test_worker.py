"""
Unit Test Worker - Handles unit_test generation tasks.

This worker processes unit test generation (both UTD and UTC) by:
1. Fetching input data (source code)
2. Generating unit test design and code (fake for now)
3. Saving results to database
"""

import asyncio
import logging
from datetime import datetime, timezone

from .base_worker import BaseWorker
from ..core.database import get_database

logger = logging.getLogger(__name__)


class UnitTestWorker(BaseWorker):
    """Worker for unit_test tasks (generates both UTD and UTC)."""
    
    async def execute(self, task_doc: dict):
        """
        Execute unit test task.
        
        Args:
            task_doc: Task execution history document
        """
        task_id = str(task_doc["_id"])
        project_id = task_doc["project_id"]
        gen_mgmt_id = task_doc["generation_management"]["id"]
        
        logger.info(
            f"[UnitTestWorker] Executing task {task_id} "
            f"for project {project_id}"
        )
        
        try:
            # Simulate processing
            await asyncio.sleep(2)
            
            # Insert fake unit test design (UTD)
            await self._insert_fake_utd(task_id, project_id, gen_mgmt_id)
            
            # Insert fake unit test code (UTC)
            await self._insert_fake_utc(task_id, project_id, gen_mgmt_id)
            
            # Mark completed
            await self._mark_completed(task_id)
            
            logger.info(f"[UnitTestWorker] Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(
                f"[UnitTestWorker] Task {task_id} failed: {e}",
                exc_info=True
            )
            await self._handle_error(task_id, e)
    
    async def _insert_fake_utd(
        self, task_id: str, project_id: str, gen_mgmt_id: str
    ):
        """Insert fake unit test design."""
        db = await get_database()
        collection = db.get_collection("unit_test_design")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        fake_doc = {
            "task_id": task_id,
            "project_id": project_id,
            "source_code_id": gen_mgmt_id,
            "test_cases": [
                {
                    "name": "test_main_function",
                    "description": "Test main function execution",
                    "expected_result": "Should print hello message"
                }
            ],
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(fake_doc)
        logger.info(f"[UnitTestWorker] Inserted fake UTD with ID {result.inserted_id}")
    
    async def _insert_fake_utc(
        self, task_id: str, project_id: str, gen_mgmt_id: str
    ):
        """Insert fake unit test code."""
        db = await get_database()
        collection = db.get_collection("unit_test_code")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        fake_doc = {
            "task_id": task_id,
            "project_id": project_id,
            "source_code_id": gen_mgmt_id,
            "test_code": """
# Fake generated unit test code
def test_main_function():
    # Test implementation
    assert True
""",
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(fake_doc)
        logger.info(f"[UnitTestWorker] Inserted fake UTC with ID {result.inserted_id}")
