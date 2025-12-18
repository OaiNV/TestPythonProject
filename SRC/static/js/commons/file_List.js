/**
 * Common: Sidebar File List Renderer
 * Render sidebar file list với trạng thái commit
 */

/**
 * Mock data
 */
export const MOCK_SIDEBAR_FILES = [
  { id: 'file001', file_name: 'SourceCode Document File001', commit_id: '0000000000000', status: '' },
  { id: 'file002', file_name: 'SourceCode Document File002', commit_id: '0000000000000', status: 'push' },
  { id: 'file003', file_name: 'SourceCode Document File003', commit_id: '0000000000000', status: 'pull' },
  { id: 'file004', file_name: 'SourceCode Document File004', commit_id: '0000000000000', status: 'pull_push' },
  { id: 'file005', file_name: 'SourceCode Document File005', commit_id: '0000000000000', status: 'synced' },
  { id: 'file006', file_name: 'SourceCode Document File006', commit_id: '0000000000000', status: 'delete_push' },
  { id: 'file007', file_name: 'SourceCode Document File007', commit_id: '0000000000000', status: 'delete_pull' }
];

/**
 * Helper class: commit ID format & sync status icons
 */
export class SourceTreeManager {
  static getSyncStatusIcons(syncStatus) {
    // Normalize syncStatus to lowercase for case-insensitive matching
    const normalizedStatus = typeof syncStatus === 'string' ? syncStatus.toLowerCase().trim() : '';

    // Return empty string for synced status (no icon needed)
    if (normalizedStatus === 'synced') return '';

    // Return empty string for delete_push and delete_pull (no icon needed, file name already shows deleted)
    if (normalizedStatus === 'delete_push' || normalizedStatus === 'delete_pull') return '';

    // Show warning icon when sync_status is empty string, null, or undefined
    if (syncStatus === '' || syncStatus === null || syncStatus === undefined || normalizedStatus === 'n/a') {
      return '<img src="/static/images/warning.png" alt="warning" class="sync-icon" title="ローカルアップロード">';
    }

    const SYNC_STATUS_ICONS = {
      push: '<img src="/static/images/right-up.png" alt="push" class="sync-icon" title="リモートのブランチと差分が出る">',
      pull: '<img src="/static/images/right-down.png" alt="pull" class="sync-icon" title="リモートのブランチに新規コミットの更新がある">',
      pull_push: `
    <img src="/static/images/right-up.png" alt="push" class="sync-icon" title="ローカルとリモートブランチに変更がある">
    <img src="/static/images/right-down.png" alt="pull" class="sync-icon" title="ローカルとリモートブランチに変更がある">
  `
    };

    return SYNC_STATUS_ICONS[normalizedStatus] || '';
  }

  static formatCommitId(commitId) {
    if (!commitId) return '';
    return commitId.substring(0, 12);
  }

  static getFileSyncStatus(file) {
    return getFileSyncStatus(file);
  }
}

/**
 * Convert status number to string (same logic as project_detail_files.js)
 */
export const convertStatusToString = (status) => {
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
 * Get sync status from file object
 * @param {Object} file - File object
 * @returns {string} Normalized sync status string
 */
export const getFileSyncStatus = (file) => {
  if (!file) return '';

  // Get sync_status directly, preserve empty string (same logic as renderCommitIdCell)
  // Support both formats: requirement/basicDesign (with git object) and sourceCode (direct)
  let syncStatus = file.git?.sync_status;
  if (syncStatus === undefined || syncStatus === null) {
    syncStatus = file.git?.status || file.sync_status || file.status || '';
  }

  // Only convert if syncStatus is not empty string
  if (syncStatus !== '') {
    syncStatus = convertStatusToString(syncStatus);
  }

  return typeof syncStatus === 'string' ? syncStatus.toLowerCase().trim() : '';
};

/**
 * Check if file has valid commit ID
 * @param {Object} file - File object
 * @returns {boolean} True if file has valid commit ID
 */
export const hasValidCommitId = (file) => {
  if (!file) return false;

  const commitId = file.git?.commit_id || file.commit_id || '';
  return commitId && commitId !== 'null' && commitId !== '0000000000000' && commitId.trim() !== '';
};

/**
 * Create sidebar file item element
 * @param {Object} file - File data
 * @returns {HTMLElement} File item element
 */
export const createSidebarFileItem = (file) => {
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.dataset.fileId = file.id;

  const normalizedSyncStatus = getFileSyncStatus(file);
  const isDeleted = normalizedSyncStatus === 'delete_push' || normalizedSyncStatus === 'delete_pull';

  if (isDeleted) fileItem.classList.add('deleted');

  const fileHasValidCommitId = hasValidCommitId(file);
  const commitId = file.git?.commit_id || file.commit_id || '';
  const formattedCommitId = fileHasValidCommitId ? SourceTreeManager.formatCommitId(commitId) : '';
  const fileName = escapeHtml(file.file_name || '');
  const syncIcons = SourceTreeManager.getSyncStatusIcons(normalizedSyncStatus);

  fileItem.innerHTML = `
    <div class="file-left-section">
      ${isDeleted ? `<img src="/static/images/minus.png" alt="minus" class="minus-icon" title="削除済み">` : ''}
      <span class="file-name">${fileName}</span>
    </div>
    <div class="file-right-section">
      ${fileHasValidCommitId ? `
      <div class="file-commit-id-container">
        <img src="/static/images/commit-git.png" alt="commit" class="commit-icon-img">
          <span class="file-commit-id">${formattedCommitId}</span>
      </div>
      ` : ''}
      ${syncIcons ? `<span class="sync-status-badge">${syncIcons}</span>` : ''}
    </div>
  `;

  return fileItem;
};

/**
 * Filter files by sync_status (exclude synced files)
 * @param {Array} files - Array of files
 * @returns {Array} Filtered files
 */
const filterNonSyncedFiles = (files) => {
  if (!files || !Array.isArray(files)) return [];

  return files.filter(file => {
    const normalizedStatus = getFileSyncStatus(file);
    return normalizedStatus !== 'synced';
  });
};

/**
 * Render sidebar file list
 * @param {string} containerId - ID của container sidebar
 * @param {Array} files - Mảng file (nếu null sẽ dùng mock data)
 * @param {boolean} filterSynced - Filter out synced files (default: true)
 */
export const renderSidebarFileList = (containerId, files = null, filterSynced = true) => {
  const fileListContainer = document.getElementById(containerId);
  if (!fileListContainer) {
    console.warn('[renderSidebarFileList] Container not found');
    return;
  }

  let fileData = files || MOCK_SIDEBAR_FILES;

  // Filter out synced files if filterSynced is true
  if (filterSynced && fileData && Array.isArray(fileData)) {
    fileData = filterNonSyncedFiles(fileData);
  }

  if (!fileData || fileData.length === 0) {
    fileListContainer.innerHTML = `
      <div style="text-align:center;padding:20px;color:#718096;font-size:14px;">
        ファイルがありません
      </div>
    `;
    return;
  }

  fileListContainer.innerHTML = '';
  fileData.forEach(file => {
    const fileItem = createSidebarFileItem(file);
    fileListContainer.appendChild(fileItem);
  });

  console.log('[renderSidebarFileList] Complete - rendered', fileData.length, 'files');
};
