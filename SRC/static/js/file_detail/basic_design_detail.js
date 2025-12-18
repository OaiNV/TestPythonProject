/**
 * Requirement Document Detail Page JavaScript
 * Handles the requirement document detail page functionality
 */

import {
  renderSidebarFileList,
  convertStatusToString,
  getFileSyncStatus,
  hasValidCommitId,
} from "../commons/file_List.js";
import { RD_MESSAGES } from "../commons/error_messages.js";
import { showCommitMessageModal } from "../commons/commit_modal.js";
import { showConflictModal } from "../commons/conflict_modal.js";
import { GitPushEndpointPath } from "../commons/constants.js";
import {
  pushGitDocuments as pushGitDocumentsAPI,
  pullGitData as pullGitDataAPI,
  restoreGitDocument as restoreGitDocumentAPI,
} from "../commons/detail_git_api.js";
/**
 * Enable live markdown preview (realtime)
 */
const setupLivePreview = () => {
  try {
    const codeEditor = document.getElementById("bdCodeEditor");
    if (!codeEditor) return;

    codeEditor.addEventListener("input", async (e) => {
      const content = e.target.value;
      bdState.codeContent = content;
      await renderPreview(content);
    });

  } catch (error) {
    throw error;
  }
};

// #region Constants
const RD_CONFIG = {
  API_BASE_URL: "/api",
  PROJECTS_ENDPOINT: "/projects",
  TIMEOUT: 30000,
};
// #endregion

// #region State Management
let bdState = {
  projectId: null,
  fileId: null,
  fileData: null,
  syncStatus: "",
  codeContent: "",
  previewContent: "",
  isCodeExpanded: false,
  isPreviewExpanded: false,
  gitFiles: [],
  expandListenersAttached: false,
  isEditable: true,
};
// #endregion

// #region Public Functions - API
/**
 * Get requirement document file details
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File data
 */
const getRequirementFile = async (projectId, fileId) => {
  if (!projectId || !fileId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_AND_FILE_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design/${fileId}`;
    const response = await window.APIClient.get(url);
    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseData.error_message ||
        responseData.message ||
        RD_MESSAGES.FILE_LOAD_FAILED;
      window.showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    const fileData = responseData.data || responseData;
    return fileData;
  } catch (error) {
    throw error;
  }
};

/**
 * Save requirement document file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} content - File content
 * @returns {Promise<Object>} Save result
 */
const saveRequirementFile = async (projectId, fileId, content) => {
  if (!projectId || !fileId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_AND_FILE_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design/${fileId}`;
    const response = await window.APIClient.put(url, {
      content: content,
    });
    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseData.error_message ||
        responseData.message ||
        RD_MESSAGES.FILE_SAVE_FAILED;
      window.showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    window.showAlert(RD_MESSAGES.FILE_SAVE_SUCCESS, "success");
    return responseData.data || responseData;
  } catch (error) {
    throw error;
  }
};

/**
 * Get project details
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
const getProject = async (projectId) => {
  if (!projectId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || data.message || RD_MESSAGES.PROJECT_LOAD_FAILED;
      window.showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all requirement documents for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of files
 */
