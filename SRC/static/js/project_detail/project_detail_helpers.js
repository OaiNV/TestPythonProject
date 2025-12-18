/**
 * Project Detail Helper Functions
 * Utility functions for project detail page
 */

import { PROJECT_MESSAGES } from '../commons/error_messages.js';

// Import utilities from BaseUtils
const { formatDate, formatDateTime, baseEscapeHtml } = window.BaseUtils || {};
const escapeHtml = baseEscapeHtml;

// #region DOM Helpers
/**
 * Get element by ID (shorthand)
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element
 */
const $projectid = (id) => document.getElementById(id);
// #endregion

// #region Table Configuration
/**
 * Get table configuration based on table type
 * @param {string} type - Table type
 * @returns {Object} Configuration object with tbody id and table element
 */
const getTableConfig = (type) => {
  try {
    const configs = {
      'requirement': { tbodyId: 'fileTableBody', selector: '[data-table-type="requirement"]' },
      'basicDesign': { tbodyId: 'fileTableBody1', selector: '[data-table-type="basicDesign"]' },
      'detailDesign': { tbodyId: 'fileTableBody2', selector: '[data-table-type="detailDesign"]' },
      'detailDesign-class': { tbodyId: 'fileTableBodyClass', selector: '[data-table-type="detailDesign-class"]' },
      'detailDesign-method': { tbodyId: 'fileTableBodyMethod', selector: '[data-table-type="detailDesign-method"]' },
      'detailDesign-interface': { tbodyId: 'fileTableBodyInterface', selector: '[data-table-type="detailDesign-interface"]' },
      'detailDesign-folder': { tbodyId: 'fileTableBodyFolder', selector: '[data-table-type="detailDesign-folder"]' },
      'detailDesign-activityDiagram': { tbodyId: 'fileTableBodyActivityDiagram', selector: '[data-table-type="detailDesign-activityDiagram"]' },
      'sourceCode': { tbodyId: 'fileTableBody3', selector: '[data-table-type="sourceCode"]' },
      'unitTestSpec': { tbodyId: 'fileTableBody4', selector: '[data-table-type="unitTestSpec"]' },
      'unitTestCode': { tbodyId: 'fileTableBody5', selector: '[data-table-type="unitTestCode"]' }
    };
    return configs[type] || configs['requirement'];
  } catch (error) {
    console.error('[getTableConfig] Error:', error);
    throw error;
  }
};

/**
 * Get tbody element by table type
 * @param {string} type - Table type
 * @returns {HTMLElement|null} Tbody element
 */
const getTbodyByType = (type) => {
  try {
    const config = getTableConfig(type);
    return document.getElementById(config.tbodyId);
  } catch (error) {
    console.error('[getTbodyByType] Error:', error);
    return null;
  }
};

/**
 * Get table element by table type
 * @param {string} type - Table type
 * @returns {HTMLElement|null} Table element
 */
const getTableByType = (type) => {
  try {
    const config = getTableConfig(type);
    return document.querySelector(config.selector);
  } catch (error) {
    console.error('[getTableByType] Error:', error);
    return null;
  }
};
// #endregion

// #region Status Helpers
/**
 * Get status text from status number
 * @param {number} status - Status number (1=Local, 2=Git)
 * @returns {string} Status text
 */
const getStatusText = (status) => {
  if (status === 1) return 'Local';
  if (status === 2) return 'Git';
  return 'Unknown';
};

/**
 * Get status CSS class from status number
 * @param {number} status - Status number (1=Local, 2=Git)
 * @returns {string} Status CSS class
 */
const getStatusClass = (status) => {
  return status === 2 ? 'status-git' : 'status-local';
};
// #endregion

// #region Project ID Extraction
/**
 * Extract project ID from URL
 * @returns {string|null} Project ID
 */
const extractProjectIdFromUrl = () => {
  try {
    console.log('[extractProjectIdFromUrl] Start');

    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get("id");

    if (idFromQuery) {
      console.log('[extractProjectIdFromUrl] Found in query:', idFromQuery);
      return idFromQuery;
    }

    const pathParts = window.location.pathname.split("/");
    const projectIndex = pathParts.indexOf("projects");

    if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
      const idFromPath = pathParts[projectIndex + 1];
      console.log('[extractProjectIdFromUrl] Found in path:', idFromPath);
      return idFromPath;
    }

    console.log('[extractProjectIdFromUrl] No project ID found');
    return null;
  } catch (error) {
    console.error('[extractProjectIdFromUrl] Error:', error);
    return null;
  }
};
// #endregion

// #region Validation Functions
/**
 * Validate project data
 * @param {string} projectName - Project name
 * @param {string} description - Project description
 * @returns {Object} Validation result
 */
const validateProjectData = (projectName, description) => {
  try {
    // console.log('[validateProjectData] Start');

    if (!projectName || projectName.trim() === "") {
      return {
        valid: false,
        message: PROJECT_MESSAGES.PROJECT_NAME_REQUIRED,
      };
    }

    if (projectName.length > 50) {
      return {
        valid: false,
        message: PROJECT_MESSAGES.PROJECT_NAME_MAX_LENGTH,
      };
    }

    if (description && description.length > 500) {
      return {
        valid: false,
        message: PROJECT_MESSAGES.DESCRIPTION_MAX_LENGTH,
      };
    }

    // console.log('[validateProjectData] Valid');
    return { valid: true };
  } catch (error) {
    console.error('[validateProjectData] Error:', error);
    throw error;
  }
};

