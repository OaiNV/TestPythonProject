/**
 * Shared Git API functions for detail pages
 * Handles push and pull operations with conflict resolution
 */

// #region Constants
const DEFAULT_ERROR_MESSAGE = "エラーが発生しました。";
const CONFLICT_DEFAULT_MESSAGE = "Conflict detected. Some files could not be merged automatically.";
// #endregion

// #region Private Functions - Helpers
/**
 * Extract conflict files from response data
 * @param {Object} data - Response data
 * @returns {Array} Array of conflict files
 */
const extractConflictFiles = (data) => {
  console.log("[extractConflictFiles] Start");
  
  if (!data) {
    return [];
  }

  if (data.conflict_files && Array.isArray(data.conflict_files)) {
    return data.conflict_files;
  }
  
  if (data.detail?.conflict_files && Array.isArray(data.detail.conflict_files)) {
    return data.detail.conflict_files;
  }
  
  if (data.data?.conflict_files && Array.isArray(data.data.conflict_files)) {
    return data.data.conflict_files;
  }

  return [];
};

/**
 * Handle conflict response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Conflict response object
 */
export const createConflictResponse = (data, statusCode = 409) => {
  console.log("[createConflictResponse] Start - statusCode:", statusCode);
  
  const conflictFiles = extractConflictFiles(data);
  console.log("[createConflictResponse] Conflict files found:", conflictFiles.length);
  
  return {
    isConflict: true,
    conflictFiles: conflictFiles,
    statusCode: data.statusCode || statusCode,
    message: data.message || CONFLICT_DEFAULT_MESSAGE,
  };
};

/**
 * Handle error response
 * @param {Object} data - Response data
 * @param {string} defaultMessage - Default error message
 * @param {Function} showAlert - Alert function
 */
export const handleErrorResponse = (data, defaultMessage, showAlert) => {
  console.log("[handleErrorResponse] Start");
  
  const errorMsg = data.error_message || data.message || defaultMessage;
  showAlert(errorMsg, "error");
  throw new Error(errorMsg);
};
// #endregion

// #region Public Functions - Git API
/**
 * Push documents to Git
 * @param {Object} config - Configuration object
 * @param {string} config.projectId - Project ID
 * @param {Array<string>} config.fileIds - Array of file IDs to push
 * @param {string} config.commitMessage - Commit message
 * @param {string} config.userName - Git username
 * @param {string} config.tokenPassword - Git token/password
 * @param {string} config.endpointPath - Endpoint path (e.g., "requirement-documents")
 * @param {string} config.apiBaseUrl - API base URL
 * @param {string} config.projectsEndpoint - Projects endpoint path
 * @param {string} config.defaultErrorMessage - Default error message
 * @param {Function} config.showAlert - Alert function
 * @returns {Promise<Object>} Push result
 */
export const pushGitDocuments = async (config) => {
  const {
    projectId,
    fileIds,
    commitMessage,
    userName,
    tokenPassword,
    endpointPath,
    apiBaseUrl,
    projectsEndpoint,
    defaultErrorMessage,
    showAlert,
  } = config;

  console.log(`[pushGitDocuments] Start - projectId=${projectId}, endpointPath=${endpointPath}`);

  if (!projectId || !fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    console.warn("[pushGitDocuments] Invalid input");
    throw new Error("INVALID_INPUT");
  }

  try {
    const url = `${apiBaseUrl}${projectsEndpoint}/${projectId}/${endpointPath}/git/push`;
    const body = {
      id: fileIds,
      commit_message: commitMessage.trim(),
      user_name: userName,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (response.status === 409) {
      console.log("[pushGitDocuments] 409 Response Data:", JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      if (response.status === 409) {
        return createConflictResponse(data, 409);
      }
      
      handleErrorResponse(data, defaultErrorMessage, showAlert);
    }

    console.log("[pushGitDocuments] Success");
    return data;
  } catch (error) {
    console.error("[pushGitDocuments] Error:", error);
    if (!error.message) {
      showAlert(defaultErrorMessage || DEFAULT_ERROR_MESSAGE, "error");
    }
    throw error;
  }
};

/**
 * Restore document marked as delete_push
 * @param {Object} config - Configuration object
 * @param {string} config.projectId - Project ID
 * @param {string} config.fileId - File ID
 * @param {string} config.userName - Git username
 * @param {string} config.tokenPassword - Git token/password
 * @param {string} config.endpointPath - Endpoint path (e.g., "requirement-documents")
 * @param {string} config.apiBaseUrl - API base URL
 * @param {string} config.projectsEndpoint - Projects endpoint path
 * @param {string} config.defaultErrorMessage - Default error message
 * @param {Function} config.showAlert - Alert function
 * @returns {Promise<Object>} Restore result
 */
export const restoreGitDocument = async (config) => {
  const {
    projectId,
    fileId,
    userName,
    tokenPassword,
    endpointPath,
    apiBaseUrl,
    projectsEndpoint,
    defaultErrorMessage,
    showAlert,
  } = config;

  console.log(
    `[restoreGitDocument] Start - projectId=${projectId}, fileId=${fileId}, endpointPath=${endpointPath}`
  );

  if (!projectId || !fileId || !userName || !endpointPath) {
    console.warn("[restoreGitDocument] Invalid input");
    throw new Error("INVALID_INPUT");
  }

  try {
    const url = `${apiBaseUrl}${projectsEndpoint}/${projectId}/${endpointPath}/${fileId}/restore`;
    const body = {
      user_name: userName,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      handleErrorResponse(data, defaultErrorMessage, showAlert);
    }

    const responseData = data.data || data;
    console.log("[restoreGitDocument] Success");
    return responseData;
  } catch (error) {
    console.error("[restoreGitDocument] Error:", error);
    if (!error.message) {
      showAlert(defaultErrorMessage || DEFAULT_ERROR_MESSAGE, "error");
    }
    throw error;
  }
};

/**
 * Pull data from Git
 * @param {Object} config - Configuration object
 * @param {string} config.projectId - Project ID
 * @param {string} config.userName - Git username
 * @param {string} config.tokenPassword - Git token/password
 * @param {boolean} config.forceOverride - Force override local changes
 * @param {string} config.apiBaseUrl - API base URL
 * @param {string} config.projectsEndpoint - Projects endpoint path
 * @param {string} config.defaultErrorMessage - Default error message
 * @param {Function} config.showAlert - Alert function
 * @returns {Promise<Object>} Pull result
 */
export const pullGitData = async (config) => {
  const {
    projectId,
    userName,
    tokenPassword = null,
    forceOverride = false,
    apiBaseUrl,
    projectsEndpoint,
    defaultErrorMessage,
    showAlert,
  } = config;

  console.log(`[pullGitData] Start - projectId=${projectId}, forceOverride=${forceOverride}`);

  if (!projectId || !userName) {
    console.warn("[pullGitData] Invalid input");
    throw new Error("INVALID_INPUT");
  }

  try {
    const url = `${apiBaseUrl}${projectsEndpoint}/${projectId}/git/pull`;
    const body = {
      user_name: userName,
      force_override: forceOverride,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        return createConflictResponse(data, 409);
      }
      
      handleErrorResponse(data, defaultErrorMessage, showAlert);
    }

    console.log("[pullGitData] Success");
    return data;
  } catch (error) {
    console.error("[pullGitData] Error:", error);
    if (!error.message) {
      showAlert(defaultErrorMessage || DEFAULT_ERROR_MESSAGE, "error");
    }
    throw error;
  }
};

// #endregion

