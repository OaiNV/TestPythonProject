/**
 * Project Detail Events Module
 * Handles all event listeners and event setup
 */

import {
  setProjectId,
  setCurrentTab,
  isEventListenersInitialized,
  setEventListenersInitialized,
  getRepoUrl,
} from "./project_detail_state.js";
import { $projectid, getTbodyByType } from "./project_detail_helpers.js";
import {
  setupCommentEvents,
  setupCommentScrollListener,
} from "./project_detail_comments.js";
import {
  handleSelectAll,
  handleDeleteFiles,
  updateSelectedFiles,
  handleUploadClick,
  sortFiles,
  handleGenerateBasicDesign,
  handleRegenerateBasicDesign,
  handleGenerateDetailDesign,
  handleGenerateDetailDesignFromSourceCode,
  handleGenerateSourceCode,
  handleGenerateUnitTest,
  handleGenerateUnitTestCode,
  handleDownloadRequirementFiles,
  handleDownloadBasicDesignFiles,
  handleDownloadDetailDesignFiles,
  updateDownloadButtonsState,
  getSelectedFileIdsFromTable,
  getFilesBySyncStatusAndAutoSelect,
} from "./project_detail_files.js";
import { setupDetailDesignNavigation, loadDetailDesignFiles, initDetailDesignTab, clearDetailDesignCache, handleSelectAllForSection } from "./project_detail_detail_design.js";
import { loadFiles } from "./project_detail_files.js";
import {
  initSourceCodeTab,
  refreshSourceTree,
  handleSourceCodeDownload,
  loadSourceData,
} from "./project_detail_source_code.js";
import {
  initUnitTestSpecTab,
  handleUTDDownload,
} from "./project_detail_utd.js";
import {
  initUnitTestCodeTab,
  handleUTCDownload,
} from "./project_detail_utc.js";
import { getProjectData, getProjectId, getCurrentTab } from "./project_detail_state.js";
import { ProjectAPI } from "./project_detail_api.js";
import { updateBranchDropdown, openBranchDropdown, closeBranchDropdown } from "./project_detail_ui.js";
import { renderSidebarFileList } from "../commons/file_List.js";
import { showCommitMessageModal } from "../commons/commit_modal.js";
import { showConflictModal } from "../commons/conflict_modal.js";
import { PROJECT_MESSAGES, GIT_MESSAGES_COMFIRM } from "../commons/error_messages.js";
import { GitPushEndpointPath, TabName } from "../commons/constants.js";
import { GitHandleAPI } from "../commons/git_handle.js";
import { showTabContentLoading, hideTabContentLoading } from "../commons/tab_loading.js";
// #region Branch Dropdown State
// Flag to prevent API call when dropdown is auto-opened after update
let isAutoOpeningDropdown = false;
// Export to window for access from other modules
window.isAutoOpeningDropdown = isAutoOpeningDropdown;

/**
 * Load branches from API
 * @returns {Promise<void>}
 */
const loadBranchesFromAPI = async () => {
  try {
    console.log("[loadBranchesFromAPI] Start");

    // Get repoUrl from project data
    const projectData = getProjectData();
    const repoUrl = projectData?.git?.repository;

    if (!repoUrl) {
      console.warn("[loadBranchesFromAPI] No repository URL found in project data");
      showAlert("No repository URL found", "warning");
      return;
    }

    // Open git auth dialog and handle credentials
    console.log("[loadBranchesFromAPI] Opening git auth dialog with repoUrl:", repoUrl);

    // Get credentials (check localStorage first, then open dialog if needed)
    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);
    console.log("[loadBranchesFromAPI] Authentication successful");

    // Call API to get list of branches
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[loadBranchesFromAPI] No project ID found");
      showAlert("Project ID not found", "error");
      return;
    }

    console.log("[loadBranchesFromAPI] Calling getListBranches API...");
    const result = await GitHandleAPI.getListBranches(
      projectId,
      userName,
      tokenPassword,
      repoUrl
    );

    // Update branch dropdown with branches
    const branches = result?.data?.branches || [];
    const currentBranch = projectData?.git?.branch || null;

    if (branches.length > 0) {
      // Set flag to true before updating (to allow auto-open)
      isAutoOpeningDropdown = true;
      window.isAutoOpeningDropdown = true; // Sync with window
      updateBranchDropdown(branches, currentBranch);
    } else {
      showAlert("No branches found", "warning");
    }

    console.log("[loadBranchesFromAPI] Branches loaded successfully:", branches);
  } catch (error) {
    console.error("[loadBranchesFromAPI] Error:", error);

    // Only show alert if not cancelled by user
    if (error.message !== "Authentication cancelled") {
      showAlert(error.message || "Failed to load branches", "warning");
    }
  }
};
// #endregion

// #region Tab Switching
/**
 * Handle tab switch
 * @param {string} targetTab - Target tab ID
 * @param {HTMLElement} tabElement - Tab element
 */
