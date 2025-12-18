"""
Basic Design Worker - Handles basic_design generation tasks.

This worker processes basic design generation by:
1. Fetching input data (detail design document)
2. Generating basic design (fake for now)
3. Saving result to database
"""

import asyncio
import logging
from datetime import datetime, timezone

from .base_worker import BaseWorker
from ..core.database import get_database

logger = logging.getLogger(__name__)


class BasicDesignWorker(BaseWorker):
    """Worker for basic_design tasks."""
    
    async def execute(self, task_doc: dict):
        """
        Execute basic design task.
        
        Args:
            task_doc: Task execution history document
        """
        task_id = str(task_doc["_id"])
        project_id = task_doc["project_id"]
        gen_mgmt_id = task_doc["generation_management"]["id"]
        
        logger.info(
            f"[BasicDesignWorker] Executing task {task_id} "
            f"for project {project_id}"
        )
        
        try:
            # TODO: In reality:
            # 1. Fetch detail design document from DB or Fetch requirement document from DB
            # 2. Call AI service to generate basic design
            # 3. Save result to DB
            
            # Currently: Fake data and simulate work
            await asyncio.sleep(2)  # Simulate processing
            
            # Insert fake basic design document
            await self._insert_fake_basic_design(task_id, project_id, gen_mgmt_id)
            
            # Mark task as completed
            await self._mark_completed(task_id)
            
            logger.info(f"[BasicDesignWorker] Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(
                f"[BasicDesignWorker] Task {task_id} failed: {e}",
                exc_info=True
            )
            await self._handle_error(task_id, e)
    
    async def _insert_fake_basic_design(
        self, task_id: str, project_id: str, gen_mgmt_id: str
    ):
        """
        Insert fake basic design document to DB.
        
        Args:
            task_id: Task execution history ID
            project_id: Project ID
            gen_mgmt_id: Generation management ID (detail design doc ID)
        """
        db = await get_database()
        collection = db.get_collection("basic_design")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        fake_doc = {
            "task_id": task_id,
            "project_id": project_id,
            "detail_design_id": gen_mgmt_id,
            "title": f"Basic Design for {project_id}",
            "content": "Fake basic design content - will be replaced with AI-generated content",
            "sections": [
                {"name": "Overview", "content": "System overview..."},
                {"name": "Architecture", "content": "System architecture..."},
                {"name": "Components", "content": "Main components..."}
            ],
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(fake_doc)
        logger.info(
            f"[BasicDesignWorker] Inserted fake basic design "
            f"with ID {result.inserted_id}"
        )
