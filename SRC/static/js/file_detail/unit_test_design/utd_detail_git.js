/**
 * Unit Test Design Detail Git Module
 * Handles Git push and pull operations
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { showCommitMessageModal } from '../../commons/commit_modal.js';
import { showConflictModal } from '../../commons/conflict_modal.js';
import {
    pushGitDocuments as pushGitDocumentsAPI,
    pullGitData as pullGitDataAPI,
} from '../../commons/detail_git_api.js';
import { getProjectId } from './utd_detail_state.js';
import { getProject } from './utd_detail_api.js';
import { loadGitFiles } from './utd_detail_data.js';
import { navigateToUTDFile } from './utd_detail_data.js';

// #region Constants
const COLLECTION_NAME_UTD = "unit_test_design";
const UTD_CONFIG = {
    API_BASE_URL: "/api",
    PROJECTS_ENDPOINT: "/projects",
    TIMEOUT: 30000,
};
// #endregion

// #region Private Functions - Git File List
/**
 * Get all files from gitFileList div (no filtering)
 * @returns {Array} Array of file IDs
 */
const getAllFilesFromGitFileList = () => {
    const gitFileList = document.getElementById("gitFileList");
    if (!gitFileList) return [];

    return Array.from(gitFileList.querySelectorAll(".file-item"))
        .map(item => item.dataset.fileId)
        .filter(Boolean);
};
// #endregion

// #region Public Functions - Git Push
/**
 * Handle Push Button action
 */
export const handlePushButton = async () => {
    const projectId = getProjectId();
    if (!projectId) return window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");

    const fileIds = getAllFilesFromGitFileList();
    if (!fileIds.length) return window.showAlert(RD_MESSAGES.NO_PUSHABLE_FILES, "warning");

    const commitMessage = await showCommitMessageModal();
    if (!commitMessage) return;

    const projectData = await getProject(projectId);
    const repoUrl = projectData?.data?.git?.repository || projectData?.git?.repository;
    if (!repoUrl) return window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");

    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

    window.BaseUtils.showLoading();
    try {
        const result = await pushGitDocumentsAPI({
            projectId,
            fileIds,
            commitMessage,
            userName,
            tokenPassword,
            endpointPath: "utd",
            apiBaseUrl: UTD_CONFIG.API_BASE_URL,
            projectsEndpoint: UTD_CONFIG.PROJECTS_ENDPOINT,
            defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
            showAlert: window.showAlert,
        });

        if (result?.isConflict && result.conflictFiles?.length) {
            const conflictFiles = result.conflictFiles.map(file => ({
                ...file,
                collection_name: file.collection_name || COLLECTION_NAME_UTD
            }));
            await showConflictModal(conflictFiles, { projectId, source: "push" });
            return;
        }

        window.showAlert(RD_MESSAGES.GIT_PUSH_SUCCESS, "success");

        const navigateToFile = (newFileId) => navigateToUTDFile(newFileId);

        await loadGitFiles(navigateToFile);

    } catch (error) {
        console.error("[handlePushButton] Git push error:", error);
        window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};
// #endregion

// #region Public Functions - Git Pull
/**
 * Get repository URL from project data
 * @param {string} projectId - Project ID
 * @returns {string|null} Repository URL or null
 */
const getRepositoryUrl = async (projectId) => {
    const projectData = await getProject(projectId);
    return projectData?.data?.git?.repository || projectData?.git?.repository || null;
};

/**
 * Create pull Git data API parameters
 * @param {string} projectId - Project ID
 * @param {string} userName - Git user name
 * @param {string} tokenPassword - Git token/password
 * @param {boolean} forceOverride - Force override flag
 * @returns {Object} API parameters object
 */
const createPullApiParams = (projectId, userName, tokenPassword, forceOverride = false) => {
    return {
        projectId,
        userName,
        tokenPassword,
        forceOverride,
        apiBaseUrl: UTD_CONFIG.API_BASE_URL,
        projectsEndpoint: UTD_CONFIG.PROJECTS_ENDPOINT,
        defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
        showAlert: window.showAlert,
    };
};

/**
 * Handle successful pull operation
 * @param {Function} navigateToFile - Navigate to file callback
 */
const handlePullSuccess = async (navigateToFile) => {
    window.showAlert(RD_MESSAGES.GIT_PULL_SUCCESS, "success");
    await loadGitFiles(navigateToFile);
};

/**
 * Create force pull override handler
 * @param {string} projectId - Project ID
 * @param {string} userName - Git user name
 * @param {string} tokenPassword - Git token/password
 * @param {Function} navigateToFile - Navigate to file callback
 * @returns {Function} Force pull override function
 */
const createForcePullOverride = (projectId, userName, tokenPassword, navigateToFile) => {
    return async () => {
        window.BaseUtils.showLoading();
        try {
            const params = createPullApiParams(projectId, userName, tokenPassword, true);
            await pullGitDataAPI(params);
            await handlePullSuccess(navigateToFile);
        } finally {
            window.BaseUtils.hideLoading();
        }
    };
};

/**
 * Handle pull conflict resolution
 * @param {Object} result - Pull result with conflicts
 * @param {string} projectId - Project ID
 * @param {string} userName - Git user name
 * @param {string} tokenPassword - Git token/password
 * @param {Function} navigateToFile - Navigate to file callback
 */
const handlePullConflict = async (result, projectId, userName, tokenPassword, navigateToFile) => {
    const forcePullOverride = createForcePullOverride(projectId, userName, tokenPassword, navigateToFile);
    await showConflictModal(result.conflictFiles, {
        projectId,
        source: "pull",
        onUseRemoteVersion: forcePullOverride,
    });
};

/**
 * Handle Pull Button action
 */
export const handlePullButton = async () => {
    const projectId = getProjectId();
    if (!projectId) {
        return window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
    }

    const repoUrl = await getRepositoryUrl(projectId);
    if (!repoUrl) {
        return window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
    }

    const { userName, tokenPassword } = await window.getGitAuth(repoUrl);
    const navigateToFile = (newFileId) => navigateToUTDFile(newFileId);

    window.BaseUtils.showLoading();
    try {
        const params = createPullApiParams(projectId, userName, tokenPassword, false);
        const result = await pullGitDataAPI(params);

        if (result?.isConflict && result.conflictFiles?.length) {
            await handlePullConflict(result, projectId, userName, tokenPassword, navigateToFile);
            return;
        }

        await handlePullSuccess(navigateToFile);
    } catch (error) {
        console.error("[handlePullButton] Git pull error:", error);
        window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};
// #endregion

// #region Public Functions - Setup
/**
 * Setup Git buttons (pullBtn and pushBtn) event listeners
 */
/**
 * Setup pull button click handler
 * @param {HTMLElement} pullBtn - Pull button element
 */
const setupPullButton = (pullBtn) => {
    if (!pullBtn) return;

    pullBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handlePullButton();
    });
};

/**
 * Setup push button click handler
 * @param {HTMLElement} pushBtn - Push button element
 */
const setupPushButton = (pushBtn) => {
    if (!pushBtn) return;

    pushBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handlePushButton();
    });
};

/**
 * Setup Git buttons (pullBtn and pushBtn) event listeners
 */
export const setupGitButtons = () => {
    const pullBtn = document.getElementById("pullBtn");
    const pushBtn = document.getElementById("pushBtn");

    setupPullButton(pullBtn);
    setupPushButton(pushBtn);
};
// #endregion

