/**
 * Example: Using SourceTreeManager for Unit Test Spec Tab
 * File: project_detail_utd.js
 */

import { ProjectAPI } from "./project_detail_api.js";
// import { showAlert} from "./project_detail_ui.js";
import { SourceTreeManager } from "../commons/source_tree_manager.js";
import { PROJECT_MESSAGES } from "../commons/error_messages.js";
import { getProjectId, getCurrentTab } from "./project_detail_state.js";
import { DownloadFilesAPI } from "../commons/download_files.js";
import { renderSidebarFileList } from "../commons/file_List.js";
let utdTreeManager = null;

/**
 * Initialize Unit Test Spec tab
 */
export const initUnitTestSpecTab = async (projectId) => {
  console.log("[initUnitTestSpecTab] Start - projectId:", projectId);

  if (!utdTreeManager) {
    utdTreeManager = new SourceTreeManager({
      treeId: "utd-sourceTree",
      headerId: "utd-sourceFileHeader",
      pathId: "utd-currentFolderPath",
      listId: "utd-sourceFileList",
      onFolderSelect: handleUTDFolderSelect,
      onFileView: handleUTDFileView,
    });
  }

  await loadUnitTestSpecData(projectId);
};

/**
 * Load unit test spec data
 */
const loadUnitTestSpecData = async (projectId) => {

  try {
    const response = await ProjectAPI.getUnitTestSpecData(projectId);

    const folders = response?.data?.folders || [];
    const specs = response?.data?.utd_list || response?.data?.sources || [];

    // Store current selected folder before loading new data
    const currentSelectedFolder = utdTreeManager.currentSelectedFolder;

    utdTreeManager.loadData(folders, specs);

    // Refresh file list if a folder was previously selected
    // This ensures the file list is updated with new sync status after push/pull
    if (currentSelectedFolder) {
      utdTreeManager.loadFolder(currentSelectedFolder);
    }

    // Update sidebar file list with non-synced files
    if (specs.length > 0) {
      renderSidebarFileList("fileList", specs, true);
    } else {
      renderSidebarFileList("fileList", [], true);
    }

    console.log("[loadUnitTestSpecData] Success");
  } catch (error) {
    console.error("[loadUnitTestSpecData] Error:", error);
    showAlert("Failed to load unit test spec data", "error");

    // Clear sidebar file list on error
    renderSidebarFileList("fileList", [], true);
  } finally {
  }
};

/**
 * Handle folder selection for UTD tab
 */
const handleUTDFolderSelect = async (folderId, manager) => {
  console.log("[handleUTDFolderSelect] folderId:", folderId);

  // Custom logic: maybe filter only test spec files
  manager.loadFolder(folderId);
};

/**
 * Handle file view for UTD tab
 */
const handleUTDFileView = (fileId, manager) => {
  console.log("[handleUTDFileView] fileId:", fileId);

  if (!fileId) {
    console.error("[handleUTDFileView] Missing fileId");
    showAlert("ファイルIDが見つかりません", "error");
    return;
  }

  openTestSpecViewer(fileId);
};

/**
 * Open test spec viewer
 * Navigate to UTD detail page: /projects/{project_id}/utd/{file_id}
 * @param {string} fileId - File ID
 */
const openTestSpecViewer = (fileId) => {
  console.log("[openTestSpecViewer] fileId:", fileId);

  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[openTestSpecViewer] Project ID not found");
      showAlert("プロジェクトIDが見つかりません", "error");
      return;
    }

    if (!fileId) {
      console.error("[openTestSpecViewer] File ID not found");
      showAlert("ファイルIDが見つかりません", "error");
      return;
    }

    // Get current tab to preserve it when navigating back
    const currentTab = getCurrentTab() || "unitTestSpec";
    const detailUrl = `/projects/${projectId}/utd/${fileId}?tab=${currentTab}`;
    console.log("[openTestSpecViewer] Navigating to:", detailUrl);
    window.location.href = detailUrl;
  } catch (error) {
    console.error("[openTestSpecViewer] Error:", error);
    showAlert("エラーが発生しました", "error");
  }
};

/**
 * Get selected UTD items (files and folders)
 */
const getSelectedUTDItems = () => {
  // Use SourceTreeManager's optimized selection method
  if (utdTreeManager) {
    return utdTreeManager.getSelectedItems();
  }

  // Fallback: if tree manager not available, use DOM checkboxes
  const listContainer = document.getElementById("utd-sourceFileList");
  if (!listContainer) {
    console.log("[getSelectedUTDItems] Container not found");
    return { fileIds: [], folderIds: [] };
  }

  const fileIds = Array.from(listContainer.querySelectorAll(".file-checkbox:checked"))
    .map((cb) => cb.dataset.fileId)
    .filter(Boolean);
  const folderIds = Array.from(listContainer.querySelectorAll(".folder-checkbox:checked"))
    .map((cb) => cb.dataset.folderId)
    .filter(Boolean);

  console.log("[getSelectedUTDItems] Result (fallback):", { fileIds, folderIds });
  return { fileIds, folderIds };
};

/**
 * Handle Unit Test Document download
 */
export const handleUTDDownload = async () => {
  console.log("[handleUTDDownload] Start");

  const projectId = getProjectId();
  if (!projectId) {
    console.error("[handleUTDDownload] Missing project ID");
    showAlert(
      PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND || "プロジェクトIDが見つかりません",
      "error"
    );
    return;
  }

  const { fileIds, folderIds } = getSelectedUTDItems();

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

    await DownloadFilesAPI.downloadUnitTestDocument(projectId, fileIds, folderIds);

    showAlert(
      PROJECT_MESSAGES.FILE_DOWNLOADED || "ファイルをダウンロードしました",
      "success"
    );
    console.log("[handleUTDDownload] Success");
  } catch (error) {
    console.error("[handleUTDDownload] Error:", error);
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

export const getUTDTreeManager = () => utdTreeManager;