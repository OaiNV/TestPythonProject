/**
 * Project Detail UI/Render Functions
 * All rendering and UI update functions
 */

import {
  $projectid,
  getTbodyByType,
  getStatusText,
  getStatusClass,
  formatDate,
  formatDateTime,
  escapeHtml,
  renderCommitIcon
} from './project_detail_helpers.js';

import {
  getComments,
  getRequirementFiles,
  getBasicDesignFiles,
  getProjectId,
  getCurrentTab
} from './project_detail_state.js';

import { renderFileRow, updateDownloadButtonsState, renderCommitIdCell, renderStatusBadge, isFileDeleted } from './project_detail_files.js';

import { SourceTreeManager } from '../commons/source_tree_manager.js';
import { updateSelectedFiles } from './project_detail_files.js';
// #region Project Header
/**
 * Render project name
 * @param {Object} project - Project data
 */
const renderProjectName = (project) => {
  const projectName = $projectid("projectName");
  if (!projectName) return;
  projectName.textContent = project.name || project.project_name || "Project";
};

/**
 * Get language image source
 * @param {string} language - Language name
 * @returns {string|null} Image source or null
 */
const getLanguageImageSrc = (language) => {
  const langMap = {
    "C#": "csharp.png",
    "Python": "python.png",
    "Java": "java.png"
  };
  return langMap[language] || null;
};

/**
 * Render language badge
 * @param {Object} project - Project data
 */
const renderLanguageBadge = (project) => {
  const languageBadge = $projectid("languageBadge");
  if (!languageBadge) return;

  const languageText = project.language || "N/A";
  const imgSrc = getLanguageImageSrc(languageText);

  languageBadge.innerHTML = imgSrc
    ? `<img src="/static/images/${imgSrc}" alt="${languageText}" style="width:24px; height:24px;" />`
    : languageText;
};
/**
 * Get status display text from status code
 * @param {string} status - Status code from API
 * @returns {string|null} Display text or null
 */
const getStatusGenerate = (status) => {
  const statusMap = {
    not_processed: "未実行",
    generating: "実行中",
    completed: "完了",
    error: "エラー",
    canceled: "キャンセル"
  };
  return statusMap[status] || null;
};

/**
 * Render status dropdown icon
 * @param {Object} project - Project data
 */
const renderStatusDropdown = (project) => {
  const projectName = $projectid("projectName");
  if (!projectName) return;

  // Remove existing dropdown
  const existingDropdown = projectName.querySelector(".status-dropdown");
  if (existingDropdown) {
    existingDropdown.remove();
  }

  // Show dropdown only when sync_status is "pull"
  const syncStatus = project.git?.sync_status;
  if (syncStatus === "pull") {
    const dropdown = document.createElement("div");
    dropdown.className = "status-dropdown";
    dropdown.innerHTML = '<img src="/static/images/right-down.png" alt="" style="width: 22px; height: 22px;">';
    dropdown.style.cssText = "display: inline-block; margin-left: 10px;";
    projectName.appendChild(dropdown);
  }
};

/**
 * Render project status badge
 * @param {Object} project - Project data
 */
const renderProjectStatus = (project) => {
  const projectName = $projectid("projectName");
  if (!projectName) return;

  // Remove existing status badge
  const existingBadge = projectName.querySelector(".status-badge");
  if (existingBadge) {
    existingBadge.remove();
  }

  // Add new status badge if valid
  const status = project.status_manage?.status;
  const statusText = getStatusGenerate(status);

  if (statusText) {
    const badge = document.createElement("span");
    badge.className = "status-badge";
    badge.style.cssText = "background-color: #8F9BA4; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;display: inline-block; vertical-align: middle;";
    badge.textContent = statusText;
    projectName.appendChild(badge);
  }
};

/**
 * Render project header information
 * @param {Object} project - Project data
 */
const renderProjectHeader = (project) => {
  try {
    renderProjectName(project);
    renderStatusDropdown(project);
    renderProjectStatus(project);
    renderLanguageBadge(project);
    renderRepoLink(project);
    renderBranchInfo(project);
    updateGitButtonsState(project);
  } catch (error) {
    console.error('[renderProjectHeader] Error:', error);
    throw error;
  }
};

