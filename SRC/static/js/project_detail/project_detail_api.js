/**
 * Project Detail API Functions
 * All API calls for project detail page
 */

import { PROJECT_MESSAGES, HTTP_MESSAGES } from "../commons/error_messages.js";
import { PROJECT_CONFIG } from "./project_detail_config.js";


// #region Project APIs
/**
 * Get project details by ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
const getProject = async (projectId) => {
  console.log("[API] GET Project - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] GET Project Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Update project information
 * @param {string} projectId - Project ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated project data
 */
const updateProject = async (projectId, updateData) => {
  console.log("[API] PUT Project - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
    const response = await window.APIClient.put(url, updateData);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    showAlert(PROJECT_MESSAGES.PROJECT_UPDATED, "success");
    return data;
  } catch (error) {
    console.error("[API] PUT Project Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Comment APIs
/**
 * Get comments for a project
 * @param {string} projectId - Project ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Comments data with pagination
 */
const getComments = async (projectId, page = 1, limit = 20) => {
  console.log("[API] GET Comments - projectId:", projectId, "page:", page);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/comments?page=${page}&limit=${limit}`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] GET Comments Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Create a new comment
 * @param {string} projectId - Project ID
 * @param {Object} commentData - Comment data
 * @returns {Promise<Object>} Created comment data
 */
const createComment = async (projectId, commentData) => {
  console.log("[API] POST Comment - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/comments`;
    const response = await window.APIClient.post(url, commentData);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] POST Comment Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Requirement Document APIs
/**
 * Get requirement documents for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Requirements data
 */
const getRequirementFiles = async (projectId) => {
  console.log("[API] GET Requirement Files - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/requirement-documents`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] GET Requirement Files Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Upload requirement document file
 * @param {string} projectId - Project ID
 * @param {File} file - File object
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Upload result
 */
const uploadRequirementFile = async (projectId, file, userId) => {
  console.log("[API] POST Upload Requirement File - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/requirement-documents`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    showAlert(PROJECT_MESSAGES.FILE_UPLOADED, "success");
    return data;
  } catch (error) {
    console.error("[API] Upload Requirement File Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Delete requirement document files
 * @param {string} projectId - Project ID
 * @param {Array<string>} fileIds - Array of file IDs to delete
 * @returns {Promise<Object>} Delete result
 */
const deleteFileRequirement = async (projectId, fileIds) => {
  console.log(
    "[API] DELETE Requirement Files - projectId:",
    projectId,
    "fileIds:",
    fileIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/requirement-documents`;
    const response = await window.APIClient.delete(url, {
      requirement_id: fileIds,
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error_message || PROJECT_MESSAGES.FILE_DELETED;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] DELETE Requirement Files Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

// #endregion

// #region Basic Design APIs
/**
 * Get basic design files for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Basic design data
 */
const getBasicDesign = async (projectId) => {
  console.log("[API] GET Basic Design - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] GET Basic Design Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Upload basic design file
 * @param {string} projectId - Project ID
 * @param {File} file - File object
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Upload result
 */
const uploadBasicDesign = async (projectId, file, userId) => {
  console.log("[API] POST Upload Basic Design - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    showAlert(PROJECT_MESSAGES.BASIC_DESIGN_UPLOADED, "success");
    return data;
  } catch (error) {
    console.error("[API] Upload Basic Design Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Delete basic design files
 * @param {string} projectId - Project ID
 * @param {Array<string>} fileIds - Array of file IDs to delete
 * @returns {Promise<Object>} Delete result
 */
const deleteFileBasicDesign = async (projectId, fileIds) => {
  console.log(
    "[API] DELETE Basic Design - projectId:",
    projectId,
    "fileIds:",
    fileIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design`;
    const response = await window.APIClient.delete(url, {
      basic_design_id: fileIds,
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error_message;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] DELETE Basic Design Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

/**
 * Generate basic design from requirement files or detail design files
 * @param {string} projectId - Project ID
 * @param {Array<string>} fileIds - Array of file IDs (requirement or detail design)
 * @param {string} inputSource - Input source type: "requirement" or "detail_design"
 * @returns {Promise<Object>} Generation result
 */
const generateBasicDesign = async (projectId, inputSource = "requirement") => {
  console.log(
    "[API] POST Generate Basic Design - projectId:",
    projectId,
    "inputSource:",
    inputSource
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/generate/basic-design`;
    const body = { 
      input_source: inputSource,
    };

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.FAILED_BASIC_DESIGN;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] Generate Basic Design Error:", error);
    if (!error.message) showAlert(PROJECT_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Source Code APIs
/**
 * Get source code data (folders + files)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Source code data with folders and files
 */
const getSourceData = async (projectId) => {
  console.log("[API] GET Source Data - projectId:", projectId);

  if (!projectId) {
    console.error("[API] Missing project ID");
    throw new Error("Project ID is required");
  }

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    console.log("[API] GET Source Data Success");
    return data;
  } catch (error) {
    console.error("[API] GET Source Data Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Source Code APIs
/**
 * Get source code data (folders + files)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Source code data with folders and files
 */
const getUnitTestSpecData = async (projectId) => {
  console.log("[API] GET Unit Test Spec Data - projectId:", projectId);

  if (!projectId) {
    console.error("[API] Missing project ID");
    throw new Error("Project ID is required");
  }

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utd`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    console.log("[API] GET Unit Test Spec Data Success");
    return data;
  } catch (error) {
    console.error("[API] GET Unit Test Spec Data Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Source Code APIs
/**
 * Get source code data (folders + files)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Source code data with folders and files
 */
const getUnitTestCodeData = async (projectId) => {
  console.log("[API] GET Unit Test Code Data - projectId:", projectId);

  if (!projectId) {
    console.error("[API] Missing project ID");
    throw new Error("Project ID is required");
  }

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utc`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    console.log("[API] GET Unit Test Code Data Success");
    return data;
  } catch (error) {
    console.error("[API] GET Unit Test Code Data Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

/**
 * Generic download function for source code, UTD, and UTC
 * @param {string} projectId - Project ID
 * @param {string} path - Download path (e.g., "source", "utd", "utc")
 * @param {Array<string>} fileIds - Array of file IDs to download
 * @param {Array<string>} folderIds - Array of folder IDs to download
 * @param {string} defaultFilename - Default filename for download
 * @param {string} logPrefix - Prefix for log messages
 */
// #region Detail Design APIs
/**
 * Get detail design files for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Detail design data
 */
const getDetailDesign = async (projectId) => {
  console.log("[API] GET Detail Design - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/detail-design`;
    const response = await window.APIClient.get(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] GET Detail Design Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

// #endregion

// #region Detail Design APIs
/**
 * Generate detail design from basic design files or source code files
 * @param {string} projectId - Project ID
 * @param {string} inputSource - Input source type: "basic_design" or "source_code"
 * @returns {Promise<Object>} Generation result
 */
const generateDetailDesign = async (projectId, inputSource = "basic_design") => {
  console.log(
    "[API] POST Generate Detail Design - projectId:",
    projectId,
    "inputSource:",
    inputSource
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/generate/detail-design`;
    const body = { 
      input_source: inputSource,
    };

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] Generate Detail Design Error:", error);
    if (!error.message) showAlert(PROJECT_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Source Code Generation APIs
/**
 * Generate source code from detail design files
 * @param {string} projectId - Project ID
 * @param {string} inputSource - Input source type: "detail_design"
 * @returns {Promise<Object>} Generation result
 */
const generateSourceCode = async (projectId, inputSource = "detail_design") => {
  console.log(
    "[API] POST Generate Source Code - projectId:",
    projectId,
    "inputSource:",
    inputSource
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/generate/source-code`;
    const body = { 
      input_source: inputSource,
    };

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] Generate Source Code Error:", error);
    if (!error.message) showAlert(PROJECT_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Unit Test Generation APIs
/**
 * Generate unit test from detail design files or source code files
 * @param {string} projectId - Project ID
 * @param {string} inputSource - Input source type: "detail_design" or "source_code"
 * @returns {Promise<Object>} Generation result
 */
const generateUnitTest = async (projectId, inputSource = "detail_design") => {
  console.log(
    "[API] POST Generate Unit Test - projectId:",
    projectId,
    "inputSource:",
    inputSource
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/generate/unit-test`;
    const body = { 
      input_source: inputSource,
    };

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] Generate Unit Test Error:", error);
    if (!error.message) showAlert(PROJECT_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// #region Unit Test Code Generation APIs
/**
 * Generate unit test code from unit test design files
 * @param {string} projectId - Project ID
 * @param {string} inputSource - Input source type: "utd"
 * @returns {Promise<Object>} Generation result
 */
const generateUnitTestCode = async (projectId, inputSource = "utd") => {
  console.log(
    "[API] POST Generate Unit Test Code - projectId:",
    projectId,
    "inputSource:",
    inputSource
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/generate/unit-test-code`;
    const body = { 
      input_source: inputSource,
    };

    const response = await window.APIClient.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error("[API] Generate Unit Test Code Error:", error);
    if (!error.message) showAlert(PROJECT_MESSAGES[500], "error");
    throw error;
  }
};
// #endregion

// Export all API functions

export const ProjectAPI = {
  // Project
  getProject,
  updateProject,

  // Comments
  getComments,
  createComment,

  // Requirement Documents
  getRequirementFiles,
  uploadRequirementFile,
  deleteFileRequirement,

  // Basic Design
  getBasicDesign,
  uploadBasicDesign,
  deleteFileBasicDesign,
  generateBasicDesign,

  // Source Code
  getSourceData,
  getUnitTestSpecData,
  getUnitTestCodeData,

  // Detail Design
  getDetailDesign,
  generateDetailDesign,

  // Source Code Generation
  generateSourceCode,

  // Unit Test Generation
  generateUnitTest,
  generateUnitTestCode,
};

export {
  getProject,
  updateProject,
  getComments,
  createComment,
  getRequirementFiles,
  uploadRequirementFile,
  deleteFileRequirement,
  getBasicDesign,
  uploadBasicDesign,
  deleteFileBasicDesign,
  generateBasicDesign,
  getSourceData,
  getUnitTestSpecData,
  getUnitTestCodeData,
  getDetailDesign,
  generateDetailDesign,
  generateSourceCode,
  generateUnitTest,
  generateUnitTestCode,
};
