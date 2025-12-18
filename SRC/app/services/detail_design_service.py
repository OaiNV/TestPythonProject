"""
Detail Design Service
Handles detail design business logic
"""

import logging
import os
import platform
import subprocess
import tempfile
import base64
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from functools import partial

from fastapi import HTTPException, status

from CEC_DocifyCode_Common.repositories.detail_design_repository import (
    detail_design_repository,
)
from app.services.download_service import download_service
from app.services.project_service import ProjectService
from app.utils.download_utils import (
    extract_detail_design_content,
)
from app.utils.constants import PermissionLevel
from app.utils.constants import FileStatus, SyncStatus
from app.utils.download_utils import extract_detail_design_content
from app.utils.http_helpers import raise_http_error
from app.services.git_services.git_push import (
    push_files_to_git,
    check_conflicts_before_push,
)
from app.services.git_services.git_service import normalize_target_directory
from app.schemas.base import ConflictResponse, ConflictFileInfo
from app.utils.helpers import get_current_utc_time
from app.core.config import get_config

from app.services.logs_service import save_exception_log_sync, LogLevel

logger = logging.getLogger(__name__)


class DetailDesignService:
    """Service for detail design management operations - Singleton pattern"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DetailDesignService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not DetailDesignService._initialized:
            self.repository = detail_design_repository
            self.project_service = ProjectService()
            DetailDesignService._initialized = True
            logger.info("[DetailDesignService] Singleton instance initialized")

    # #region Public Methods

    async def get_detail_designs_by_project(
        self, project_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all detail designs for a project

        Args:
            project_id: Project ID

        Returns:
            List of detail design documents with mapped fields
        """
        logger.info(f"[get_detail_designs_by_project] Start - project_id={project_id}")

        if not project_id:
            logger.warning("[get_detail_designs_by_project] Missing project_id")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            raw_documents = await self.repository.get_detail_designs_by_project(
                project_id
            )
            mapped_documents = [
                self._map_detail_design_fields(doc) for doc in raw_documents
            ]

            logger.info(
                f"[get_detail_designs_by_project] Success - count={len(mapped_documents)}"
            )
            return mapped_documents
        except ValueError as ve:
            error_message = f"[get_detail_designs_by_project] Validation error: {ve}"
            logger.error(error_message)
            save_exception_log_sync(ve, error_message, __name__)

            raise
        except Exception as e:
            error_message = (
                f"[get_detail_designs_by_project] Error - project_id={project_id}: {e}"
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def get_detail_design_detail(
        self, project_id: str, file_id: str, user_id: str, user_role: str
    ) -> Dict[str, Any]:
        """
        Get a single detail design document with authorization enforcement
        """
        logger.info(
            "[get_detail_design_detail] Start - project_id=%s, file_id=%s, user_id=%s",
            project_id,
            file_id,
            user_id,
        )

        if not project_id or not file_id or not user_id:
            logger.warning("[get_detail_design_detail] Missing required parameters")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            await self._validate_user_authorization(
                user_role=user_role, user_id=user_id, project_id=project_id
            )

            document = await self.repository.get_detail_design_by_id(
                project_id, file_id
            )
            if not document:
                logger.warning(
                    "[get_detail_design_detail] Document not found - project_id=%s, file_id=%s",
                    project_id,
                    file_id,
                )
                raise_http_error(status.HTTP_404_NOT_FOUND, "FILE_NOT_FOUND")

            logger.info(
                "[get_detail_design_detail] Document fetched - project_id=%s, file_name=%s",
                project_id,
                document.get("file_name"),
            )

            mapped_document = self._map_detail_design_fields(document)
            mapped_document["content"] = document.get("content") or ""

            # Generate image from PlantUML if file_type is activity_diagram
            file_type = document.get("file_type")
            if file_type == "activity_diagram":
                puml_content = document.get("content") or ""
                if puml_content:
                    try:
                        image = self.generate_puml_image(puml_content)
                        mapped_document["images"] = image
                    except Exception as e:
                        error_message = (
                            "[get_detail_design_detail] Failed to generate PlantUML image - project_id=%s, file_id=%s: %s"
                            % (
                                project_id,
                                file_id,
                                e,
                            )
                        )
                        logger.warning(error_message)
                        save_exception_log_sync(
                            e, error_message, __name__, level=LogLevel.WARNING
                        )

                        mapped_document["images"] = None
                else:
                    mapped_document["images"] = None
            else:
                mapped_document["images"] = None

            logger.info(
                "[get_detail_design_detail] Success - project_id=%s, file_id=%s",
                project_id,
                file_id,
            )
            return mapped_document
        except HTTPException:
            raise
        except ValueError as ve:
            error_message = (
                "[get_detail_design_detail] Validation error - project_id=%s, file_id=%s: %s"
                % (
                    project_id,
                    file_id,
                    ve,
                )
            )
            logger.error(error_message)
            save_exception_log_sync(ve, error_message, __name__)

            raise
        except Exception as e:
            error_message = (
                "[get_detail_design_detail] Error - project_id=%s, file_id=%s: %s"
                % (
                    project_id,
                    file_id,
                    e,
                )
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def download_detail_designs(
        self,
        project_id: str,
        file_ids: List[str],
        user_id: str,
        user_role: str,
    ) -> Dict[str, Any]:
        """
        Download detail design files: single file (no zip) or multiple files (zip).

        Args:
            project_id: Project ID
            file_ids: List of detail design IDs
            user_id: User ID
            user_role: User role

        Returns:
            Dict with download payload
        """
        logger.info(
            f"[download_detail_designs] Start - project_id={project_id}, file_ids={file_ids}, user_id={user_id}"
        )

        if not project_id or not file_ids or not user_id:
            logger.warning("[download_detail_designs] Missing required parameters")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            project = await download_service.validate_project_download(
                project_id=project_id,
                user_id=user_id,
                user_role=user_role,
                project_service=self.project_service,
            )
            documents = await self.repository.get_detail_designs_by_ids(
                project_id, file_ids
            )

            normalized_documents = [
                self._ensure_detail_design_document_id(document)
                for document in documents
                if document
            ]
            document_count = len(normalized_documents)
            created_at = datetime.utcnow().isoformat() + "Z"
            logger.info(
                "[download_detail_designs] Retrieved documents - project_id=%s, document_count=%s, will_zip=%s",
                project_id,
                document_count,
                document_count > 1,
            )

            activity_handler = partial(
                self._log_detail_design_download_activity,
                project,
                document_count,
            )

            # Extract project_name from project object
            project_name = self._extract_project_name(project)

            context = download_service.create_download_context(
                project_id=project_id,
                project_name=project_name,
                project=project,
                user_id=user_id,
                created_at=created_at,
                file_type="detail design document",
                file_suffix="detail_design",
            )

            resolvers = download_service.create_resolver_config(
                document_id_resolver=self._extract_detail_design_document_id,
                document_normalizer=self._ensure_detail_design_document_id,
                content_extractor=extract_detail_design_content,
            )

            handlers = download_service.create_file_handlers()

            return await download_service.build_download_payload(
                documents=normalized_documents,
                context=context,
                resolvers=resolvers,
                handlers=handlers,
                activity_logger=activity_handler,
            )

        except HTTPException:
            raise
        except ValueError:
            raise
        except Exception as e:
            error_message = f"[download_detail_designs] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def push_git_detail_designs(
        self,
        project_id: str,
        file_ids: List[str],
        commit_message: str,
        user_name: str,
        token_password: Optional[str],
        user_id: str,
    ) -> Dict[str, Any]:
        """Push detail designs to Git repository"""
        logger.info(
            f"[push_git_detail_designs] Start - project_id={project_id}, file_ids={file_ids}, user_id={user_id}"
        )

        if not project_id or not file_ids or not user_id:
            logger.warning("[push_git_detail_designs] Missing required parameters")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            # Check user authorization
            has_access = await self.project_service.check_user_project_access(
                user_id, project_id
            )
            if not has_access:
                raise_http_error(status.HTTP_403_FORBIDDEN)

            # Get project to retrieve Git info and directory
            project = await self.project_service.get_project_by_id(project_id)
            if not project:
                logger.warning(
                    f"[push_git_detail_designs] Project not found - project_id={project_id}"
                )
                raise_http_error(status.HTTP_404_NOT_FOUND)

            # Get Git repository info
            git_info = project.setting_item.git if project.setting_item else None
            if not git_info or not git_info.repository or not git_info.branch:
                logger.warning(
                    "[push_git_detail_designs] Project does not have Git configuration"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="GIT_NOT_CONFIGURED"
                )

            repository_url = git_info.repository
            branch_name = git_info.branch

            # Get directory structure
            directory = project.setting_item.directory if project.setting_item else None
            if not directory or not directory.pd:
                logger.warning(
                    "[push_git_detail_designs] Project does not have PD directory configured"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="PD_DIRECTORY_NOT_CONFIGURED"
                )

            target_directory = directory.pd.strip("/")
            
            # Normalize target_directory when src is "/"
            src_path = directory.src if directory else None
            target_directory = normalize_target_directory(target_directory, src_path)

            # Get files from repository
            documents = await self.repository.get_detail_designs_by_ids(
                project_id, file_ids
            )

            # Filter files by sync_status: push, pull_push, delete_push, or empty
            valid_sync_statuses = [
                SyncStatus.PUSH,
                SyncStatus.PULL_PUSH,
                SyncStatus.DELETE_PUSH,
                "",
                None,
            ]
            filtered_documents = [
                doc
                for doc in documents
                if (doc.get("sync_status") or "") in valid_sync_statuses
            ]

            if not filtered_documents:
                logger.warning(
                    "[push_git_detail_designs] No files with valid sync_status to push"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="FILE_NOT_CHANGED"
                )

            # Separate files to push and files to delete
            files_to_push = []
            files_to_delete = []
            for doc in filtered_documents:
                sync_status = doc.get("sync_status") or ""
                if sync_status == SyncStatus.DELETE_PUSH:
                    # For delete_push, use file_path from document if available, otherwise use file_name
                    file_name = doc.get("file_name")
                    if file_name:
                        file_path = doc.get("file_path") or file_name
                        files_to_delete.append(file_path)
                    continue

                file_name = doc.get("file_name")
                content = doc.get("content")

                if not file_name or not content:
                    logger.warning(
                        f"[push_git_detail_designs] Skipping document with missing content - doc_id={doc.get('id')}"
                    )
                    continue

                # Detail design content is stored as string (markdown)
                file_content = (
                    content.encode("utf-8") if isinstance(content, str) else content
                )

                # Use file_path from document if available, otherwise use file_name
                file_path = doc.get("file_path") or file_name

                files_to_push.append(
                    {
                        "file_name": file_name,
                        "file_path": file_path,  # Include file_path for proper Git path handling
                        "content": file_content,
                    }
                )

            if not files_to_push and not files_to_delete:
                logger.warning(
                    "[push_git_detail_designs] No valid files to push or delete after processing"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="NO_VALID_FILES_TO_PUSH"
                )

            # Check for conflicts before pushing (only for files that have commit_id)
            collection_name = getattr(self.repository, "collection_name", None)
            files_with_commit_id = []
            for doc in filtered_documents:
                if (
                    doc.get("commit_id")
                    and doc.get("commit_id").strip()
                    and doc.get("commit_id") != "null"
                    and (doc.get("sync_status") or "") != SyncStatus.DELETE_PUSH
                ):
                    # Use file_path from document if available, otherwise use file_name
                    file_path = doc.get("file_path") or doc.get("file_name")
                    files_with_commit_id.append(
                        {
                            "file_name": doc.get("file_name"),
                            "file_path": file_path,  # Use file_path from document
                            "local_commit_id": doc.get("commit_id") or "",
                            "file_id": doc.get("id"),
                            "project_id": project_id,
                            "collection_name": collection_name,
                        }
                    )

            if files_with_commit_id:
                conflict_files = await check_conflicts_before_push(
                    repository_url=repository_url,
                    branch_name=branch_name,
                    user_name=user_name,
                    token_password=token_password,
                    files_with_commit_id=files_with_commit_id,
                    target_directory=target_directory,
                )

                if conflict_files:
                    logger.warning(
                        f"[push_git_detail_designs] Conflicts detected - count={len(conflict_files)}"
                    )
                    # Raise conflict exception with conflict files
                    conflict_response = ConflictResponse(
                        statusCode=409,
                        message="Conflict detected. Some files could not be merged automatically.",
                        conflict_files=[
                            ConflictFileInfo(**cf) for cf in conflict_files
                        ],
                    )
                    raise HTTPException(
                        status_code=409,
                        detail=conflict_response.dict(),
                    )

            # Push files to Git (or delete if delete_push)
            commit_id = await push_files_to_git(
                repository_url=repository_url,
                branch_name=branch_name,
                user_name=user_name,
                token_password=token_password,
                files=files_to_push,
                commit_message=commit_message,
                target_directory=target_directory,
                files_to_delete=files_to_delete if files_to_delete else None,
            )

            # Get current time for deleted_at (for delete_push files)
            current_time = get_current_utc_time()

            # Update sync_status and commit_id for pushed files
            pushed_file_ids = [doc.get("id") for doc in filtered_documents]

            # Separate files that were delete_push (need to update deleted_at too)
            delete_push_file_ids = []
            for doc in filtered_documents:
                if doc.get("sync_status") == SyncStatus.DELETE_PUSH:
                    doc_id = doc.get("id")
                    if doc_id:
                        delete_push_file_ids.append(doc_id)
            other_file_ids = [
                doc_id
                for doc_id in pushed_file_ids
                if doc_id not in delete_push_file_ids
            ]

            # Update files that were delete_push: sync_status, commit_id, and deleted_at
            if delete_push_file_ids:
                updated_delete_count = await self.repository.update_documents(
                    document_ids=delete_push_file_ids,
                    project_id=project_id,
                    update_data={
                        "commit_id": commit_id,
                        "sync_status": SyncStatus.SYNCED,
                        "deleted_at": current_time,
                    },
                )
                logger.info(
                    f"[push_git_detail_designs] Updated delete_push files - count={updated_delete_count}"
                )

            # Update other files: only sync_status and commit_id
            if other_file_ids:
                updated_other_count = await self.repository.update_documents(
                    document_ids=other_file_ids,
                    project_id=project_id,
                    update_data={
                        "commit_id": commit_id,
                        "sync_status": SyncStatus.SYNCED,
                    },
                )
                logger.info(
                    f"[push_git_detail_designs] Updated other files - count={updated_other_count}"
                )

            total_updated = len(delete_push_file_ids) + len(other_file_ids)
            logger.info(
                f"[push_git_detail_designs] Success - commit_id={commit_id}, total_updated={total_updated}"
            )

            # Update project commit_ids
            try:
                await self.project_service.add_commit_id_to_project(
                    project=project,
                    new_commit_id=commit_id,
                )
            except Exception as e:
                error_message = f"[push_git_detail_designs] Failed to update project commit_ids: {e}"
                logger.warning(error_message)
                save_exception_log_sync(
                    e, error_message, __name__, level=LogLevel.WARNING
                )

            return {
                "commit_id": commit_id,
                "updated_count": total_updated,
            }

        except HTTPException:
            raise
        except Exception as e:
            error_message = f"[push_git_detail_designs] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def update_detail_design_content(
        self,
        project_id: str,
        file_id: str,
        content: str,
        user_id: str,
        user_role: str = PermissionLevel.USER,
    ) -> Dict[str, Any]:
        """Update detail design content with sync_status logic"""
        logger.info(
            f"[update_detail_design_content] Start - project_id={project_id}, file_id={file_id}, user_id={user_id}"
        )

        if not project_id or not file_id or not content or not user_id:
            logger.warning("[update_detail_design_content] Missing required parameters")
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            # Check user authorization
            await self._validate_user_authorization(
                project_id=project_id, user_id=user_id, user_role=user_role
            )

            # Find the document
            document = await self.repository.get_detail_design_by_id(
                project_id, file_id
            )

            if not document:
                logger.warning(
                    f"[update_detail_design_content] Document not found - file_id={file_id}, project_id={project_id}"
                )
                raise_http_error(status.HTTP_404_NOT_FOUND)

            # Get current sync_status
            current_sync_status = document.get("sync_status") or ""

            # Determine new sync_status
            if current_sync_status == SyncStatus.PULL:
                new_sync_status = SyncStatus.PULL_PUSH
            else:
                new_sync_status = SyncStatus.PUSH

            # Prepare update data
            from app.utils.helpers import get_current_utc_time

            current_time = get_current_utc_time()
            update_data = {
                "content": content,
                "sync_status": new_sync_status,
                "updated_at": current_time,
            }

            # Update document
            is_updated = await self.repository.update_document(
                document_id=file_id,
                project_id=project_id,
                update_data=update_data,
            )

            if not is_updated:
                logger.warning(
                    f"[update_detail_design_content] Failed to update document - file_id={file_id}"
                )
                raise_http_error(status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Check if file_type is activity_diagram and generate image
            file_type = document.get("file_type")
            images = None
            if file_type == "activity_diagram":
                logger.info(
                    f"[update_detail_design_content] Generating image for activity_diagram - file_id={file_id}"
                )
                try:
                    puml_content = self.extract_plantuml_content(content)
                    if puml_content:
                        images = self.generate_puml_image(puml_content)
                        logger.info(
                            f"[update_detail_design_content] Image generated successfully - file_id={file_id}"
                        )
                    else:
                        logger.warning(
                            f"[update_detail_design_content] No PlantUML content found - file_id={file_id}"
                        )
                except Exception as e:
                    error_message = f"[update_detail_design_content] Failed to generate image - file_id={file_id}: {e}"
                    logger.warning(error_message)
                    save_exception_log_sync(
                        e, error_message, __name__, level=LogLevel.WARNING
                    )

                    images = None

            logger.info(
                f"[update_detail_design_content] Success - file_id={file_id}, sync_status={new_sync_status}"
            )

            result = {
                "project_id": project_id,
                "file_id": file_id,
                "updated_at": current_time,
                "content": content,
            }

            if images is not None:
                result["images"] = images

            return result

        except HTTPException:
            raise
        except Exception as e:
            error_message = f"[update_detail_design_content] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    # #endregion

    # #region Private Methods

    def _map_detail_design_fields(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map MongoDB document fields to API response format

        Args:
            document: MongoDB document

        Returns:
            Mapped document with API fields
        """
        logger.info(
            "[DetailDesignService._map_detail_design_fields] Start - document_keys=%s",
            list(document.keys()) if document else None,
        )

        if not document:
            logger.warning(
                "[DetailDesignService._map_detail_design_fields] Missing document"
            )
            return {}

        try:
            # Extract id from _id or id field
            document_id = document.get("id") or document.get("_id")
            if isinstance(document_id, str):
                resolved_id = document_id
            else:
                resolved_id = str(document_id) if document_id else ""

            commit_id = document.get("commit_id")
            status = (
                FileStatus.GIT if commit_id and commit_id.strip() else FileStatus.LOCAL
            )

            mapped = {
                "id": resolved_id,
                "project_id": document.get("project_id", ""),
                "type": document.get("type", ""),
                "file_name": document.get("file_name", ""),
                "commit_id": commit_id,
                "sync_status": document.get("sync_status"),
                "status": status,
                "file_type": document.get("file_type"),
                "created_at": document.get("created_at"),
                "updated_at": document.get("updated_at"),
                "deleted_at": document.get("deleted_at"),
            }

            logger.info("[DetailDesignService._map_detail_design_fields] Success")
            return mapped
        except Exception as e:
            error_message = (
                "[DetailDesignService._map_detail_design_fields] Error: %s" % (e,)
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    def _extract_project_name(self, project: Dict[str, Any]) -> str:
        """Extract project name from project dict or object"""
        logger.debug("[_extract_project_name] Extracting project name")

        try:
            if isinstance(project, dict):
                project_name = (
                    project.get("project_name")
                    or project.get("name")
                    or project.get("setting_item", {}).get("project_name")
                    or "project"
                )
            else:
                setting_item = getattr(project, "setting_item", None)
                if setting_item:
                    project_name = getattr(setting_item, "project_name", "project")
                else:
                    project_name = getattr(project, "project_name", "project")

            logger.debug("[_extract_project_name] Extracted: %s", project_name)
            return project_name

        except Exception as e:
            error_message = "[_extract_project_name] Error: %s" % e
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            return "project"

    def _ensure_detail_design_document_id(
        self, document: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Ensure document has id field

        Args:
            document: MongoDB document

        Returns:
            Document with id field
        """
        logger.info(
            "[DetailDesignService._ensure_detail_design_document_id] Start - document_keys=%s",
            list(document.keys()) if document else None,
        )

        if not document:
            logger.warning(
                "[DetailDesignService._ensure_detail_design_document_id] Missing document"
            )
            return {}

        try:
            resolved_id = self._extract_detail_design_document_id(document)
            if resolved_id:
                document["id"] = resolved_id

            logger.info(
                "[DetailDesignService._ensure_detail_design_document_id] Success"
            )
            return document
        except Exception as e:
            error_message = (
                "[DetailDesignService._ensure_detail_design_document_id] Error: %s"
                % (e,)
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    def _extract_detail_design_document_id(self, document: Dict[str, Any]) -> str:
        """
        Extract identifier from detail design document

        Args:
            document: MongoDB document

        Returns:
            Document ID as string
        """
        logger.info(
            "[DetailDesignService._extract_detail_design_document_id] Start - document_keys=%s",
            list(document.keys()) if document else None,
        )

        if not document:
            logger.warning(
                "[DetailDesignService._extract_detail_design_document_id] Missing document input"
            )
            return ""

        try:
            doc_id = document.get("id")
            if isinstance(doc_id, str) and doc_id.strip():
                resolved_id = doc_id.strip()
            else:
                fallback_id = document.get("_id")
                resolved_id = str(fallback_id) if fallback_id else ""

            logger.info(
                "[DetailDesignService._extract_detail_design_document_id] Success - document_id=%s",
                resolved_id,
            )
            return resolved_id
        except Exception as e:
            error_message = (
                "[DetailDesignService._extract_detail_design_document_id] Error: %s"
                % (e,)
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def _validate_user_authorization(
        self, user_role: str, user_id: str, project_id: str
    ) -> None:
        """Validate whether the user can access a project's detail design"""
        logger.info(
            "[DetailDesignService._validate_user_authorization] Start - project_id=%s, user_id=%s",
            project_id,
            user_id,
        )

        if not user_id or not project_id:
            logger.warning(
                "[DetailDesignService._validate_user_authorization] Missing input"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST)

        try:
            normalized_role = user_role or PermissionLevel.USER
            if normalized_role == PermissionLevel.ADMIN:
                logger.info(
                    "[DetailDesignService._validate_user_authorization] Admin role granted"
                )
                return

            has_access = await self.project_service.check_user_project_access(
                user_id=user_id, project_id=project_id
            )
            if not has_access:
                logger.warning(
                    "[DetailDesignService._validate_user_authorization] Access denied - project_id=%s, user_id=%s",
                    project_id,
                    user_id,
                )
                raise_http_error(status.HTTP_403_FORBIDDEN)

            logger.info(
                "[DetailDesignService._validate_user_authorization] Access granted - project_id=%s, user_id=%s",
                project_id,
                user_id,
            )
        except HTTPException:
            raise
        except Exception as e:
            error_message = (
                "[DetailDesignService._validate_user_authorization] Error - project_id=%s: %s"
                % (
                    project_id,
                    e,
                )
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    async def _log_detail_design_download_activity(
        self,
        project: Dict[str, Any],
        total_documents: int,
        project_id: str,
        user_id: str,
        activity_type: str,
        file_ids: List[str],
        file_type: str,
    ) -> None:
        """
        Log detail design download activity

        Args:
            project: Project data
            total_documents: Total number of documents
            project_id: Project ID
            user_id: User ID
            activity_type: Activity type
            file_ids: List of file IDs
            file_type: File type
        """
        logger.info(
            "[DetailDesignService._log_detail_design_download_activity] Start - project_id=%s, user_id=%s, total_documents=%s",
            project_id,
            user_id,
            total_documents,
        )

        try:
            from app.utils.download_utils import create_download_activity

            file_count = len(file_ids) if file_ids else total_documents
            await create_download_activity(
                project_id=project_id,
                user_id=user_id,
                file_count=file_count,
                document_type=file_type,
            )

            logger.info(
                "[DetailDesignService._log_detail_design_download_activity] Success - file_count=%s",
                file_count,
            )
        except Exception as e:
            error_message = (
                "[DetailDesignService._log_detail_design_download_activity] Error - project_id=%s: %s"
                % (
                    project_id,
                    e,
                )
            )
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

    def find_java_executable(self) -> str:
        """Find Java executable path"""
        logger.info("[find_java_executable] Start")
        try:
            # Try config JAVA_PATH first
            config = get_config()
            java_path_from_config = getattr(config, "JAVA_PATH", None)
            if java_path_from_config and os.path.isfile(java_path_from_config):
                logger.info(
                    "[find_java_executable] Success - path=%s (from config)",
                    java_path_from_config,
                )
                return java_path_from_config

            if platform.system() == "Windows":
                # Try to find java.exe in PATH first
                try:
                    result = subprocess.run(
                        ["where", "java.exe"],
                        capture_output=True,
                        text=True,
                        check=False,
                    )
                    if result.returncode == 0 and result.stdout.strip():
                        java_path = result.stdout.strip().split("\n")[0].strip()
                        if java_path and os.path.isfile(java_path):
                            logger.info(
                                "[find_java_executable] Success - path=%s", java_path
                            )
                            return java_path
                except Exception:
                    pass

                # Try JAVA_HOME
                java_home = os.environ.get("JAVA_HOME", "")
                if java_home:
                    java_path = os.path.join(java_home, "bin", "java.exe")
                    if os.path.isfile(java_path):
                        logger.info(
                            "[find_java_executable] Success - path=%s", java_path
                        )
                        return java_path

                # Try common Program Files paths
                program_files = os.environ.get("ProgramFiles", "")
                program_files_x86 = os.environ.get("ProgramFiles(x86)", "")
                for pf in [program_files, program_files_x86]:
                    if pf:
                        for java_dir in ["Java", "Eclipse Adoptium", "Microsoft"]:
                            java_path = os.path.join(pf, java_dir, "bin", "java.exe")
                            if os.path.isfile(java_path):
                                logger.info(
                                    "[find_java_executable] Success - path=%s",
                                    java_path,
                                )
                                return java_path

                raise FileNotFoundError(
                    "Could not find 'java.exe'. Ensure Java is installed and added to PATH or set JAVA_PATH in config."
                )
            else:
                java_path = subprocess.run(
                    ["which", "java"], capture_output=True, text=True
                ).stdout.strip()
                if not java_path or not os.path.isfile(java_path):
                    raise FileNotFoundError(
                        "Could not find 'java'. Ensure Java is installed and added to PATH or set JAVA_PATH in config."
                    )
                logger.info("[find_java_executable] Success - path=%s", java_path)
                return java_path
        except Exception as e:
            error_message = "[find_java_executable] Error: %s" % (e,)
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            raise

    def extract_plantuml_content(self, content: str) -> Optional[str]:
        """Extract PlantUML content from markdown code block or return as-is"""
        logger.info("[extract_plantuml_content] Start")

        if not content or not isinstance(content, str):
            logger.info("[extract_plantuml_content] Empty or invalid content")
            return None

        try:
            # Check if content contains PlantUML code blocks
            pattern = r"```(?:plantuml|puml)?\s*\n(.*?)```"
            matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

            if matches:
                # Extract first PlantUML block
                puml_content = matches[0].strip()
                logger.info(
                    "[extract_plantuml_content] Extracted from markdown code block"
                )
                return puml_content

            # Check if content is already PlantUML (contains @startuml)
            if "@startuml" in content.lower():
                logger.info("[extract_plantuml_content] Content is already PlantUML")
                return content.strip()

            # If no PlantUML found, return None
            logger.warning("[extract_plantuml_content] No PlantUML content found")
            return None

        except Exception as e:
            error_message = f"[extract_plantuml_content] Error: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            return None

    def generate_puml_image(self, puml_content: str) -> Optional[str]:
        """Generate base64-encoded PNG image from PlantUML content"""
        logger.info("[generate_puml_image] Start")
        if not puml_content:
            logger.warning("[generate_puml_image] Empty puml_content")
            return None

        try:
            # Get paths
            project_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            plantuml_jar_path = os.path.join(project_dir, "plantuml.jar")
            if not os.path.exists(plantuml_jar_path):
                logger.warning(
                    "[generate_puml_image] plantuml.jar not found at %s",
                    plantuml_jar_path,
                )
                return None

            java_path = self.find_java_executable()

            with tempfile.TemporaryDirectory() as temp_dir:
                puml_file_path = os.path.join(temp_dir, "diagram.puml")

                # Write PUML file
                with open(puml_file_path, "w", encoding="utf-8") as puml_file:
                    puml_file.write(puml_content.strip())

                # Generate PNG
                subprocess.run(
                    [
                        java_path,
                        "-DPLANTUML_LIMIT_SIZE=8192",
                        "-Dfile.encoding=UTF-8",
                        "-jar",
                        plantuml_jar_path,
                        "-tpng",
                        puml_file_path,
                    ],
                    check=False,
                    capture_output=True,
                )

                # Check if PNG was generated
                generated_png_path = puml_file_path.replace(".puml", ".png")
                if os.path.exists(generated_png_path):
                    # Read and encode to base64
                    with open(generated_png_path, "rb") as img_file:
                        image_bytes = img_file.read()
                        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                        logger.info(
                            "[generate_puml_image] Success - size=%s bytes",
                            len(image_bytes),
                        )
                        return image_base64

            logger.warning("[generate_puml_image] PNG file was not generated")
            return None
        except Exception as e:
            error_message = "[generate_puml_image] Error: %s" % (e,)
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            return None

    # #endregion


detail_design_service = DetailDesignService()
