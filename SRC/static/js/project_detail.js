/**
 * Project Detail JavaScript - Main Orchestration
 * Refactored modular architecture
 * ES6+ Functional Approach
 */

// Import all modules
import { PROJECT_MESSAGES, HTTP_MESSAGES } from './commons/error_messages.js';

// State Management
import {
  setProjectId,
  setProjectData,
  getProjectId,
  getProjectData,
  getSelectedFileIds,
  getDetailDesignData,
  ProjectState
} from './project_detail/project_detail_state.js';

// Helpers
import { extractProjectIdFromUrl } from './project_detail/project_detail_helpers.js';

// API
import { ProjectAPI } from './project_detail/project_detail_api.js';

// UI/Rendering
import {
  renderProjectHeader,
  updateBranchDropdown
} from './project_detail/project_detail_ui.js';

// Comments
import {
  loadComments,
  handleSendComment
} from './project_detail/project_detail_comments.js';

// Files
import {
  loadFiles,
  handleFileUpload,
  handleDeleteFiles
} from './project_detail/project_detail_files.js';

// Detail Design
import {
  loadDetailDesignFiles,
  initDetailDesignTab
} from './project_detail/project_detail_detail_design.js';

// Source Code
import {
  initSourceCodeTab,
  loadSourceTree,
  refreshSourceTree,
  getSourceCodeData
} from './project_detail/project_detail_source_code.js';

// Events
import {
  initProjectEventListeners,
  setupUploadButton,
  setupFileCheckboxes,
  triggerRepoCheck
} from './project_detail/project_detail_events.js';

import { renderSidebarFileList, MOCK_SIDEBAR_FILES } from './commons/file_List.js'
// #region Main Project Loading
/**
 * Load project data and initialize page
 */
const loadProjectData = async () => {
  console.log('[loadProjectData] Start');

  const projectId = getProjectId();
  if (!projectId) {
    console.error('[loadProjectData] No project ID');
    return;
  }

  showLoading();

  try {
    const result = await ProjectAPI.getProject(projectId);
    console.log("[Project] Data loaded:", result);

    const projectData = result.data || result;
    setProjectData(projectData);

    renderProjectHeader(projectData);
    await loadComments(projectId);
    await loadFiles(projectId);
    // File list will be updated automatically when loadFiles completes

    // Check if tab is specified in URL query parameter (from back navigation)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    
    if (tabParam) {
      // Restore the tab from URL parameter
      console.log("[loadProjectData] Restoring tab from URL:", tabParam);
      const tabMapping = {
        "requirement": "tabRequirementBtn",
        "basicDesign": "tabBasicDesignBtn",
        "detailDesign": "tabDetailDesignBtn",
        "sourceCode": "tabSourceCodeBtn",
        "unitTestSpec": "tabUnitTestSpecBtn",
        "unitTestCode": "tabUnitTestCodeBtn"
      };
      
      const tabButtonId = tabMapping[tabParam];
      if (tabButtonId) {
        const tabButton = document.getElementById(tabButtonId);
        if (tabButton) {
          // Remove tab parameter from URL to clean it up
          urlParams.delete("tab");
          const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "");
          window.history.replaceState({}, "", newUrl);
          
          // Click the tab button to restore it
          tabButton.click();
        }
      }
    } else {
      // Default: Ensure requirement tab is active and loaded on page load
      const requirementTab = document.getElementById('tabRequirementBtn');
      if (requirementTab) {
        requirementTab.click();
      }
    }

    // Trigger immediate repo check now that data is loaded
    triggerRepoCheck();

    console.log('[loadProjectData] Complete');
  } catch (error) {
    console.error("[Project] Load error:", error);
    showAlert(error.message, "error");
  } finally {
    hideLoading();
  }
};
// #endregion

// #region Update Project
/**
 * Handle project update
 * @param {string} projectName - Project name
 * @param {string} description - Project description
 */