const handleTabSwitch = async function () {
  console.log("[handleTabSwitch] Start");

  try {
    const targetTab = this.getAttribute("data-tab");

    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));

    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
      content.style.display = "none";
    });

    this.classList.add("active");
    const contentElement = $projectid(targetTab);

    if (contentElement) {
      contentElement.classList.add("active");
      contentElement.style.display = "block";

      showTabContentLoading(targetTab);
    }

    // Get projectId from state (already set during initialization)
    const projectId = getProjectId();

    console.log("targetTab:", targetTab);
    console.log("projectId:", projectId);

    // Map targetTab to tab name for URL parameter
    const tabMapping = {
      "tabContent-requirement": "requirement",
      "tabContent-basicDesign": "basicDesign",
      "tabContent-detailDesign": "detailDesign",
      "tabContent-sourceCode": "sourceCode",
      "tabContent-unitTestSpec": "unitTestSpec",
      "tabContent-unitTestCode": "unitTestCode"
    };

    const tabName = tabMapping[targetTab];

    // Update URL with tab parameter
    if (tabName && projectId) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("tab", tabName);
      const newUrl = `/projects/${projectId}?${urlParams.toString()}`;
      window.history.pushState({}, "", newUrl);
      console.log("[handleTabSwitch] URL updated with tab:", tabName);
    }
    try {
      if (targetTab === "tabContent-basicDesign") {
        setCurrentTab("basicDesign");
        if (projectId) await loadFiles(projectId, "basicDesign");
      } else if (targetTab === "tabContent-requirement") {
        setCurrentTab("requirement");
        if (projectId) await loadFiles(projectId, "requirement");
      } else if (targetTab === "tabContent-detailDesign") {
        setCurrentTab("detailDesign");
        if (projectId) await initDetailDesignTab(projectId);
      } else if (targetTab === "tabContent-sourceCode") {
        setCurrentTab("sourceCode");
        if (projectId) await initSourceCodeTab(projectId);
      } else if (targetTab === "tabContent-unitTestSpec") {
        setCurrentTab("unitTestSpec");
        if (projectId) await initUnitTestSpecTab(projectId);
      } else if (targetTab === "tabContent-unitTestCode") {
        setCurrentTab("unitTestCode");
        if (projectId) await initUnitTestCodeTab(projectId);
      }
    } finally {
      hideTabContentLoading(targetTab);
    }
    console.log("[handleTabSwitch] Switched to:", targetTab);
  } catch (error) {
    console.error("[handleTabSwitch] Error:", error);

    const targetTab = this.getAttribute("data-tab");
    hideTabContentLoading(targetTab);
  }
};
// #endregion

// #region Setup Upload Buttons
/**
 * Setup upload buttons for requirement and basic design
 */
const setupUploadButton = () => {
  console.log("[setupUploadButton] Start");

  try {
    const reqBtn = $projectid("newFileBtn");
    const basicBtn = $projectid("newFileBtn1");

    if (reqBtn) {
      const newReqBtn = reqBtn.cloneNode(true);
      reqBtn.parentNode.replaceChild(newReqBtn, reqBtn);

      newReqBtn.addEventListener("click", () => {
        handleUploadClick("requirement");
      });
    }

    if (basicBtn) {
      const newBasicBtn = basicBtn.cloneNode(true);
      basicBtn.parentNode.replaceChild(newBasicBtn, basicBtn);

      newBasicBtn.addEventListener("click", () => {
        handleUploadClick("basicDesign");
      });
    }

    console.log("[setupUploadButton] Complete");
  } catch (error) {
    console.error("[setupUploadButton] Error:", error);
  }
};
// #endregion

// #region Setup Delete Buttons
/**
 * Setup delete buttons for file tables
 */
const setupDeleteButtons = () => {
  console.log("[setupDeleteButtons] Start");

  try {
    const deleteBtn = $projectid("deleteBtn");
    const deleteBtn1 = $projectid("deleteBtn1");

    if (deleteBtn) {
      deleteBtn.addEventListener("click", handleDeleteFiles);
    }

    if (deleteBtn1) {
      deleteBtn1.addEventListener("click", handleDeleteFiles);
    }

    console.log("[setupDeleteButtons] Complete");
  } catch (error) {
    console.error("[setupDeleteButtons] Error:", error);
  }
};
// #endregion

// #region Setup Select All Checkboxes
/**
 * Setup select all checkboxes for file tables
 */
const setupSelectAllCheckboxes = () => {
  console.log("[setupSelectAllCheckboxes] Start");

  try {
    const selectAllReq = $projectid("selectAllCheckbox");
    const selectAllBasic = $projectid("selectAllCheckbox1");

    if (selectAllReq) {
      selectAllReq.addEventListener("change", (e) =>
        handleSelectAll(e, "requirement")
      );
    }

    if (selectAllBasic) {
      selectAllBasic.addEventListener("change", (e) =>
        handleSelectAll(e, "basicDesign")
      );
    }

    // Setup detail design select all checkboxes
    const selectAllClass = $projectid("selectAllCheckboxClass");
    const selectAllMethod = $projectid("selectAllCheckboxMethod");
    const selectAllInterface = $projectid("selectAllCheckboxInterface");
    const selectAllFolder = $projectid("selectAllCheckboxFolder");
    const selectAllActivityDiagram = $projectid("selectAllCheckboxActivityDiagram");

    if (selectAllClass) {
      selectAllClass.addEventListener("change", (e) => {
        handleSelectAll(e, "detailDesign-class")
        handleSelectAllForSection(e.target.checked, "class");
      });
    }

    if (selectAllMethod) {
      selectAllMethod.addEventListener("change", (e) => {
        handleSelectAll(e, "detailDesign-method")
        handleSelectAllForSection(e.target.checked, "method");
      });
    }

    if (selectAllInterface) {
      selectAllInterface.addEventListener("change", (e) => {
        handleSelectAll(e, "detailDesign-interface")
        handleSelectAllForSection(e.target.checked, "interface");
      });
    }

    if (selectAllFolder) {
      selectAllFolder.addEventListener("change", (e) => {
        handleSelectAll(e, "detailDesign-folder")
        handleSelectAllForSection(e.target.checked, "folder");
      });
    }

    if (selectAllActivityDiagram) {
      selectAllActivityDiagram.addEventListener("change", (e) => {
        handleSelectAll(e, "detailDesign-activityDiagram")
        handleSelectAllForSection(e.target.checked, "activityDiagram");
      });
    }

    console.log("[setupSelectAllCheckboxes] Complete");
  } catch (error) {
    console.error("[setupSelectAllCheckboxes] Error:", error);
  }
};
// #endregion

// #region Setup Generate Button
/**
 * Setup generate basic design button
 */
