"""
Page routes for HTML templates
Centralizes all screen/page endpoints to keep main.py clean
"""

from app.services.logs_service import save_exception_log_sync
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.config import get_config
from app.core.logging import setup_logging

# Initialize logger and config
logger = setup_logging()
config = get_config()

# Initialize templates
templates = Jinja2Templates(directory="templates")

# Create router for page routes
page_router = APIRouter()


# region Public Routes


@page_router.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    Root endpoint - redirect to login
    """
    logger.info("[root] Root page accessed")
    try:
        return templates.TemplateResponse("login.html", {"request": request})
    except Exception as e:
        error_message = f"[root] Error rendering root page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """
    Login page endpoint
    """
    logger.info("[login_page] Login page accessed")
    try:
        return templates.TemplateResponse(
            "login.html",
            {
                "request": request,
                "MAX_LENGTH_EMAIL": config.MAX_LENGTH_EMAIL,
                "MAX_LENGTH_PASS": config.MAX_LENGTH_PASS,
            },
        )
    except Exception as e:
        error_message = f"[login_page] Error rendering login page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """
    Dashboard page endpoint
    """
    logger.info("[dashboard] Dashboard page accessed")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse("dashboard.html", {"request": request})
    except Exception as e:
        error_message = f"[dashboard] Error rendering dashboard page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/projects", response_class=HTMLResponse)
async def projects(request: Request):
    """
    Projects page endpoint
    """
    logger.info("[projects] Projects page accessed")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse("projects.html", {"request": request})
    except Exception as e:
        error_message = f"[projects] Error rendering projects page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/projects/new", response_class=HTMLResponse)
async def create_project(request: Request):
    """
    Create project page endpoint
    """
    logger.info("[create_project] Create project page accessed")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "project/create_project.html", {"request": request}
        )
    except Exception as e:
        error_message = f"[create_project] Error rendering create project page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/projects/{project_id}/settings", response_class=HTMLResponse)
async def project_settings(request: Request, project_id: str):
    """
    Project settings page endpoint
    """
    logger.info(
        f"[project_settings] Project settings page accessed - project_id={project_id}"
    )
    if not project_id:
        logger.warning("[project_settings] Missing project_id")
        raise ValueError("project_id is required")

    try:
        return templates.TemplateResponse(
            "project/update_project.html",  # file HTML settings
            {"request": request, "project_id": project_id},
        )
    except Exception as e:
        error_message = f"[project_settings] Error rendering settings page - project_id={project_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}", response_class=HTMLResponse)
async def project_detail(request: Request, project_id: str):
    """
    Project detail page endpoint
    """
    logger.info(
        f"[project_detail] Project detail page accessed - project_id={project_id}"
    )

    if not project_id:
        logger.warning("[project_detail] Missing project_id")
        raise ValueError("project_id is required")

    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "project_detail.html",
            {
                "request": request,
                "project_id": project_id,
                "GIT_CHECK_INTERVAL": config.GIT_CHECK_INTERVAL,
            },
        )
    except Exception as e:
        error_message = f"[project_detail] Error rendering project detail page - project_id={project_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/rd/{file_id}", response_class=HTMLResponse)
async def rd_detail(request: Request, project_id: str, file_id: str):
    """
    Requirement document detail page endpoint
    """
    logger.info(
        f"[rd_detail] RD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[rd_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[rd_detail] Missing file_id")
        raise ValueError("file_id is required")

    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/requirement_design_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[rd_detail] Error rendering RD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/bd/{file_id}", response_class=HTMLResponse)
async def bd_detail(request: Request, project_id: str, file_id: str):
    """
    Basic design detail page endpoint
    """
    logger.info(
        f"[bd_detail] BD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[bd_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[bd_detail] Missing file_id")
        raise ValueError("file_id is required")

    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/basic_design_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[bd_detail] Error rendering BD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/pd/{file_id}", response_class=HTMLResponse)
async def pd_detail(request: Request, project_id: str, file_id: str):
    """
    Detail design detail page endpoint
    """
    logger.info(
        f"[pd_detail] PD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[pd_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[pd_detail] Missing file_id")
        raise ValueError("file_id is required")

    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/detail_design_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[pd_detail] Error rendering PD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/src/{file_id}", response_class=HTMLResponse)
async def src_detail(request: Request, project_id: str, file_id: str):
    """
    Source code detail page endpoint
    """
    logger.info(
        f"[src_detail] PD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[src_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[src_detail] Missing file_id")
        raise ValueError("file_id is required")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/source_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[src_detail] Error rendering PD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/utd/{file_id}", response_class=HTMLResponse)
async def utd_detail(request: Request, project_id: str, file_id: str):
    """
    Unit test design detail page endpoint
    """
    logger.info(
        f"[utd_detail] PD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[utd_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[utd_detail] Missing file_id")
        raise ValueError("file_id is required")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/unit_test_design_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[utd_detail] Error rendering PD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/projects/{project_id}/utc/{file_id}", response_class=HTMLResponse)
async def utc_detail(request: Request, project_id: str, file_id: str):
    """
    Unit test code detail page endpoint
    """
    logger.info(
        f"[utc_detail] PD detail page accessed - project_id={project_id}, file_id={file_id}"
    )

    if not project_id:
        logger.warning("[utc_detail] Missing project_id")
        raise ValueError("project_id is required")

    if not file_id:
        logger.warning("[utc_detail] Missing file_id")
        raise ValueError("file_id is required")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "file_detail/unit_test_code_detail.html",
            {"request": request, "project_id": project_id, "file_id": file_id},
        )
    except Exception as e:
        error_message = f"[utc_detail] Error rendering PD detail page - project_id={project_id}, file_id={file_id}: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/user-management", response_class=HTMLResponse)
async def user_management(request: Request):
    """
    User management page endpoint
    """
    logger.info("[user_management] User management page accessed")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "user_management.html",
            {
                "request": request,
                "MAX_LENGTH_EMAIL": config.MAX_LENGTH_EMAIL,
                "MAX_LENGTH_NAME": config.MAX_LENGTH_NAME,
                "MAX_LENGTH_PASS": config.MAX_LENGTH_PASS,
            },
        )
    except Exception as e:
        error_message = f"[user_management] Error rendering user management page: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


@page_router.get("/access-management-right", response_class=HTMLResponse)
async def access_management_right(request: Request):
    """
    Access management rights page endpoint
    """
    logger.info("[access_management_right] Access management rights page accessed")
    try:
        # TODO: Add authentication check here
        return templates.TemplateResponse(
            "access_management_right.html", {"request": request}
        )
    except Exception as e:
        error_message = (
            f"[access_management_right] Error rendering access management page: {e}"
        )
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)
        raise


@page_router.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    logger.info("[health_check] Health check requested")
    try:
        return {"status": "healthy", "message": "Service is running"}
    except Exception as e:
        error_message = f"[health_check] Error in health check: {e}"
        logger.error(error_message)
        save_exception_log_sync(e, error_message, __name__)

        raise


# endregion