const handleUpdateProject = async (projectName, description) => {
  console.log("[Update] Starting...");

  showLoading();

  try {
    const userInfo = window.Auth?.getUserInfo();
    if (!userInfo || !userInfo.user_id) {
      showAlert(PROJECT_MESSAGES.USER_NOT_FOUND, "error");
      return;
    }

    const requestBody = {
      user_id: userInfo.user_id,
    };

    if (projectName) requestBody.project_name = projectName;
    if (description !== undefined) requestBody.description = description;

    const projectId = getProjectId();
    const result = await ProjectAPI.updateProject(projectId, requestBody);

    console.log("[Update] Success:", result);
    showAlert(PROJECT_MESSAGES.PROJECT_UPDATED, "success");

    await loadProjectData();
  } catch (error) {
    console.error("[Update] Error:", error);
    showAlert(error.message, "error");
  } finally {
    hideLoading();
  }
};
// #endregion
//setting button
const setupSettingsButton = () => {
  const settingBtn = document.querySelector(".setting-wrapper .setting");
  if (!settingBtn) return;

  settingBtn.addEventListener("click", () => {
    const projectId = extractProjectIdFromUrl();
    if (!projectId) {
      console.error("[Settings] Project ID not found in URL");
      showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    window.location.href = `/projects/${projectId}/settings`;
  });
};

// #region Initialization
/**
 * Initialize the project detail page
 */
const initializeProjectDetail = () => {
  console.log("[Init] Page loading...");

  // Check authentication
  if (window.Auth && typeof window.Auth.checkAuth === 'function') {
    window.Auth.checkAuth();
  }

  // Extract and set project ID
  const projectId = extractProjectIdFromUrl();
  if (!projectId) {
    console.error("[Init] No project ID found");
    showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
    return;
  }

  setProjectId(projectId);
  console.log("[Init] Project ID:", projectId);

  setupSettingsButton();

  // Initialize event listeners
  initProjectEventListeners();

  // Load project data
  loadProjectData();

  // Setup upload buttons
  setupUploadButton();

  // Setup file checkboxes after table render
  setTimeout(() => {
    setupFileCheckboxes();
  }, 500);

  console.log("[Init] Initialization complete");
};
// #endregion

// #region DOMContentLoaded Event
document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeProjectDetail();
  } catch (error) {
    console.error('[DOMContentLoaded] Error:', error);
    showAlert('初期化エラーが発生しました', 'error');
  }
});
// #endregion

// #region Expose Global API
/**
 * Expose safe global API for external access
 */
window.projectDetail = {
  // Data getters
  getData: () => ({
    projectData: getProjectData(),
    selectedFileIds: getSelectedFileIds(),
  }),

  // Main functions
  loadProject: loadProjectData,
  loadComments: () => {
    const projectId = getProjectId();
    return loadComments(projectId);
  },
  loadFiles: () => {
    const projectId = getProjectId();
    return loadFiles(projectId);
  },

  // Actions
  sendComment: handleSendComment,
  updateProject: handleUpdateProject,
  deleteFiles: handleDeleteFiles,
  uploadFile: handleFileUpload,

  // Detail Design functions
  loadDetailDesignFiles: (sectionType) => {
    const projectId = getProjectId();
    return loadDetailDesignFiles(projectId, sectionType);
  },
  getDetailDesignData: getDetailDesignData,
  initDetailDesignTab: () => {
    const projectId = getProjectId();
    return initDetailDesignTab(projectId);
  },

  // Source Code functions
  initSourceCodeTab: () => {
    const projectId = getProjectId();
    return initSourceCodeTab(projectId);
  },
  loadSourceTree: () => {
    const projectId = getProjectId();
    return loadSourceTree(projectId);
  },
  // loadFilesInFolder: loadFilesInFolder,
  refreshSourceTree: refreshSourceTree,
  getSourceCodeData: getSourceCodeData,

  // API access
  api: ProjectAPI,
};
// #endregion


console.log('[project_detail.js] Module loaded successfully ✅');
