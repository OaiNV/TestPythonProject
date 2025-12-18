/**
 * Project Detail Files Module
 * Handles file upload, delete, and management
 */

import { ProjectAPI } from './project_detail_api.js';
import {
  getProjectId,
  getCurrentTab,
  setRequirementFiles,
  setBasicDesignFiles,
  setSelectedFileIds,
  getRequirementFiles,
  getBasicDesignFiles,
  getSelectedFileIds,
  getSortState,
  setSortState,
  getDetailDesignData,
  ProjectState
} from './project_detail_state.js';
import {
  renderFileTable,
  updateSortIcons,
  setupCheckboxEvents,
} from './project_detail_ui.js';
import {
  $projectid,
  validateFile,
  getUserInfo,
  getTbodyByType
} from './project_detail_helpers.js';
import { PROJECT_MESSAGES } from '../commons/error_messages.js';
import { DownloadFilesAPI } from '../commons/download_files.js';
import { SourceTreeManager } from '../commons/file_List.js';
import { renderSidebarFileList } from '../commons/file_List.js';
import { getSourceTreeManager } from './project_detail_source_code.js';
import { getUTDTreeManager } from './project_detail_utd.js';
import { getUTCTreeManager } from './project_detail_utc.js';
import {
  getAllSelectedFileIdsFromCheckboxStates,
  clearCheckboxStates
} from './project_detail_detail_design.js';
import { TabName } from '../commons/constants.js';
// #region Load Files
/**
 * Load files for a project
 * @param {string} projectId - Project ID
 * @param {string} type - File type (requirement, basicDesign)
 */
const loadFiles = async (projectId, type = 'requirement') => {
  console.log(`[Files] Load - projectId: ${projectId}, type: ${type}`);

  try {

    let result;
    let files = [];

    if (type === 'requirement') {
      result = await ProjectAPI.getRequirementFiles(projectId);
      console.log("[Requirement Files] Loaded:", result);
      files = result.data?.files || [];
      setRequirementFiles(files);
    } else if (type === 'basicDesign') {
      result = await ProjectAPI.getBasicDesign(projectId);
      console.log("[Basic Design Files] Loaded:", result);
      files = result.data?.files || [];
      setBasicDesignFiles(files);
    }

    renderFileTable();
    setupCheckboxEvents();
    updateDownloadButtonsState();

    // Update sidebar file list with non-synced files
    renderSidebarFileList('fileList', files, true);

  } catch (error) {
    console.error(`[${type} Files] Load error:`, error);

    if (type === 'requirement') {
      setRequirementFiles([]);
    } else {
      setBasicDesignFiles([]);
    }

    renderFileTable();

    // Clear sidebar file list on error
    renderSidebarFileList('fileList', [], true);
  } finally {

  }
};
// #endregion

// #region Helper Functions - Convert Status
/**
 * Convert status number sang string
 */
const convertStatusToString = (status) => {
  if (typeof status === 'string') return status;

  const STATUS_MAP = {
    0: '',
    1: '',
    2: 'push',
    3: 'pull',
    4: 'pull_push',
    5: 'synced',
    6: 'delete_push',
    7: 'delete_pull'
  };

  return STATUS_MAP[status] || '';
};

/**
 * Get Git Status text (Local or Git)
 */
const getGitStatusText = (file) => {
  // Use status field directly from API response if available (for detail design and other collections)
  // API returns "status": "Git" or "status": "Local"
  if (file.status && typeof file.status === 'string' && file.status.trim() !== '') {
    return file.status.trim();
  }

  // Fallback: check commit_id (for backward compatibility with requirement/basic design)
  const commitId = file.git?.commit_id || file.commit_id || '';

  if (commitId && commitId !== 'null' && commitId !== '0000000000000') {
    return 'Git';
  }

  return 'Local';
};

/**
 * Render commit ID cell 
 */