const setupCheckboxEvents = () => {
  const allCheckboxes = document.querySelectorAll(
    ".file-checkbox, .folder-checkbox, .file-checkbox-all, .folder-checkbox-all"
  );

  allCheckboxes.forEach(cb => {
    cb.addEventListener("change", updateDownloadButtonsState);
  });
};

/**
 * Extract repository name from URL
 * @param {string} repoUrl - Repository URL
 * @returns {string} Repository name
 */
const extractRepoName = (repoUrl) => {
  let repoName = repoUrl.replace(/\.git$/, "");
  const match = repoName.match(/(?:[/:])([^/]+)$/);
  return match?.[1] || repoName.split("/").pop() || repoUrl;
};

/**
 * Render repository link
 * @param {Object} project - Project data
 */
const renderRepoLink = (project) => {
  try {
    const repoLink = $projectid("repoLink");
    if (!repoLink) return;

    const repoUrl = project.git?.repository;
    if (!repoUrl) {
      repoLink.style.display = "none";
      return;
    }

    const repoName = extractRepoName(repoUrl);
    const svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M21 9L21 3M21 3H15M21 3L13 11M10 5H7.8C6.11984 5 5.27976 5 4.63803 5.32698C4.07354 5.6146 3.6146 6.07354 3.32698 6.63803C3 7.27976 3 8.11984 3 9.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H14.2C15.8802 21 16.7202 21 17.362 20.673C17.9265 20.3854 18.3854 19.9265 18.673 19.362C19 18.7202 19 17.8802 19 16.2V14" stroke="#3C69E2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`;

    repoLink.innerHTML = `${escapeHtml(repoName)} ${svgIcon}`;
    repoLink.href = repoUrl;
    repoLink.target = "_blank";
    repoLink.style.display = "inline-flex";
  } catch (error) {
    console.error('[renderRepoLink] Error:', error);
  }
};

/**
 * Render branch name
 * @param {Object} project - Project data
 */
const renderBranchName = (project) => {
  const branchName = $projectid("branchName");
  if (branchName) {
    branchName.textContent = project.git?.branch || "";
  }
};

/**
 * Render branch dropdown selected text
 * @param {Object} project - Project data
 */
const renderBranchDropdownSelected = (project) => {
  const branchDropdownSelected = $projectid("branchDropdownSelected");
  if (branchDropdownSelected && project.git?.branch) {
    branchDropdownSelected.textContent = project.git.branch;
  }
};

/**
 * Render branch date
 * @param {Object} project - Project data
 */
const renderBranchDate = (project) => {
  const branchDate = $projectid("branchDate");
  if (!branchDate) return;

  const dateStr = project.updated_at || project.created_at;
  if (dateStr) {
    branchDate.textContent = formatDateTime(new Date(dateStr));
  }
};

/**
 * Render branch information
 * @param {Object} project - Project data
 */
const renderBranchInfo = (project) => {
  try {
    renderBranchName(project);
    renderBranchDropdownSelected(project);
    renderBranchDate(project);
  } catch (error) {
    console.error('[renderBranchInfo] Error:', error);
  }
};

/**
 * Open branch dropdown programmatically
 * @param {HTMLElement} branchDropdown - Dropdown container element
 */
const openBranchDropdown = (branchDropdown) => {
  if (!branchDropdown) return;
  branchDropdown.classList.add('open');
};

/**
 * Close branch dropdown programmatically
 * @param {HTMLElement} branchDropdown - Dropdown container element
 */
const closeBranchDropdown = (branchDropdown) => {
  if (!branchDropdown) return;
  branchDropdown.classList.remove('open');
};

/**
 * Create branch option element
 * @param {string} branch - Branch name
 * @returns {HTMLElement} List item element
 */
const createBranchOption = (branch) => {
  const li = document.createElement("li");
  li.textContent = branch;
  li.dataset.value = branch;
  return li;
};