const getRequirementDocumentsList = async (projectId) => {
  if (!projectId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design`;
    const response = await window.APIClient.get(url);
    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseData.error_message ||
        responseData.message ||
        RD_MESSAGES.FILES_LIST_LOAD_FAILED;
      window.showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    const files = responseData.data?.files || [];
    return files;
  } catch (error) {
    throw error;
  }
};

/**
 * Push documents to Git
 * @param {string} projectId - Project ID
 * @param {Array<string>} fileIds - Array of file IDs to push
 * @param {string} commitMessage - Commit message
 * @param {string} userName - Git username
 * @param {string} tokenPassword - Git token/password
 * @param {string} endpointPath - Endpoint path (e.g., "basic-design")
 * @returns {Promise<Object>} Push result
 */
const pushGitDocuments = async (
  projectId,
  fileIds,
  commitMessage,
  userName,
  tokenPassword,
  endpointPath
) => {
  return await pushGitDocumentsAPI({
    projectId,
    fileIds,
    commitMessage,
    userName,
    tokenPassword,
    endpointPath,
    apiBaseUrl: RD_CONFIG.API_BASE_URL,
    projectsEndpoint: RD_CONFIG.PROJECTS_ENDPOINT,
    defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
    showAlert: window.showAlert,
  });
};

/**
 * Pull data from Git
 * @param {string} projectId - Project ID
 * @param {string} userName - Git username
 * @param {string} tokenPassword - Git token/password
 * @param {boolean} forceOverride - Force override local changes
 * @returns {Promise<Object>} Pull result
 */
const pullGitData = async (
  projectId,
  userName,
  tokenPassword = null,
  forceOverride = false
) => {
  return await pullGitDataAPI({
    projectId,
    userName,
    tokenPassword,
    forceOverride,
    apiBaseUrl: RD_CONFIG.API_BASE_URL,
    projectsEndpoint: RD_CONFIG.PROJECTS_ENDPOINT,
    defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
    showAlert: window.showAlert,
  });
};

/**
 * Restore document marked as delete_push
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} userName - Git username
 * @param {string} tokenPassword - Git token/password
 * @param {string} endpointPath - Endpoint path
 * @returns {Promise<Object>} Restore response
 */
const restoreGitDocument = async (
  projectId,
  fileId,
  userName,
  tokenPassword,
  endpointPath
) => {
  return await restoreGitDocumentAPI({
    projectId,
    fileId,
    userName,
    tokenPassword,
    endpointPath,
    apiBaseUrl: RD_CONFIG.API_BASE_URL,
    projectsEndpoint: RD_CONFIG.PROJECTS_ENDPOINT,
    defaultErrorMessage: RD_MESSAGES.RESTORE_FAILED,
    showAlert: window.showAlert,
  });
};
// #endregion

// #region Public Functions - UI Rendering
/**
 * Render file header information
 * @param {Object} fileData - File data
 * @param {Object} projectData - Project data
 */
const renderHeader = (fileData, projectData) => {
  if (!fileData) return;

  try {
    renderFileName(fileData);
    if (projectData) {
      renderRepoInfo(projectData);
    }
    renderCommitDate(fileData);

  } catch (error) {
    throw error;
  }
};

/**
 * Render code editor content
 * @param {string} content - Code content
 */
const renderCodeEditor = (content) => {
  try {
    const codeEditor = document.getElementById("bdCodeEditor");
    if (!codeEditor) return;

    codeEditor.value = content || "";
    bdState.codeContent = content || "";
  } catch (error) {
    throw error;
  }
};

/**
 * Render preview content (markdown will be parsed to HTML)
 * @param {string} content - Preview content (markdown text)
 */
const renderPreview = async (content) => {
  try {
    const previewEl = document.getElementById("bdPreview");
    if (!previewEl) return;
    if (!content || content.trim() === "") {
      previewEl.innerHTML = `<p>${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
      bdState.previewContent = "";
      return;
    }

    // Resolve local images in markdown before parsing
    let resolvedContent = content;
    if (window.MarkdownImageResolver && bdState.projectId) {
      try {
        // Fallback: if file_path not available, create from collection prefix + file_name
        const filePath =
          bdState.fileData?.file_path ||
          (bdState.fileData?.file_name
            ? `BD/${bdState.fileData.file_name}`
            : "BD/");

        resolvedContent =
          await window.MarkdownImageResolver.resolveMarkdownImages(
            content,
            filePath,
            bdState.projectId
          );
      } catch (resolveError) {
        throw resolveError;
      }
    }

    const htmlContent = parseMarkdownToHtml(resolvedContent);
    previewEl.innerHTML = htmlContent;
    bdState.previewContent = content;
  } catch (error) {
    renderPreviewFallback(content);
  }
};

/**
 * Render image preview (for image type)
 * @param {string} base64Content - Base64 image content
 */
const renderImagePreview = (base64Content) => {
  try {
    hideCodeSection();
    showImagePreview(base64Content);

  } catch (error) {
    throw error;
  }
};

/**
 * Reset to markdown mode (show code section)
 */
const resetToMarkdownMode = () => {
  try {
    showCodeSection();
    removeImageMode();

  } catch (error) {
    throw error;
  }
};

/**
 * Render Git file list using common component
 * @param {Array} files - Array of file objects
 */
const renderGitFileList = (files) => {
  if (!files || !Array.isArray(files)) return;

  try {
    const filteredFiles = filterFilesWithSyncStatus(files);
    renderSidebarFileList("gitFileList", filteredFiles, false);

  } catch (error) {
    throw error;
  }
};

/**
 * Update Save/Restore button visibility based on sync_status
 * @param {string} syncStatus - Current sync status
 */