const renderCommitIdCell = (file) => {
  let commitId = file.git?.commit_id || file.commit_id || '';

  if (!commitId || commitId === 'null') {
    commitId = '0000000000000';
  }

  // Get sync_status directly, preserve empty string
  // Check file.sync_status first (for detail design and other collections)
  let syncStatus = file.sync_status;
  if (syncStatus === undefined || syncStatus === null) {
    syncStatus = file.git?.sync_status;
  }
  if (syncStatus === undefined || syncStatus === null) {
    syncStatus = file.git?.status || '';
  }

  // Only convert if syncStatus is not empty string
  if (syncStatus !== '') {
    syncStatus = convertStatusToString(syncStatus);
  }

  const formattedCommitId = SourceTreeManager.formatCommitId(commitId);

  const syncIcons = SourceTreeManager.getSyncStatusIcons(syncStatus);

  return `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 4px;">
        <img src="/static/images/commit-git.png" alt="commit" style="width: 16px; height: 16px;">
        <span>${formattedCommitId}</span>
      </div>
      ${syncIcons ? `<span class="sync-status-badge">${syncIcons}</span>` : ''}
    </div>
  `;
};

/**
 * Render status badge 
 */
const renderStatusBadge = (file) => {
  const statusText = getGitStatusText(file);
  if (!statusText) return '';
  return `<span class="status-badge status-${statusText.toLowerCase()}">${statusText}</span>`;
};

/**
 * Check if file deleted
 */
const isFileDeleted = (file) => {
  // Check file.sync_status first (for detail design and other collections)
  const status = file.sync_status || file.git?.sync_status || file.git?.status || '';
  const statusStr = convertStatusToString(status);
  return statusStr === 'delete_push' || statusStr === 'delete_pull';
};

/**
 * Render file row 
 */
const renderFileRow = (file) => {
  const deleted = isFileDeleted(file);
  const deletedClass = deleted ? 'deleted-row' : '';

  return `
    <tr data-file-id="${file.id || ''}" class="${deletedClass}">
      <td>
        <input type="checkbox" 
               class="checkbox file-checkbox" 
               data-file-id="${file.id || ''}">
      </td>
      <td>
        ${deleted ? '<img src="/static/images/minus.png" alt="minus" style="width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;" title="削除済み">' : ''}
        <span class="${deleted ? 'deleted-file-name' : ''}">${escapeHtml(file.file_name || '')}</span>
      </td>
      <td>${renderCommitIdCell(file)}</td>
      <td>${renderStatusBadge(file)}</td>
      <td>${formatDate(file.updated_at)}</td>
      <td>${formatDate(file.created_at)}</td>
    </tr>
  `;
};
// #endregion

// #region File Upload
/**
 * Handle file upload
 * @param {File} file - File object
 * @param {string} tabType - Tab type (requirement, basicDesign)
 */
const handleFileUpload = async (file, tabType = 'requirement') => {
  if (!file) return;

  console.log('[Upload] Starting...', file.name);

  const validation = validateFile(file);
  if (!validation.valid) {
    showAlert(validation.message, "error");
    return;
  }

  const userInfo = getUserInfo();

  console.log('[Upload] User Info:', userInfo);

  if (!userInfo || !userInfo.user_id) {
    showAlert(PROJECT_MESSAGES.USER_NOT_FOUND, "error");
    return;
  }

  showLoading();

  try {
    const projectId = getProjectId();
    let result;

    if (tabType === 'basicDesign') {
      result = await ProjectAPI.uploadBasicDesign(projectId, file, userInfo.user_id);
    } else {
      result = await ProjectAPI.uploadRequirementFile(projectId, file, userInfo.user_id);
    }

    console.log('[Upload] Success:', result);
    await loadFiles(projectId, tabType);

  } catch (error) {
    console.error('[Upload] Error:', error);

    if (error.message.includes('PAYLOAD_TOO_LARGE')) {
      showAlert(PROJECT_MESSAGES.FILE_SIZE_TOO_LARGE, "error");
    } else {
      showAlert(error.message || PROJECT_MESSAGES.UPLOAD_FAILED, "error");
    }
  } finally {
    hideLoading();
  }
};
// #endregion

// #region File Delete
/**
 * Delete basic design files
 * @param {string} projectId - Project ID
 * @param {Array<string>} selectedIds - Selected file IDs
 * @returns {Promise<Object>} Delete result
 */
const deleteBasicDesignFiles = async (projectId, selectedIds) => {
  console.log('[削除] 基本設計書ファイル:', selectedIds);

  try {
    const result = await ProjectAPI.deleteFileBasicDesign(projectId, selectedIds);

    if (result.deleted_ids?.length) {
      // Reload file list to update sync_status (files with commit_id will have DELETE_PUSH status)
      await loadFiles(projectId, 'basicDesign');
    }

    showAlert(PROJECT_MESSAGES.BASIC_DESIGN_DELETED, "success");
    return result;
  } catch (error) {
    console.error('[deleteBasicDesignFiles] Error:', error);
    throw error;
  }
};