const setupGenerateButton = () => {
  console.log("[setupGenerateButton] Start");

  try {
    const generateBtn = $projectid("generateDesignBtn");

    if (generateBtn) {
      generateBtn.onclick = () => handleGenerateBasicDesign();
    }

    console.log("[setupGenerateButton] Complete");
  } catch (error) {
    console.error("[setupGenerateButton] Error:", error);
  }
};

/**
 * Setup regenerate basic design button (from detail design tab)
 */
const setupRegenerateBasicDesignButton = () => {
  console.log("[setupRegenerateBasicDesignButton] Start");

  try {
    const regenerateBtn = $projectid("regenerateBasicDesignBtn");

    if (regenerateBtn) {
      regenerateBtn.onclick = () => handleRegenerateBasicDesign();
    }

    console.log("[setupRegenerateBasicDesignButton] Complete");
  } catch (error) {
    console.error("[setupRegenerateBasicDesignButton] Error:", error);
  }
};

/**
 * Setup generate detail design button (from basic design tab)
 */
const setupGenerateDetailDesignButton = () => {
  console.log("[setupGenerateDetailDesignButton] Start");

  try {
    const generateBtn = $projectid("generateDesignBtn1");

    if (generateBtn) {
      generateBtn.onclick = () => handleGenerateDetailDesign();
    }

    console.log("[setupGenerateDetailDesignButton] Complete");
  } catch (error) {
    console.error("[setupGenerateDetailDesignButton] Error:", error);
  }
};

/**
 * Setup generate detail design from source code button
 */
const setupGenerateDetailDesignFromSourceCodeButton = () => {
  console.log("[setupGenerateDetailDesignFromSourceCodeButton] Start");

  try {
    const generateBtn = $projectid("sourceCode-generateDetailedDesignDocumentBtn");

    if (generateBtn) {
      generateBtn.onclick = () => handleGenerateDetailDesignFromSourceCode();
    }

    console.log("[setupGenerateDetailDesignFromSourceCodeButton] Complete");
  } catch (error) {
    console.error("[setupGenerateDetailDesignFromSourceCodeButton] Error:", error);
  }
};

/**
 * Setup generate source code button (from detail design tab)
 */
const setupGenerateSourceCodeButton = () => {
  console.log("[setupGenerateSourceCodeButton] Start");

  try {
    const generateBtn = $projectid("generateSourceCodeBtn");

    if (generateBtn) {
      generateBtn.onclick = () => handleGenerateSourceCode();
    }

    console.log("[setupGenerateSourceCodeButton] Complete");
  } catch (error) {
    console.error("[setupGenerateSourceCodeButton] Error:", error);
  }
};

/**
 * Setup generate unit test button (from detail design or source code tab)
 * Handles multiple buttons with same ID in different tabs
 */
const setupGenerateUnitTestButton = () => {
  console.log("[setupGenerateUnitTestButton] Start");

  try {
    // Find all buttons with this ID (there are 2: one in detail design tab, one in source code tab)
    const generateBtns = document.querySelectorAll('#sourceCode-generateUnitTestSpecBtn');

    generateBtns.forEach((generateBtn) => {
      if (generateBtn) {
        generateBtn.onclick = () => handleGenerateUnitTest();
      }
    });

    console.log(`[setupGenerateUnitTestButton] Complete - setup ${generateBtns.length} button(s)`);
  } catch (error) {
    console.error("[setupGenerateUnitTestButton] Error:", error);
  }
};

/**
 * Setup generate unit test code button (from unit test design tab)
 */
const setupGenerateUnitTestCodeButton = () => {
  console.log("[setupGenerateUnitTestCodeButton] Start");

  try {
    const generateBtn = $projectid("utd-generateUnitTestCodeBtn");

    if (generateBtn) {
      generateBtn.onclick = () => handleGenerateUnitTestCode();
    }

    console.log("[setupGenerateUnitTestCodeButton] Complete");
  } catch (error) {
    console.error("[setupGenerateUnitTestCodeButton] Error:", error);
  }
};
// #endregion

// #region Setup Download Buttons
/**
 * Setup download buttons for requirement, basic design, and detail design
 */
const setupDownloadButtons = () => {
  console.log("[setupDownloadButtons] Start");

  try {
    // Requirement download button
    const requirementDownloadBtn = $projectid("basicDesignDownloadBtn");
    if (requirementDownloadBtn) {
      requirementDownloadBtn.addEventListener(
        "click",
        handleDownloadRequirementFiles
      );
    }

    // Basic design download button
    const basicDesignDownloadBtn = $projectid("requirementDesignDownloadBtn");
    if (basicDesignDownloadBtn) {
      basicDesignDownloadBtn.addEventListener(
        "click",
        handleDownloadBasicDesignFiles
      );
    }

    // Detail design download button
    const detailDesignDownloadBtn = $projectid("detailDesignDownloadBtn");
    if (detailDesignDownloadBtn) {
      detailDesignDownloadBtn.addEventListener(
        "click",
        handleDownloadDetailDesignFiles
      );
    }

    console.log("[setupDownloadButtons] Complete");
  } catch (error) {
    console.error("[setupDownloadButtons] Error:", error);
  }
};
// #endregion

// #region Setup Sort Headers
/**
 * Setup sort functionality for table headers
 */
const setupSortHeaders = () => {
  console.log("[setupSortHeaders] Start");

  try {
    document
      .querySelectorAll(".file-table thead tr th[data-column]")
      .forEach((th) => {
        const table = th.closest("table");
        const type = table?.dataset?.tableType || "requirement";

        th.addEventListener("click", () => {
          const column = th.dataset.column;
          sortFiles(type, column);
        });
      });

    console.log("[setupSortHeaders] Complete");
  } catch (error) {
    console.error("[setupSortHeaders] Error:", error);
  }
};
// #endregion

// #region Setup Source Code Events
/**
 * Setup source code tab event listeners
 */
