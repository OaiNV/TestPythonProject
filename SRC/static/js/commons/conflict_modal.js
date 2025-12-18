/**
 * Conflict Modal
 * Handles conflict detection modal when Git push fails due to conflicts
 */

import { getProjectId } from "../project_detail/project_detail_state.js";
import { DownloadFilesAPI } from "./download_files.js";
// #region Constants
const CONFLICT_MODAL_HTML = `
  <div id="conflictModal" class="conflict-modal" style="display:none;">
    <div class="conflict-modal-overlay"></div>
    <div class="conflict-modal-content">
      <div class="conflict-modal-header">
        <img src="/static/images/warn.svg" alt="warning" class="conflict-warning-icon">
        <h3 class="conflict-modal-title">コンフリクトが発生しました</h3>
      </div>
      <p class="conflict-modal-description">リモートとローカルのファイルに差分があります。</p>
      <p class="conflict-modal-subtitle">以下のファイルでコンフリクトが発生しています:</p>
      <div class="conflict-files-list" id="conflictFilesList">
        <!-- Files will be populated here -->
      </div>
      <p class="conflict-modal-instruction">これらのファイルをローカルにダウンロードし コンフリクトを解消してから再アップロードしてください。</p>
      <div class="conflict-modal-actions">
        <button id="conflictDownloadBtn" class="btn btn-primary">
          <img src="/static/images/download.png" alt="download" class="btn-icon">
          <span>Download</span>
        </button>
        <button id="conflictOkBtn" class="btn btn-primary">OK</button>
      </div>
    </div>
  </div>
`;
// #endregion

// #region Modal State
let conflictResolve = null;
let isConflictModalInitialized = false;
let currentConflictFiles = [];
let currentConflictProjectId = null;
let conflictDownloadBtn = null;
let conflictOkBtn = null;
let isConflictDownloadInProgress = false;
let currentConflictOptions = {
  source: "push",
  projectId: null,
  onUseRemoteVersion: null,
};
let isUseRemoteVersionEnabled = false;
// #endregion

// #region Private Functions

/**
 * Initialize conflict modal (create DOM elements)
 */
const initConflictModal = () => {
  console.log('[ConflictModal] Initializing modal');

  try {
    // Check if modal already exists
    if (document.getElementById('conflictModal')) {
      isConflictModalInitialized = true;
      return;
    }

    // Create modal HTML
    document.body.insertAdjacentHTML('beforeend', CONFLICT_MODAL_HTML);
    isConflictModalInitialized = true;

    // Setup event listeners
    setupConflictModalEvents();

    console.log('[ConflictModal] Modal initialized');
  } catch (error) {
    console.error('[ConflictModal] Error initializing modal:', error);
  }
};

/**
 * Setup conflict modal event listeners
 */
const setupConflictModalEvents = () => {
  console.log('[ConflictModal] Setting up event listeners');

  try {
    const modal = document.getElementById('conflictModal');
    const overlay = modal?.querySelector('.conflict-modal-overlay');
    const downloadBtn = document.getElementById('conflictDownloadBtn');
    const okBtn = document.getElementById('conflictOkBtn');

    if (!modal || !downloadBtn || !okBtn) {
      console.error('[ConflictModal] Modal elements not found');
      return;
    }

    conflictDownloadBtn = downloadBtn;
    conflictOkBtn = okBtn;

    // Download button
    downloadBtn.addEventListener('click', async () => {
      console.log('[ConflictModal] Download button clicked');
      await handleConflictDownload();
    });

    // OK button - close modal or trigger callback
    okBtn.addEventListener('click', async () => {
      await handleOkButtonClick();
    });

    // Close on overlay click
    overlay?.addEventListener('click', () => {
      hideConflictModal();
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        hideConflictModal();
      }
    };
    document.addEventListener('keydown', handleEscape);

    console.log('[ConflictModal] Event listeners setup complete');
  } catch (error) {
    console.error('[ConflictModal] Error setting up events:', error);
  }
};

/**
 * Render conflict files list
 * @param {Array} conflictFiles - Array of conflict file objects
 */
const renderConflictFiles = (conflictFiles) => {
  console.log('[ConflictModal] Rendering conflict files:', conflictFiles);

  try {
    const filesListContainer = document.getElementById('conflictFilesList');
    if (!filesListContainer) {
      console.error('[ConflictModal] Files list container not found');
      return;
    }

    if (!conflictFiles || conflictFiles.length === 0) {
      filesListContainer.innerHTML = '<p class="no-conflicts">No conflicts found</p>';
      return;
    }

    // Deduplicate files before rendering
    const uniqueFiles = deduplicateConflictFiles(conflictFiles);
    console.log('[ConflictModal] Deduplicated files:', uniqueFiles.length, 'unique files from', conflictFiles.length, 'total entries');

    // Create numbered list of files
    const filesHTML = uniqueFiles
      .map((file, index) => {
        const filePath = file.file_path || file.file_name || '';
        return `<div class="conflict-file-item">${index + 1}. ${escapeHtml(filePath)}</div>`;
      })
      .join('');

    filesListContainer.innerHTML = filesHTML;

    console.log('[ConflictModal] Files list rendered');
  } catch (error) {
    console.error('[ConflictModal] Error rendering files:', error);
  }
};

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Deduplicate conflict files by file_path or file_name
 * @param {Array} conflictFiles - Array of conflict file objects
 * @returns {Array} Deduplicated array of conflict files
 */
const deduplicateConflictFiles = (conflictFiles) => {
  if (!Array.isArray(conflictFiles) || conflictFiles.length === 0) {
    return [];
  }

  const seen = new Set();
  const deduplicated = [];

  for (const file of conflictFiles) {
    // Use file_path as primary identifier, fallback to file_name
    const identifier = file.file_path || file.file_name || '';

    if (identifier && !seen.has(identifier)) {
      seen.add(identifier);
      deduplicated.push(file);
    }
  }

  return deduplicated;
};
// #endregion