/**
 * Delete requirement files
 * @param {string} projectId - Project ID
 * @param {Array<string>} selectedIds - Selected file IDs
 * @returns {Promise<Object>} Delete result
 */
const deleteRequirementFiles = async (projectId, selectedIds) => {
  console.log('[削除] 要件定義書ファイル:', selectedIds);

  try {
    const result = await ProjectAPI.deleteFileRequirement(projectId, selectedIds);

    if (result.deleted_ids?.length) {
      // Reload file list to update sync_status (files with commit_id will have DELETE_PUSH status)
      await loadFiles(projectId, 'requirement');
    }

    showAlert(PROJECT_MESSAGES.FILE_DELETED, "success");
    return result;
  } catch (error) {
    console.error('[deleteRequirementFiles] Error:', error);
    throw error;
  }
};

/**
 * Cleanup UI after file deletion
 * @param {string} currentTab - Current tab type
 */
const cleanupAfterDelete = (currentTab) => {
  try {
    renderFileTable();

    const selectAllId = currentTab === 'basicDesign' ? 'selectAllCheckbox1' : 'selectAllCheckbox';
    const selectAllCheckbox = $projectid(selectAllId);
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    setSelectedFileIds([]);
  } catch (error) {
    console.error('[cleanupAfterDelete] Error:', error);
  }
};

/**
 * Handle file deletion
 */
const handleDeleteFiles = async () => {
  try {
    updateSelectedFiles();
    const selectedIds = getSelectedFileIds();

    if (!selectedIds || selectedIds.length === 0) {
      showAlert(PROJECT_MESSAGES.SELECT_FILE_ERROR, "error");
      return;
    }

    const currentTab = getCurrentTab();
    const allFiles = currentTab === 'basicDesign' ? getBasicDesignFiles() : getRequirementFiles();

    const validFiles = allFiles.filter(file => selectedIds.includes(file.id) && !isFileDeleted(file));

    if (validFiles.length === 0) {
      showAlert(PROJECT_MESSAGES.FILE_ALREADY_DELETED, "error");
      return;
    }

    const validIds = validFiles.map(f => f.id);
    const projectId = getProjectId();

    // Confirm dialog
    const deleteConfirmMsg = PROJECT_MESSAGES.FILE_DELETE_CONFIRM(validIds.length);
    const confirmed = await window.confirm(PROJECT_MESSAGES.FILE_DELETE_TITLE, deleteConfirmMsg);
    if (!confirmed) return;

    showLoading();

    let result;
    if (currentTab === 'basicDesign') {
      result = await deleteBasicDesignFiles(projectId, validIds);
    } else {
      result = await deleteRequirementFiles(projectId, validIds);
    }

    cleanupAfterDelete(currentTab);

  } catch (error) {
    showAlert(error.message || PROJECT_MESSAGES.FILE_DELETE_ERROR, "error");
  } finally {
    hideLoading();
  }
};
// #endregion

// #region File Download

/**
 * Helper: get selected file IDs from a manager (handles files + folders recursively)
 * @param {object} manager - Manager instance with getSelectedItems() and currentFiles
 * @returns {Array<string>} Array of selected file IDs or null if manager unavailable
 */
const getSelectedFromManager = (manager) => {
  if (!manager || typeof manager.getSelectedItems !== 'function') return null;

  const sel = manager.getSelectedItems();
  const fileIds = Array.isArray(sel.fileIds) ? sel.fileIds.filter(Boolean) : [];
  const folderIds = Array.isArray(sel.folderIds) ? sel.folderIds.filter(Boolean) : [];

  const allFileIds = [...fileIds];

  if (folderIds.length && manager.currentFiles) {
    folderIds.forEach(folderId => {
      const subfolderIds = typeof manager._getAllSubfolderIds === 'function'
        ? manager._getAllSubfolderIds(folderId)
        : [];
      const allFolderIds = [folderId, ...subfolderIds];

      allFolderIds.forEach(fId => {
        const filesInFolder = manager.currentFiles.filter(file => file.folder_id === fId);
        filesInFolder.forEach(file => {
          const fileId = file.id || file.file_id;
          if (fileId && !allFileIds.includes(fileId)) allFileIds.push(fileId);
        });
      });
    });
  }

  return allFileIds;
};

