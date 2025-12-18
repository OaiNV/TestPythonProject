/**
 * Unit Test Code Module
 * Handles folder tree and file list for unit test code tab
 * Uses default SourceTreeManager rendering (no customization)
 */

import { ProjectAPI } from "./project_detail_api.js";
import { getProjectId, getCurrentTab } from "./project_detail_state.js";
// import { showAlert} from "./project_detail_ui.js";
import { SourceTreeManager } from "../commons/source_tree_manager.js";
import { PROJECT_MESSAGES } from "../commons/error_messages.js";
import { DownloadFilesAPI } from "../commons/download_files.js";
import { renderSidebarFileList } from "../commons/file_List.js";
// #region State Management
let utcTreeManager = null;
// #endregion

// #region Public Functions

/**
 * Initialize Unit Test Code tab
 * @param {string} projectId - Project ID
 */
export const initUnitTestCodeTab = async (projectId) => {
  console.log("[initUnitTestCodeTab] Start - projectId:", projectId);

  if (!projectId) {
    console.error("[initUnitTestCodeTab] Invalid project ID");
    return;
  }

  try {
    // Initialize SourceTreeManager WITHOUT customFileRowBuilder
    // It will use the default _buildFileRow() from SourceTreeManager
    if (!utcTreeManager) {
      utcTreeManager = new SourceTreeManager({
        treeId: "utc-sourceTree",
        headerId: "utc-sourceFileHeader",
        pathId: "utc-currentFolderPath",
        listId: "utc-sourceFileList",
        onFolderSelect: handleUTCFolderSelect,
        onFileView: handleUTCFileView,
        // ❌ NO customFileRowBuilder - uses default
        // ❌ NO customSubfolderRowBuilder - uses default
      });

      console.log(
        "[initUnitTestCodeTab] Manager initialized with default builder"
      );
    }

    await loadUnitTestCodeData(projectId);
    console.log("[initUnitTestCodeTab] Success");
  } catch (error) {
    console.error("[initUnitTestCodeTab] Error:", error);
    showAlert("Failed to initialize unit test code tab", "error");
  }
};

/**
 * Load unit test code data (folders + test codes)
 * @param {string} projectId - Project ID
 */
const loadUnitTestCodeData = async (projectId) => {
  console.log("[loadUnitTestCodeData] Start - projectId:", projectId);

  if (!projectId) {
    console.error("[loadUnitTestCodeData] Missing project ID");
    return;
  }

  try {
    // Call API - MUST return same structure as source code
    // Response should be:
    // {
    //   data: {
    //     folders: [...],
    //     sources: [...] or test_codes: [...]
    //   }
    // }
    const response = await ProjectAPI.getUnitTestCodeData(projectId);

    console.log("[loadUnitTestCodeData] API Response:", response);

    // Extract folders and files
    const folders = response?.data?.folders || [];
    const testCodes =
      response?.data?.utc_list ||
      response?.data?.test_codes ||
      response?.data?.sources ||
      [];

    console.log("[loadUnitTestCodeData] Folders:", folders.length);
    console.log("[loadUnitTestCodeData] Test Codes:", testCodes.length);

    // IMPORTANT: Each file MUST have these properties for default builder:
    // - id
    // - file_name
    // - folder_id (to link to folder)
    // - commit_id
    // - sync_status (optional)
    // - updated_at

    // Validate data structure
    if (testCodes.length > 0) {
      const sampleFile = testCodes[0];
      console.log("[loadUnitTestCodeData] Sample file structure:", {
        id: sampleFile.id,
        file_name: sampleFile.file_name,
        folder_id: sampleFile.folder_id,
        commit_id: sampleFile.commit_id,
        updated_at: sampleFile.updated_at,
      });

      // Check if files have folder_id
      const filesWithFolderId = testCodes.filter((f) => f.folder_id);
      if (filesWithFolderId.length === 0) {
        console.error(
          "[loadUnitTestCodeData] ⚠️ WARNING: No files have folder_id!"
        );
        console.error(
          "[loadUnitTestCodeData] Files will not appear in folder view"
        );
      }
    }

    // Load data into tree manager
    if (utcTreeManager) {
      // Store current selected folder before loading new data
      const currentSelectedFolder = utcTreeManager.currentSelectedFolder;

      utcTreeManager.loadData(folders, testCodes);
      console.log("[loadUnitTestCodeData] Data loaded into manager");

      // Refresh file list if a folder was previously selected
      // This ensures the file list is updated with new sync status after push/pull
      if (currentSelectedFolder) {
        utcTreeManager.loadFolder(currentSelectedFolder);
      }
    } else {
      console.error("[loadUnitTestCodeData] Manager not initialized!");
    }

    // Update sidebar file list with non-synced files
    if (testCodes.length > 0) {
      renderSidebarFileList("fileList", testCodes, true);
    } else {
      renderSidebarFileList("fileList", [], true);
    }

    console.log("[loadUnitTestCodeData] Success");
  } catch (error) {
    console.error("[loadUnitTestCodeData] Error:", error);
    showAlert("Failed to load unit test code data", "error");

    // Clear sidebar file list on error
    renderSidebarFileList("fileList", [], true);
  } finally {

  }
};