const setupSourceCodeEvents = () => {
  console.log("[setupSourceCodeEvents] Start");

  try {
    // Refresh tree button
    const refreshTreeBtn = $projectid("refreshTreeBtn");
    if (refreshTreeBtn) {
      refreshTreeBtn.addEventListener("click", async () => {
        console.log("[Source Code] Refresh tree clicked");
        await refreshSourceTree();
      });
    }

    const downloadBtn = $projectid("sourceCodeDownloadBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", handleSourceCodeDownload);
    }

    console.log("[setupSourceCodeEvents] Complete");
  } catch (error) {
    console.error("[setupSourceCodeEvents] Error:", error);
  }
};
// #endregion

// #region Setup UTD Events
/**
 * Setup Unit Test Document (UTD) events
 */
const setupUTDEvents = () => {
  console.log("[setupUTDEvents] Start");

  try {
    const downloadBtn = $projectid("utd-downloadUnitTestSpecBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", handleUTDDownload);
      console.log("[setupUTDEvents] Download button listener added");
    } else {
      console.warn("[setupUTDEvents] Download button not found");
    }

    console.log("[setupUTDEvents] Complete");
  } catch (error) {
    console.error("[setupUTDEvents] Error:", error);
  }
};
// #endregion

// #region Setup UTC Events
/**
 * Setup Unit Test Code (UTC) events
 */
const setupUTCEvents = () => {
  console.log("[setupUTCEvents] Start");

  try {
    const downloadBtn = $projectid("utc-downloadUnitTestCodeBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", handleUTCDownload);
      console.log("[setupUTCEvents] Download button listener added");
    } else {
      console.warn("[setupUTCEvents] Download button not found");
    }

    console.log("[setupUTCEvents] Complete");
  } catch (error) {
    console.error("[setupUTCEvents] Error:", error);
  }
};
// #endregion

// #region Setup File Checkboxes
/**
 * Setup file checkbox event listeners
 */
const setupFileCheckboxes = () => {
  console.log("[setupFileCheckboxes] Start");

  try {
    const tbodyReq = getTbodyByType("requirement");
    const tbodyBasic = getTbodyByType("basicDesign");

    if (tbodyReq) {
      tbodyReq
        .querySelectorAll(".file-checkbox")
        .forEach((cb) => cb.addEventListener("change", updateSelectedFiles));
    }

    if (tbodyBasic) {
      tbodyBasic
        .querySelectorAll(".file-checkbox")
        .forEach((cb) => cb.addEventListener("change", updateSelectedFiles));
    }

    // Setup event listeners for Source Code, Unit Test Spec, and Unit Test Code tabs
    // Use event delegation on list containers to handle dynamically added checkboxes
    const sourceCodeList = $projectid("sourceFileList");
    if (sourceCodeList) {
      sourceCodeList.addEventListener("change", (e) => {
        if (e.target.matches(".file-checkbox, .folder-checkbox")) {
          updateSelectedFiles();
        }
      });
    }

    const utdList = $projectid("utd-sourceFileList");
    if (utdList) {
      utdList.addEventListener("change", (e) => {
        if (e.target.matches(".file-checkbox, .folder-checkbox")) {
          updateSelectedFiles();
        }
      });
    }

    const utcList = $projectid("utc-sourceFileList");
    if (utcList) {
      utcList.addEventListener("change", (e) => {
        if (e.target.matches(".file-checkbox, .folder-checkbox")) {
          updateSelectedFiles();
        }
      });
    }

    console.log("[setupFileCheckboxes] Complete");
  } catch (error) {
    console.error("[setupFileCheckboxes] Error:", error);
  }
};
// #endregion

// #region Git Push Events
// Flag to track if event listener is already added
let gitPushEventListenerAdded = false;

/**
 * Refresh file list for current tab
 * @param {string} projectId - Project ID
 * @returns {Promise<void>}
 */
const refreshCurrentTabFiles = async (projectId) => {
  console.log("[refreshCurrentTabFiles] Start - projectId:", projectId);

  try {
    let currentTab = getCurrentTab();
    console.log("[refreshCurrentTabFiles] Current tab:", currentTab);

    // For detailDesign tab, need to get the active section from DOM
    if (currentTab === TabName.DETAIL_DESIGN) {
      // Find active section in detail design
      const activeSection = document.querySelector('.detail-design-section.active');
      if (activeSection) {
        const sectionId = activeSection.id.replace('section-', '');
        currentTab = `${TabName.DETAIL_DESIGN}-${sectionId}`;
        console.log("[refreshCurrentTabFiles] Active detail design section:", sectionId, "currentTab:", currentTab);
      } else {
        // Default to class section if no active section found
        currentTab = `${TabName.DETAIL_DESIGN}-class`;
        console.log("[refreshCurrentTabFiles] No active section found, defaulting to class");
      }
    }

    if (currentTab === TabName.REQUIREMENT) {
      await loadFiles(projectId, TabName.REQUIREMENT);
    } else if (currentTab === TabName.BASIC_DESIGN) {
      await loadFiles(projectId, TabName.BASIC_DESIGN);
    } else if (currentTab === TabName.DETAIL_DESIGN || currentTab.startsWith(`${TabName.DETAIL_DESIGN}-`)) {
      // Extract section type from currentTab (e.g., "detailDesign-class" -> "class")
      const sectionType = currentTab === TabName.DETAIL_DESIGN ? "class" : currentTab.replace(`${TabName.DETAIL_DESIGN}-`, "");
      // Clear cache to force reload from API
      clearDetailDesignCache();
      await loadDetailDesignFiles(projectId, sectionType);
    } else if (currentTab === TabName.SOURCE_CODE) {
      await loadSourceData(projectId);
    } else if (currentTab === TabName.UNIT_TEST_SPEC) {
      await initUnitTestSpecTab(projectId);
    } else if (currentTab === TabName.UNIT_TEST_CODE) {
      await initUnitTestCodeTab(projectId);
    }

    console.log("[refreshCurrentTabFiles] Success");
  } catch (error) {
    console.error("[refreshCurrentTabFiles] Error:", error);
    throw error;
  }
};