/**
 * Get selected branch from branches list
 * @param {Array<string>} branches - List of branches
 * @param {string} currentBranch - Current branch
 * @returns {string|null} Selected branch
 */
const getSelectedBranch = (branches, currentBranch) => {
  if (currentBranch && branches.includes(currentBranch)) {
    return currentBranch;
  }
  return branches.length > 0 ? branches[0] : null;
};

/**
 * Mark branch option as selected
 * @param {HTMLElement} branchDropdownOptions - Options container
 * @param {string} selectedBranch - Selected branch name
 */
const markBranchAsSelected = (branchDropdownOptions, selectedBranch) => {
  const selectedLi = branchDropdownOptions.querySelector(`li[data-value="${selectedBranch}"]`);
  if (selectedLi) {
    selectedLi.classList.add('selected');
  }
};

/**
 * Auto-open dropdown with flag management
 * @param {HTMLElement} branchDropdown - Dropdown element
 */
const autoOpenDropdown = (branchDropdown) => {
  if (window.isAutoOpeningDropdown !== undefined) {
    window.isAutoOpeningDropdown = true;
  }

  setTimeout(() => {
    openBranchDropdown(branchDropdown);
    setTimeout(() => {
      if (window.isAutoOpeningDropdown !== undefined) {
        window.isAutoOpeningDropdown = false;
      }
    }, 100);
  }, 100);
};

/**
 * Update branch dropdown with list of branches
 * @param {Array<string>} branches - List of branch names
 * @param {string} currentBranch - Current selected branch (optional)
 */
const updateBranchDropdown = (branches, currentBranch = null) => {
  try {
    const branchDropdown = $projectid("branchDropdown");
    const branchDropdownOptions = $projectid("branchDropdownOptions");
    const branchDropdownSelected = $projectid("branchDropdownSelected");

    if (!branchDropdown || !branchDropdownOptions || !branchDropdownSelected) {
      return;
    }

    branchDropdownOptions.innerHTML = '';

    if (!branches?.length) return;

    branches.forEach(branch => {
      branchDropdownOptions.appendChild(createBranchOption(branch));
    });

    const selectedBranch = getSelectedBranch(branches, currentBranch);
    if (selectedBranch) {
      branchDropdownSelected.textContent = selectedBranch;
      markBranchAsSelected(branchDropdownOptions, selectedBranch);
    }

    autoOpenDropdown(branchDropdown);
  } catch (error) {
    console.error('[updateBranchDropdown] Error:', error);
  }
};
// #endregion

// #region Comments Rendering
/**
 * Get scroll position for maintaining scroll
 * @param {HTMLElement} container - Container element
 * @returns {Object} Scroll position object
 */
const getScrollPosition = (container) => {
  return {
    scrollHeight: container.scrollHeight,
    scrollTop: container.scrollTop
  };
};

/**
 * Restore scroll position
 * @param {HTMLElement} container - Container element
 * @param {Object} prevPosition - Previous scroll position
 */
const restoreScrollPosition = (container, prevPosition) => {
  const newScrollHeight = container.scrollHeight;
  container.scrollTop = newScrollHeight - prevPosition.scrollHeight + prevPosition.scrollTop;
};

/**
 * Render empty comments message
 * @param {HTMLElement} container - Container element
 */
const renderEmptyComments = (container) => {
  container.innerHTML = `
    <div style="text-align:center;padding:20px;color:#718096;font-size:14px;">
      コメントがありません
    </div>
  `;
};

/**
 * Render comments list
 * @param {boolean} keepScrollPosition - Whether to maintain scroll position
 */
const renderComments = (keepScrollPosition = false) => {
  try {
    const container = $projectid("commentsContainer");
    if (!container) return;

    const prevPosition = keepScrollPosition ? getScrollPosition(container) : null;
    container.innerHTML = "";

    const projectComments = getComments();
    if (!projectComments?.length) {
      renderEmptyComments(container);
      return;
    }

    projectComments.forEach(comment => {
      container.appendChild(createCommentElement(comment));
    });

    if (keepScrollPosition && prevPosition) {
      restoreScrollPosition(container, prevPosition);
    } else {
      scrollCommentsToBottom();
    }
  } catch (error) {
    console.error('[renderComments] Error:', error);
    throw error;
  }
};

