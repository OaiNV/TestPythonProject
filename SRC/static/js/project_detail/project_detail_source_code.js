/**
 * Source Code Module
 * Handles folder tree and file list for source code tab
 * Now using SourceTreeManager for UI rendering
 */

import { ProjectAPI } from './project_detail_api.js';
import { getProjectId, getCurrentTab } from './project_detail_state.js';
import { SourceTreeManager } from '../commons/source_tree_manager.js';
import { PROJECT_MESSAGES } from '../commons/error_messages.js';
import { renderSidebarFileList } from '../commons/file_List.js';
import { DownloadFilesAPI } from '../commons/download_files.js';
// #region State Management
let sourceTreeManager = null;
let currentProjectLanguage = null;
// #endregion

// #region Public Functions

/**
 * Initialize source code tab
 * @param {string} projectId - Project ID
 */
export const initSourceCodeTab = async (projectId) => {
  if (!projectId) return;

  try {
    // Get project info to get language
    const projectInfo = await ProjectAPI.getProject(projectId);
    currentProjectLanguage = projectInfo?.data?.language;

    // Initialize SourceTreeManager instance
    if (!sourceTreeManager) {
      sourceTreeManager = new SourceTreeManager({
        treeId: 'sourceTree',
        headerId: 'sourceFileHeader',
        pathId: 'currentFolderPath',
        listId: 'sourceFileList',
        onFolderSelect: handleFolderSelect,
        onFileView: handleFileView
      });
    }

    await loadSourceData(projectId);
  } catch (error) {
    showAlert(PROJECT_MESSAGES.SOURCE_TAB_INIT_FAILED, 'error');
  }
};

const getProjectLanguage = () => {
  return currentProjectLanguage;
}
/**
 * Load unified source code data (folders + files)
 * @param {string} projectId - Project ID
 */
export const loadSourceData = async (projectId) => {
  if (!projectId) return;

  try {
    const response = await ProjectAPI.getSourceData(projectId);

    // Extract folders and sources from unified response
    const folders = response?.data?.folders || [];
    const sources = response?.data?.sources || [];

    // Load data into tree manager
    if (sourceTreeManager) {
      // Store current selected folder before loading new data
      const currentSelectedFolder = sourceTreeManager.currentSelectedFolder;
      sourceTreeManager.loadData(folders, sources);
      // Refresh file list if a folder was previously selected
      // This ensures the file list is updated with new sync status after push/pull
      if (currentSelectedFolder) {
        sourceTreeManager.loadFolder(currentSelectedFolder);
      }
    }

    // Update sidebar file list with non-synced files
    if (sources.length > 0) {
      renderSidebarFileList('fileList', sources, true);
    } else {
      renderSidebarFileList('fileList', [], true);
    }

  } catch (error) {
    showAlert(PROJECT_MESSAGES.SOURCE_DATA_LOAD_FAILED, 'error');

    // Clear sidebar file list on error
    renderSidebarFileList('fileList', [], true);
  } finally {

  }
};

/**
 * Load folder tree structure
 * @deprecated Use loadSourceData() instead
 * @param {string} projectId - Project ID
 */
export const loadSourceTree = async (projectId) => {
  await loadSourceData(projectId);
};

/**
 * Refresh source code data
 */
export const refreshSourceTree = async () => {

  const projectId = getProjectId();
  if (!projectId) return;

  await loadSourceData(projectId);
};

// #endregion

// #region Event Handlers

/**
 * Handle folder selection
 * @param {string} folderId - Selected folder ID
 * @param {SourceTreeManager} manager - Tree manager instance
 */
const handleFolderSelect = async (folderId, manager) => {
  try {
    // Simply load the folder contents
    manager.loadFolder(folderId);
  } catch (error) {
    showAlert(PROJECT_MESSAGES.FOLDER_LOAD_FAILED, 'error');
  }
};

/**
 * Handle file view button click
 * @param {string} fileId - File ID
 * @param {SourceTreeManager} manager - Tree manager instance
 */
const validateIds = (fileId) => {
  if (!fileId) {
    window.showAlert?.(PROJECT_MESSAGES.FILE_ID_REQUIRED, "error");
    return false;
  }
  return true;
};

const validateProject = (projectId, projectLanguage) => {
  if (!projectId) {
    showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
    return false;
  }

  if (!projectLanguage) {
    showAlert(PROJECT_MESSAGES.PROJECT_LANGUAGE_UNDETERMINED, "error");
    return false;
  }
  return true;
};

const findFileInfo = (manager, fileId) => {
  const sources = [manager.sources, manager.data, manager.fileData];

  for (const list of sources) {
    if (Array.isArray(list)) {
      const found = list.find(item => item.id === fileId);
      if (found) return found;
    }
  }
  return null;
};

