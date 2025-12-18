/**
 * Source Detail API Module
 * Handles all API calls for source detail page
 */

import { SRC_CONFIG } from './source_detail_state.js';
import { SRC_MESSAGES } from '../../commons/error_messages.js';
import { showConflictModal } from '../../commons/conflict_modal.js';
import { pullGitData, pushGitDocuments } from '../../commons/git_handle.js';

/**
 * Get source code file details
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File data
 */
export const getSourceFile = async (projectId, fileId) => {
    console.log(`[getSourceFile] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[getSourceFile] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source/${fileId}`;
        const response = await window.APIClient.get(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.FILE_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        const fileData = responseData.data || responseData;
        console.log("[getSourceFile] Success");
        return fileData;
    } catch (error) {
        console.error(`[getSourceFile] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};

/**
 * Save source code file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} content - File content
 * @returns {Promise<Object>} Save result
 */
export const saveSourceFile = async (projectId, fileId, content) => {
    console.log(`[saveSourceFile] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[saveSourceFile] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source/${fileId}`;
        const response = await window.APIClient.put(url, {
            content: content
        });
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.FILE_SAVE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        window.showAlert(SRC_MESSAGES.FILE_SAVE_SUCCESS, "success");
        console.log("[saveSourceFile] Success");
        return responseData.data || responseData;
    } catch (error) {
        console.error(`[saveSourceFile] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};

/**
 * Get project details
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
export const getProject = async (projectId) => {
    console.log(`[getProject] Start - projectId=${projectId}`);

    if (!projectId) {
        console.warn("[getProject] Missing projectId");
        throw new Error("Project ID is required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
        const response = await window.APIClient.get(url);
        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error_message || data.message || SRC_MESSAGES.PROJECT_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        console.log("[getProject] Success");
        return data;
    } catch (error) {
        console.error(`[getProject] Error - projectId=${projectId}: ${error}`);
        throw error;
    }
};

/**
 * Get file tree (folders + files)
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Normalized file tree data
 */
export const getFileTree = async (projectId) => {
    console.log(`[getFileTree] Start - projectId=${projectId}`);

    if (!projectId) {
        console.warn("[getFileTree] Missing projectId");
        throw new Error("Project ID is required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source`;
        const response = await window.APIClient.get(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.FILE_TREE_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        const rawData = responseData.data || responseData;
        console.log("[getFileTree] Success");
        return rawData;
    } catch (error) {
        console.error(`[getFileTree] Error - projectId=${projectId}: ${error}`);
        throw error;
    }
};

/**
 * Get all source code files for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of files
 */
export const getSourceFilesList = async (projectId) => {
    console.log(`[getSourceFilesList] Start - projectId=${projectId}`);

    if (!projectId) {
        console.warn("[getSourceFilesList] Missing projectId");
        throw new Error("Project ID is required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source`;
        const response = await window.APIClient.get(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.FILES_LIST_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        // API returns { data: { folders: [], sources: [] } }
        const files = responseData.data?.sources || [];
        console.log(`[getSourceFilesList] Success - found ${files.length} files`);
        return files;
    } catch (error) {
        console.error(`[getSourceFilesList] Error - projectId=${projectId}: ${error}`);
        throw error;
    }
};

/**
 * Generate detailed design (PD)
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Generated PD data
 */
export const generatePD = async (projectId, fileId) => {
    console.log(`[generatePD] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[generatePD] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source/${fileId}/generate-pd`;
        const response = await window.APIClient.post(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.DETAIL_DESIGN_GENERATE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        console.log("[generatePD] Success");
        return responseData.data || responseData;
    } catch (error) {
        console.error(`[generatePD] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};

/**
 * Generate unit test specification (UTD)
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Generated UTD data
 */
export const generateUTD = async (projectId, fileId) => {
    console.log(`[generateUTD] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[generateUTD] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source/${fileId}/generate-utd`;
        const response = await window.APIClient.post(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.UNIT_TEST_SPEC_GENERATE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        console.log("[generateUTD] Success");
        return responseData.data || responseData;
    } catch (error) {
        console.error(`[generateUTD] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};

/**
 * Generate unit test code (UTC)
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Generated UTC data
 */
export const generateUTC = async (projectId, fileId) => {
    console.log(`[generateUTC] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[generateUTC] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/source/${fileId}/generate-utc`;
        const response = await window.APIClient.post(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.UNIT_TEST_CODE_GENERATE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        console.log("[generateUTC] Success");
        return responseData.data || responseData;
    } catch (error) {
        console.error(`[generateUTC] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};

export const gitPush = async (config) => {
    const {
        projectId,
        fileIds,
        commitMessage,
        userName,
        tokenPassword,
        showAlert = window.showAlert,
    } = config;

    console.log(`[gitPush] Start - projectId=${projectId}, fileIds=${fileIds}`);

    if (!projectId || !fileIds) {
        console.warn("[gitPush] Missing projectId or fileIds");
        throw new Error("Project ID and File IDs are required");
    }

    if (!commitMessage || !commitMessage.trim()) {
        console.warn("[gitPush] Missing commitMessage");
        throw new Error("Commit message is required");
    }

    if (!userName) {
        console.warn("[gitPush] Missing userName");
        throw new Error("Git username is required");
    }

    try {
        const pushResult = await pushGitDocuments(
            projectId,
            fileIds,
            commitMessage,
            userName,
            tokenPassword,
            "source"
        );

        if (pushResult?.isConflict) {
            console.warn(`[gitPush] Conflict detected - projectId=${projectId}, fileIds=${fileIds}`);
            await showConflictModal(pushResult.conflictFiles || [], {
                projectId: projectId,
                source: "push",
            });
            console.log(`[gitPush] Conflict modal shown - projectId=${projectId}, fileIds=${fileIds}`);
            return pushResult;
        }

        showAlert(SRC_MESSAGES.GIT_PUSH_SUCCESS, "success");
        console.log(`[gitPush] Success - projectId=${projectId}, fileIds=${fileIds}`);
        return pushResult?.data || pushResult;
    } catch (error) {
        console.error(`[gitPush] Error - projectId=${projectId}, fileIds=${fileIds}`, error);
        throw error;
    }
};

export const gitPull = async (config) => {
    const {
        projectId,
        userName,
        tokenPassword,
        forceOverride = false,
        showAlert = window.showAlert,
    } = config;

    console.log(`[gitPull] Start - projectId=${projectId}, forceOverride=${forceOverride}`);

    if (!projectId) {
        console.warn("[gitPull] Missing projectId");
        throw new Error("Project ID is required");
    }

    if (!userName) {
        console.warn("[gitPull] Missing userName");
        throw new Error("Git username is required");
    }

    try {
        const pullResult = await pullGitData(projectId, userName, tokenPassword, forceOverride);

        if (pullResult?.isConflict) {
            console.warn(`[gitPull] Conflict detected - projectId=${projectId}`);
            await showConflictModal(pullResult.conflictFiles || [], {
                projectId: projectId,
                source: "pull",
            });
            console.log(`[gitPull] Conflict modal shown - projectId=${projectId}`);
            return pullResult;
        }

        showAlert(SRC_MESSAGES.GIT_PULL_SUCCESS, "success");
        console.log(`[gitPull] Success - projectId=${projectId}`);
        return pullResult?.data || pullResult;
    } catch (error) {
        console.error(`[gitPull] Error - projectId=${projectId}`, error);
        throw error;
    }
};

/**
 * Create issue
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} title - Issue title
 * @param {string} content - Issue content
 * @param {string} sourceCodeId - Source code ID (optional)
 * @param {string} userName - Git username
 * @param {string} tokenPassword - Git token/password
 * @returns {Promise<Object>} Created issue data
 */
export const createIssue = async (projectId, fileId, title, content, sourceCodeId = null, userName = null, tokenPassword = null) => {
    console.log(`[createIssue] Start - projectId=${projectId}, fileId=${fileId}`);

    if (!projectId || !fileId) {
        console.warn("[createIssue] Missing projectId or fileId");
        throw new Error("Project ID and File ID are required");
    }

    if (!title || !content) {
        console.warn("[createIssue] Missing title or content");
        throw new Error("Title and content are required");
    }

    try {
        const url = `${SRC_CONFIG.API_BASE_URL}${SRC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/issue`;
        const body = {
            title: title,
            description: content,
            source_code_id: sourceCodeId || fileId,
        };

        if (userName) {
            body.user_name = userName;
        }
        if (tokenPassword) {
            body.token_password = tokenPassword;
        }

        const response = await window.APIClient.post(url, body);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || SRC_MESSAGES.ISSUE_CREATE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        window.showAlert(SRC_MESSAGES.ISSUE_CREATED, "success");
        console.log("[createIssue] Success");
        return responseData.data || responseData;
    } catch (error) {
        console.error(`[createIssue] Error - projectId=${projectId}, fileId=${fileId}: ${error}`);
        throw error;
    }
};