/**
 * Validate file before upload
 * @param {File} file - File object
 * @returns {Object} Validation result
 */
const validateFile = (file) => {
  try {
    // console.log('[validateFile] Start - file:', file?.name);

    if (!file) {
      return { valid: false, message: PROJECT_MESSAGES.NO_FILE_SELECTED };
    }

    const allowedExtensions = ['.md', '.jpg', '.jpeg', '.png'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return { valid: false, message: PROJECT_MESSAGES.INVALID_FILE_TYPE };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const isImage = ['.jpg', '.jpeg', '.png'].some(ext => fileName.endsWith(ext));
    const isMarkdown = fileName.endsWith('.md');

    if (isImage && fileSizeMB > 12) {
      return { valid: false, message: PROJECT_MESSAGES.FILE_TOO_LARGE_IMAGE };
    }

    if (isMarkdown && fileSizeMB > 15) {
      return { valid: false, message: PROJECT_MESSAGES.FILE_TOO_LARGE_MD };
    }

    // console.log('[validateFile] Valid');
    return { valid: true };
  } catch (error) {
    console.error('[validateFile] Error:', error);
    throw error;
  }
};
// #endregion

// #region Render Helpers
/**
 * Render status icon based on status
 * @param {string} status - Status (done, error, pending)
 * @returns {string} HTML string for status icon
 */
const renderStatusIcon = (status) => {
  switch (status) {
    case "done":
      return `<span style="color:#3182ce;">✔</span>`;
    case "error":
      return `<span style="color:#e53e3e;">⛔</span>`;
    default:
      return `<span style="color:#a0aec0;">○</span>`;
  }
};

/**
 * Render commit icon with commit ID
 * @param {string} commitId - Git commit ID
 * @returns {string} HTML string for commit icon
 */
const renderCommitIcon = (commitId) => {
  if (!commitId) {
    return `
      <span style="display:flex; align-items:center; gap:4px;">
        <svg fill="#ff9800" width="18px" height="18px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path fill-rule="evenodd" d="M253.617407,12.4967773 L434.398258,193.277628 C451.060628,209.939998 451.060628,236.955037 434.398258,253.617407 L253.617407,434.398258 C236.955037,451.060628 209.939998,451.060628 193.277628,434.398258 L12.4967773,253.617407 C-4.16559245,236.955037 -4.16559245,209.939998 12.4967773,193.277628 L193.277628,12.4967773 C209.939998,-4.16559245 236.955037,-4.16559245 253.617407,12.4967773 Z M223.447518,42.6666667 L42.6666667,223.447518 L223.447518,404.228369 L404.228369,223.447518 L223.447518,42.6666667 Z M223.447518,282.114184 C238.685613,282.114184 250.114184,293.378184 250.114184,308.738184 C250.114184,324.098184 238.685613,335.362184 223.447518,335.362184 C207.863102,335.362184 196.780851,324.098184 196.780851,308.396851 C196.780851,293.378184 208.209422,282.114184 223.447518,282.114184 Z M244.780851,116.780851 L244.780851,244.780851 L202.114184,244.780851 L202.114184,116.780851 L244.780851,116.780851 Z" transform="translate(32.552 32.552)"></path>
          </g>
        </svg>
      </span>`;
  }

  return `
    <span style="color: #999; display:flex; align-items:center; gap:4px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 12C16 14.2 14.2 16 12 16C9.8 16 8 14.2 8 12C8 9.8 9.8 8 12 8C14.2 8 16 9.8 16 12Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 12H22M8 12H2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${commitId.substring(0, 8)}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3C69E2" transform="rotate(270)" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 17L7 7M7 7V16M7 7H16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;
};
// #endregion

// #region User Info
/**
 * Get user info from localStorage
 * @returns {Object|null} User info object
 */
const getUserInfo = () => {
  try {
    // Try to get from window.navbarManager first (if available)
    if (window.navbarManager && typeof window.navbarManager.getUserInfo === 'function') {
      return window.navbarManager.getUserInfo();
    }

    // Fallback: Read directly from localStorage
    const userStr = localStorage.getItem("user_info");
    if (!userStr) {
      console.warn('[getUserInfo] No user info in localStorage');
      return null;
    }

    const userInfo = JSON.parse(userStr);

    // Add role if not present
    if (!userInfo.role) {
      userInfo.role = localStorage.getItem("user_role") || "user";
    }

    return userInfo;
  } catch (error) {
    console.error('[getUserInfo] Error:', error);
    return null;
  }
};
// #endregion

// Export all helper functions
export {
  // DOM Helpers
  $projectid,

  // Table Helpers
  getTableConfig,
  getTbodyByType,
  getTableByType,

  // Status Helpers
  getStatusText,
  getStatusClass,

  // Project ID
  extractProjectIdFromUrl,

  // Validation
  validateProjectData,
  validateFile,

  // Render Helpers
  renderStatusIcon,
  renderCommitIcon,

  // User Info
  getUserInfo,

  // Re-export from BaseUtils
  formatDate,
  formatDateTime,
  escapeHtml
};