/**
 * Create comment DOM element
 * @param {Object} comment - Comment data
 * @returns {HTMLElement} Comment element
 */
const createCommentElement = (comment) => {
  const commentItem = document.createElement("div");
  commentItem.className = "comment-item";
  commentItem.dataset.commentId = comment.comment_id;

  const commentDate = new Date(comment.created_at.split(".")[0] + "Z");
  const dateStr = formatDateTime(commentDate);
  const avatarLetter = (comment.user_name || "U").charAt(0).toUpperCase();

  commentItem.innerHTML = `
    <div class="comment-avatar">${avatarLetter}</div>
    <div class="comment-content">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.user_name || "ユーザー")}</span>
      </div>
      <div class="comment-text">${escapeHtml(comment.content || "")}</div>
      <div class="comment-date">${dateStr}</div>
    </div>
  `;

  return commentItem;
};

/**
 * Scroll comments container to bottom
 */
const scrollCommentsToBottom = () => {
  const container = $projectid("commentsContainer");
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
};
// #endregion

// #region File Table Rendering
/**
 * Render file tables for requirement and basic design
 */
const renderFileTable = () => {
  try {
    const tbodyRequirement = getTbodyByType("requirement");
    const tbodyBasicDesign = getTbodyByType("basicDesign");

    if (tbodyRequirement) {
      tbodyRequirement.innerHTML = "";
      renderFilesToTable(tbodyRequirement, getRequirementFiles() || []);
    }

    if (tbodyBasicDesign) {
      tbodyBasicDesign.innerHTML = "";
      renderFilesToTable(tbodyBasicDesign, getBasicDesignFiles() || []);
    }
  } catch (error) {
    console.error('[renderFileTable] Error:', error);
    throw error;
  }
};

/**
 * Render files to a specific table body
 * @param {HTMLElement} tbody - Table body element
 * @param {Array} files - Array of file objects
 */

