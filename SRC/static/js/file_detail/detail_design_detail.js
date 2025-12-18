/**
 * Detail Design Document Detail Page JavaScript
 * Handles the detail design document detail page functionality
 */

import {
  renderSidebarFileList,
  convertStatusToString,
  getFileSyncStatus,
  hasValidCommitId,
} from "../commons/file_List.js";
import { RD_MESSAGES } from "../commons/error_messages.js";

/**
 * Enable live markdown preview (realtime)
 */
const setupLivePreview = () => {
  try {
    const codeEditor = document.getElementById("pdCodeEditor");
    if (!codeEditor) return;

    codeEditor.addEventListener("input", async (e) => {
      const content = e.target.value;
      pdState.codeContent = content;

      // Skip real-time preview update for activity_diagram
      const fileType = pdState.fileData?.file_type || "";
      if (fileType === "activity_diagram") return;

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
let pdState = {
  projectId: null,
  fileId: null,
  fileData: null,
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
 * Get detail design file details
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File data
 */
const getRequirementFile = async (projectId, fileId) => {
  if (!projectId || !fileId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_AND_FILE_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/detail-design/${fileId}`;
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
 * Save detail design file
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
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/detail-design/${fileId}`;
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
 * Get all detail design documents for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of files
 */
const getRequirementDocumentsList = async (projectId) => {
  if (!projectId) {
    throw new Error(RD_MESSAGES.PROJECT_ID_REQUIRED);
  }

  try {
    const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/detail-design`;
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

    const files =
      responseData.data?.detail_design_list || responseData.data?.files || [];
    return files;
  } catch (error) {
    throw error;
  }
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
    const codeEditor = document.getElementById("pdCodeEditor");
    if (!codeEditor) return;

    codeEditor.value = content || "";
    pdState.codeContent = content || "";
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
    const previewEl = document.getElementById("pdPreview");
    if (!previewEl) return;

    if (!content || content.trim() === "") {
      previewEl.innerHTML = `<p>${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
      pdState.previewContent = "";
      return;
    }

    // Resolve local images in markdown before parsing
    let resolvedContent = content;
    if (window.MarkdownImageResolver && pdState.projectId) {
      try {
        // Fallback: if file_path not available, create from collection prefix + file_name
        const filePath =
          pdState.fileData?.file_path ||
          (pdState.fileData?.file_name ? `PD/${pdState.fileData.file_name}` : "PD/");
        resolvedContent =
          await window.MarkdownImageResolver.resolveMarkdownImages(
            content,
            filePath,
            pdState.projectId
          );
      } catch (resolveError) {
      }
    }

    const htmlContent = parseMarkdownToHtml(resolvedContent);
    previewEl.innerHTML = htmlContent;
    pdState.previewContent = content;

  } catch (error) {
    renderPreviewFallback(content);
  }
};

/**
 * Render image preview (for image type)
 * @param {string} base64Content - Base64 image content
 * @param {boolean} hideCode - Whether to hide code section (default: true)
 */
const renderImagePreview = (base64Content, hideCode = true) => {
  try {
    if (hideCode) {
      hideCodeSection();
    }
    showImagePreview(base64Content, !hideCode);

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
// #endregion

// #region Public Functions - Data Loading
/**
 * Load detail design file data
 */
const loadFileData = async () => {
  if (!pdState.projectId || !pdState.fileId) return;

  window.BaseUtils.showLoading();

  try {
    const [fileData, projectData] = await Promise.all([
      getRequirementFile(pdState.projectId, pdState.fileId),
      getProject(pdState.projectId),
    ]);

    pdState.fileData = fileData;
    renderHeader(fileData, projectData);

    // Detail design content is directly in fileData.content
    const content = fileData.content || "";
    const contentType = fileData.type || "markdown";
    const fileType = fileData.file_type || "";
    const fileName = fileData.file_name || "";
    const images = fileData.images || null;

    pdState.contentType = contentType;

    // Priority: activity_diagram with images (show alongside code), then raw image files, then markdown preview
    if (fileType === "activity_diagram" && images) {
      showCodeSection();
      renderCodeEditor(content);
      updateEditorMode(false);
      renderImagePreview(images, false); // show with code
    } else if (contentType === "image" || isImageFile(fileName)) {
      renderImagePreview(content);
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
      const projectId = pdState?.projectId;

      // Get tab from URL query parameter to preserve it when navigating back
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab") || "detailDesign";

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
    const codeEditor = document.getElementById("pdCodeEditor");

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
  const codeEditor = document.getElementById("pdCodeEditor");

  if (!saveBtn || !codeEditor) return;

  if (!pdState.isEditable) {
    saveBtn.style.display = "none";
    return;
  }
  const currentCode = codeEditor.value;
  const hasChanges = currentCode !== pdState.codeContent;

  saveBtn.style.display = hasChanges ? "block" : "none";
};

/**
 * Handle expand code and preview buttons
 */
const handleExpandCode = () => {
  try {
    if (!pdState.expandListenersAttached) {
      document.addEventListener("click", (e) => {
        if (e.target.closest("#expandCodeBtn")) {
          onExpandCodeClick(e);
        }
        if (e.target.closest("#expandPreviewBtn")) {
          onExpandPreviewClick(e);
        }
      });

      pdState.expandListenersAttached = true;
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
// #endregion

// #region Public Functions - Initialization
/**
 * Initialize the page
 */
const init = async () => {
  try {
    const { projectId, fileId } = extractIdsFromUrl();

    if (!projectId || !fileId) {
      window.showAlert(RD_MESSAGES.INVALID_URL_PARAMETERS, "error");
      window.location.href = "/projects";
      return;
    }

    pdState.projectId = projectId;
    pdState.fileId = fileId;

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
    const pdIndex = pathParts.indexOf("pd");

    if (projectIndex === -1 || pdIndex === -1) {
      return { projectId: null, fileId: null };
    }

    const projectId = pathParts[projectIndex + 1];
    const fileId = pathParts[pdIndex + 1];
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

/**
 * Check if file name is an image file based on extension
 * @param {string} fileName - File name
 * @returns {boolean} True if file is an image
 */
const isImageFile = (fileName) => {
  if (!fileName) return false;

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
  const lowerFileName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerFileName.endsWith(ext));
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
  const previewEl = document.getElementById("pdPreview");
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
 * @param {boolean} showWithCode - Whether to show alongside code section (default: false)
 */
const showImagePreview = (base64Content, showWithCode = false) => {
  const previewSection = document.getElementById("previewSection");
  if (previewSection) {
    if (showWithCode) {
      // Show alongside code section (50/50 split)
      previewSection.style.flex = "0 0 calc(50% - 10px)";
      previewSection.style.width = "calc(50% - 10px)";
      previewSection.style.maxWidth = "calc(50% - 10px)";
    } else {
      // Full width mode
      previewSection.style.flex = "1";
      previewSection.style.width = "100%";
      previewSection.style.maxWidth = "100%";
    }
    previewSection.style.display = "flex";
  }

  const container = document.querySelector(".code-preview-container");
  if (container) {
    if (showWithCode) {
      // Don't add image-mode class when showing with code
      container.classList.remove("image-mode");
    } else {
      container.classList.add("image-mode");
    }
  }

  const previewEl = document.getElementById("pdPreview");
  if (previewEl) {
    const imageSrc = base64Content.startsWith("data:")
      ? base64Content
      : `data:image/png;base64,${base64Content}`;
    previewEl.innerHTML = `<img src="${imageSrc}" alt="Preview" style="max-width: 100%; height: auto; display: block; margin: 0 auto; bobder-radius: 4px;">`;
    pdState.previewContent = base64Content;
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
  const actionSection = document.getElementById("pdActionSection");
  if (actionSection) {
    actionSection.style.display =
      targetTab === "tabContent-batchProcessing" ? "flex" : "none";
  }

  const gitContent = document.getElementById("pdGitContent");
  if (gitContent) {
    gitContent.style.display =
      targetTab === "tabContent-git" ? "block" : "none";
  }
};

const loadGitFiles = async () => {
  if (!pdState.projectId) return;

  try {
    const files = await getRequirementDocumentsList(pdState.projectId);
    pdState.gitFiles = files || [];
    renderGitFileList(files || []);
    await updateGitBranchInfo(files || []);
  } catch (error) {
    window.showAlert(RD_MESSAGES.GIT_FILES_LOAD_FAILED, "error");
    renderGitFileList([]);
  }
};
/**
 * Load content for selected tab
 * @param {string} targetTab - Target tab ID
 */
const loadTabContent = (targetTab) => {
  if (targetTab === "tabContent-git") {
    if (pdState.projectId) {
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
  const codeEditor = document.getElementById("pdCodeEditor");
  const saveBtn = document.getElementById("saveCodeBtn");

  if (!codeEditor) {
    window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
    return;
  }

  if (!pdState.isEditable) return;

  if (!pdState.projectId || !pdState.fileId) {
    window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
    return;
  }

  const content = codeEditor.value;
  window.BaseUtils.showLoading();

  try {
    const responseData = await saveRequirementFile(pdState.projectId, pdState.fileId, content);
    pdState.codeContent = content;

    if (saveBtn) {
      saveBtn.style.display = "none";
    }

    if (responseData && responseData.images) {
      const fileType = pdState.fileData?.file_type || "";
      const hideCode = fileType !== "activity_diagram";
      if (fileType === "activity_diagram") {
        showCodeSection();
      }
      renderImagePreview(responseData.images, hideCode);
      if (pdState.fileData) {
        pdState.fileData.images = responseData.images;
      }
    }
  } catch (error) {
    throw error;
  } finally {
    window.BaseUtils.hideLoading();
    await loadGitFiles();
  }
};

/**
 * Call this function when toggling between edit/readOnly mode
 * or when loading new file content
 */
const updateEditorMode = (isEditable) => {
  pdState.isEditable = isEditable;
  const codeEditor = document.getElementById("pdCodeEditor");

  if (codeEditor) {
    codeEditor.readOnly = !isEditable;
    console.log('updateEditorMode:', { isEditable, readOnly: codeEditor.readOnly }); // Debug
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

  pdState.isCodeExpanded = !pdState.isCodeExpanded;
  pdState.isPreviewExpanded = false;

  container.classList.remove("code-expanded", "preview-expanded");

  if (pdState.isCodeExpanded) {
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

  pdState.isPreviewExpanded = !pdState.isPreviewExpanded;
  pdState.isCodeExpanded = false;

  container.classList.remove("code-expanded", "preview-expanded");

  if (pdState.isPreviewExpanded) {
    container.classList.add("preview-expanded");
  }
};

/**
 * Handle copy code action
 */
const onCopyCode = async () => {
  const codeEditor = document.getElementById("pdCodeEditor");
  if (!codeEditor) return;

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
  if (!pdState.projectId || !pdState.fileId) {
    window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
    return;
  }

  const confirmed = await window.confirm(
    RD_MESSAGES.DETAIL_DESIGN_GENERATE_TITLE,
    RD_MESSAGES.DETAIL_DESIGN_GENERATE_CONFIRM
  );

  if (!confirmed) return;

  window.BaseUtils.showLoading();
  try {
    window.showAlert(
      RD_MESSAGES.DETAIL_DESIGN_GENERATE_IN_PROGRESS,
      "info"
    );
    // TODO: Call API to generate detail design
    // const url = `${RD_CONFIG.API_BASE_URL}${RD_CONFIG.PROJECTS_ENDPOINT}/${pdState.projectId}/generate/detail-design`;
    // const response = await window.APIClient.post(url, { files_id: [pdState.fileId] });
    // const responseData = await response.json();
    // if (response.ok) {
    //     window.showAlert(RD_MESSAGES.DETAIL_DESIGN_GENERATE_SUCCESS || "詳細設計書の生成が完了しました", "success");
    // }
  } catch (error) {
    window.showAlert(
      RD_MESSAGES.DETAIL_DESIGN_GENERATE_FAILED,
      "error"
    );
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

// #region Private Functions - Git Branch Info
/**
 * Update Git branch information in sidebar
 * @param {Array} files - Array of files
 */
const updateGitBranchInfo = async (files) => {
  try {
    const projectData = await getProject(pdState.projectId);
    const projectInfo = projectData.data || projectData;

    const gitContent = document.getElementById("pdGitContent");
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "0000/00/00 00:00";
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("[formatDateTime] Error:", error);
      return "0000/00/00 00:00";
    }
  };

  branchDateEl.textContent = branchDate
    ? formatDateTime(branchDate)
    : "0000/00/00 00:00";
};

/**
 * Set default branch information
 */
const setDefaultBranchInfo = () => {
  const gitContent = document.getElementById("pdGitContent");
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
const setupEventListeners = () => {
  handleTabSwitch();
  handleBackButton();
  handleSaveCode();
  handleExpandCode();
  handleExpandPreview();
  handleCopyCode();
  setupLivePreview();
  handleGenerateDetailDesign();
};

/**
 * Show default action section
 */
const showDefaultActionSection = () => {
  const actionSection = document.getElementById("pdActionSection");
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
