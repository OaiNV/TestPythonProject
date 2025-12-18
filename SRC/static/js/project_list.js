// Project List page functionality

import { PROJECT_ALERTS } from "./commons/error_messages.js";
// Configuration constants
const PROJECTS_CONFIG = {
  API_BASE_URL: "/api",
  PROJECTS_ENDPOINT: "/projects",
  TIMEOUT: 30000,
};
// DOM elements
let projectsGrid;
let newProjectBtn;
let deleteProjectBtn;

// Selection state
let selectedProjectIds = new Set();
let lastSelectedId = null;

const { showLoading, hideLoading } = window.BaseUtils;
const updateDeleteButtonVisibility = () => {
  if (!deleteProjectBtn) return;
  const hasSelection = selectedProjectIds.size > 0;
  deleteProjectBtn.style.display = hasSelection ? "inline-flex" : "none";
};

// Initialize page
const initProjectListPage = () => {
  console.log("[ProjectListPage] Initializing project list page");
  getProjectListDOMElements();
  setupProjectListEventListeners();
  loadProjectList();
  setupGitPullButtons();
};

// Get DOM elements
const getProjectListDOMElements = () => {
  projectsGrid = document.getElementById("projectsGrid");
  newProjectBtn = document.getElementById("newProjectBtn");
  deleteProjectBtn = document.getElementById("deleteProjectBtn");
};

// Setup event listeners
const setupProjectListEventListeners = () => {
  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", handleNewProject);
  }

  if (deleteProjectBtn) {
    deleteProjectBtn.addEventListener("click", handleDeleteProject);
    // Hidden by default until selection exists
    deleteProjectBtn.style.display = "none";
  }

  // Click to select (supports Ctrl multi-select)
  if (projectsGrid) {
    projectsGrid.addEventListener("click", handleProjectCardClick);
    projectsGrid.addEventListener("dblclick", handleProjectCardDoubleClick);
  }
};

// Load project list from API
const loadProjectList = async () => {
  console.log("[ProjectListPage] Loading project list");

  const userInfoStr = localStorage.getItem("user_info");
  if (!userInfoStr) {
    console.error("[ProjectListPage] User not logged in");
    return;
  }

  try {
    showLoading();

    const userInfo = JSON.parse(userInfoStr);
    const userId = userInfo.user_id;

    if (!userId) {
      console.error("[ProjectListPage] User ID not found");
      hideLoading();
      return;
    }

    const url = `${PROJECTS_CONFIG.API_BASE_URL}${PROJECTS_CONFIG.PROJECTS_ENDPOINT
      }?user_id=${encodeURIComponent(userId)}`;
    const response = await window.APIClient.get(url);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error_message || data.message || "Failed to fetch project list"
      );
    }

    console.log("[ProjectListPage] Project list loaded successfully");
    renderProjectList(data.data.projects);
  } catch (error) {
    console.error("[ProjectListPage] Error loading project list:", error);

    if (error.message !== "SESSION_EXPIRED") {
      showAlert(error.message, "error");
    }
  } finally {
    hideLoading();
  }
};

// Render project list grid
const renderProjectList = (projects) => {
  if (!projectsGrid) return;

  if (!projects || projects.length === 0) {
    projectsGrid.innerHTML = `
            <div class="no-projects">
                <p>まだプロジェクトがありません。新しいプロジェクトを作成してください。</p>
            </div>
        `;
    // No items, ensure delete hidden
    updateDeleteButtonVisibility();
    return;
  }

  projectsGrid.innerHTML = projects
    .map((project) => createProjectCard(project))
    .join("");

  // Re-apply selected class after render
  selectedProjectIds.forEach((id) => {
    const card = projectsGrid.querySelector(
      `.project-card[data-project-id="${id}"]`
    );
    if (card) card.classList.add("selected");
  });

  updateDeleteButtonVisibility();
};