const renderFilesToTable = (tbody, files) => {
  if (!tbody) return;

  if (!files || files.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;color:#718096">
          ファイルがありません
        </td>
      </tr>
    `;
    return;
  }

  const htmlRows = files.map(file => renderFileRow(file)).join('');
  tbody.innerHTML = htmlRows;

  // Setup click handlers for requirement file rows
  setupFileRowClickHandlers(tbody);
};

/**
 * Check if click target should be ignored
 * @param {EventTarget} target - Click target
 * @returns {boolean} True if should ignore
 */
const shouldIgnoreClick = (target) => {
  return target.matches('input[type="checkbox"]') ||
    target.closest('input[type="checkbox"]') ||
    target.closest('button');
};

/**
 * Get detail URL based on table type
 * @param {string} tableType - Table type
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {string|null} Detail URL or null
 */
const getDetailUrl = (tableType, projectId, fileId) => {
  const urlMap = {
    'requirement': `/projects/${projectId}/rd/${fileId}`,
    'basicDesign': `/projects/${projectId}/bd/${fileId}`
  };

  if (urlMap[tableType]) {
    return urlMap[tableType];
  }

  if (tableType.startsWith('detailDesign-')) {
    return `/projects/${projectId}/pd/${fileId}`;
  }

  return null;
};

/**
 * Setup click handlers for file rows to navigate to detail page
 * @param {HTMLElement} tbody - Table body element
 */
const setupFileRowClickHandlers = (tbody) => {
  if (!tbody) return;

  const tableType = tbody.closest('table')?.dataset?.tableType;
  if (!tableType) return;

  const isDetailDesignTable = tableType.startsWith('detailDesign-');
  const isValidTable = tableType === 'requirement' || tableType === 'basicDesign' || isDetailDesignTable;
  if (!isValidTable) return;

  tbody.addEventListener('click', (e) => {
    if (shouldIgnoreClick(e.target)) return;

    const row = e.target.closest('tr[data-file-id]');
    if (!row?.dataset.fileId) return;

    const projectId = getProjectId();
    if (!projectId) return;

    const detailUrl = getDetailUrl(tableType, projectId, row.dataset.fileId);
    if (detailUrl) {
      window.location.href = detailUrl;
    }
  });

  tbody.querySelectorAll('tr[data-file-id]').forEach(row => {
    row.style.cursor = 'pointer';
  });
};

/**
 * Create file table row element - wrapper for renderFileRow
 * @param {Object} file - File data
 * @returns {HTMLElement} Table row element
 */
const createFileTableRow = (file) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderFileRow(file);
  return tempDiv.firstElementChild;
};
// #endregion

// #region Detail Design Table Rendering
/**
 * Render empty files message
 * @param {HTMLElement} tbody - Table body element
 */
const renderEmptyFilesMessage = (tbody) => {
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 40px; color: #718096;">
        <div style="font-size: 14px;">ファイルがありません</div>
      </td>
    </tr>
  `;
};

/**
 * Setup checkbox event listeners
 * @param {HTMLElement} tbody - Table body element
 */
const setupCheckboxListeners = (tbody) => {
  tbody.querySelectorAll(".file-checkbox").forEach(cb => {
    const newCb = cb.cloneNode(true);
    cb.parentNode.replaceChild(newCb, cb);
    newCb.addEventListener("change", updateSelectedFiles);
  });
};

/**
 * Render detail design files to table
 * @param {string} sectionType - Section type (class, method, interface, folder)
 * @param {Array} files - Array of file objects
 */
const renderDetailDesignTable = (sectionType, files) => {
  try {
    const tbody = getTbodyByType(`detailDesign-${sectionType}`);
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!files?.length) {
      renderEmptyFilesMessage(tbody);
      return;
    }

    files.forEach(file => {
      tbody.appendChild(createDetailDesignTableRow(file));
    });

    setupCheckboxListeners(tbody);
    setupFileRowClickHandlers(tbody);
  } catch (error) {
    console.error('[renderDetailDesignTable] Error:', error);
    throw error;
  }
};

/**
 * Create detail design table row
 * @param {Object} file - File data
 * @returns {HTMLElement} Table row element
 */
const createDetailDesignTableRow = (file) => {
  const row = document.createElement('tr');
  row.dataset.fileId = file.id || '';

  // Check if file is deleted
  const deleted = isFileDeleted(file);
  const deletedClass = deleted ? 'deleted-row' : '';
  row.className = deletedClass;

  row.innerHTML = `
    <td>
      <input type="checkbox" class="checkbox file-checkbox" data-file-id="${file.id || ''}">
    </td>
    <td>
      ${deleted ? '<img src="/static/images/minus.png" alt="minus" style="width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;">' : ''}
      <span class="${deleted ? 'deleted-file-name' : ''}">${escapeHtml(file.file_name || file.name || '')}</span>
    </td>
    <td>${renderCommitIdCell(file)}</td>
    <td>${renderStatusBadge(file)}</td>
    <td style="text-align: center;">${formatDate(file.updated_at)}</td>
    <td style="text-align: center;">${formatDate(file.created_at)}</td>
  `;

  return row;
};
// #endregion

// #region Sort Icons
/**
 * Update sort icon for a header
 * @param {HTMLElement} th - Table header element
 * @param {string} column - Column name
 * @param {string} direction - Sort direction
 */
const updateSortIcon = (th, column, direction) => {
  const svg = th.querySelector('svg.sort-icon');
  if (!svg) return;

  const isActive = th.dataset.column === column;
  svg.style.transform = isActive
    ? (direction === 'asc' ? 'rotate(90deg)' : 'rotate(-90deg)')
    : 'rotate(90deg)';
  svg.style.fill = isActive ? '#2563eb' : '#000';
};

/**
 * Update sort icons in table headers
 * @param {string} type - Table type
 * @param {string} column - Column name
 * @param {string} direction - Sort direction
 */
