/**
 * UTC API Functions
 * Handles all API calls for unit test code operations
 */

import { UTC_CONFIG } from './utc_detail_state.js';
import { RD_MESSAGES } from '../../commons/error_messages.js';
import { getFileData, setFileData } from './utc_detail_state.js';

/**
 * Get unit test code file details
 * API: GET /api/projects/{project_id}/utc/{file_id}
 */
export const getUnitTestCodeFile = async (projectId, fileId) => {
    if (!projectId || !fileId) {
        throw new Error("Project ID and File ID are required");
    }

    try {
        const url = `${UTC_CONFIG.API_BASE_URL}${UTC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utc/${fileId}`;
        const response = await window.APIClient.get(url);

        if (response.status === 404) {
            window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
            return null;
        }

        const responseData = await response.json();
        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || RD_MESSAGES.FILE_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            return null;
        }

        const fileObj = responseData.data?.file || {};
        const utcFiles = responseData.data?.unit_test_codes || [];
        const utcFile = utcFiles[0] || null;

        const validMethodIds = new Set(utcFiles.map(u => u.method_id).filter(Boolean));

        if (fileObj.classes?.length) {
            fileObj.classes.forEach(cls => {
                if (cls.methods?.length) {
                    cls.methods = cls.methods.filter(m => validMethodIds.has(m.method_id));
                }
            });

            fileObj.classes = fileObj.classes.filter(cls => cls.methods?.length);
        }

        if (fileObj.global_methods?.length) {
            fileObj.global_methods = fileObj.global_methods.filter(m => validMethodIds.has(m.method_id));
        }

        const codeContent = utcFile?.unit_test_code || utcFile?.ut_code_content || fileObj.source_code || fileObj.content || "";
        const sourceCodeId = fileObj.id || fileObj.file_id || fileObj.source_code_id || fileId;

        return {
            ...fileObj,
            // id: sourceCodeId,
            // file_id: sourceCodeId,
            // source_code_id: sourceCodeId,
            unit_test_code: utcFile?.unit_test_code || null,
            ut_code_content: utcFile?.ut_code_content || null,
            content: codeContent,
            sync_status: utcFile?.sync_status || "",
            commit_id: utcFile?.commit_id || fileObj.commit_id || "",
            created_at: utcFile?.created_at || fileObj.created_at,
            updated_at: utcFile?.updated_at || fileObj.updated_at,
            unit_test_codes: utcFiles,
        };

    } catch (error) {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
        return null;
    }
};

/**
 * Save unit test code file
 * API: PUT /api/projects/{project_id}/utc/{file_id}
 */
export const saveUnitTestCodeFile = async (projectId, fileId, content) => {
    if (!projectId || !fileId) {
        throw new Error("Project ID and File ID are required");
    }

    if (content === undefined || content === null) {
        throw new Error("Content is required");
    }

    try {
        const url = `${UTC_CONFIG.API_BASE_URL}${UTC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utc/${fileId}`;
        const requestBody = { content };

        const response = await window.APIClient.put(url, requestBody);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || RD_MESSAGES.FILE_SAVE_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        const savedData = responseData.data || {};
        const currentFileData = getFileData();
        if (currentFileData) {
            if (savedData.updated_at) currentFileData.updated_at = savedData.updated_at;
            currentFileData.unit_test_code = content;
            currentFileData.ut_code_content = content;
            currentFileData.content = content;
            setFileData(currentFileData);
        }

        window.showAlert(RD_MESSAGES.FILE_SAVE_SUCCESS, "success");
        return savedData;
    } catch (error) {
        throw error;
    }
};

/**
 * Get project details
 */
export const getProject = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    try {
        const url = `${UTC_CONFIG.API_BASE_URL}${UTC_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
        const response = await window.APIClient.get(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || RD_MESSAGES.PROJECT_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        return responseData;
    } catch (error) {
        throw error;
    }
};

/**
 * Get all unit test code documents for a project
 * API: GET /api/projects/{project_id}/utc
 */
export const getUnitTestCodeDocumentsList = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    try {
        const url = `${UTC_CONFIG.API_BASE_URL}${UTC_CONFIG.PROJECTS_ENDPOINT}/${projectId}/utc`;
        const response = await window.APIClient.get(url);
        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error_message || responseData.message || RD_MESSAGES.FILES_LIST_LOAD_FAILED;
            window.showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        return responseData.data?.utc_list || [];
    } catch (error) {
        throw error;
    }
};