// Get status display text and style
const getStatusDisplay = (statusManage) => {
  const status = statusManage?.status;
  const statusMap = {
    not_processed: { text: "未実行", color: "#8F9BA4" },
    generating: { text: "実行中", color: "#8F9BA4" },
    completed: { text: "完了", color: "#8F9BA4" },
    error: { text: "エラー", color: "#8F9BA4" },
    canceled: { text: "キャンセル", color: "#8F9BA4" },
  };

  return statusMap[status] || null;
};

// Create project card HTML
const createProjectCard = (project) => {
  const languageClass = getLanguageClass(project.language);
  const formattedDate = formatProjectDate(project.created_at);
  const statusDisplay = getStatusDisplay(project.status_manage);
  const showDropdown = project.git?.sync_status === "pull";
  const hasGit = project.git && project.git.branch;

  return `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-card-header">
                <div class="project-card-meta">
                    <span class="language-tag ${languageClass}">
                      <img 
                        src="/static/images/${project.language
      .toLowerCase()
      .replace("#", "sharp")}.png" 
                        alt="${project.language}" 
                        class="language-logo" 
                      />
                    </span>
                    <div class="project-meta-right">
                    ${hasGit
      ? `
                        <div class="branch-info">
                            <img src="/static/images/git.svg" class="icon-git">
                            ${project.git?.branch}
                        </div>
                        <img src="/static/images/commit-git.png" alt="" style="width: 22px; height: 22px;">
                        `
      : ``
    }
                        <span class="project-date">${formattedDate}</span>
                    </div>
                </div>
                ${showDropdown
      ? `<div class="status-dropdown">
                    <img src="/static/images/right-down.png" alt="" style="width: 22px; height: 22px;">
                </div>`
      : ""
    }
            </div>
            <h3 class="project-name">
                <span class="project-title">${project.name}</span>
                ${statusDisplay
      ? `<span class="status-badge" style="background-color: ${statusDisplay.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${statusDisplay.text}</span>`
      : ""
    }
            </h3>
            <p class="project-description">${project.description}</p>
        </div>
    `;
};

// Get language CSS class
const getLanguageClass = (language) => {
  const languageMap = {
    "C#": "csharp",
    Python: "python",
    Java: "java",
  };
  return languageMap[language] || "python";
};

// Format project date
const formatProjectDate = (dateString) => {
  if (!dateString) return "0000/00/00 00:00";

  try {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\//g, "/");
  } catch (error) {
    return "0000/00/00 00:00";
  }
};

// Event handlers
const handleNewProject = () => {
  console.log("[ProjectListPage] New project clicked");
  window.location.href = "/projects/new";
  // TODO: Implement new project logic
  // showAlert("New project functionality will be implemented", "info");
};

const handleDeleteProject = async () => {
  console.log("[ProjectListPage] Delete project clicked");

  const count = selectedProjectIds.size;
  if (count === 0) {
    return;
  }

  const title = PROJECT_ALERTS.DELETE_TITLE;
  const message = PROJECT_ALERTS.DELETE_MESSAGE(count);

  const confirmed = await confirm(title, message);
  if (!confirmed) {
    return;
  }

  try {
    showLoading();
    const result = await deleteProjects(Array.from(selectedProjectIds));
    if (result?.status === 200) {
      showAlert(PROJECT_ALERTS.DELETE_SUCCESS, "success");
      clearAllSelections();
      await loadProjectList();
    } else {
      showAlert(PROJECT_ALERTS.DELETE_FAILURE, "error");
    }
  } catch (err) {
    console.error("[ProjectListPage] Delete error:", err);
    showAlert(PROJECT_ALERTS.DELETE_FAILURE, "error");
  } finally {
    hideLoading();
  }
};

const deleteProjects = async (projectIds) => {
  console.log("[ProjectListPage] Deleting projects");

  // Input validation
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    throw new Error(PROJECT_ALERTS.DELETE_NO_TARGET);
  }

  try {
    const url = `${PROJECTS_CONFIG.API_BASE_URL}${PROJECTS_CONFIG.PROJECTS_ENDPOINT}`;
    const response = await window.APIClient.delete(url, {
      project_id: projectIds,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) { }

    if (!response.ok) {
      const message =
        data?.error_message || data?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    console.log("[ProjectListPage] Projects deleted successfully");
    return { status: response.status, data };
  } catch (error) {
    console.error("[ProjectListPage] Error deleting projects:", error);
    throw error;
  }
};

// Handle single click selection
const handleProjectCardClick = (event) => {
  const projectCard = event.target.closest(".project-card");
  if (!projectCard || !projectsGrid.contains(projectCard)) return;

  const projectId = projectCard.getAttribute("data-project-id");
  if (!projectId) return;

  const isCtrl = event.ctrlKey || event.metaKey; // support Cmd on macOS

  if (isCtrl) {
    // Toggle selection
    if (selectedProjectIds.has(projectId)) {
      selectedProjectIds.delete(projectId);
      projectCard.classList.remove("selected");
    } else {
      selectedProjectIds.add(projectId);
      projectCard.classList.add("selected");
      lastSelectedId = projectId;
    }
  } else {
    // If clicked item is already selected, deselect it
    if (selectedProjectIds.has(projectId)) {
      selectedProjectIds.delete(projectId);
      projectCard.classList.remove("selected");
    } else {
      // Single selection
      clearAllSelections();
      selectedProjectIds.add(projectId);
      projectCard.classList.add("selected");
      lastSelectedId = projectId;
    }
  }

  updateDeleteButtonVisibility();
};

const clearAllSelections = () => {
  selectedProjectIds.forEach((id) => {
    const card = projectsGrid.querySelector(
      `.project-card[data-project-id="${id}"]`
    );
    if (card) card.classList.remove("selected");
  });
  selectedProjectIds.clear();
};

// Handle project card double click
const handleProjectCardDoubleClick = (event) => {
  const projectCard = event.target.closest(".project-card");
  if (!projectCard) return;

  const projectId = projectCard.getAttribute("data-project-id");
  if (!projectId) return;

  console.log("[ProjectListPage] Project card double clicked:", projectId);
  navigateToProjectDetail(projectId);
};

// Set up Git Pull Button
const setupGitPullButtons = () => {
  if (!projectsGrid) return;

  projectsGrid.querySelectorAll(".git-pull-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest(".project-card");
      if (!card) return;

      const projectId = card.dataset.projectId;
      const branch =
        card.querySelector(".branch-info")?.textContent.trim() || "main";
      const reloadBtn = btn;
      const iconDropdown = card.querySelector(".status-dropdown");
      const loadingIcon = btn.querySelector(".btn-loading");
      const btnText = btn.querySelector(".btn-text");

      // Start loading
      reloadBtn.disabled = true;
      loadingIcon.style.display = "inline-block";
      btnText.textContent = "Pulling...";

      try {
        const url = `/api/projects/${projectId}/git-pull?branch=${encodeURIComponent(
          branch
        )}`;
        const response = await window.APIClient.post(url);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Git pull failed");

        // Handle new commits
        if (data.newCommits) {
          iconDropdown.style.display = "block"; // show dropdown icon
          reloadBtn.disabled = false;
          btnText.textContent = "Git Pull";
        } else {
          iconDropdown.style.display = "none"; // hide icon
          reloadBtn.disabled = true;
          btnText.textContent = "Git Pull";
        }
      } catch (err) {
        console.error("Git pull failed", projectId, err);
        showAlert(PROJECT_ALERTS.GIT_PULL_FAILURE, "error");
        btnText.textContent = "Git Pull";
        reloadBtn.disabled = false;
        iconDropdown.style.display = "none";
      } finally {
        loadingIcon.style.display = "none";
      }
    });
  });
};

// Navigate to project detail page
const navigateToProjectDetail = (projectId) => {
  console.log("[ProjectListPage] Navigating to project detail:", projectId);
  window.location.href = `/projects/${projectId}`;
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  Auth.checkAuth();
  initProjectListPage();
});