const updateRestoreVisibility = (syncStatus) => {
  const normalizedStatus = (syncStatus || "").toLowerCase();
  const isDeletePush = normalizedStatus === "delete_push";

  try {
    const saveBtn = document.getElementById("saveCodeBtn");
    const restoreBtn = document.getElementById("bdRestoreBtn");

    if (saveBtn) {
      if (isDeletePush) {
        saveBtn.classList.add("hidden");
      } else {
        saveBtn.classList.remove("hidden");
      }
    }

    if (restoreBtn) {
      if (isDeletePush) {
        restoreBtn.classList.remove("hidden");
        restoreBtn.disabled = false;
      } else {
        restoreBtn.classList.add("hidden");
        restoreBtn.disabled = true;
      }
    }

  } catch (error) {
    throw error;
  }
};
// #endregion

// #region Public Functions - Data Loading
/**
 * Load requirement document file data
 */
const loadFileData = async () => {
  if (!bdState.projectId || !bdState.fileId) return;

  window.BaseUtils.showLoading();

  try {
    const [fileData, projectData] = await Promise.all([
      getRequirementFile(bdState.projectId, bdState.fileId),
      getProject(bdState.projectId),
    ]);

    bdState.fileData = fileData;
    bdState.syncStatus = fileData.sync_status || "";
    updateRestoreVisibility(bdState.syncStatus);
    renderHeader(fileData, projectData);

    const bdContent = fileData.bd_content || {};
    const contentType = bdContent.type || "markdown";
    const content = bdContent.content || fileData.content || "";

    bdState.contentType = contentType;

    if (contentType === "image") {
      if (content && typeof content === "string" && content.trim() !== "") {
        renderImagePreview(content);
      } else {
        resetToMarkdownMode();
        const previewEl = document.getElementById("bdPreview");
        if (previewEl) {
          previewEl.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
        }
      }
    } else {
      resetToMarkdownMode();
      renderCodeEditor(content);
      updateEditorMode(false);
      await renderPreview(content);
    }

  } catch (error) {
    window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
  } finally {
    window.BaseUtils.hideLoading();
  }
};

/**
 * Load Git files (all requirement documents in the project)
 */
export const loadGitFiles = async () => {
  if (!bdState.projectId) return;

  try {
    const files = await getRequirementDocumentsList(bdState.projectId);
    bdState.gitFiles = files || [];
    renderGitFileList(files || []);
    await updateGitBranchInfo(files || []);
  } catch (error) {
    window.showAlert(RD_MESSAGES.GIT_FILES_LOAD_FAILED, "error");
    renderGitFileList([]);
  }
};
// #endregion

// #region Public Functions - Event Handlers
/**
 * Handle tab switching
 */