const handleConflictDownload = async () => {
  if (isConflictDownloadInProgress) {
    return;
  }

  if (!currentConflictFiles || currentConflictFiles.length === 0) {
    if (window.showAlert) {
      window.showAlert("ダウンロード対象のコンフリクトファイルがありません", "warning");
    }
    return;
  }

  const projectId =
    currentConflictProjectId ||
    currentConflictOptions.projectId ||
    getProjectId();
  if (!projectId) {
    if (window.showAlert) {
      window.showAlert("プロジェクトIDが見つかりません", "error");
    }
    return;
  }

  try {
    isConflictDownloadInProgress = true;
    if (conflictDownloadBtn) {
      conflictDownloadBtn.disabled = true;
      conflictDownloadBtn.classList.add("loading");
    }

    await DownloadFilesAPI.downloadConflictFiles(projectId, currentConflictFiles);
    if (window.showAlert) {
      window.showAlert("コンフリクトファイルをダウンロードしました", "success");
    }

    if (currentConflictOptions.source === "pull") {
      isUseRemoteVersionEnabled = true;
      if (conflictOkBtn) {
        conflictOkBtn.disabled = false;
        conflictOkBtn.classList.remove("disabled");
      }
    }
  } catch (error) {
    console.error("[ConflictModal] Download conflict files error:", error);
    if (window.showAlert) {
      window.showAlert(
        error?.message || "コンフリクトファイルのダウンロードに失敗しました",
        "error"
      );
    }
  } finally {
    isConflictDownloadInProgress = false;
    if (conflictDownloadBtn) {
      conflictDownloadBtn.disabled = false;
      conflictDownloadBtn.classList.remove("loading");
    }
  }
};

const handleOkButtonClick = async () => {
  if (currentConflictOptions.source !== "pull") {
    hideConflictModal();
    return;
  }

  if (
    !currentConflictOptions.onUseRemoteVersion ||
    typeof currentConflictOptions.onUseRemoteVersion !== "function" ||
    conflictOkBtn?.disabled ||
    !isUseRemoteVersionEnabled
  ) {
    return;
  }

  try {
    if (conflictOkBtn) {
      conflictOkBtn.disabled = true;
      conflictOkBtn.classList.add("loading");
    }

    await currentConflictOptions.onUseRemoteVersion();
    hideConflictModal();
  } catch (error) {
    console.error("[ConflictModal] Use remote version error:", error);
    window.showAlert?.(
      error?.message || "リモート版への切り替えに失敗しました",
      "error"
    );
    if (conflictOkBtn) {
      conflictOkBtn.disabled = false;
    }
  } finally {
    conflictOkBtn?.classList.remove("loading");
  }
};

// #region Public Functions

/**
 * Show conflict modal
 * @param {Array} conflictFiles - Array of conflict file objects with id, file_name, file_path, etc.
 * @param {Object} options - Additional options (e.g., { projectId })
 * @returns {Promise<void>} Resolves when modal is closed
 */
export const showConflictModal = (conflictFiles = [], options = {}) => {
  console.log('[ConflictModal] Opening modal with files:', conflictFiles);

  return new Promise((resolve) => {
    try {
      // Initialize modal if not already done
      if (!isConflictModalInitialized) {
        initConflictModal();
      }

      conflictResolve = resolve;
      currentConflictFiles = Array.isArray(conflictFiles)
        ? conflictFiles
        : [];
      currentConflictProjectId = options.projectId || getProjectId() || null;
      currentConflictOptions = {
        source: options.source || "push",
        projectId: currentConflictProjectId,
        onUseRemoteVersion: options.onUseRemoteVersion || null,
      };
      isUseRemoteVersionEnabled = false;

      const modal = document.getElementById('conflictModal');

      if (!modal) {
        console.error('[ConflictModal] Modal element not found');
        resolve();
        return;
      }

      // Render conflict files
      renderConflictFiles(conflictFiles);

      if (conflictOkBtn) {
        if (currentConflictOptions.source === "pull") {
          conflictOkBtn.textContent = "Use remote version";
          conflictOkBtn.disabled = true;
          conflictOkBtn.classList.add("disabled");
          conflictOkBtn.setAttribute("aria-disabled", "true");
        } else {
          conflictOkBtn.textContent = "OK";
          conflictOkBtn.disabled = false;
          conflictOkBtn.classList.remove("disabled");
          conflictOkBtn.removeAttribute("aria-disabled");
        }
      }

      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling

      console.log('[ConflictModal] Modal shown');
    } catch (error) {
      console.error('[ConflictModal] Error showing modal:', error);
      resolve();
    }
  });
};

/**
 * Hide conflict modal
 */
export const hideConflictModal = () => {
  console.log('[ConflictModal] Hiding modal');

  try {
    const modal = document.getElementById('conflictModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }

    // Resolve promise
    if (conflictResolve) {
      conflictResolve();
      conflictResolve = null;
    }

    currentConflictFiles = [];
    currentConflictProjectId = null;
    currentConflictOptions = {
      source: "push",
      projectId: null,
      onUseRemoteVersion: null,
    };
    isUseRemoteVersionEnabled = false;
    if (conflictOkBtn) {
      conflictOkBtn.disabled = false;
      conflictOkBtn.classList.remove("disabled", "loading");
      conflictOkBtn.removeAttribute("aria-disabled");
    }
  } catch (error) {
    console.error('[ConflictModal] Error hiding modal:', error);
  }
};
// #endregion

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConflictModal);
} else {
  initConflictModal();
}

console.log('[conflict_modal.js] Module loaded ✅');