const extractFileName = (fileInfo, fileId) => {
  if (fileInfo?.name) return fileInfo.name;

  const row = document.querySelector(`tr[data-file-id="${fileId}"]`);
  const cell = row?.querySelector("td:first-child");

  return cell ? cell.textContent.trim() : null;
};

const validateFileExtension = (fileName, projectLanguage) => {
  if (!isValidSourceFile(fileName, projectLanguage)) {
    const extList = getValidExtensions(projectLanguage)
      .map(ext => `.${ext}`)
      .join(", ");

    return false;
  }
  return true;
};

const navigateToFile = (projectId, fileId) => {
  const currentTab = getCurrentTab() || "sourceCode";
  window.location.href = `/projects/${projectId}/src/${fileId}?tab=${currentTab}`;
};

const handleFileView = (fileId, manager) => {
  if (!validateIds(fileId)) return;

  const projectId = getProjectId();
  const projectLanguage = getProjectLanguage();

  if (!validateProject(projectId, projectLanguage)) return;

  const fileInfo = findFileInfo(manager, fileId);
  const fileName = extractFileName(fileInfo, fileId);

  if (!fileName) {
    showAlert(PROJECT_MESSAGES.FILE_TYPE_UNDETERMINED, "error");
    return;
  }

  if (!validateFileExtension(fileName, projectLanguage)) return;

  navigateToFile(projectId, fileId);
};

/**
 * Check if file extension is valid based on project language
 * @param {string} fileName - File name
 * @param {string} language - Project language (Python, C#, Java, etc.)
 * @returns {boolean} - True if extension is valid
 */
const isValidSourceFile = (fileName, language) => {
  if (!fileName) return false;

  const extension = fileName.split('.').pop().toLowerCase();
  const languageMap = {
    'Python': ['py'],
    'C#': ['cs'],
    'Java': ['java'],
    'JavaScript': ['js', 'jsx', 'ts', 'tsx'],
    'Go': ['go'],
    'Ruby': ['rb'],
    'PHP': ['php']
  };

  // If no language specified, block all files
  if (!language) return false;

  const validExtensions = languageMap[language] || [];
  return validExtensions.includes(extension);
};

/**
 * Get valid file extensions for a language
 * @param {string} language - Project language
 * @returns {Array} - Array of valid extensions
 */
const getValidExtensions = (language) => {
  const languageMap = {
    'Python': ['py'],
    'C#': ['cs'],
    'Java': ['java'],
    'JavaScript': ['js', 'jsx', 'ts', 'tsx'],
    'Go': ['go'],
    'Ruby': ['rb'],
    'PHP': ['php']
  };
  return languageMap[language] || [];
};
// #endregion

// #region Helpers
const getSelectedSourceItems = () => {
  // Use SourceTreeManager's optimized selection method
  if (sourceTreeManager) {
    return sourceTreeManager.getSelectedItems();
  }

  // Fallback: if tree manager not available, use DOM checkboxes
  const listContainer = document.getElementById('sourceFileList');
  if (!listContainer) {
    return { fileIds: [], folderIds: [] };
  }

  const fileIds = Array.from(listContainer.querySelectorAll('.file-checkbox:checked'))
    .map((checkbox) => checkbox.dataset.fileId)
    .filter((id) => !!id);

  const folderIds = Array.from(listContainer.querySelectorAll('.folder-checkbox:checked'))
    .map((checkbox) => checkbox.dataset.folderId)
    .filter((id) => !!id);
  return { fileIds, folderIds };
};
// #endregion
// #region Git Operations


// #endregion
// #region Downloads
export const handleSourceCodeDownload = async () => {
  const projectId = getProjectId();
  if (!projectId) {
    showAlert(PROJECT_MESSAGES.PROJECT_ID_NOT_FOUND, 'error');
    return;
  }

  const { fileIds, folderIds } = getSelectedSourceItems();

  if ((fileIds.length === 0) && (folderIds.length === 0)) {
    showAlert(PROJECT_MESSAGES.SELECT_FILE_OR_FOLDER, 'error');
    return;
  }

  try {
    showLoading();

    await DownloadFilesAPI.downloadSourceCode(projectId, fileIds, folderIds);

    showAlert(PROJECT_MESSAGES.FILE_DOWNLOADED, 'success');
  } catch (error) {
    showAlert(error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE, 'error');
  } finally {
    hideLoading();
  }
};
// #endregion

// #region Exports for External Access
export const getSourceCodeData = () => {
  if (!sourceTreeManager) {
    return {
      currentSelectedFolder: null,
      folderTreeData: [],
      currentFiles: []
    };
  }

  return sourceTreeManager.getState();
};

export const getSourceTreeManager = () => sourceTreeManager;
export const getSelectedSourceItemsState = getSelectedSourceItems;
// #endregion