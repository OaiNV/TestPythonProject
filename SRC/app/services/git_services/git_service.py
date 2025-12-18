"""
Git service functions for repository operations
"""

import logging
import re
import httpx
from typing import Optional, List, Any, Dict
from git import Repo
from app.services.git_services.git_validate import (
    validate_git_url,
    handle_git_api_error,
)
from app.utils.constants import GitType, DOCIFYCODE_DIRECTORY_NAME
from app.utils.http_helpers import raise_http_error
from fastapi import status

from app.services.logs_service import save_exception_log_sync, LogLevel

logger = logging.getLogger(__name__)


async def get_default_branch(
    repository_url: str,
    user_name: Optional[str],
    token_password: Optional[str],
    git_type: Optional[GitType] = None,
) -> str:
    """
    Get default branch from Git repository (supports GitHub and GitBucket)

    Args:
        repository_url: Git repository URL
        user_name: Git username (optional)
        token_password: Git token/password (optional)
        git_type: Git type (GitHub/GitBucket), if None will be auto-detected

    Returns:
        Default branch name

    Raises:
        HTTPException: If repository access fails
    """
    logger.info(f"[get_default_branch] Start - repository_url={repository_url}")

    if not repository_url:
        logger.warning("[get_default_branch] Missing repository_url")
        raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

    try:
        # Determine Git type if not provided
        if not git_type:
            git_type = await validate_git_url(repository_url)
            if not git_type:
                logger.warning(
                    f"[get_default_branch] Invalid URL format - repository_url={repository_url}"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL"
                )

        # Get default branch based on Git type
        if git_type == GitType.GITHUB:
            return await _get_github_default_branch(
                repository_url, user_name, token_password
            )
        elif git_type == GitType.GITBUCKET:
            return await _get_gitbucket_default_branch(
                repository_url, user_name, token_password
            )
        else:
            logger.warning(
                f"[get_default_branch] Unsupported Git type - git_type={git_type}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

    except Exception as e:
        error_message = (
            f"[get_default_branch] Error - repository_url={repository_url}: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


async def _get_github_default_branch(
    repository_url: str,
    user_name: Optional[str],
    token: Optional[str],
) -> str:
    """Get default branch from GitHub repository"""
    logger.info(f"[_get_github_default_branch] Start - repository_url={repository_url}")

    try:
        # Extract owner and repo from URL
        url_pattern = r"github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$"
        match = re.search(url_pattern, repository_url)
        if not match:
            logger.warning(
                f"[_get_github_default_branch] Invalid GitHub URL format - repository_url={repository_url}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

        owner = match.group(1)
        repo = match.group(2)

        # Prepare headers
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DocifyCode",
        }

        # Add authentication if token provided
        if token:
            headers["Authorization"] = f"token {token}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get repository info
            repo_url = f"https://api.github.com/repos/{owner}/{repo}"
            repo_response = await client.get(repo_url, headers=headers)

            handle_git_api_error(
                repo_response, repository_url, "_get_github_default_branch"
            )

            repo_data = repo_response.json()
            default_branch = repo_data.get("default_branch", "main")

            logger.info(
                f"[_get_github_default_branch] Success - default_branch={default_branch}"
            )
            return default_branch

    except Exception as e:
        error_message = (
            f"[_get_github_default_branch] Error - repository_url={repository_url}: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


async def _get_gitbucket_default_branch(
    repository_url: str,
    user_name: Optional[str],
    password: Optional[str],
) -> str:
    """Get default branch from GitBucket repository"""
    logger.info(
        f"[_get_gitbucket_default_branch] Start - repository_url={repository_url}"
    )

    if not user_name or not password:
        logger.warning(
            "[_get_gitbucket_default_branch] Missing authentication credentials"
        )
        raise_http_error(
            status.HTTP_401_UNAUTHORIZED, error_key="GIT_AUTHENTICATION_FAILED"
        )

    try:
        # Extract protocol, host, and repository path from URL (same logic as validate_gitbucket_repository)
        url_pattern = r"(https?://)([^/]+)/(.+?)(?:\.git)?/?$"
        match = re.search(url_pattern, repository_url)
        if not match:
            logger.warning(
                f"[_get_gitbucket_default_branch] Invalid GitBucket URL format - repository_url={repository_url}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

        protocol = match.group(1)  # http:// or https://
        host = match.group(2)
        repo_path = match.group(3)

        # Remove /git/ prefix if present
        if repo_path.startswith("git/"):
            repo_path = repo_path[4:]

        # Prepare authentication
        auth = (user_name, password)

        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            # Get repository info
            api_url = f"{protocol}{host}/api/v3/repos/{repo_path}"
            repo_response = await client.get(api_url, auth=auth)

            handle_git_api_error(
                repo_response, repository_url, "_get_gitbucket_default_branch"
            )

            repo_data = repo_response.json()
            default_branch = repo_data.get("default_branch", "master")

            logger.info(
                f"[_get_gitbucket_default_branch] Success - default_branch={default_branch}"
            )
            return default_branch

    except Exception as e:
        error_message = f"[_get_gitbucket_default_branch] Error - repository_url={repository_url}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


async def get_list_branches(
    repository_url: str,
    user_name: str,
    token_password: Optional[str],
    git_type: Optional[GitType] = None,
) -> List[str]:
    """
    Get list of branches from Git repository (supports GitHub and GitBucket)

    Args:
        repository_url: Git repository URL
        user_name: Git username (required)
        token_password: Git token/password (optional)
        git_type: Git type (GitHub/GitBucket), if None will be auto-detected

    Returns:
        List of branch names

    Raises:
        HTTPException: If repository access fails
    """
    logger.info(f"[get_list_branches] Start - repository_url={repository_url}")

    if not repository_url or not user_name:
        logger.warning("[get_list_branches] Missing required parameters")
        raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

    try:
        # Determine Git type if not provided
        if not git_type:
            git_type = await validate_git_url(repository_url)
            if not git_type:
                logger.warning(
                    f"[get_list_branches] Invalid URL format - repository_url={repository_url}"
                )
                raise_http_error(
                    status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL"
                )

        # Get branches based on Git type
        if git_type == GitType.GITHUB:
            return await _get_github_branches(repository_url, user_name, token_password)
        elif git_type == GitType.GITBUCKET:
            return await _get_gitbucket_branches(
                repository_url, user_name, token_password
            )
        else:
            logger.warning(
                f"[get_list_branches] Unsupported Git type - git_type={git_type}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

    except Exception as e:
        error_message = (
            f"[get_list_branches] Error - repository_url={repository_url}: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


async def _get_github_branches(
    repository_url: str,
    user_name: Optional[str],
    token: Optional[str],
) -> List[str]:
    """Get list of branches from GitHub repository"""
    logger.info(f"[_get_github_branches] Start - repository_url={repository_url}")

    try:
        # Extract owner and repo from URL
        url_pattern = r"github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$"
        match = re.search(url_pattern, repository_url)
        if not match:
            logger.warning(
                f"[_get_github_branches] Invalid GitHub URL format - repository_url={repository_url}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

        owner = match.group(1)
        repo = match.group(2)

        # Prepare headers
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DocifyCode",
        }

        # Add authentication if token provided
        if token:
            headers["Authorization"] = f"token {token}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get all branches with pagination
            all_branches = []
            page = 1
            per_page = 100

            while True:
                branches_url = f"https://api.github.com/repos/{owner}/{repo}/branches?per_page={per_page}&page={page}"
                branches_response = await client.get(branches_url, headers=headers)

                handle_git_api_error(
                    branches_response, repository_url, "_get_github_branches"
                )

                branches_data = branches_response.json()

                # If this page has no more branches => break
                if not branches_data:
                    logger.info(
                        f"[_get_github_branches] No more branches on page {page}"
                    )
                    break

                # Add branch names to the list
                page_branches = [
                    branch.get("name") for branch in branches_data if branch.get("name")
                ]
                all_branches.extend(page_branches)
                logger.info(
                    f"[_get_github_branches] Page {page}: found {len(page_branches)} branches"
                )

                # If the number of branches returned is less than per_page => no more pages
                if len(branches_data) < per_page:
                    break

                # Otherwise -> go to the next page
                page += 1

            logger.info(
                f"[_get_github_branches] Success - found {len(all_branches)} branches total"
            )
            return all_branches

    except Exception as e:
        error_message = (
            f"[_get_github_branches] Error - repository_url={repository_url}: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


async def _get_gitbucket_branches(
    repository_url: str,
    user_name: str,
    password: Optional[str],
) -> List[str]:
    """Get list of branches from GitBucket repository"""
    logger.info(f"[_get_gitbucket_branches] Start - repository_url={repository_url}")

    if not user_name or not password:
        logger.warning("[_get_gitbucket_branches] Missing authentication credentials")
        raise_http_error(
            status.HTTP_401_UNAUTHORIZED, error_key="GIT_AUTHENTICATION_FAILED"
        )

    try:
        # Extract protocol, host, and repository path from URL
        url_pattern = r"(https?://)([^/]+)/(.+?)(?:\.git)?/?$"
        match = re.search(url_pattern, repository_url)
        if not match:
            logger.warning(
                f"[_get_gitbucket_branches] Invalid GitBucket URL format - repository_url={repository_url}"
            )
            raise_http_error(status.HTTP_400_BAD_REQUEST, error_key="GIT_INVALID_URL")

        protocol = match.group(1)  # http:// or https://
        host = match.group(2)
        repo_path = match.group(3)

        # Remove /git/ prefix if present
        if repo_path.startswith("git/"):
            repo_path = repo_path[4:]

        # Prepare authentication
        auth = (user_name, password)

        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            # Get list of branches
            branches_url = f"{protocol}{host}/api/v3/repos/{repo_path}/branches"
            branches_response = await client.get(branches_url, auth=auth)

            handle_git_api_error(
                branches_response, repository_url, "_get_gitbucket_branches"
            )

            branches_data = branches_response.json()
            branch_names = [
                branch.get("name") for branch in branches_data if branch.get("name")
            ]

            logger.info(
                f"[_get_gitbucket_branches] Success - found {len(branch_names)} branches"
            )
            return branch_names

    except Exception as e:
        error_message = (
            f"[_get_gitbucket_branches] Error - repository_url={repository_url}: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


def clone_repository(
    clone_url: str, branch_name: str, temp_dir: str, depth: Optional[int] = None
) -> Repo:
    """
    Clone Git repository to temporary directory

    Args:
        clone_url: Git repository clone URL (with credentials if needed)
        branch_name: Branch name to clone
        temp_dir: Temporary directory path to clone into
        depth: Optional depth limit for shallow clone. If None, clones full history

    Returns:
        GitPython Repo object

    Raises:
        Exception: If clone fails
    """
    logger.info(f"[clone_repository] Start - branch_name={branch_name}, depth={depth}")

    try:
        if depth is not None:
            # Shallow clone with depth limit
            repo = Repo.clone_from(
                clone_url, temp_dir, branch=branch_name, depth=depth, single_branch=True
            )
        else:
            # Full clone without depth limit to get all commits history
            repo = Repo.clone_from(
                clone_url, temp_dir, branch=branch_name, single_branch=True
            )
        logger.info("[clone_repository] Repository cloned successfully")
        return repo
    except Exception as e:
        error_message = f"[clone_repository] Error cloning repository: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


def get_all_commit_ids(repo: Any, branch_name: str) -> List[str]:
    """
    Get all commit IDs from a branch

    Args:
        repo: GitPython Repo object
        branch_name: Branch name

    Returns:
        List of commit IDs (hexsha) from newest to oldest
    """
    logger.info(f"[get_all_commit_ids] Start - branch_name={branch_name}")

    try:
        # Use git rev-list to get all commits from the branch (more reliable than git log)
        # rev-list shows all commits reachable from the branch
        commit_log = repo.git.rev_list(branch_name).strip()

        if commit_log:
            commit_ids = [
                line.strip() for line in commit_log.split("\n") if line.strip()
            ]
            logger.info(
                f"[get_all_commit_ids] Success - found {len(commit_ids)} commits"
            )
            return commit_ids

        # Fallback: try git log if rev-list doesn't work
        logger.warning("[get_all_commit_ids] rev-list returned empty, trying git log")
        commit_log = repo.git.log(branch_name, "--format=%H", "--all").strip()

        if commit_log:
            commit_ids = [
                line.strip() for line in commit_log.split("\n") if line.strip()
            ]
            logger.info(
                f"[get_all_commit_ids] Success via git log - found {len(commit_ids)} commits"
            )
            return commit_ids
        else:
            # Fallback: try iter_commits
            logger.warning(
                "[get_all_commit_ids] Git log returned empty, trying iter_commits"
            )
            commit_ids = []
            for commit in repo.iter_commits(branch_name):
                commit_ids.append(commit.hexsha)

            if commit_ids:
                logger.info(
                    f"[get_all_commit_ids] Success via iter_commits - found {len(commit_ids)} commits"
                )
                return commit_ids
            else:
                # Last fallback: return HEAD commit
                head_commit = repo.head.commit.hexsha
                logger.warning(
                    f"[get_all_commit_ids] No commits found, using HEAD commit as fallback: {head_commit}"
                )
                return [head_commit]

    except Exception as e:
        error_message = f"[get_all_commit_ids] Error: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        # Fallback: try iter_commits
        try:
            logger.warning("[get_all_commit_ids] Trying iter_commits as fallback")
            commit_ids = []
            for commit in repo.iter_commits(branch_name):
                commit_ids.append(commit.hexsha)

            if commit_ids:
                logger.info(
                    f"[get_all_commit_ids] Success via iter_commits fallback - found {len(commit_ids)} commits"
                )
                return commit_ids
        except Exception as e:
            error_message = (
                f"[get_all_commit_ids] iter_commits fallback also failed: {e}"
            )
            logger.warning(error_message)
            save_exception_log_sync(e, error_message, __name__, level=LogLevel.WARNING)

        # Last fallback: return at least HEAD commit
        try:
            head_commit = repo.head.commit.hexsha
            logger.warning(
                f"[get_all_commit_ids] Using HEAD commit as last fallback: {head_commit}"
            )
            return [head_commit]
        except Exception as e:
            error_message = f"[get_all_commit_ids] All fallbacks failed: {e}"
            logger.error(error_message)
            save_exception_log_sync(e, error_message, __name__)

            return []


def normalize_directory_paths(
    directory_paths: Dict[str, str],
) -> Dict[str, str]:
    """
    Normalize directory paths when src is "/" (root)
    When src is "/", other directories (rd, bd, pd, etc.) are inside DOCIFYCODE_DIRECTORY_NAME

    Args:
        directory_paths: Dictionary of directory paths

    Returns:
        Normalized directory paths dictionary
    """
    logger.info("[normalize_directory_paths] Start")

    try:
        if not directory_paths:
            return directory_paths

        normalized_paths = directory_paths.copy()
        src_path = normalized_paths.get("src", "")

        # Check if src is "/" or empty (root directory)
        normalized_src = src_path.strip().strip("/") if src_path else ""
        is_root_src = not normalized_src or normalized_src == ""

        if is_root_src:
            # When src is root, other directories are inside DOCIFYCODE_DIRECTORY_NAME
            # Directory keys that should be prefixed (excluding src)
            directory_keys_to_prefix = [
                "rd",
                "bd",
                "pd",
                "cd",
                "md",
                "id",
                "fs",
                "ac",
                "utd",
                "utc",
            ]

            for key in directory_keys_to_prefix:
                dir_path = normalized_paths.get(key)
                if dir_path:
                    # Normalize path and add prefix if not already present
                    normalized_dir = dir_path.replace("\\", "/").strip("/")
                    if normalized_dir:
                        # Check if already has DOCIFYCODE_DIRECTORY_NAME prefix
                        if not normalized_dir.lower().startswith(
                            DOCIFYCODE_DIRECTORY_NAME.lower() + "/"
                        ):
                            normalized_paths[key] = (
                                f"{DOCIFYCODE_DIRECTORY_NAME}/{normalized_dir}"
                            )
                            logger.info(
                                f"[normalize_directory_paths] Added prefix to {key}: {normalized_paths[key]}"
                            )

        logger.info("[normalize_directory_paths] Success")
        return normalized_paths

    except Exception as e:
        error_message = f"[normalize_directory_paths] Error: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        return directory_paths


def normalize_target_directory(
    target_directory: str, src_path: Optional[str] = None
) -> str:
    """
    Normalize target_directory when src is "/" (root)
    When src is "/", other directories are inside DOCIFYCODE_DIRECTORY_NAME

    Args:
        target_directory: Target directory path
        src_path: Source directory path (optional, to check if src is root)

    Returns:
        Normalized target directory path
    """
    logger.info(
        f"[normalize_target_directory] Start - target_directory={target_directory}, src_path={src_path}"
    )

    try:
        if not target_directory:
            return target_directory

        # Check if src is "/" or empty (root directory)
        normalized_src = src_path.strip().strip("/") if src_path else ""
        is_root_src = not normalized_src or normalized_src == ""

        if is_root_src:
            # Normalize target directory
            normalized_target = target_directory.replace("\\", "/").strip("/")
            if normalized_target:
                # Check if already has DOCIFYCODE_DIRECTORY_NAME prefix
                if not normalized_target.lower().startswith(
                    DOCIFYCODE_DIRECTORY_NAME.lower() + "/"
                ):
                    normalized_target = (
                        f"{DOCIFYCODE_DIRECTORY_NAME}/{normalized_target}"
                    )
                    logger.info(
                        f"[normalize_target_directory] Added prefix: {normalized_target}"
                    )
                    return normalized_target

        logger.info("[normalize_target_directory] Success")
        return target_directory

    except Exception as e:
        error_message = f"[normalize_target_directory] Error: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        return target_directory