/**
 * Setup Git Push buttons event listeners
 * Uses event delegation to handle all buttons with same ID
 */
const setupGitPushButtons = () => {
  console.log("[setupGitPushButtons] Start");

  try {
    // Use event delegation to handle all git push buttons
    // This works even if all buttons use the same ID
    // Only add listener once to avoid duplicates
    if (!gitPushEventListenerAdded) {
      document.addEventListener("click", async (e) => {
        // Check if click is on git push button or its child elements (img, span)
        // Use closest to find button parent if clicking on child elements
        const button = e.target.closest('button[id="gitPushBtn"]');
        if (!button) return;

        // Check if button is visible (not in hidden tab)
        const tabContent = button.closest('.tab-content');
        if (tabContent && !tabContent.classList.contains('active')) {
          console.log("[setupGitPushButtons] Button is in inactive tab, ignoring");
          return;
        }

        console.log("[setupGitPushButtons] Git Push button clicked");

        // Prevent default if needed
        e.stopPropagation();

        // Call handleGitPush (it will check current tab internally)
        await handleGitPush();
      });

      gitPushEventListenerAdded = true;
      console.log("[setupGitPushButtons] Event listener added - using event delegation");
    }

    console.log("[setupGitPushButtons] Complete");
  } catch (error) {
    console.error("[setupGitPushButtons] Error:", error);
  }
};

/**
 * Setup Push Button event listener (sidebar pushBtn)
 */
const setupPushButton = () => {
  console.log("[setupPushButton] Start");

  try {
    const pushBtn = document.getElementById("pushBtn");
    if (!pushBtn) {
      console.warn("[setupPushButton] Push button not found");
      return;
    }

    pushBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[setupPushButton] Push button clicked");
      await handlePushButton();
    });

    console.log("[setupPushButton] Complete");
  } catch (error) {
    console.error("[setupPushButton] Error:", error);
  }
};

/**
 * Handle Git Push action
 */