/**
 * Get selected file IDs from a specific table
 * @param {string} tableType - Table type (sourceCode, unitTestSpec, unitTestCode, requirement, basicDesign, detailDesign)
 * @returns {Array<string>} Array of selected file IDs
 */
const getSelectedFileIdsFromTable = (tableType) => {
  try {
    let container = null;

    // Tables using Manager: sourceCode, unitTestSpec, unitTestCode
    if ([TabName.SOURCE_CODE, TabName.UNIT_TEST_SPEC, TabName.UNIT_TEST_CODE].includes(tableType)) {
      let managerGetter = null;
      if (tableType === TabName.SOURCE_CODE) managerGetter = getSourceTreeManager;
      if (tableType === TabName.UNIT_TEST_SPEC) managerGetter = getUTDTreeManager;
      if (tableType === TabName.UNIT_TEST_CODE) managerGetter = getUTCTreeManager;

      try {
        const manager = managerGetter && typeof managerGetter === 'function' ? managerGetter() : null;
        const managedResult = getSelectedFromManager(manager);

        if (managedResult) {
          console.log(`[getSelectedFileIdsFromTable] Using Manager for ${tableType}, total file IDs:`, managedResult.length);
          return managedResult;
        }
      } catch (err) {
        console.warn(`[getSelectedFileIdsFromTable] Manager unavailable for ${tableType}, falling back to DOM`, err);
      }

      // fallback to DOM
      if (tableType === TabName.SOURCE_CODE) container = $projectid('sourceFileList');
      if (tableType === TabName.UNIT_TEST_SPEC) container = $projectid('utd-sourceFileList');
      if (tableType === TabName.UNIT_TEST_CODE) container = $projectid('utc-sourceFileList');
    }
    // Detail Design tables: use checkboxStates instead of DOM
    else if (tableType.startsWith('detailDesign-')) {
      try {
        console.log("[getSelectedFileIdsFromTable] Using checkboxStates for detail design");

        const selectedIds = getAllSelectedFileIdsFromCheckboxStates();
        return selectedIds;
      } catch (err) {
        // Fallback to DOM if there's an error
        container = getTbodyByType(tableType);
      }
    }
    // Other tables: requirement, basicDesign
    else {
      container = getTbodyByType(tableType);
    }

    if (!container) {
      console.warn(`[getSelectedFileIdsFromTable] Container not found for tableType: ${tableType}`);
      return [];
    }

    // Fallback: get selected checkboxes from DOM
    const selectedIds = Array.from(container.querySelectorAll(".file-checkbox:checked"))
      .map(cb => cb.dataset.fileId)
      .filter(Boolean);

    return selectedIds;

  } catch (error) {
    console.error('[getSelectedFileIdsFromTable] Error:', error);
    return [];
  }
};

/**
 * Get files by sync status and auto-select them (tick checkboxes)
 * @returns {Array<string>} Array of file IDs with push status
 */
const getFilesBySyncStatusAndAutoSelect = () => {
  console.log(`[getFilesBySyncStatusAndAutoSelect] Start`);

  try {
    const fileListElement = document.getElementById('fileList');
    if (!fileListElement) {
      console.log("[getFilesBySyncStatusAndAutoSelect] fileList element not found");
      return [];
    }

    const fileItems = fileListElement.querySelectorAll('.file-item[data-file-id]');
    if (!fileItems || fileItems.length === 0) {
      console.log("[getFilesBySyncStatusAndAutoSelect] No file items found in fileList");
      return [];
    }

    const fileIds = [];
    fileItems.forEach(fileItem => {
      const fileId = fileItem.dataset.fileId;
      if (!fileId) return;
      fileIds.push(fileId);
    });

    return fileIds;
  } catch (error) {
    console.error('[getFilesBySyncStatusAndAutoSelect] Error:', error);
    return [];
  }
};

/**
 * Handle download requirement files
 */