const handleTabSwitch = () => {
  try {
    const tabs = document.querySelectorAll(".rd-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        onTabClick(tab);
      });
    });
    const activeTab = document.querySelector(".rd-tab.active");
    if (activeTab) {
      onTabClick(activeTab);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Handle back button click
 */
const handleBackButton = () => {
  try {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;

    backBtn.addEventListener("click", () => {
      const projectId = bdState?.projectId;

      // Get tab from URL query parameter to preserve it when navigating back
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab") || "basicDesign";

      if (projectId) {
        // Navigate back with tab parameter to restore the tab
        window.location.href = `/projects/${projectId}?tab=${tab}`;
      } else {
        window.location.href = "/projects";
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Handle save code button
 */
const handleSaveCode = () => {
  try {
    const saveBtn = document.getElementById("saveCodeBtn");
    const codeEditor = document.getElementById("bdCodeEditor");
    if (!saveBtn) return;
    if (!codeEditor) return;

    saveBtn.style.display = "none";
    saveBtn.addEventListener("click", async () => {
      await onSaveCode();
    });
    codeEditor.addEventListener("input", () => {
      checkAndToggleSaveButton();
    });
  } catch (error) {
    throw error;
  }
};
/**
 * Check if code has changed and toggle save button visibility
 */
const checkAndToggleSaveButton = () => {
  const saveBtn = document.getElementById("saveCodeBtn");
  const codeEditor = document.getElementById("bdCodeEditor");

  if (!saveBtn || !codeEditor) return;

  if (!bdState.isEditable) {
    saveBtn.style.display = "none";
    return;
  }

  const currentCode = codeEditor.value;
  const hasChanges = currentCode !== bdState.codeContent;

  saveBtn.style.display = hasChanges ? "block" : "none";
};
/**
 * Handle expand code and preview buttons
 */
const handleExpandCode = () => {
  try {
    if (!bdState.expandListenersAttached) {
      document.addEventListener("click", (e) => {
        if (e.target.closest("#expandCodeBtn")) {
          onExpandCodeClick(e);
        }
        if (e.target.closest("#expandPreviewBtn")) {
          onExpandPreviewClick(e);
        }
      });

      bdState.expandListenersAttached = true;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Handle expand preview button
 */
const handleExpandPreview = () => { };

/**
 * Handle copy code button
 */
const handleCopyCode = () => {
  try {
    const copyBtn = document.getElementById("copyCodeBtn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async () => {
      await onCopyCode();
    });

  } catch (error) {
    throw error;
  }
};

/**
 * Handle generate detail design button
 */
const handleGenerateDetailDesign = () => {
  try {
    const generateBtn = document.getElementById("generateDetailDesignBtn");
    if (!generateBtn) return;

    generateBtn.addEventListener("click", async () => {
      await onGenerateDetailDesign();
    });

  } catch (error) {
    throw error;
  }
};

/**
 * Handle restore button click
 */
const handleRestoreButton = () => {
  try {
    const restoreBtn = document.getElementById("bdRestoreBtn");
    if (!restoreBtn) return;

    restoreBtn.addEventListener("click", async () => {
      restoreBtn.disabled = true;
      try {
        await onRestoreFile();
      } finally {
        restoreBtn.disabled = false;
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Execute restore workflow
 */
const onRestoreFile = async () => {
  if (!bdState.projectId || !bdState.fileId) {
    window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
    return;
  }

  window.BaseUtils.showLoading();

  try {
    const projectResponse = await getProject(bdState.projectId);
    const projectInfo = projectResponse.data || projectResponse;
    const repoUrl = projectInfo.git?.repository;

    if (!repoUrl) {
      window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
      return;
    }

    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);
    const endpointPath = GitPushEndpointPath.BASIC_DESIGN;

    const restoreResult = await restoreGitDocument(
      bdState.projectId,
      bdState.fileId,
      userName,
      tokenPassword,
      endpointPath
    );

    const updatedStatus = (restoreResult?.sync_status || "push").toLowerCase();
    bdState.syncStatus = updatedStatus;
    if (bdState.fileData) {
      bdState.fileData.sync_status = updatedStatus;
    }

    updateRestoreVisibility(updatedStatus);
    window.showAlert(RD_MESSAGES.RESTORE_SUCCESS, "success");
    await loadGitFiles();
  } catch (error) {
    window.showAlert(RD_MESSAGES.RESTORE_FAILED, "error");
  } finally {
    window.BaseUtils.hideLoading();
  }
};
// #endregion

// #region Public Functions - Initialization
/**
 * Initialize the page
 */
const init = async () => {
  console.log("[init] Start");

  try {
    const { projectId, fileId } = extractIdsFromUrl();

    if (!projectId || !fileId) {
      window.showAlert(RD_MESSAGES.INVALID_URL_PARAMETERS, "error");
      window.location.href = "/projects";
      return;
    }

    bdState.projectId = projectId;
    bdState.fileId = fileId;

    setupEventListeners();
    showDefaultActionSection();
    await loadFileData();

  } catch (error) {
    window.showAlert(RD_MESSAGES.PAGE_INIT_FAILED, "error");
  }
};
// #endregion

// #region Private Functions - Helpers
/**
 * Extract project ID and file ID from URL
 * @returns {Object} Object with projectId and fileId
 */
const extractIdsFromUrl = () => {
  try {
    const pathParts = window.location.pathname.split("/");
    const projectIndex = pathParts.indexOf("projects");
    const bdIndex = pathParts.indexOf("bd");

    if (projectIndex === -1 || bdIndex === -1) {
      return { projectId: null, fileId: null };
    }

    const projectId = pathParts[projectIndex + 1];
    const fileId = pathParts[bdIndex + 1];

    return { projectId, fileId };
  } catch (error) {
    return { projectId: null, fileId: null };
  }
};

/**
 * Extract repository name from repository URL (part before .git)
 * @param {string} repoUrl - Repository URL
 * @returns {string} Repository name
 */
const extractRepoName = (repoUrl) => {
  if (!repoUrl) return RD_MESSAGES.REPOSITORY_NAME;

  try {
    let repoName = repoUrl.replace(/\.git$/, "");
    const match = repoName.match(/(?:[/:])([^/]+)$/);
    return match && match[1] ? match[1] : repoName;
  } catch (error) {
    console.error("[extractRepoName] Error:", error);
    return repoUrl || RD_MESSAGES.REPOSITORY_NAME;
  }
};

// Use BaseUtils.baseEscapeHtml directly - no wrapper needed

/**
 * Parse markdown to HTML
 * @param {string} content - Markdown content
 * @returns {string} HTML content
 */
const parseMarkdownToHtml = (content) => {
  if (typeof marked !== "undefined") {
    return marked.parse(content);
  }

  return `<pre>${window.BaseUtils?.baseEscapeHtml(content) || content}</pre>`;
};

/**
 * Render preview fallback (raw content)
 * @param {string} content - Content to display
 */
const renderPreviewFallback = (content) => {
  const previewEl = document.getElementById("bdPreview");
  if (previewEl) {
    const escapedContent =
      window.BaseUtils?.baseEscapeHtml(content || "") || content || "";
    previewEl.innerHTML = `<pre>${escapedContent}</pre>`;
  }
};
// #endregion

// #region Private Functions - UI Helpers
/**
 * Render file name in header
 * @param {Object} fileData - File data
 */
const renderFileName = (fileData) => {
  const fileNameEl = document.getElementById("fileName");
  if (fileNameEl && fileData) {
    fileNameEl.textContent = fileData.file_name || RD_MESSAGES.FILE_NAME;
  }
};

/**
 * Render repository information in header
 * @param {Object} projectData - Project data
 */
const renderRepoInfo = (projectData) => {
  const projectInfo = projectData.data || projectData;

  const repoNameEl = document.getElementById("repoName");
  if (repoNameEl) {
    const repoUrl =
      projectInfo.git?.repository ||
      projectInfo.repository_name ||
      projectInfo.repo_name ||
      "";
    const repoName = extractRepoName(repoUrl);
    repoNameEl.textContent = repoName;
  }

  const branchNameEl = document.getElementById("branchName");
  if (branchNameEl) {
    const branchName =
      projectInfo.git?.branch ||
      projectInfo.branch_name ||
      projectInfo.branch ||
      RD_MESSAGES.BRANCH_NAME;
    branchNameEl.textContent = branchName;
  }
};

/**
 * Render commit date in header
 * @param {Object} fileData - File data
 */
const renderCommitDate = (fileData) => {
  const updateDateEl = document.getElementById("updateDate");
  if (!updateDateEl || !fileData) return;

  const commitDate = fileData.updated_at || fileData.created_at;
  if (commitDate) {
    updateDateEl.textContent = window.BaseUtils?.formatDate(commitDate) || "";
  } else {
    updateDateEl.textContent =
      window.BaseUtils?.formatDate(new Date().toISOString()) || "";
  }
};

/**
 * Hide code section for image mode
 */
const hideCodeSection = () => {
  const codeSection = document.getElementById("codeSection");
  if (codeSection) {
    codeSection.style.display = "none";
  }

  const codeActions = document.querySelectorAll(
    ".code-actions .code-action-btn"
  );
  codeActions.forEach((btn) => {
    btn.style.display = "none";
  });
};

/**
 * Show code section
 */
const showCodeSection = () => {
  const codeSection = document.getElementById("codeSection");
  if (codeSection) {
    codeSection.style.display = "flex";
  }

  const codeActions = document.querySelectorAll(
    ".code-actions .code-action-btn"
  );
  codeActions.forEach((btn) => {
    btn.style.display = "flex";
  });
};

/**
 * Show image preview
 * @param {string} base64Content - Base64 image content
 */
const showImagePreview = (base64Content) => {
  if (
    !base64Content ||
    typeof base64Content !== "string" ||
    base64Content.trim() === ""
  ) {
    const previewEl = document.getElementById("bdPreview");
    if (previewEl) {
      previewEl.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
    }
    return;
  }

  try {
    const previewSection = document.getElementById("previewSection");
    if (previewSection) {
      previewSection.style.flex = "1";
      previewSection.style.width = "100%";
      previewSection.style.display = "flex";
    }

    const container = document.querySelector(".code-preview-container");
    if (container) {
      container.classList.add("image-mode");
    }

    const previewEl = document.getElementById("bdPreview");
    if (previewEl) {
      const imageSrc = base64Content.startsWith("data:")
        ? base64Content
        : `data:image/png;base64,${base64Content}`;
      previewEl.innerHTML = `<img src="${imageSrc}" alt="Preview" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px;">`;
      bdState.previewContent = base64Content;
    }

    console.log("[showImagePreview] Success");
  } catch (error) {
    console.error("[showImagePreview] Error:", error);
    const previewEl = document.getElementById("bdPreview");
    if (previewEl) {
      previewEl.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
    }
  }
};

/**
 * Remove image mode class
 */
const removeImageMode = () => {
  const container = document.querySelector(".code-preview-container");
  if (container) {
    container.classList.remove("image-mode");
  }
};
// #endregion

// #region Private Functions - Event Handlers
/**
 * Handle tab click
 * @param {HTMLElement} tab - Tab element
 */
const onTabClick = (tab) => {
  const targetTab = tab.getAttribute("data-tab");
  if (!targetTab) return;

  updateTabActiveState(tab, targetTab);
  updateTabContentVisibility(targetTab);
  loadTabContent(targetTab);
};

/**
 * Update active state of tabs
 * @param {HTMLElement} activeTab - Active tab element
 * @param {string} targetTab - Target tab ID
 */
const updateTabActiveState = (activeTab, targetTab) => {
  const tabs = document.querySelectorAll(".rd-tab");
  const tabContents = document.querySelectorAll(".rd-tab-content");

  tabs.forEach((t) => t.classList.remove("active"));
  tabContents.forEach((tc) => tc.classList.remove("active"));

  activeTab.classList.add("active");
  const targetContent = document.getElementById(targetTab);
  if (targetContent) {
    targetContent.classList.add("active");
  }
};

/**
 * Update visibility of tab content sections
 * @param {string} targetTab - Target tab ID
 */
const updateTabContentVisibility = (targetTab) => {
  const actionSection = document.getElementById("bdActionSection");
  if (actionSection) {
    actionSection.style.display =
      targetTab === "tabContent-batchProcessing" ? "flex" : "none";
  }

  const gitContent = document.getElementById("bdGitContent");
  if (gitContent) {
    gitContent.style.display =
      targetTab === "tabContent-git" ? "block" : "none";
  }
};

/**
 * Load content for selected tab
 * @param {string} targetTab - Target tab ID
 */
const loadTabContent = (targetTab) => {
  if (targetTab === "tabContent-git") {
    if (bdState.projectId) {
      loadGitFiles();
    } else {
      renderGitFileList([]);
    }
  }
};

/**
 * Handle save code action
 */
const onSaveCode = async () => {
  const codeEditor = document.getElementById("bdCodeEditor");
  const saveBtn = document.getElementById("saveCodeBtn");

  if (!codeEditor) {
    window.showAlert?.(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
    return;
  }

  if (!bdState.isEditable) return;

  if (!bdState.projectId || !bdState.fileId) {
    window.showAlert?.(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
    return;
  }

  const content = codeEditor.value;
  window.BaseUtils?.showLoading();

  try {
    await saveRequirementFile(bdState.projectId, bdState.fileId, content);
    bdState.codeContent = content;
    if (saveBtn) {
      saveBtn.style.display = "none";
    }
  } catch (error) {
  } finally {
    window.BaseUtils?.hideLoading();
    await loadGitFiles?.();
  }
};
/**
 * Call this function when toggling between edit/readOnly mode
 */
const updateEditorMode = (isEditable) => {
  bdState.isEditable = isEditable;
  const codeEditor = document.getElementById("bdCodeEditor");

  if (codeEditor) {
    codeEditor.readOnly = !isEditable;
  }

  checkAndToggleSaveButton();
};
/**
 * Handle expand code button click
 * @param {Event} e - Click event
 */
const onExpandCodeClick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  const container = document.querySelector(".code-preview-container");
  if (!container) return;

  bdState.isCodeExpanded = !bdState.isCodeExpanded;
  bdState.isPreviewExpanded = false;

  container.classList.remove("code-expanded", "preview-expanded");

  if (bdState.isCodeExpanded) {
    container.classList.add("code-expanded");
  }
};

/**
 * Handle expand preview button click
 * @param {Event} e - Click event
 */
const onExpandPreviewClick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  const container = document.querySelector(".code-preview-container");
  if (!container) return;

  bdState.isPreviewExpanded = !bdState.isPreviewExpanded;
  bdState.isCodeExpanded = false;

  container.classList.remove("code-expanded", "preview-expanded");

  if (bdState.isPreviewExpanded) {
    container.classList.add("preview-expanded");
  }
};

/**
 * Handle copy code action
 */
const onCopyCode = async () => {
  const codeEditor = document.getElementById("bdCodeEditor");
  if (!codeEditor) {
    window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
    return;
  }

  if (window.BaseUtils?.copyToClipboard) {
    await window.BaseUtils.copyToClipboard(codeEditor.value);
  } else {
    try {
      await navigator.clipboard.writeText(codeEditor.value);
      window.showAlert(RD_MESSAGES.CODE_COPIED, "success");
    } catch (error) {
      window.showAlert(RD_MESSAGES.CODE_COPY_FAILED, "error");
    }
  }
};

/**
 * Handle generate detail design action
 */
const onGenerateDetailDesign = async () => {
  if (!bdState.projectId || !bdState.fileId) {
    window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
    return;
  }

  const confirmed = await window.confirm(
    RD_MESSAGES.DETAIL_DESIGN_GENERATE_TITLE,
    RD_MESSAGES.DETAIL_DESIGN_GENERATE_CONFIRM
  );

  if (!confirmed) {
    return;
  }

  window.BaseUtils.showLoading();
  try {
    window.showAlert(RD_MESSAGES.DETAIL_DESIGN_GENERATE_IN_PROGRESS, "info");
    // TODO: Call API to generate detail design
    // const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${bdState.projectId}/generate/detail-design`;
    // const response = await window.APIClient.post(url, { files_id: [bdState.fileId] });
    // const responseData = await response.json();
    // if (response.ok) {
    //     window.showAlert(RD_MESSAGES.DETAIL_DESIGN_GENERATE_SUCCESS || "詳細設計書の生成が完了しました", "success");
    // }
  } catch (error) {
    window.showAlert(RD_MESSAGES.DETAIL_DESIGN_GENERATE_FAILED, "error");
  } finally {
    window.BaseUtils.hideLoading();
  }
};
// #endregion

// #region Private Functions - Filtering
/**
 * Filter out files that only have commit_id but no sync status icon
 * @param {Array} files - Array of file objects
 * @returns {Array} Filtered files
 */
const filterFilesWithSyncStatus = (files) => {
  if (!files || !Array.isArray(files)) return [];

  return files.filter((file) => {
    const fileHasCommitId = hasValidCommitId(file);
    const syncStatus = getFileSyncStatus(file);

    if (fileHasCommitId && (syncStatus === "" || syncStatus === "synced")) {
      return false;
    }

    return true;
  });
};

/**
 * Filter out files with sync_status = 'push'
 * @param {Array} files - Array of file objects
 * @returns {Array} Filtered files
 */
const filterNonPushedFiles = (files) => {
  if (!files || !Array.isArray(files)) return [];

  return files.filter((file) => {
    const syncStatus = getFileSyncStatus(file);
    return syncStatus !== "push";
  });
};
// #endregion

// #region Private Functions - Git File List
/**
 * Get all files from gitFileList div (no filtering)
 * @returns {Array<string>} Array of file IDs
 */
const getAllFilesFromGitFileList = () => {
  try {
    const gitFileList = document.getElementById("gitFileList");
    if (!gitFileList) return [];

    const fileItems = gitFileList.querySelectorAll(".file-item");
    if (!fileItems || fileItems.length === 0) return [];

    const fileIds = Array.from(fileItems)
      .map((item) => item.dataset.fileId)
      .filter((id) => id); // Filter out empty IDs
    return fileIds;
  } catch (error) {
    return [];
  }
};
// #endregion

// #region Private Functions - Git Branch Info
/**
 * Update Git branch information in sidebar
 * @param {Array} files - Array of files
 */
const updateGitBranchInfo = async (files) => {
  try {
    const projectData = await getProject(bdState.projectId);
    const projectInfo = projectData.data || projectData;

    const gitContent = document.getElementById("bdGitContent");
    if (!gitContent) return;

    updateBranchName(gitContent, projectInfo);
    updateBranchDate(gitContent, projectInfo, files);
  } catch (error) {
    setDefaultBranchInfo();
  }
};

/**
 * Update branch name in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 */
const updateBranchName = (gitContent, projectInfo) => {
  const branchNameEl = gitContent.querySelector("#branchName");
  if (branchNameEl) {
    const branchName =
      projectInfo.git?.branch ||
      projectInfo.branch_name ||
      projectInfo.branch ||
      "Branch Name";
    branchNameEl.textContent = branchName;
  }
};

/**
 * Update branch date in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 * @param {Array} files - Array of files
 */
const updateBranchDate = (gitContent, projectInfo, files) => {
  const branchDateEl = gitContent.querySelector("#branchDate");
  if (!branchDateEl) return;

  let branchDate =
    projectInfo.updated_at ||
    projectInfo.last_commit_date ||
    projectInfo.created_at;

  const filteredFiles = filterNonPushedFiles(files);
  if (filteredFiles && filteredFiles.length > 0) {
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      const dateA = new Date(a.updated_at || 0);
      const dateB = new Date(b.updated_at || 0);
      return dateB - dateA;
    });
    branchDate = sortedFiles[0].updated_at || branchDate;
  }

  branchDateEl.textContent = branchDate
    ? formatDateTime(branchDate)
    : "0000/00/00 00:00";
};

/**
 * Set default branch information
 */
const setDefaultBranchInfo = () => {
  const gitContent = document.getElementById("bdGitContent");
  if (!gitContent) return;

  const branchNameEl = gitContent.querySelector("#branchName");
  const branchDateEl = gitContent.querySelector("#branchDate");

  if (branchNameEl) {
    branchNameEl.textContent = "Branch Name";
  }
  if (branchDateEl) {
    branchDateEl.textContent = "0000/00/00 00:00";
  }
};
// #endregion

// #region Private Functions - Setup
/**
 * Setup all event listeners
 */
// #region Git Push and Pull Handlers
/**
 * Handle Push Button action
 */
const handlePushButton = async () => {
  try {
    if (!bdState.projectId) {
      window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    // Get all files from gitFileList (no filtering)
    const fileIds = getAllFilesFromGitFileList();

    if (!fileIds || fileIds.length === 0) {
      window.showAlert(RD_MESSAGES.NO_PUSHABLE_FILES, "warning");
      return;
    }

    // Show commit message modal
    const commitMessage = await showCommitMessageModal();

    if (!commitMessage) return;

    // Get Git credentials
    const projectData = await getProject(bdState.projectId);
    const projectInfo = projectData.data || projectData;
    const repoUrl = projectInfo.git?.repository;

    if (!repoUrl) {
      window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
      return;
    }

    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Determine endpoint path (basic-design for bd_detail)
    const endpointPath = GitPushEndpointPath.BASIC_DESIGN;

    // Call API to push files to Git
    window.BaseUtils.showLoading();
    try {
      const result = await pushGitDocuments(
        bdState.projectId,
        fileIds,
        commitMessage,
        userName,
        tokenPassword,
        endpointPath
      );

      // Check if result indicates conflict
      if (result && result.isConflict && result.conflictFiles) {
        await showConflictModal(result.conflictFiles, {
          projectId: bdState.projectId,
          source: "push",
        });
        // Don't refresh file list on conflict
        return;
      }

      window.showAlert(RD_MESSAGES.GIT_PUSH_SUCCESS, "success");

      // Refresh file list to update sync status
      await loadGitFiles();
    } catch (error) {
      throw error;
      // Error message already shown by API function
    } finally {
      window.BaseUtils.hideLoading();
    }
  } catch (error) {
    window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
  }
};

/**
 * Handle Pull Button action
 */
const handlePullButton = async () => {
  try {
    if (!bdState.projectId) {
      window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    // Get Git credentials
    const projectData = await getProject(bdState.projectId);
    const projectInfo = projectData.data || projectData;
    const repoUrl = projectInfo.git?.repository;

    if (!repoUrl) {
      window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
      return;
    }

    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Call API to pull data from Git
    window.BaseUtils.showLoading();
    try {
      const result = await pullGitData(
        bdState.projectId,
        userName,
        tokenPassword,
        false // forceOverride = false by default
      );

      // Check if result indicates conflict
      if (result && result.isConflict && result.conflictFiles) {
        const forcePullOverride = async () => {
          window.BaseUtils.showLoading();
          try {
            await pullGitData(bdState.projectId, userName, tokenPassword, true);
            window.showAlert(RD_MESSAGES.GIT_PULL_SUCCESS, "success");
            await loadGitFiles();
          } catch (error) {
            throw error;
          } finally {
            window.BaseUtils.hideLoading();
          }
        };

        await showConflictModal(result.conflictFiles, {
          projectId: bdState.projectId,
          source: "pull",
          onUseRemoteVersion: forcePullOverride,
        });
        // Don't refresh file list on conflict
        return;
      }

      window.showAlert(RD_MESSAGES.GIT_PULL_SUCCESS, "success");

      // Refresh file list to update sync status
      await loadGitFiles();
    } catch (error) {
      throw error;
      // Error message already shown by API function
    } finally {
      window.BaseUtils.hideLoading();
    }
  } catch (error) {
    window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
  }
};

/**
 * Setup Git buttons (pullBtn and pushBtn) event listeners
 */
const setupGitButtons = () => {
  try {
    const pullBtn = document.getElementById("pullBtn");
    const pushBtn = document.getElementById("pushBtn");

    if (pullBtn) {
      pullBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handlePullButton();
      });
    } else {
    }

    if (pushBtn) {
      pushBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handlePushButton();
      });
    } else {
    }

  } catch (error) {
    throw error;
  }
};
// #endregion

const setupEventListeners = () => {
  handleTabSwitch();
  handleBackButton();
  setupGitButtons();
  handleSaveCode();
  handleExpandCode();
  handleExpandPreview();
  handleCopyCode();
  setupLivePreview();
  handleGenerateDetailDesign();
  handleRestoreButton();
};

/**
 * Show default action section
 */
const showDefaultActionSection = () => {
  const actionSection = document.getElementById("bdActionSection");
  if (actionSection) {
    actionSection.style.display = "flex";
  }
};
// #endregion

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
