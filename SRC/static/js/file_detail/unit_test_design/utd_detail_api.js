/**
 * Unit Test Design Detail API Module
 * Handles all API calls for unit test design detail page
 */

import { UTD_CONFIG, COLLECTION_NAME_UTD } from './utd_detail_state.js';
import { RD_MESSAGES } from '../../commons/error_messages.js';
import { getFileData } from './utd_detail_state.js';

/**
 * Get source_code_id from unit_test_id by searching in UTD list
 * @param {string} projectId - Project ID
 * @param {string} unitTestId - Unit test ID
 * @returns {Promise<string|null>} Source code ID or null if not found
 */
export const getSourceCodeIdFromUnitTestId = async (projectId, unitTestId) => {
    try {
        const files = await getUnitTestDesignDocumentsList(projectId);
        if (!Array.isArray(files) || files.length === 0) return null;

        const utdFile = files.find(
            f => f.id === unitTestId || f.unit_test_id === unitTestId
        );
        if (!utdFile) return null;

        return (
            utdFile.source_code_id ||
            utdFile.source_file_id ||
            utdFile.file_id ||
            null
        );
    } catch {
        return null;
    }
};

/**
 * Get unit test design file details
 * API: GET /api/projects/{project_id}/utd/{file_id}
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID (should be source_code_id)
 * @returns {Promise<Object|null>} File data or null
 */
export const getUnitTestDesignFile = async (projectId, fileId) => {
    if (!projectId || !fileId) {
        throw new Error("Project ID and File ID are required");
    }

    try {
        if (!window.APIClient) {
            throw new Error("APIClient not initialized");
        }

        const url = `${UTD_CONFIG.API_BASE_URL}${UTD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utd/${fileId}`;
        const response = await window.APIClient.get(url);

        if (response.status === 404) {
            window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            const msg =
                data.error_message ||
                data.message ||
                RD_MESSAGES.FILE_LOAD_FAILED;
            window.showAlert(msg, "error");
            return null;
        }

        const fileObj = data.data?.file || {};
        const utdFiles = data.data?.unit_test_designs || [];
        const utdFile = utdFiles[0] || null;

        const validMethodIds = new Set(utdFiles.map(u => u.method_id).filter(Boolean));

        if (fileObj.classes?.length) {
            fileObj.classes.forEach(cls => {
                if (cls.methods?.length) {
                    cls.methods = cls.methods.filter(m => validMethodIds.has(m.method_id));
                }
            });
        }

        if (fileObj.global_methods?.length) {
            fileObj.global_methods = fileObj.global_methods.filter(m => validMethodIds.has(m.method_id));
        }

        const sourceCodeId =
            fileObj.id ||
            fileObj.file_id ||
            fileObj.source_code_id ||
            fileId;

        return {
            ...fileObj,
            id: sourceCodeId,
            file_id: sourceCodeId,
            source_code_id: sourceCodeId,
            unit_test_id: utdFile?.unit_test_id || null,
            unit_test_design_json: utdFile?.unit_test_design_json || "",
            decision_table: utdFile?.decision_table,
            test_pattern: utdFile?.test_pattern,
            content: utdFile?.unit_test_design_json || fileObj.source_code || "",
            sync_status: utdFile?.sync_status || "",
            created_at: utdFile?.created_at || fileObj.created_at,
            updated_at: utdFile?.updated_at || fileObj.updated_at,
            unit_test_designs: utdFiles
        };

    } catch (error) {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
        return null;
    }
};

/**
 * Get source code ID for saving file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID from URL
 * @returns {Promise<string>} Source code ID
 */
export const getSourceCodeIdForSave = async (projectId, fileId) => {
    try {
        const fileData = getFileData();

        if (fileData?.unit_test_id) return fileData.unit_test_id;

        const localId =
            fileData?.id ||
            fileData?.file_id ||
            fileData?.source_code_id ||
            fileId;

        if (localId !== fileId) return localId;

        const utdFiles = await getUnitTestDesignDocumentsList(projectId);
        const matchedFile = utdFiles.find(
            f => f.source_code_id === fileId || f.id === fileId
        );

        return matchedFile?.unit_test_id || fileId;
    } catch {
        return fileId;
    }
};

/**
 * Save unit test design file
 * API: PUT /api/projects/{project_id}/utd/{file_id}
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID (có thể là source_code_id hoặc unit_test_id)
 * @param {string} content - File content
 * @returns {Promise<Object>} Save result
 */
export const saveUnitTestDesignFile = async (projectId, fileId, content) => {
    if (!projectId || !fileId) {
        throw new Error("Project ID and File ID are required");
    }

    if (content === undefined || content === null) {
        throw new Error("Content is required");
    }

    try {
        if (!window.APIClient) {
            throw new Error("APIClient not initialized");
        }

        const url = `${UTD_CONFIG.API_BASE_URL}${UTD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utd/${fileId}`;
        const response = await window.APIClient.put(url, { content });
        const data = await response.json();

        if (!response.ok) {
            const msg =
                data.error_message ||
                data.message ||
                RD_MESSAGES.FILE_SAVE_FAILED;

            window.showAlert(msg, "error");
            throw new Error(msg);
        }

        const saved = data.data || {};
        const fileData = getFileData();

        if (saved.updated_at && fileData) {
            fileData.updated_at = saved.updated_at;
        }

        window.showAlert(RD_MESSAGES.FILE_SAVE_SUCCESS, "success");
        return saved;

    } catch (err) {
        window.showAlert(RD_MESSAGES.FILE_SAVE_FAILED, "error");
        throw err;
    }
};

/**
 * Get project details
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
export const getProject = async (projectId) => {
    if (!projectId) throw new Error("Project ID is required");
    if (!window.APIClient) throw new Error("APIClient not initialized");

    try {
        const url = `${UTD_CONFIG.API_BASE_URL}${UTD_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
        const response = await window.APIClient.get(url);
        const data = await response.json();

        if (!response.ok) {
            const msg = data.error_message || data.message || RD_MESSAGES.PROJECT_LOAD_FAILED;
            window.showAlert(msg, "error");
            throw new Error(msg);
        }

        return data;
    } catch (err) {
        window.showAlert(RD_MESSAGES.PROJECT_LOAD_FAILED, "error");
        throw err;
    }
};

/**
 * Get all unit test design documents for a project
 * API: GET /api/projects/{project_id}/utd
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} List of UTD files
 */
export const getUnitTestDesignDocumentsList = async (projectId) => {
    if (!projectId) throw new Error("Project ID is required");
    if (!window.APIClient) throw new Error("APIClient not initialized");

    try {
        const url = `${UTD_CONFIG.API_BASE_URL}${UTD_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utd`;
        const response = await window.APIClient.get(url);
        const data = await response.json();

        if (!response.ok) {
            const msg = data.error_message || data.message || RD_MESSAGES.FILES_LIST_LOAD_FAILED;
            window.showAlert(msg, "error");
            throw new Error(msg);
        }

        return data.data?.utd_list || [];
    } catch (err) {
        window.showAlert(RD_MESSAGES.FILES_LIST_LOAD_FAILED, "error");
        throw err;
    }
};