const handleDownloadRequirementFiles = async () => {
  console.log('[Download] Start - requirement files');

  try {
    const selectedIds = getSelectedFileIdsFromTable('requirement');

    if (selectedIds.length === 0) {
      showAlert(PROJECT_MESSAGES.SELECT_FILE_ERROR, "error");
      return;
    }

    showLoading();

    const projectId = getProjectId();
    await DownloadFilesAPI.downloadRequirementFiles(projectId, selectedIds);

    showAlert(PROJECT_MESSAGES.FILE_DOWNLOADED || "ファイルをダウンロードしました", "success");
    console.log('[Download] Success');

  } catch (error) {
    console.error('[Download] Error:', error);
    showAlert(error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE, "error");
  } finally {
    hideLoading();
  }
};

/**
 * Handle download basic design files
 */
const handleDownloadBasicDesignFiles = async () => {
  console.log('[Download] Start - basic design files');

  try {
    const selectedIds = getSelectedFileIdsFromTable('basicDesign');

    if (selectedIds.length === 0) {
      showAlert(PROJECT_MESSAGES.SELECT_FILE_ERROR, "error");
      return;
    }

    showLoading();

    const projectId = getProjectId();
    await DownloadFilesAPI.downloadBasicDesignFiles(projectId, selectedIds);

    showAlert(PROJECT_MESSAGES.FILE_DOWNLOADED || "ファイルをダウンロードしました", "success");
    console.log('[Download] Success');

  } catch (error) {
    console.error('[Download] Error:', error);
    showAlert(error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE, "error");
  } finally {
    hideLoading();
  }
};

/**
 * Handle download detail design files
 */
const handleDownloadDetailDesignFiles = async () => {
  console.log('[Download] Start - detail design files');

  try {
    // Get selected IDs from all detail design tables (class, method, interface, folder, activityDiagram)
    const selectedIds = [];
    const tableTypes = ['detailDesign-class', 'detailDesign-method', 'detailDesign-interface', 'detailDesign-folder', 'detailDesign-activityDiagram'];

    tableTypes.forEach(tableType => {
      const ids = getSelectedFileIdsFromTable(tableType);
      selectedIds.push(...ids);
    });

    if (selectedIds.length === 0) {
      showAlert(PROJECT_MESSAGES.SELECT_FILE_ERROR, "error");
      return;
    }

    showLoading();

    const projectId = getProjectId();
    await DownloadFilesAPI.downloadDetailDesignFiles(projectId, selectedIds);

    showAlert(PROJECT_MESSAGES.FILE_DOWNLOADED || "ファイルをダウンロードしました", "success");
    console.log('[Download] Success');

  } catch (error) {
    console.error('[Download] Error:', error);
    showAlert(error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE, "error");
  } finally {
    hideLoading();
  }
};
// #endregion

// #region File Selection
/**
 * Update selected files array
 */
// Flag to prevent infinite loop when updating select all checkbox
let isUpdatingSelectAll = false;

/**
 * Update select all checkbox state based on individual checkboxes
 * @param {string} tabType - Tab type (requirement, basicDesign, detailDesign-class, etc.)
 */
const updateSelectAllCheckboxState = (tabType) => {
  try {
    if (isUpdatingSelectAll) return;

    const tbody = getTbodyByType(tabType);
    if (!tbody) return;

    const checkboxes = tbody.querySelectorAll(".file-checkbox");
    if (checkboxes.length === 0) return;

    const checkedCount = tbody.querySelectorAll(".file-checkbox:checked").length;
    const allChecked = checkedCount === checkboxes.length;

    // Map tabType to selectAllCheckbox ID
    const selectAllCheckboxIdMap = {
      'requirement': 'selectAllCheckbox',
      'basicDesign': 'selectAllCheckbox1',
      'detailDesign-class': 'selectAllCheckboxClass',
      'detailDesign-method': 'selectAllCheckboxMethod',
      'detailDesign-interface': 'selectAllCheckboxInterface',
      'detailDesign-folder': 'selectAllCheckboxFolder',
      'detailDesign-activityDiagram': 'selectAllCheckboxActivityDiagram'
    };

    const selectAllCheckboxId = selectAllCheckboxIdMap[tabType];
    if (!selectAllCheckboxId) return;

    const selectAllCheckbox = $projectid(selectAllCheckboxId);
    if (selectAllCheckbox && selectAllCheckbox.checked !== allChecked) {
      isUpdatingSelectAll = true;
      selectAllCheckbox.checked = allChecked;
      // Use setTimeout to reset flag after event propagation
      setTimeout(() => {
        isUpdatingSelectAll = false;
      }, 0);
    }
  } catch (error) {
    console.error('[updateSelectAllCheckboxState] Error:', error);
    isUpdatingSelectAll = false;
  }
};

