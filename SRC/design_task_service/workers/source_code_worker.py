"""
Source Code Worker - Handles source_code generation tasks.

This worker processes source code generation by:
1. Fetching input data (basic design document)
2. Generating source code (fake for now)
3. Saving result to database
"""

import asyncio
import logging
from datetime import datetime, timezone

from .base_worker import BaseWorker
from ..core.database import get_database

logger = logging.getLogger(__name__)


class SourceCodeWorker(BaseWorker):
    """Worker for source_code tasks."""
    
    async def execute(self, task_doc: dict):
        """
        Execute source code task.
        
        Args:
            task_doc: Task execution history document
        """
        task_id = str(task_doc["_id"])
        project_id = task_doc["project_id"]
        gen_mgmt_id = task_doc["generation_management"]["id"]
        
        logger.info(
            f"[SourceCodeWorker] Executing task {task_id} "
            f"for project {project_id}"
        )
        
        try:
            # Simulate processing
            await asyncio.sleep(2)
            
            # Insert fake source code
            await self._insert_fake_source_code(task_id, project_id, gen_mgmt_id)
            
            # Mark completed
            await self._mark_completed(task_id)
            
            logger.info(f"[SourceCodeWorker] Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(
                f"[SourceCodeWorker] Task {task_id} failed: {e}",
                exc_info=True
            )
            await self._handle_error(task_id, e)
    
    async def _insert_fake_source_code(
        self, task_id: str, project_id: str, gen_mgmt_id: str
    ):
        """Insert fake source code to DB."""
        db = await get_database()
        collection = db.get_collection("source_code")
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        fake_doc = {
            "task_id": task_id,
            "project_id": project_id,
            "basic_design_id": gen_mgmt_id,
            "file_name": "main.py",
            "code": """
# Fake generated source code
def main():
    print("Hello from AI-generated code")
    
if __name__ == "__main__":
    main()
""",
            "language": "python",
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(fake_doc)
        logger.info(
            f"[SourceCodeWorker] Inserted fake source code "
            f"with ID {result.inserted_id}"
        )
