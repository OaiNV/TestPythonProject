"""
Project service for business logic
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid6 import uuid7
from fastapi import status

from app.utils.http_helpers import raise_http_error
from CEC_DocifyCode_Common.models.project import (
    Project,
    ProjectSettingItem,
    GitInfo,
    AIProgramming,
    ProjectDirectory,
    ProjectStatusManage,
    JiraConfig,
    RedmineConfig,
)
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectCreateRequestSchema
from app.schemas.base import PaginationResponse
from app.schemas.project import ProjectResponse
from app.services.user_service import user_service
from CEC_DocifyCode_Common.repositories.project_repository import project_repository
from app.utils.helpers import get_current_utc_time

from app.services.logs_service import save_exception_log_sync, LogLevel

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for project operations - Singleton pattern"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProjectService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not ProjectService._initialized:
            self.repository = project_repository
            ProjectService._initialized = True
            logger.info("[ProjectService] Singleton instance initialized")

    async def get_projects(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        language: Optional[str] = None,
    ) -> PaginationResponse:
        """Get projects with pagination and filtering"""
        logger.info(f"[get_projects] Start - page={page}, per_page={per_page}")
        try:
            # Build filter
            filter_dict = {"deleted_at": None}
            if search:
                filter_dict["$or"] = [
                    {"project_name": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                ]
            if language:
                filter_dict["language"] = language

            # Count total
            total = await self.repository.count_documents(filter_dict)

            # Calculate pagination
            skip = (page - 1) * per_page
            total_pages = (total + per_page - 1) // per_page

            # Fetch projects
            documents = await self.repository.find_many(
                filter_dict=filter_dict, skip=skip, limit=per_page
            )
            projects = [Project(**document) for document in documents]

            return PaginationResponse(
                data=[ProjectResponse.from_project(p) for p in projects],
                page=page,
                per_page=per_page,
                total=total,
                total_pages=total_pages,
            )
        except Exception as e:
            error_message = f"[get_projects] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def check_user_project_access(self, user_id: str, project_id: str) -> bool:
        """Check if user has access to project through personal_projects"""

        try:
            # Get user from user_service
            user_doc = await user_service.get_user_by_id(user_id)

            if not user_doc:
                return False

            personal_projects = user_doc.get("personal_projects", [])
            has_access = project_id in personal_projects

            return has_access

        except Exception as e:
            error_message = f"[check_user_project_access] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            return False

    async def check_project_exists(self, project_id: str) -> bool:
        """Check if project exists by ID"""
        logger.info(f"[check_project_exists] Start - project_id={project_id}")

        if not project_id:
            logger.warning("[check_project_exists] Missing project_id")
            return False

        try:
            count = await self.repository.count_documents(
                {"id": project_id, "deleted_at": None}
            )

            exists = count > 0
            logger.info(
                f"[check_project_exists] Result - project_id={project_id}, exists={exists}"
            )
            return exists

        except Exception as e:
            error_message = (
                f"[check_project_exists] Error - project_id={project_id}: {e}"
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def check_project_name_exists(self, project_name: str) -> bool:
        """Check if project name already exists"""
        if not project_name:
            return False

        try:
            # Build query filter
            query_filter = {
                "setting_item.project_name": project_name,
                "deleted_at": None,
            }

            count = await self.repository.count_documents(query_filter)

            exists = count > 0
            return exists

        except Exception as e:
            error_message = (
                f"[check_project_name_exists] Error - project_name={project_name}: {e}"
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def check_repository_exists(
        self, repository_url: str, exclude_project_id: Optional[str] = None
    ) -> bool:
        """Check if repository URL already exists in another project"""
        logger.info(
            f"[check_repository_exists] Start - repository_url={repository_url}, exclude_project_id={exclude_project_id}"
        )

        if not repository_url:
            logger.warning("[check_repository_exists] Missing repository_url")
            return False

        try:
            # Build query filter
            query_filter = {
                "setting_item.git.repository": repository_url,
                "deleted_at": None,
            }

            # Exclude current project if provided
            if exclude_project_id:
                query_filter["id"] = {"$ne": exclude_project_id}

            count = await self.repository.count_documents(query_filter)

            exists = count > 0
            logger.info(
                f"[check_repository_exists] Result - repository_url={repository_url}, exists={exists}"
            )
            return exists

        except Exception as e:
            error_message = f"[check_repository_exists] Error - repository_url={repository_url}: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def get_project_by_id(self, project_id: str) -> Optional[Project]:
        """Get raw project by ID (for internal use)"""
        logger.info(f"[get_project_by_id] Start - project_id={project_id}")

        if not project_id:
            logger.warning("[get_project_by_id] Missing project_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            project_filter = {"id": project_id, "deleted_at": None}
            doc = await self.repository.find_one(project_filter)

            if doc:
                logger.info(f"[get_project_by_id] Success - project_id={project_id}")
                return Project(**doc)
            logger.warning(
                f"[get_project_by_id] Project not found - project_id={project_id}"
            )
            return None
        except Exception as e:
            error_message = f"[get_project_by_id] Error - project_id={project_id}: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def get_detail_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project detail with formatted response data"""
        logger.info(f"[get_detail_project] Start - project_id={project_id}")

        if not project_id:
            logger.warning("[get_detail_project] Missing project_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            project_filter = {"id": project_id, "deleted_at": None}
            document = await self.repository.find_one(project_filter)

            if not document:
                logger.warning(
                    f"[get_detail_project] Project not found - project_id={project_id}"
                )
                return None

            # Map fields to API spec naming (new structure with setting_item)
            setting_item = document.get("setting_item") or {}
            status_manage = document.get("status_manage")
            git_info = setting_item.get("git") or {}
            ai_programming_info = setting_item.get("ai_programming") or {}
            directory_info = setting_item.get("directory") or {}

            # Build git object
            git_obj = None
            if git_info:
                git_obj = {
                    "repository": git_info.get("repository"),
                    "branch": git_info.get("branch"),
                    "commit_id": git_info.get("commit_id"),
                    "sync_status": git_info.get("sync_status"),
                    "repo_provider": git_info.get("repo_provider"),
                }

            # Build ai_programming object
            ai_programming_obj = None
            if ai_programming_info:
                ai_programming_obj = {
                    "user_name": ai_programming_info.get("user_name"),
                    "password": ai_programming_info.get("password"),
                    "token": ai_programming_info.get("token"),
                }

            # Build directory object (map src to source_code)
            directory_obj = None
            if directory_info:
                directory_obj = {
                    "rd": directory_info.get("rd"),
                    "bd": directory_info.get("bd"),
                    "pd": directory_info.get("pd"),
                    "cd": directory_info.get("cd"),
                    "md": directory_info.get("md"),
                    "id": directory_info.get("id"),
                    "fs": directory_info.get("fs"),
                    "ac": directory_info.get("ac"),
                    "source_code": directory_info.get("src"),  # Map src to source_code
                    "utd": directory_info.get("utd"),
                    "utc": directory_info.get("utc"),
                }

            result = {
                "id": document.get("id"),
                "name": setting_item.get("project_name") or "",
                "description": setting_item.get("description") or "",
                "language": setting_item.get("language") or "",
                "framework": setting_item.get("framework"),
                "base_specification": setting_item.get("base_specification"),
                "git": git_obj,
                "ai_programming": ai_programming_obj,
                "directory": directory_obj,
                "share": document.get("share") or [],
                "status_manage": (
                    {
                        "status": status_manage.get("status"),
                        "error_info": status_manage.get("error_info"),
                    }
                    if status_manage is not None
                    else None
                ),
                "created_at": document.get("created_at"),
                "updated_at": document.get("updated_at"),
            }

            return result
        except Exception as e:
            error_message = f"[get_detail_project] Error - project_id={project_id}: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def get_projects_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get projects for a specific user by fetching personal_projects from user collection."""
        logger.info(f"[get_projects_for_user] Start - user_id={user_id}")

        if not user_id:
            logger.warning("[get_projects_for_user] Missing user_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            # Get user document to extract personal_projects
            user_doc = await user_service.get_user_by_id(user_id)

            if not user_doc:
                logger.warning(f"[get_projects_for_user] User not found: {user_id}")
                return []

            personal_project_ids = user_doc.get("personal_projects", [])
            if not personal_project_ids:
                logger.info(
                    f"[get_projects_for_user] No personal projects for user: {user_id}"
                )
                return []

            # Fetch projects from project collection using personal_project_ids (new structure: id field)
            project_filter = {
                "id": {"$in": personal_project_ids},
                "deleted_at": None,
            }
            documents = await self.repository.find_many(
                filter_dict=project_filter, sort_order=[("created_at", -1)]
            )

            # Map fields to API spec naming (new structure with setting_item)
            results = [
                {
                    "id": document.get("id"),
                    "name": (
                        (document.get("setting_item") or {}).get("project_name") or ""
                    ),
                    "description": (
                        (document.get("setting_item") or {}).get("description") or ""
                    ),
                    "language": (
                        (document.get("setting_item") or {}).get("language") or ""
                    ),
                    "git": (
                        {
                            "repository": (
                                (document.get("setting_item") or {}).get("git") or {}
                            ).get("repository"),
                            "branch": (
                                (document.get("setting_item") or {}).get("git") or {}
                            ).get("branch"),
                            "commit_id": (
                                (document.get("setting_item") or {}).get("git") or {}
                            ).get("commit_id"),
                            "sync_status": (
                                (document.get("setting_item") or {}).get("git") or {}
                            ).get("sync_status"),
                        }
                        if (document.get("setting_item") or {}).get("git")
                        else None
                    ),
                    "ai_programming": (
                        {
                            "user_name": (
                                (document.get("setting_item") or {}).get(
                                    "ai_programming"
                                )
                                or {}
                            ).get("user_name"),
                        }
                        if (document.get("setting_item") or {}).get("ai_programming")
                        else None
                    ),
                    "created_at": document.get("created_at"),
                    "updated_at": document.get("updated_at"),
                    "status_manage": {
                        "status": (document.get("status_manage") or {}).get("status"),
                        "error_info": (document.get("status_manage") or {}).get(
                            "error_info"
                        ),
                    },
                }
                for document in documents
            ]

            return results

        except Exception as e:
            raise

    async def update_project(
        self, project_id: str, project_data: ProjectUpdate, user_id: str
    ) -> Optional[Project]:
        """Update project with validation and uniqueness check"""
        logger.info(
            f"[update_project] Start - project_id={project_id}, user_id={user_id}"
        )

        # Input validation
        if not project_id:
            logger.warning("[update_project] Missing project_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            # Get existing project to preserve repository_url and branch_name
            existing_project = await self.repository.find_one(
                {"id": project_id, "deleted_at": None}
            )
            if not existing_project:
                logger.warning(f"[update_project] Project not found: {project_id}")
                raise_http_error(status.HTTP_404_NOT_FOUND)

            existing_setting_item = existing_project.get("setting_item", {})
            existing_git = existing_setting_item.get("git", {})

            # Note: Project name uniqueness is checked in API layer before calling this function

            # Build update data for setting_item (new structure)
            setting_item_updates = {}
            update_data = {}

            project_name = project_data.name
            if project_name is not None:
                setting_item_updates["setting_item.project_name"] = project_name
            if project_data.description is not None:
                setting_item_updates["setting_item.description"] = (
                    project_data.description
                )
            if project_data.programming_language is not None:
                setting_item_updates["setting_item.language"] = (
                    project_data.programming_language
                )
            if project_data.framework_test is not None:
                setting_item_updates["setting_item.framework"] = (
                    project_data.framework_test
                )

            # Note: user_name and token_password are not stored in git object (they are in ai_programming)
            if project_data.git_spec is not None:
                # Only update repository and branch if existing values are empty
                existing_repository = existing_git.get("repository") or ""
                existing_branch = existing_git.get("branch") or ""

                # Update repository_url only if existing value is empty
                repository_url = (
                    project_data.git_spec.repository_url
                    if (
                        project_data.git_spec.repository_url
                        and not existing_repository.strip()
                    )
                    else existing_repository
                )

                # Update branch_name only if existing value is empty
                branch_name = (
                    project_data.git_spec.branch_name
                    if (
                        project_data.git_spec.branch_name
                        and not existing_branch.strip()
                    )
                    else existing_branch
                )

                git_update = {
                    "repository": repository_url,
                    "branch": branch_name,
                    "commit_id": existing_git.get(
                        "commit_id"
                    ),  # Preserve existing commit_id
                    "sync_status": existing_git.get(
                        "sync_status"
                    ),  # Preserve existing sync_status
                }
                setting_item_updates["setting_item.git"] = git_update

            # Update ai_spec
            if project_data.ai_spec is not None:
                ai_programming_update = {
                    "user_name": project_data.ai_spec.user_name,
                    "token": project_data.ai_spec.token_password,
                }
                setting_item_updates["setting_item.ai_programming"] = (
                    ai_programming_update
                )

            # Update directory_spec
            if project_data.directory_spec is not None:
                directory_update = project_data.directory_spec.dict(exclude_none=True)
                setting_item_updates["setting_item.directory"] = directory_update

            # Update share list
            if project_data.share is not None:
                update_data["share"] = project_data.share

            # Build update data
            update_data["updated_at"] = get_current_utc_time()
            update_data.update(setting_item_updates)

            # Prepare query filter
            query_filter = {"id": project_id, "deleted_at": None}

            # Prepare update operations
            update_operations = {"$set": update_data}

            # Perform update
            is_updated = await self.repository.update_one(
                query_filter, update_operations
            )

            if not is_updated:
                logger.warning(
                    f"[update_project] No changes made - project_id={project_id}"
                )

            logger.info(f"[update_project] Success - project_id={project_id}")
            return await self.get_project_by_id(project_id)

        except ValueError:
            raise
        except Exception as e:
            error_message = f"[update_project] Error - project_id={project_id}: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """Delete project (soft delete) and all related collections"""
        logger.info(
            f"[delete_project] Start - project_id={project_id}, user_id={user_id}"
        )

        if not project_id:
            logger.warning("[delete_project] Missing project_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            current_time = get_current_utc_time()

            # Soft delete all related collections first
            from app.services.git_services.git_change_branch import (
                soft_delete_project_data,
            )

            await soft_delete_project_data(project_id)
            logger.info(
                f"[delete_project] Soft deleted related collections - project_id={project_id}"
            )

            # Soft delete project
            query_filter = {"id": project_id, "deleted_at": None}
            update_operations = {"$set": {"deleted_at": current_time}}
            deleted = await self.repository.update_one(query_filter, update_operations)

            # Create activity record
            if deleted:
                try:
                    from app.services.activity_log_service import activity_log_service

                    await activity_log_service.create_activity_log(
                        project_id=project_id,
                        user_id=user_id,
                        activity_type="DELETE_PROJECT",
                    )
                    logger.info(
                        f"[delete_project] Created activity record - project_id={project_id}"
                    )
                except Exception as e:
                    error_message = f"[delete_project] Failed to create activity record - project_id={project_id}: {e}"
                    logger.warning(error_message)
                    save_exception_log_sync(
                        e, error_message, __name__, level=LogLevel.WARNING
                    )

                    # Don't fail the delete operation if activity logging fails

            logger.info(
                f"[delete_project] Success - project_id={project_id}, deleted={deleted}"
            )
            return deleted
        except Exception as e:
            error_message = f"[delete_project] Error - project_id={project_id}: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def delete_projects_bulk(
        self, user_id: str, project_ids: List[str]
    ) -> Dict[str, List[str]]:
        """Bulk delete projects (soft delete) and all related collections for the provided IDs without ownership checks.
        Returns a dict with 'deleted_ids' and 'failed_ids'.
        """
        logger.info(
            f"[delete_projects_bulk] Start - user_id={user_id}, count={len(project_ids) if project_ids else 0}"
        )

        if not project_ids:
            logger.warning("[delete_projects_bulk] Missing project_ids")
            return {"deleted_ids": [], "failed_ids": []}

        try:
            # Soft delete all related collections for each project
            from app.services.git_services.git_change_branch import (
                soft_delete_project_data,
            )

            for project_id in project_ids:
                try:
                    await soft_delete_project_data(project_id)
                    logger.info(
                        f"[delete_projects_bulk] Soft deleted related collections - project_id={project_id}"
                    )
                except Exception as e:
                    error_message = f"[delete_projects_bulk] Failed to soft delete collections for project_id={project_id}: {e}"
                    logger.warning(error_message)
                    save_exception_log_sync(
                        e, error_message, __name__, level=LogLevel.WARNING
                    )

                    # Continue with project deletion even if collection deletion fails

            # Soft delete provided IDs by setting deleted_at
            modified_count = await self.repository.update_many(
                {"id": {"$in": project_ids}, "deleted_at": None},
                {"$set": {"deleted_at": datetime.utcnow().isoformat()}},
            )

            deleted_ids: List[str] = []
            failed_ids: List[str] = []

            if modified_count:
                # Verify which documents were updated
                documents = await self.repository.find_many(
                    {"id": {"$in": project_ids}}
                )
                updated_set = set()
                for document in documents:
                    if document.get("deleted_at") is not None:
                        updated_set.add(document.get("id"))
                deleted_ids = list(updated_set)
                failed_ids = [pid for pid in project_ids if pid not in updated_set]

                # Create activity records for successfully deleted projects
                try:
                    from app.services.activity_log_service import activity_log_service

                    for project_id in deleted_ids:
                        try:
                            await activity_log_service.create_activity_log(
                                project_id=project_id,
                                user_id=user_id,
                                activity_type="DELETE_PROJECT",
                            )
                            logger.info(
                                f"[delete_projects_bulk] Created activity record - project_id={project_id}"
                            )
                        except Exception as e:
                            error_message = f"[delete_projects_bulk] Failed to create activity record - project_id={project_id}: {e}"
                            logger.warning(error_message)
                            save_exception_log_sync(
                                e, error_message, __name__, level=LogLevel.WARNING
                            )

                            # Don't fail the delete operation if activity logging fails
                except Exception as e:
                    error_message = (
                        f"[delete_projects_bulk] Failed to create activity records: {e}"
                    )
                    logger.warning(error_message)
                    save_exception_log_sync(
                        e, error_message, __name__, level=LogLevel.WARNING
                    )

            else:
                failed_ids = list(project_ids)

            return {"deleted_ids": deleted_ids, "failed_ids": failed_ids}
        except Exception as e:
            error_message = f"[delete_projects_bulk] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def create_project(
        self, project_request: ProjectCreateRequestSchema, user_id: str
    ) -> Project:
        """Create new project with comprehensive structure"""
        logger.info(
            f"[create_project_with_files] Start - name={project_request.name}, user_id={user_id}"
        )

        if not project_request or not user_id:
            logger.warning("[create_project_with_files] Missing required input")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            # Generate UUID7 for project ID
            project_id = str(uuid7())

            # Get current UTC timestamp
            current_time = get_current_utc_time()

            # Build GitInfo
            git_info = None
            if project_request.git_spec:
                git_info = GitInfo(
                    repository=project_request.git_spec.repository_url or None,
                    branch=project_request.git_spec.branch_name or None,
                    commit_id=None,  # Will be updated after clone
                    sync_status=None,  # Will be updated after clone
                    repo_provider=project_request.git_spec.repo_provider or None,
                )

            # Build AIProgramming
            ai_programming = None
            if project_request.ai_spec:
                ai_programming = AIProgramming(
                    user_name=project_request.ai_spec.user_name,
                    password=None,
                    token=project_request.ai_spec.token_password,
                )

            # Build ProjectDirectory
            directory = None
            if project_request.directory_spec:
                directory = ProjectDirectory(
                    rd=project_request.directory_spec.rd or "RD",
                    bd=project_request.directory_spec.bd or "BD",
                    pd=project_request.directory_spec.pd or "PD",
                    cd=project_request.directory_spec.cd or "CD",
                    md=project_request.directory_spec.md or "MD",
                    id=project_request.directory_spec.id or "ID",
                    fs=project_request.directory_spec.fs or "FS",
                    ac=project_request.directory_spec.ac or "AC",
                    src=project_request.directory_spec.src or "SRC",
                    utd=project_request.directory_spec.utd or "UTD",
                    utc=project_request.directory_spec.utc or "UTC",
                )

            # Build JiraConfig
            jira_config = JiraConfig(
                url=project_request.jira.url if project_request.jira else None,
                project_name=(
                    project_request.jira.project_name if project_request.jira else None
                ),
                user_name=(
                    project_request.jira.user_name if project_request.jira else None
                ),
                password=(
                    project_request.jira.password if project_request.jira else None
                ),
            )

            # Build RedmineConfig
            redmine_config = RedmineConfig(
                url=project_request.redmine.url if project_request.redmine else None,
                project_name=(
                    project_request.redmine.project_name
                    if project_request.redmine
                    else None
                ),
                user_name=(
                    project_request.redmine.user_name
                    if project_request.redmine
                    else None
                ),
                password=(
                    project_request.redmine.password
                    if project_request.redmine
                    else None
                ),
            )

            # Build ProjectSettingItem
            setting_item = ProjectSettingItem(
                project_name=project_request.name,
                description=project_request.description,
                language=project_request.programming_language,
                framework=project_request.framework_test,
                base_specification=project_request.base_specification,
                git=git_info,
                ai_programming=ai_programming,
                directory=directory,
                jira=jira_config,
                redmine=redmine_config,
            )

            # Create project document
            # Use exclude_none=False to include None values for commit_id and sync_status
            # status_manage must be an object (not null), but status and error_info can be null
            status_manage_obj = ProjectStatusManage(status=None, error_info=None)

            project_doc = {
                "id": project_id,
                "setting_item": setting_item.dict(exclude_none=False),
                "share": project_request.share or [],
                "status_manage": status_manage_obj.dict(exclude_none=False),
                "created_at": current_time,
                "updated_at": current_time,
                "deleted_at": None,
            }

            # Insert into database
            is_inserted = await self.repository.insert_one(project_doc)

            if not is_inserted:
                logger.error("[create_project_with_files] Failed to insert project")
                raise_http_error(status.HTTP_500_INTERNAL_SERVER_ERROR)

            logger.info(
                f"[create_project] Project created successfully - project_id={project_id}"
            )

            return Project(**project_doc)

        except Exception as e:
            error_message = f"[create_project_with_files] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def update_project_commit_ids(
        self,
        project_id: str,
        new_commit_ids: List[str],
    ) -> None:
        """
        Update project with commit IDs and sync status

        Args:
            project_id: Project ID
            new_commit_ids: List of new commit IDs from branch
        """
        logger.info(
            f"[update_project_commit_ids] Start - project_id={project_id}, commit_count={len(new_commit_ids)}"
        )

        if not project_id:
            logger.warning("[update_project_commit_ids] Missing project_id")
            return

        try:
            project = await self.get_project_by_id(project_id)

            if not project:
                logger.warning(
                    f"[update_project_commit_ids] Project not found - project_id={project_id}"
                )
                return

            # Get old commit IDs
            old_commit_ids = []
            if (
                project.setting_item
                and project.setting_item.git
                and project.setting_item.git.commit_id
            ):
                old_commit_ids = project.setting_item.git.commit_id

            # Determine sync_status
            sync_status = "synced"
            if old_commit_ids:
                # Check if there are new commits (compare first commit in list - newest)
                if new_commit_ids and new_commit_ids[0] not in old_commit_ids:
                    sync_status = "pull"
                elif not new_commit_ids or len(new_commit_ids) > len(old_commit_ids):
                    sync_status = "pull"
            else:
                # First time pull, set as synced
                sync_status = "synced"

            # Update project via repository
            is_updated = await self.repository.update_project_commit_ids(
                project_id, new_commit_ids, sync_status
            )

            if is_updated:
                logger.info(
                    f"[update_project_commit_ids] Success - project_id={project_id}, sync_status={sync_status}, commit_count={len(new_commit_ids)}"
                )
            else:
                logger.warning(
                    f"[update_project_commit_ids] Failed to update - project_id={project_id}"
                )

        except Exception as e:
            error_message = (
                f"[update_project_commit_ids] Error - project_id={project_id}: {e}"
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            # Don't raise - project creation should still succeed even if commit update fails

    async def update_project_branch(
        self,
        project_id: str,
        branch_name: str,
    ) -> None:
        """
        Update project branch name

        Args:
            project_id: Project ID
            branch_name: New branch name
        """
        logger.info(
            f"[update_project_branch] Start - project_id={project_id}, branch_name={branch_name}"
        )

        if not project_id or not branch_name:
            logger.warning("[update_project_branch] Missing project_id or branch_name")
            return

        try:
            project = await self.get_project_by_id(project_id)

            if not project:
                logger.warning(
                    f"[update_project_branch] Project not found - project_id={project_id}"
                )
                return

            # Get current git info
            setting_item = project.setting_item if project.setting_item else None
            git_info = setting_item.git if setting_item and setting_item.git else None

            if not git_info:
                logger.warning(
                    f"[update_project_branch] Project does not have git info - project_id={project_id}"
                )
                return

            # Update branch via repository
            is_updated = await self.repository.update_project_branch(
                project_id, branch_name
            )

            if is_updated:
                logger.info(
                    f"[update_project_branch] Success - project_id={project_id}, branch_name={branch_name}"
                )
            else:
                logger.warning(
                    f"[update_project_branch] Failed to update - project_id={project_id}"
                )

        except Exception as e:
            error_message = f"[update_project_branch] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def update_project_branch_with_commits(
        self,
        project_id: str,
        branch_name: str,
        commit_ids: List[str],
    ) -> None:
        """
        Update project branch name, sync_status, and commit_ids

        Args:
            project_id: Project ID
            branch_name: New branch name
            commit_ids: List of commit IDs from new branch
        """
        logger.info(
            f"[update_project_branch_with_commits] Start - project_id={project_id}, branch_name={branch_name}, commit_count={len(commit_ids)}"
        )

        if not project_id or not branch_name:
            logger.warning(
                "[update_project_branch_with_commits] Missing project_id or branch_name"
            )
            return

        try:
            project = await self.get_project_by_id(project_id)

            if not project:
                logger.warning(
                    f"[update_project_branch_with_commits] Project not found - project_id={project_id}"
                )
                return

            # Update branch, sync_status, and commit_ids via repository
            is_updated = await self.repository.update_project_branch_with_commits(
                project_id, branch_name, commit_ids
            )

            if is_updated:
                logger.info(
                    f"[update_project_branch_with_commits] Success - project_id={project_id}, branch_name={branch_name}, commit_count={len(commit_ids)}"
                )
            else:
                logger.warning(
                    f"[update_project_branch_with_commits] Failed to update - project_id={project_id}"
                )

        except Exception as e:
            error_message = f"[update_project_branch_with_commits] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def update_project_sync_status(
        self,
        project_id: str,
        sync_status: str,
    ) -> None:
        """
        Update project sync status

        Args:
            project_id: Project ID
            sync_status: Sync status to set
        """
        logger.info(
            f"[update_project_sync_status] Start - project_id={project_id}, sync_status={sync_status}"
        )

        if not project_id:
            logger.warning("[update_project_sync_status] Missing project_id")
            return

        try:
            project = await self.get_project_by_id(project_id)

            if not project:
                logger.warning(
                    f"[update_project_sync_status] Project not found - project_id={project_id}"
                )
                return

            # Get current commit_ids
            commit_ids = []
            if (
                project.setting_item
                and project.setting_item.git
                and project.setting_item.git.commit_id
            ):
                commit_ids = project.setting_item.git.commit_id

            # Update project via repository
            is_updated = await self.repository.update_project_commit_ids(
                project_id, commit_ids, sync_status
            )

            if is_updated:
                logger.info(
                    f"[update_project_sync_status] Success - project_id={project_id}, sync_status={sync_status}"
                )
            else:
                logger.warning(
                    f"[update_project_sync_status] Failed to update - project_id={project_id}"
                )

        except Exception as e:
            error_message = f"[update_project_sync_status] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def add_commit_id_to_project(
        self,
        project: Project,
        new_commit_id: str,
        sync_status: Optional[str] = None,
    ) -> None:
        """
        Add new commit_id to project's commit_ids array after successful push

        Args:
            project: Project object (already loaded)
            new_commit_id: New commit ID to add (from push)
            sync_status: Optional sync status to set. If None, keeps current sync_status
        """
        if not project or not project.id:
            logger.warning("[add_commit_id_to_project] Missing project or project.id")
            return

        project_id = project.id
        logger.info(
            f"[add_commit_id_to_project] Start - project_id={project_id}, new_commit_id={new_commit_id}"
        )

        if not new_commit_id:
            logger.warning(
                "[add_commit_id_to_project] Missing new_commit_id - project_id=%s",
                project_id,
            )
            return

        try:
            # Get current commit_ids from project
            current_commit_ids = []
            if (
                project.setting_item
                and project.setting_item.git
                and project.setting_item.git.commit_id
            ):
                current_commit_ids = project.setting_item.git.commit_id

            # Add new commit_id to the beginning of the array (newest first)
            if new_commit_id not in current_commit_ids:
                updated_commit_ids = [new_commit_id] + current_commit_ids

                # Get current sync_status if not provided
                if sync_status is None:
                    if project.setting_item and project.setting_item.git:
                        sync_status = project.setting_item.git.sync_status or "synced"
                    else:
                        sync_status = "synced"

                # Update project commit_ids
                is_updated = await self.repository.update_project_commit_ids(
                    project_id=project_id,
                    commit_ids=updated_commit_ids,
                    sync_status=sync_status,
                )

                if is_updated:
                    logger.info(
                        f"[add_commit_id_to_project] Success - project_id={project_id}, new_commit_id={new_commit_id}"
                    )
                else:
                    logger.warning(
                        f"[add_commit_id_to_project] Failed to update - project_id={project_id}"
                    )
            else:
                logger.info(
                    f"[add_commit_id_to_project] Commit ID already exists - project_id={project_id}, commit_id={new_commit_id}"
                )

        except Exception as e:
            error_message = (
                f"[add_commit_id_to_project] Error - project_id={project_id}: {e}"
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            # Don't raise - push should still succeed even if commit_ids update fails


# Create singleton service instance
project_service = ProjectService()