/**
 * Update download buttons state based on selected checkboxes
 */
const updateDownloadButtonsState = () => {
  try {
    // Requirement Document tab
    const requirementTbody = getTbodyByType('requirement');
    const requirementChecked = requirementTbody
      ? requirementTbody.querySelectorAll(".file-checkbox:checked").length
      : 0;
    const requirementDownloadBtn = $projectid("basicDesignDownloadBtn");
    if (requirementDownloadBtn) {
      const isDisabled = requirementChecked === 0;
      requirementDownloadBtn.disabled = isDisabled;
      requirementDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    // Basic Design Document tab
    const basicDesignTbody = getTbodyByType('basicDesign');
    const basicDesignChecked = basicDesignTbody
      ? basicDesignTbody.querySelectorAll(".file-checkbox:checked").length
      : 0;
    const basicDesignDownloadBtn = $projectid("requirementDesignDownloadBtn");
    if (basicDesignDownloadBtn) {
      const isDisabled = basicDesignChecked === 0;
      basicDesignDownloadBtn.disabled = isDisabled;
      basicDesignDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    // Detail Design Document tab - check all sections
    const detailDesignSections = [
      'detailDesign-class',
      'detailDesign-method',
      'detailDesign-interface',
      'detailDesign-folder',
      'detailDesign-activityDiagram'
    ];
    let detailDesignChecked = 0;
    detailDesignSections.forEach(sectionType => {
      const tbody = getTbodyByType(sectionType);
      if (tbody) {
        detailDesignChecked += tbody.querySelectorAll(".file-checkbox:checked").length;
      }
    });
    const detailDesignDownloadBtn = $projectid("detailDesignDownloadBtn");
    if (detailDesignDownloadBtn) {
      const isDisabled = detailDesignChecked === 0;
      detailDesignDownloadBtn.disabled = isDisabled;
      detailDesignDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    // Source Code tab - check both files and folders
    const sourceCodeListContainer = $projectid('sourceFileList');
    let sourceCodeChecked = 0;
    if (sourceCodeListContainer) {
      const fileChecked = sourceCodeListContainer.querySelectorAll(".file-checkbox:checked").length;
      const folderChecked = sourceCodeListContainer.querySelectorAll(".folder-checkbox:checked").length;
      sourceCodeChecked = fileChecked + folderChecked;
    }
    const sourceCodeDownloadBtn = $projectid("sourceCodeDownloadBtn");
    if (sourceCodeDownloadBtn) {
      const isDisabled = sourceCodeChecked === 0;
      sourceCodeDownloadBtn.disabled = isDisabled;
      sourceCodeDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    // Unit Test Spec tab - check both files and folders
    const unitTestSpecListContainer = $projectid('utd-sourceFileList');
    let unitTestSpecChecked = 0;
    if (unitTestSpecListContainer) {
      const fileChecked = unitTestSpecListContainer.querySelectorAll(".file-checkbox:checked").length;
      const folderChecked = unitTestSpecListContainer.querySelectorAll(".folder-checkbox:checked").length;
      unitTestSpecChecked = fileChecked + folderChecked;
    }
    const unitTestSpecDownloadBtn = $projectid("utd-downloadUnitTestSpecBtn");
    if (unitTestSpecDownloadBtn) {
      const isDisabled = unitTestSpecChecked === 0;
      unitTestSpecDownloadBtn.disabled = isDisabled;
      unitTestSpecDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    // Unit Test Code tab - check both files and folders
    const unitTestCodeListContainer = $projectid('utc-sourceFileList');
    let unitTestCodeChecked = 0;
    if (unitTestCodeListContainer) {
      const fileChecked = unitTestCodeListContainer.querySelectorAll(".file-checkbox:checked").length;
      const folderChecked = unitTestCodeListContainer.querySelectorAll(".folder-checkbox:checked").length;
      unitTestCodeChecked = fileChecked + folderChecked;
    }
    const unitTestCodeDownloadBtn = $projectid("utc-downloadUnitTestCodeBtn");
    if (unitTestCodeDownloadBtn) {
      const isDisabled = unitTestCodeChecked === 0;
      unitTestCodeDownloadBtn.disabled = isDisabled;
      unitTestCodeDownloadBtn.style.opacity = isDisabled ? '0.5' : '1';
    }
  } catch (error) {
    console.error('[updateDownloadButtonsState] Error:', error);
  }
};

const updateSelectedFiles = (optimizedSelection = null) => {
  try {
    let selectedIds = [];

    // If caller provided an optimized selection object (from SourceTreeManager), use it
    if (optimizedSelection && typeof optimizedSelection === 'object') {
      if (Array.isArray(optimizedSelection.fileIds)) {
        selectedIds = optimizedSelection.fileIds.slice();
      }
    } else {
      // Fallback: read visible DOM checkboxes (current folder view)
      selectedIds = Array.from(document.querySelectorAll(".file-checkbox:checked"))
        .map(cb => cb.dataset.fileId);
    }

    setSelectedFileIds(selectedIds);
    console.log('[Files] 現在選択中のファイル:', selectedIds);

    // Update select all checkbox state for requirement tab
    updateSelectAllCheckboxState('requirement');

    // Update select all checkbox state for basicDesign tab
    updateSelectAllCheckboxState('basicDesign');

    // Update select all checkbox state for all detail design sections
    updateSelectAllCheckboxState('detailDesign-class');
    updateSelectAllCheckboxState('detailDesign-method');
    updateSelectAllCheckboxState('detailDesign-interface');
    updateSelectAllCheckboxState('detailDesign-folder');
    updateSelectAllCheckboxState('detailDesign-activityDiagram');

    // Update download buttons state
    updateDownloadButtonsState();
  } catch (error) {
    console.error('[updateSelectedFiles] Error:', error);
  }
};

// Expose updateSelectedFiles to window for SourceTreeManager to use
window.updateSelectedFiles = updateSelectedFiles;

/**
 * Handle select all checkbox
 * @param {Event} event - Change event
 * @param {string} tabType - Tab type
 */
const handleSelectAll = (event, tabType) => {
  console.log('[handleSelectAll] tabType:', tabType);

  try {
    // Skip if this is triggered by updateSelectAllCheckboxState
    if (isUpdatingSelectAll) return;

    const isChecked = event.target.checked;
    const tbody = getTbodyByType(tabType);

    if (!tbody) return;

    // const checkboxes = tbody.querySelectorAll(".file-checkbox");
    const checkboxes = tbody.querySelectorAll(".file-checkbox:not([disabled])");
    checkboxes.forEach(cb => cb.checked = isChecked);

    updateSelectedFiles();
  } catch (error) {
    console.error('[handleSelectAll] Error:', error);
  }
};
// #endregion

// #region File Sort
/**
 * Sort files by column
 * @param {string} type - Table type (requirement, basicDesign)
 * @param {string} column - Column name
 */
const sortFiles = (type, column) => {
  console.log(`[sortFiles] type: ${type}, column: ${column}`);

  try {
    let fileList = type === 'requirement' ? getRequirementFiles() : getBasicDesignFiles();
    const state = getSortState(type);

    if (state.column === column) {
      state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
      state.column = column;
      state.direction = 'asc';
    }

    setSortState(type, state.column, state.direction);

    fileList.sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (column === 'commit_id') {
        valA = a.git?.commit_id || '';
        valB = b.git?.commit_id || '';
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return state.direction === 'asc' ? -1 : 1;
      if (valA > valB) return state.direction === 'asc' ? 1 : -1;
      return 0;
    });

    renderFileTable();
    updateSortIcons(type, column, state.direction);
  } catch (error) {
    console.error('[sortFiles] Error:', error);
  }
};
// #endregion

// #region Generate Basic Design
/**
 * Handle generate basic design from requirement files
 */
const handleGenerateBasicDesign = async () => {
  console.log('[Generate Basic Design] Start');

  try {
    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateBasicDesign(projectId, "requirement");

      console.log("[Generate Basic Design] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Basic Design] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Basic Design] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle regenerate basic design from detail design files
 */
const handleRegenerateBasicDesign = async () => {
  console.log('[Regenerate Basic Design] Start');

  try {

    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateBasicDesign(projectId, "detail_design");

      console.log("[Regenerate Basic Design] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

      // Clear checkbox states for all detail design sections
      clearCheckboxStates();

    } catch (error) {
      console.error("[Regenerate Basic Design] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Regenerate Basic Design] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle generate detail design from basic design files
 */
const handleGenerateDetailDesign = async () => {
  console.log('[Generate Detail Design] Start');

  try {
    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateDetailDesign(projectId, "basic_design");

      console.log("[Generate Detail Design] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Detail Design] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Detail Design] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle generate detail design from source code files
 */
const handleGenerateDetailDesignFromSourceCode = async () => {
  console.log('[Generate Detail Design From Source Code] Start');

  try {
    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateDetailDesign(projectId, "source_code");

      console.log("[Generate Detail Design From Source Code] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Detail Design From Source Code] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Detail Design From Source Code] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle generate source code from detail design files
 */
const handleGenerateSourceCode = async () => {
  console.log('[Generate Source Code] Start');

  try {
    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateSourceCode(projectId, "detail_design");

      console.log("[Generate Source Code] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Source Code] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Source Code] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle generate unit test from detail design or source code files
 * Detects current tab to determine input_source
 */
const handleGenerateUnitTest = async () => {
  console.log('[Generate Unit Test] Start');

  try {
    // Detect current tab to determine input_source
    const currentTab = getCurrentTab();
    let inputSource = "detail_design"; // default

    if (currentTab === "sourceCode") {
      inputSource = "source_code";
    } else if (currentTab === "detailDesign") {
      inputSource = "detail_design";
    }

    console.log(`[Generate Unit Test] Detected tab: ${currentTab}, using input_source: ${inputSource}`);

    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateUnitTest(projectId, inputSource);

      console.log("[Generate Unit Test] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Unit Test] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Unit Test] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};

/**
 * Handle generate unit test code from unit test design files
 */
const handleGenerateUnitTestCode = async () => {
  console.log('[Generate Unit Test Code] Start');

  try {
    showLoading();

    try {
      const projectId = getProjectId();
      const result = await ProjectAPI.generateUnitTestCode(projectId, "unit_test_design");

      console.log("[Generate Unit Test Code] Response:", result);

      if (result.statusCode === 200) {
        showAlert(PROJECT_MESSAGES.BASIC_DESIGN_GENERATE_SUCCESS, "success");
      } else {
        showAlert(PROJECT_MESSAGES.GENERATE_COMPLETED, "info");
      }

    } catch (error) {
      console.error("[Generate Unit Test Code] Error:", error);
      const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
    } finally {
      hideLoading();
    }
  } catch (error) {
    console.error("[Generate Unit Test Code] Error:", error);
    const errorMsg = error.message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
    showAlert(errorMsg, "error");
  }
};
// #endregion

// #region File Input Setup
/**
 * Setup file input element
 * @param {string} tabType - Tab type
 * @returns {HTMLInputElement} File input element
 */
const setupFileInput = (tabType) => {
  console.log('[setupFileInput] tabType:', tabType);

  try {
    const inputId = tabType === 'basicDesign' ? 'fileInput1' : 'fileInput';
    let fileInput = $projectid(inputId);

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = inputId;
      fileInput.accept = '.md,.jpg,.jpeg,.png';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          await handleFileUpload(file, tabType);
          e.target.value = '';
        }
      });
    }

    return fileInput;
  } catch (error) {
    console.error('[setupFileInput] Error:', error);
    return null;
  }
};

/**
 * Handle upload button click
 * @param {string} type - File type (requirement, basicDesign)
 */
const handleUploadClick = (type) => {
  console.log('[handleUploadClick] type:', type);

  try {
    const inputId = type === 'requirement' ? 'requirementFileInput' : 'basicDesignFileInput';
    let fileInput = $projectid(inputId);

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = inputId;
      fileInput.accept = '.md,.jpg,.jpeg,.png';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await handleFileUpload(file, type);
      e.target.value = '';
    };

    fileInput.click();
  } catch (error) {
    console.error('[handleUploadClick] Error:', error);
  }
};
// #endregion

// Export file functions
export {
  loadFiles,
  handleFileUpload,
  handleDeleteFiles,
  deleteBasicDesignFiles,
  deleteRequirementFiles,
  cleanupAfterDelete,
  updateSelectedFiles,
  updateDownloadButtonsState,
  handleSelectAll,
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
  setupFileInput,
  handleUploadClick,
  renderFileRow,
  renderCommitIdCell,
  renderStatusBadge,
  isFileDeleted,
  getSelectedFileIdsFromTable,
  getFilesBySyncStatusAndAutoSelect
};