const handleGitPush = async () => {
  console.log("[handleGitPush] Start");
  const projectData = getProjectData();
  const repoUrl = projectData?.git?.repository;

  try {
    // Get current tab to determine which table to check
    let currentTab = getCurrentTab();
    console.log("[handleGitPush] Current tab:", currentTab);

    // For detailDesign tab, need to get the active section
    if (currentTab === TabName.DETAIL_DESIGN) {
      // Find active section in detail design
      const activeSection = document.querySelector('.detail-design-section.active');
      if (activeSection) {
        const sectionId = activeSection.id.replace('section-', '');
        currentTab = `${TabName.DETAIL_DESIGN}-${sectionId}`;
        console.log("[handleGitPush] Active detail design section:", sectionId, "currentTab:", currentTab);
      } else {
        // Default to class section if no active section found
        currentTab = `${TabName.DETAIL_DESIGN}-class`;
        console.log("[handleGitPush] No active section found, defaulting to class");
      }
    }

    // Get selected checkboxes from current tab
    let selectedCount = 0;
    let container = null;

    // For sourceCode, unitTestSpec, unitTestCode - use list elements instead of tbody
    if (currentTab === TabName.SOURCE_CODE) {
      container = $projectid('sourceFileList');
    } else if (currentTab === TabName.UNIT_TEST_SPEC) {
      container = $projectid('utd-sourceFileList');
    } else if (currentTab === TabName.UNIT_TEST_CODE) {
      container = $projectid('utc-sourceFileList');
    } else {
      // For requirement, basicDesign, detailDesign - use tbody
      container = getTbodyByType(currentTab);
    }

    if (container) {
      selectedCount = container.querySelectorAll(".file-checkbox:checked").length;
    }

    // Get selected file IDs
    const selectedFileIds = getSelectedFileIdsFromTable(currentTab);
    console.log("[handleGitPush] Selected file IDs:", selectedFileIds);
    if (!selectedFileIds || selectedFileIds.length === 0) {
      showAlert(PROJECT_MESSAGES.NO_FILE_SELECTED, "error");
      return;
    }

    // Show commit message modal
    const commitMessage = await showCommitMessageModal();

    if (!commitMessage) {
      console.log("[handleGitPush] Commit cancelled");
      return;
    }

    // Get Git credentials
    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Get project ID
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[handleGitPush] Project ID not found");
      showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    // Determine endpoint path based on current tab
    let endpointPath = null;
    if (currentTab === TabName.REQUIREMENT) {
      endpointPath = GitPushEndpointPath.REQUIREMENT;
    } else if (currentTab === TabName.BASIC_DESIGN) {
      endpointPath = GitPushEndpointPath.BASIC_DESIGN;
    } else if (currentTab === TabName.DETAIL_DESIGN || currentTab.startsWith(`${TabName.DETAIL_DESIGN}-`)) {
      endpointPath = GitPushEndpointPath.DETAIL_DESIGN;
    } else if (currentTab === TabName.SOURCE_CODE) {
      endpointPath = GitPushEndpointPath.SOURCE_CODE;
    } else if (currentTab === TabName.UNIT_TEST_SPEC) {
      endpointPath = GitPushEndpointPath.UNIT_TEST_SPEC;
    } else if (currentTab === TabName.UNIT_TEST_CODE) {
      endpointPath = GitPushEndpointPath.UNIT_TEST_CODE;
    } else {
      showAlert("このタブではGit Pushがサポートされていません", "error");
      return;
    }

    // Call API to push files to Git
    showLoading();
    try {
      const result = await GitHandleAPI.pushGitDocuments(
        projectId,
        selectedFileIds,
        commitMessage,
        userName,
        tokenPassword,
        endpointPath
      );

      // Check if result indicates conflict
      if (result && result.isConflict && result.conflictFiles) {
        console.log("[handleGitPush] Conflict detected, showing conflict modal");
        await showConflictModal(result.conflictFiles, {
          projectId,
          source: "push",
        });
        // Don't refresh file list on conflict
        return;
      }

      showAlert("Git Pushが完了しました", "success");
      console.log("[handleGitPush] Git push successful");

      // Refresh file list to update sync status
      await refreshCurrentTabFiles(projectId);
    } catch (error) {
      console.error("[handleGitPush] Git push error:", error);
      // Error message already shown by API function
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[handleGitPush] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};

/**
 * Handle Push Button action (auto-selects files with push status)
 */
const handlePushButton = async () => {
  console.log("[handlePushButton] Start");
  const projectData = getProjectData();
  const repoUrl = projectData?.git?.repository;

  try {
    // Get current active tab
    let currentTab = getCurrentTab();
    console.log("[handlePushButton] Current tab:", currentTab);

    // For detailDesign tab, need to get the active section
    if (currentTab === TabName.DETAIL_DESIGN) {
      // Find active section in detail design
      const activeSection = document.querySelector('.detail-design-section.active');
      if (activeSection) {
        const sectionId = activeSection.id.replace('section-', '');
        currentTab = `${TabName.DETAIL_DESIGN}-${sectionId}`;
        console.log("[handlePushButton] Active detail design section:", sectionId, "currentTab:", currentTab);
      } else {
        // Default to class section if no active section found
        currentTab = `${TabName.DETAIL_DESIGN}-class`;
        console.log("[handlePushButton] No active section found, defaulting to class");
      }
    }

    // Only process files from fileList element
    const selectedFileIds = getFilesBySyncStatusAndAutoSelect();

    if (!selectedFileIds || selectedFileIds.length === 0) {
      showAlert("プッシュ可能なファイルが見つかりません", "warning");
      return;
    }

    console.log("[handlePushButton] Auto-selected files:", selectedFileIds.length);

    // Show commit message modal
    const commitMessage = await showCommitMessageModal();

    if (!commitMessage) {
      console.log("[handlePushButton] Commit cancelled");
      return;
    }

    // Get Git credentials
    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Get project ID
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[handlePushButton] Project ID not found");
      showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    // Determine endpoint path based on current tab (same logic as handleGitPush)
    let endpointPath = null;
    if (currentTab === TabName.REQUIREMENT) {
      endpointPath = GitPushEndpointPath.REQUIREMENT;
    } else if (currentTab === TabName.BASIC_DESIGN) {
      endpointPath = GitPushEndpointPath.BASIC_DESIGN;
    } else if (currentTab === TabName.DETAIL_DESIGN || currentTab.startsWith(`${TabName.DETAIL_DESIGN}-`)) {
      endpointPath = GitPushEndpointPath.DETAIL_DESIGN;
    } else if (currentTab === TabName.SOURCE_CODE) {
      endpointPath = GitPushEndpointPath.SOURCE_CODE;
    } else if (currentTab === TabName.UNIT_TEST_SPEC) {
      endpointPath = GitPushEndpointPath.UNIT_TEST_SPEC;
    } else if (currentTab === TabName.UNIT_TEST_CODE) {
      endpointPath = GitPushEndpointPath.UNIT_TEST_CODE;
    } else {
      showAlert("このタブではGit Pushがサポートされていません", "error");
      return;
    }

    // Call API to push files to Git
    showLoading();
    try {
      const result = await GitHandleAPI.pushGitDocuments(
        projectId,
        selectedFileIds,
        commitMessage,
        userName,
        tokenPassword,
        endpointPath
      );

      // Check if result indicates conflict
      if (result && result.isConflict && result.conflictFiles) {
        console.log("[handlePushButton] Conflict detected, showing conflict modal");
        await showConflictModal(result.conflictFiles, {
          projectId,
          source: "push",
        });
        // Don't refresh file list on conflict
        return;
      }

      showAlert("Git Pushが完了しました", "success");
      console.log("[handlePushButton] Git push successful");

      // Refresh file list to update sync status
      await refreshCurrentTabFiles(projectId);
    } catch (error) {
      console.error("[handlePushButton] Git push error:", error);
      // Error message already shown by API function
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[handlePushButton] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};
// #endregion

// #region Git Pull Events
/**
 * Setup Git Pull button event listener
 */
const setupGitPullButton = () => {
  console.log("[setupGitPullButton] Start");

  try {
    const pullBtn = document.getElementById("pullBtn");
    if (!pullBtn) {
      console.warn("[setupGitPullButton] Pull button not found");
      return;
    }

    pullBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[setupGitPullButton] Pull button clicked");
      await handleGitPull();
    });

    console.log("[setupGitPullButton] Complete");
  } catch (error) {
    console.error("[setupGitPullButton] Error:", error);
  }
};

/**
 * Handle Git Pull action
 */
const handleGitPull = async () => {
  console.log("[handleGitPull] Start");
  const projectData = getProjectData();
  const repoUrl = projectData?.git?.repository;

  if (!repoUrl) {
    console.warn("[handleGitPull] No repository URL found in project data");
    showAlert("リポジトリURLが見つかりません", "warning");
    return;
  }

  try {
    // Get Git credentials
    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Get project ID
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[handleGitPull] Project ID not found");
      showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
      return;
    }

    // Call API to pull data from Git
    showLoading();
    try {
      const result = await GitHandleAPI.pullGitData(
        projectId,
        userName,
        tokenPassword,
        false // forceOverride = false by default
      );

      // Check if result indicates conflict
      if (result && result.isConflict && result.conflictFiles) {
        console.log("[handleGitPull] Conflict detected, showing conflict modal");
        const forcePullOverride = async () => {
          console.log("[handleGitPull] Force override pull triggered");
          showLoading();
          try {
            await GitHandleAPI.pullGitData(
              projectId,
              userName,
              tokenPassword,
              true
            );
            showAlert("Git Pullが完了しました", "success");
            await refreshCurrentTabFiles(projectId);
          } catch (error) {
            console.error("[handleGitPull] Force pull error:", error);
            throw error;
          } finally {
            hideLoading();
          }
        };

        await showConflictModal(result.conflictFiles, {
          projectId,
          source: "pull",
          onUseRemoteVersion: forcePullOverride,
        });
        // Don't refresh file list on conflict
        return;
      }

      showAlert("Git Pullが完了しました", "success");
      console.log("[handleGitPull] Git pull successful");

      // Refresh file list to update sync status for current tab only
      await refreshCurrentTabFiles(projectId);
    } catch (error) {
      console.error("[handleGitPull] Git pull error:", error);
      // Error message already shown by API function
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[handleGitPull] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};

/**
 * Handle branch change
 * @param {string} newBranchName - New branch name to switch to
 */
const handleBranchChange = async (newBranchName) => {
  console.log("[handleBranchChange] Start - newBranchName:", newBranchName);

  const projectData = getProjectData();
  const repoUrl = projectData?.git?.repository;

  if (!repoUrl) {
    console.warn("[handleBranchChange] No repository URL found in project data");
    return;
  }

  try {
    // Get Git credentials
    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    // Get project ID
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[handleBranchChange] Project ID not found");
      return;
    }

    // Call API to change branch (first try without force)
    showLoading();
    try {
      const result = await GitHandleAPI.changeBranch(
        projectId,
        newBranchName,
        userName,
        tokenPassword,
        false // force = false by default
      );

      // Check if API response indicates local changes
      const hasLocalChanges = result?.data?.has_local_changes === true;

      if (hasLocalChanges) {
        // Show confirmation modal
        const confirmed = await window.confirm(
          GIT_MESSAGES_COMFIRM.BRANCH_CHANGE_CONFIRM_TITLE,
          GIT_MESSAGES_COMFIRM.BRANCH_CHANGE_CONFIRM_MESSAGE,
          true
        );

        if (!confirmed) {
          // User cancelled, don't change branch
          hideLoading();
          return;
        }

        // User confirmed, retry with force=true
        try {
          const forceResult = await GitHandleAPI.changeBranch(
            projectId,
            newBranchName,
            userName,
            tokenPassword,
            true // force = true
          );

          console.log("[handleBranchChange] Branch change successful with force");

          // Update branch display
          const branchDropdownSelected = $projectid("branchDropdownSelected");
          if (branchDropdownSelected) {
            branchDropdownSelected.textContent = newBranchName;
          }

          // Refresh project data
          if (window.projectDetail && window.projectDetail.loadProject) {
            await window.projectDetail.loadProject();
          }

          // Refresh current tab files
          await refreshCurrentTabFiles(projectId);
        } catch (forceError) {
          console.error("[handleBranchChange] Force branch change error:", forceError);
          // Error message already shown by API function
        }
      } else {
        // No local changes, branch change successful
        console.log("[handleBranchChange] Branch change successful");

        // Update branch display
        const branchDropdownSelected = $projectid("branchDropdownSelected");
        if (branchDropdownSelected) {
          branchDropdownSelected.textContent = newBranchName;
        }

        // Refresh project data to get latest branch info
        if (window.projectDetail && window.projectDetail.loadProject) {
          await window.projectDetail.loadProject();
        }

        // Refresh current tab files
        await refreshCurrentTabFiles(projectId);
      }
    } catch (error) {
      console.error("[handleBranchChange] Branch change error:", error);
      // Error message already shown by API function
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[handleBranchChange] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};
// #endregion

// #region Initialize All Event Listeners
/**
 * Setup basic UI event listeners (back, refresh, branch)
 */
const setupBasicUIEvents = () => {
  console.log("[setupBasicUIEvents] Start");

  try {
    // Back button
    const backBtn = $projectid("backBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "/projects";
      });
    }

    // Refresh button
    const refreshBtn = $projectid("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (window.projectDetail && window.projectDetail.loadProject) {
          window.projectDetail.loadProject();
        }
      });
    }

    // Branch dropdown - custom dropdown with click to open git auth dialog
    const branchDropdown = $projectid("branchDropdown");
    const branchDropdownSelected = $projectid("branchDropdownSelected");
    const branchDropdownOptions = $projectid("branchDropdownOptions");

    if (branchDropdown && branchDropdownSelected && branchDropdownOptions) {
      // Handle click on selected text to toggle dropdown or call API
      branchDropdownSelected.addEventListener("click", async (e) => {
        console.log("[Branch] Dropdown selected clicked");

        // Check if dropdown is already open
        const isOpen = branchDropdown.classList.contains('open');

        // If dropdown is already open, close it (priority: close first)
        if (isOpen) {
          closeBranchDropdown(branchDropdown);
          window.isAutoOpeningDropdown = false;
          return;
        }

        // No options - call API to load branches
        console.log("[Branch] No options - calling API");
        e.preventDefault();
        e.stopPropagation();

        // Call function to load branches
        await loadBranchesFromAPI();
      });

      // Handle click on options to select branch
      branchDropdownOptions.addEventListener("click", async (e) => {
        console.log("[Branch] Options clicked, target:", e.target);

        const li = e.target.closest('li');
        if (!li) {
          console.log("[Branch] Clicked element is not an li or inside li");
          return;
        }

        const selectedValue = li.dataset.value;
        if (!selectedValue) {
          console.warn("[Branch] No data-value attribute found on li element");
          return;
        }

        console.log("[Branch] Selected branch:", selectedValue);

        // Prevent event bubbling to document click listener
        e.stopPropagation();
        e.preventDefault();

        // Get current branch
        const currentBranch = branchDropdownSelected.textContent.trim();
        console.log("[Branch] Current branch:", currentBranch, "Selected branch:", selectedValue);

        // If same branch, just close dropdown
        if (selectedValue === currentBranch) {
          console.log("[Branch] Same branch selected, closing dropdown");
          closeBranchDropdown(branchDropdown);
          return;
        }

        // Close dropdown
        closeBranchDropdown(branchDropdown);

        // Call API to change branch
        console.log("[Branch] Calling handleBranchChange with:", selectedValue);
        try {
          await handleBranchChange(selectedValue);
        } catch (error) {
          console.error("[Branch] Error in handleBranchChange:", error);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        // Don't close if clicking inside the dropdown
        if (branchDropdown.contains(e.target)) {
          return;
        }
        closeBranchDropdown(branchDropdown);
      });
    }

    console.log("[setupBasicUIEvents] Complete");
  } catch (error) {
    console.error("[setupBasicUIEvents] Error:", error);
  }
};