/**
 * Refresh unit test code data
 */
export const refreshUnitTestCodeTree = async () => {
  console.log("[refreshUnitTestCodeTree] Start");

  const projectId = getProjectId();
  if (!projectId) {
    console.error("[refreshUnitTestCodeTree] No project ID");
    return;
  }

  await loadUnitTestCodeData(projectId);

  console.log("[refreshUnitTestCodeTree] Complete");
};

// #endregion

// #region Event Handlers

/**
 * Handle folder selection
 * @param {string} folderId - Selected folder ID
 * @param {SourceTreeManager} manager - Tree manager instance
 */
const handleUTCFolderSelect = async (folderId, manager) => {
  console.log("[handleUTCFolderSelect] folderId:", folderId);

  try {
    // Simply load folder contents
    // Manager will use default _buildFileRow() to render files
    manager.loadFolder(folderId);

    console.log("[handleUTCFolderSelect] Success");
  } catch (error) {
    console.error("[handleUTCFolderSelect] Error:", error);
    showAlert("Failed to load folder", "error");
  }
};

/**
 * Handle file view button click
 * @param {string} fileId - File ID
 * @param {SourceTreeManager} manager - Tree manager instance
 */
const handleUTCFileView = (fileId, manager) => {
  console.log("[handleUTCFileView] fileId:", fileId);

  if (!fileId) {
    console.error("[handleUTCFileView] Missing fileId");
    showAlert("ファイルIDが見つかりません", "error");
    return;
  }

  openTestCodeViewer(fileId);
};

/**
 * Open test code viewer
 * Navigate to UTC detail page: /projects/{project_id}/utc/{file_id}
 * @param {string} fileId - File ID
 */
const openTestCodeViewer = (fileId) => {
  console.log("[openTestCodeViewer] fileId:", fileId);

  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[openTestCodeViewer] Project ID not found");
      showAlert("プロジェクトIDが見つかりません", "error");
      return;
    }

    if (!fileId) {
      console.error("[openTestCodeViewer] File ID not found");
      showAlert("ファイルIDが見つかりません", "error");
      return;
    }

    // Get current tab to preserve it when navigating back
    const currentTab = getCurrentTab() || "unitTestCode";
    const detailUrl = `/projects/${projectId}/utc/${fileId}?tab=${currentTab}`;
    console.log("[openTestCodeViewer] Navigating to:", detailUrl);
    window.location.href = detailUrl;
  } catch (error) {
    console.error("[openTestCodeViewer] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};

/**
 * Get selected UTC items (files and folders)
 */
const getSelectedUTCItems = () => {
  // Use SourceTreeManager's optimized selection method
  if (utcTreeManager) {
    return utcTreeManager.getSelectedItems();
  }

  // Fallback: if tree manager not available, use DOM checkboxes
  const listContainer = document.getElementById("utc-sourceFileList");
  if (!listContainer) {
    console.log("[getSelectedUTCItems] Container not found");
    return { fileIds: [], folderIds: [] };
  }

  const fileIds = Array.from(listContainer.querySelectorAll(".file-checkbox:checked"))
    .map((cb) => cb.dataset.fileId)
    .filter(Boolean);
  const folderIds = Array.from(listContainer.querySelectorAll(".folder-checkbox:checked"))
    .map((cb) => cb.dataset.folderId)
    .filter(Boolean);

  console.log("[getSelectedUTCItems] Result (fallback):", { fileIds, folderIds });
  return { fileIds, folderIds };
};

/**
 * Handle Unit Test Code download
 */
export const handleUTCDownload = async () => {
  console.log("[handleUTCDownload] Start");

  const projectId = getProjectId();
  if (!projectId) {
    console.error("[handleUTCDownload] Missing project ID");
    showAlert(
      PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND || "プロジェクトIDが見つかりません",
      "error"
    );
    return;
  }

  const { fileIds, folderIds } = getSelectedUTCItems();

  if (fileIds.length === 0 && folderIds.length === 0) {
    showAlert(
      PROJECT_MESSAGES.SELECT_FILE_ERROR ||
      "ファイルまたはフォルダを選択してください",
      "error"
    );
    return;
  }

  try {
    showLoading();

    await DownloadFilesAPI.downloadUnitTestCode(projectId, fileIds, folderIds);

    showAlert(
      PROJECT_MESSAGES.FILE_DOWNLOADED || "ファイルをダウンロードしました",
      "success"
    );
    console.log("[handleUTCDownload] Success");
  } catch (error) {
    console.error("[handleUTCDownload] Error:", error);
    showAlert(
      error.message ||
      PROJECT_MESSAGES.COMMON_ERROR_MESSAGE ||
      "処理中にエラーが発生しました",
      "error"
    );
  } finally {
    hideLoading();
  }
};

// #endregion

// #region Exports for External Access

export const getUnitTestCodeData = () => {
  if (!utcTreeManager) {
    return {
      currentSelectedFolder: null,
      folderTreeData: [],
      currentFiles: [],
    };
  }

  return utcTreeManager.getState();
};

export const getUTCTreeManager = () => utcTreeManager;

// #endregion

console.log("[project_detail_utc.js] Module loaded ✅");