const updateSortIcons = (type, column, direction) => {
  try {
    const tbody = getTbodyByType(type);
    if (!tbody) return;

    const headers = tbody.closest('table').querySelectorAll('th[data-column]');
    headers.forEach(th => updateSortIcon(th, column, direction));
  } catch (error) {
    console.error('[updateSortIcons] Error:', error);
  }
};
// #endregion

// #endregion

// #region Loading & Alert
// /**
//  * Show loading indicator
//  */
// const showLoading = () => {
//   if (window.showLoading) {
//     window.showLoading();
//   }
// };

// /**
//  * Hide loading indicator
//  */
// const hideLoading = () => {
//   if (window.hideLoading) {
//     window.hideLoading();
//   }
// };

// /**
//  * Show alert message
//  * @param {string} message - Alert message
//  * @param {string} type - Alert type (success, error, info, warning)
//  */
// const showAlert = (message, type = 'info') => {
//   if (window.showAlert) {
//     window.showAlert(message, type);
//   }
// };
// #endregion

// #region Git Buttons State Management
/**
 * Update button state based on repository availability
 * @param {HTMLElement} button - Button element
 * @param {boolean} hasRepository - Has repository flag
 * @param {string} enabledTitle - Title when enabled
 */
const updateButtonState = (button, hasRepository, enabledTitle) => {
  button.disabled = !hasRepository;
  button.style.opacity = hasRepository ? '1' : '0.5';
  button.style.cursor = hasRepository ? 'pointer' : 'not-allowed';
  button.title = hasRepository ? enabledTitle : 'リポジトリが設定されていません';
};

/**
 * Update branch dropdown state
 * @param {HTMLElement} branchDropdown - Dropdown element
 * @param {HTMLElement} branchDropdownSelected - Selected element
 * @param {boolean} hasRepository - Has repository flag
 */
const updateBranchDropdownState = (branchDropdown, branchDropdownSelected, hasRepository) => {
  if (!branchDropdown || !branchDropdownSelected) return;

  if (hasRepository) {
    branchDropdown.classList.remove('disabled');
    branchDropdownSelected.style.pointerEvents = 'auto';
    branchDropdownSelected.style.opacity = '1';
    branchDropdownSelected.style.cursor = 'pointer';
  } else {
    branchDropdown.classList.add('disabled');
    branchDropdownSelected.style.pointerEvents = 'none';
    branchDropdownSelected.style.opacity = '0.5';
    branchDropdownSelected.style.cursor = 'not-allowed';
    branchDropdownSelected.title = 'リポジトリが設定されていません';
  }
};

/**
 * Update Git-related buttons state (enable/disable) based on repository availability
 * @param {Object} project - Project data
 */
const updateGitButtonsState = (project) => {
  try {
    const hasRepository = !!(project?.git?.repository?.trim());

    document.querySelectorAll('#pushBtn, #gitPushBtn').forEach(button => {
      updateButtonState(button, hasRepository, 'Push');
    });

    document.querySelectorAll('button[id="pullBtn"]').forEach(button => {
      updateButtonState(button, hasRepository, 'Git Pull');
    });

    const branchDropdown = $projectid('branchDropdown');
    const branchDropdownSelected = $projectid('branchDropdownSelected');
    updateBranchDropdownState(branchDropdown, branchDropdownSelected, hasRepository);
  } catch (error) {
    console.error('[updateGitButtonsState] Error:', error);
  }
};
// #endregion

// Export all UI functions
export {
  // Project Header
  renderProjectHeader,
  renderRepoLink,
  renderBranchInfo,
  updateBranchDropdown,
  openBranchDropdown,
  closeBranchDropdown,
  updateGitButtonsState,

  // Comments
  renderComments,
  createCommentElement,
  scrollCommentsToBottom,

  // File Tables
  renderFileTable,
  renderFilesToTable,
  createFileTableRow,

  // Detail Design
  renderDetailDesignTable,
  createDetailDesignTableRow,

  // Sort
  updateSortIcons,

  setupCheckboxEvents,
};