/**
 * Setup tab switching events
 */
const setupTabEvents = () => {
  console.log("[setupTabEvents] Start");

  try {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", handleTabSwitch);
    });

    console.log("[setupTabEvents] Complete");
  } catch (error) {
    console.error("[setupTabEvents] Error:", error);
  }
};

/**
 * Setup all component-specific events
 */
const setupComponentEvents = () => {
  console.log("[setupComponentEvents] Start");

  try {
    setupCommentEvents();
    setupCommentScrollListener();
    setupUploadButton();
    setupDeleteButtons();
    setupSelectAllCheckboxes();
    setupGenerateButton();
    setupRegenerateBasicDesignButton();
    setupGenerateDetailDesignButton();
    setupGenerateDetailDesignFromSourceCodeButton();
    setupGenerateSourceCodeButton();
    setupGenerateUnitTestButton();
    setupGenerateUnitTestCodeButton();
    setupDownloadButtons();
    setupDetailDesignNavigation();
    setupSortHeaders();
    setupSourceCodeEvents();
    setupUTDEvents();
    setupUTCEvents();
    setupGitPushButtons();
    setupGitPullButton();
    setupPushButton();

    // Initialize download buttons state (disable by default)
    updateDownloadButtonsState();

    console.log("[setupComponentEvents] Complete");
  } catch (error) {
    console.error("[setupComponentEvents] Error:", error);
  }
};

//  #region Check repository new commit
/**
 * Check repository URL and get git auth credentials periodically
 * Checks every 1 minute if repoUrl exists
 */
/**
 * Check repository URL and get git auth credentials
 * Can be called manually or via interval
 */
const triggerRepoCheck = async () => {
  try {
    const repoUrl = getRepoUrl();

    if (repoUrl) {
      console.log("[triggerRepoCheck] Repository URL found, getting git auth credentials");
      const { userName, tokenPassword } = await window.getGitAuth(repoUrl);
      console.log("[triggerRepoCheck] Git auth credentials retrieved successfully");

      // Call API to check repository changes
      const projectId = getProjectId();
      if (projectId) {
        console.log("[triggerRepoCheck] Calling checkRepoChanges API");
        const result = await GitHandleAPI.checkRepoChanges(projectId, userName, tokenPassword);
        console.log("[triggerRepoCheck] Check repo changes completed", result);

        // If API returns success and has updated files, reload current tab data
        if (result && result.statusCode === 200) {
          const updatedCount = result.data?.updated_files_count || 0;
          if (updatedCount > 0) {
            console.log(`[triggerRepoCheck] ${updatedCount} files updated, reloading current tab data`);
            await refreshCurrentTabFiles(projectId);
          }
        }
      } else {
        console.warn("[triggerRepoCheck] No project ID found, skipping API call");
      }
    } else {
      console.log("[triggerRepoCheck] No repository URL found, skipping");
    }
  } catch (error) {
    console.error("[triggerRepoCheck] Error:", error);
  }
};

/**
 * Check repository URL and get git auth credentials periodically
 * Checks every 1 minute if repoUrl exists
 */
const startRepoUrlCheckInterval = () => {
  // Get CHECK_INTERVAL from window (set by backend template) - value is in minutes
  const CHECK_INTERVAL_MINUTES = window.GIT_CHECK_INTERVAL || 1; // Default: 1 minute
  const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000; // Convert minutes to milliseconds for setInterval
  console.log("[startRepoUrlCheckInterval] Start, CHECK_INTERVAL: ", CHECK_INTERVAL_MINUTES, "minutes");

  // Then check every CHECK_INTERVAL minutes
  setInterval(triggerRepoCheck, CHECK_INTERVAL_MS);

  console.log(`[startRepoUrlCheckInterval] Started checking repoUrl every ${CHECK_INTERVAL_MINUTES} minutes`);
};

/**
 * Initialize all project event listeners
 * This should only be called once
 */
const initProjectEventListeners = () => {
  if (isEventListenersInitialized()) {
    console.log("[Init] Event listeners already initialized, skip.");
    return;
  }

  console.log("[initProjectEventListeners] Start");

  try {
    setEventListenersInitialized(true);

    setupBasicUIEvents();
    setupTabEvents();
    setupComponentEvents();

    // Start checking repoUrl periodically
    startRepoUrlCheckInterval();

    console.log("[Init] Event listeners setup completed");
  } catch (error) {
    console.error("[initProjectEventListeners] Error:", error);
    setEventListenersInitialized(false);
  }
};
// #endregion

// Export event functions
export {
  initProjectEventListeners,
  handleTabSwitch,
  setupBasicUIEvents,
  setupTabEvents,
  setupComponentEvents,
  setupUploadButton,
  setupDeleteButtons,
  setupSelectAllCheckboxes,
  setupGenerateButton,
  setupRegenerateBasicDesignButton,
  setupGenerateDetailDesignButton,
  setupGenerateDetailDesignFromSourceCodeButton,
  setupGenerateSourceCodeButton,
  setupGenerateUnitTestButton,
  setupGenerateUnitTestCodeButton,
  setupDownloadButtons,
  setupSortHeaders,
  setupFileCheckboxes,
  setupSourceCodeEvents,
  setupUTDEvents,
  setupUTCEvents,
  triggerRepoCheck,
};

