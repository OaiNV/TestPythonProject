/**
 * UTC Git Operations
 * Handles Git push/pull operations and branch info
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { showCommitMessageModal } from '../../commons/commit_modal.js';
import { showConflictModal } from '../../commons/conflict_modal.js';
import { pushGitDocuments as pushGitDocumentsAPI, pullGitData as pullGitDataAPI } from '../../commons/detail_git_api.js';
import { getProject } from './utc_detail_api.js';
import { getAllFilesFromGitFileList, filterNonPushedFiles } from './utc_detail_helpers.js';
import { loadGitFiles } from './utc_detail_data.js';
import { getProjectId } from './utc_detail_state.js';
import { UTC_CONFIG, COLLECTION_NAME_UTC } from './utc_detail_state.js';

/**
 * Update Git branch information in sidebar
 */
export const updateGitBranchInfo = async (files) => {
    try {
        const projectData = await getProject(getProjectId());
        const projectInfo = projectData.data || projectData;

        const gitContent = document.getElementById("rdGitContent");
        if (!gitContent) return;

        updateBranchName(gitContent, projectInfo);
        updateBranchDate(gitContent, projectInfo, files);
    } catch (error) {
        console.error("[updateGitBranchInfo] Error:", error);
        setDefaultBranchInfo();
    }
};

/**
 * Update branch name in Git content
 */
const updateBranchName = (gitContent, projectInfo) => {
    const branchNameEl = gitContent.querySelector("#branchName");
    if (branchNameEl) {
        const branchName = projectInfo.git?.branch || projectInfo.branch_name || projectInfo.branch || RD_MESSAGES.DEFAULT_BRANCH_NAME;
        branchNameEl.textContent = branchName;
    }
};

/**
 * Update branch date in Git content
 */
const updateBranchDate = (gitContent, projectInfo, files) => {
    const branchDateEl = gitContent.querySelector("#branchDate");
    if (!branchDateEl) return;

    let branchDate = projectInfo.updated_at || projectInfo.last_commit_date || projectInfo.created_at;

    const filteredFiles = filterNonPushedFiles(files);
    if (filteredFiles && filteredFiles.length > 0) {
        const sortedFiles = [...filteredFiles].sort((a, b) => {
            const dateA = new Date(a.updated_at || 0);
            const dateB = new Date(b.updated_at || 0);
            return dateB - dateA;
        });
        branchDate = sortedFiles[0].updated_at || branchDate;
    }

    const formattedDate = branchDate ? window.BaseUtils?.formatDateTime(branchDate) : RD_MESSAGES.DEFAULT_DATE;
    branchDateEl.textContent = formattedDate;
};

/**
 * Set default branch information
 */
const setDefaultBranchInfo = () => {
    const gitContent = document.getElementById("rdGitContent");
    if (!gitContent) return;

    const branchNameEl = gitContent.querySelector("#branchName");
    const branchDateEl = gitContent.querySelector("#branchDate");

    if (branchNameEl) {
        branchNameEl.textContent = RD_MESSAGES.DEFAULT_BRANCH_NAME;
    }
    if (branchDateEl) {
        branchDateEl.textContent = RD_MESSAGES.DEFAULT_DATE;
    }
};

/**
 * Handle Push Button action
 */
export const handlePushButton = async (navigateToFile) => {
    console.log("[handlePushButton] Start");

    try {
        if (!getProjectId()) {
            window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
            return;
        }

        const fileIds = getAllFilesFromGitFileList();
        if (!fileIds || fileIds.length === 0) {
            window.showAlert(RD_MESSAGES.NO_PUSHABLE_FILES, "warning");
            return;
        }

        const commitMessage = await showCommitMessageModal();
        if (!commitMessage) {
            return;
        }

        const projectData = await getProject(getProjectId());
        const projectInfo = projectData.data || projectData;
        const repoUrl = projectInfo.git?.repository;

        if (!repoUrl) {
            window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
            return;
        }

        const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

        window.BaseUtils.showLoading();
        try {
            const result = await pushGitDocumentsAPI({
                projectId: getProjectId(),
                fileIds,
                commitMessage,
                userName,
                tokenPassword,
                endpointPath: "utc",
                apiBaseUrl: UTC_CONFIG.API_BASE_URL,
                projectsEndpoint: UTC_CONFIG.PROJECTS_ENDPOINT,
                defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
                showAlert: window.showAlert,
            });

            if (result && result.isConflict && result.conflictFiles) {
                const conflictFiles = result.conflictFiles.map(file => ({
                    ...file,
                    collection_name: file.collection_name || COLLECTION_NAME_UTC
                }));

                await showConflictModal(conflictFiles, {
                    projectId: getProjectId(),
                    source: "push",
                });
                return;
            }

            window.showAlert(RD_MESSAGES.GIT_PUSH_SUCCESS, "success");
            await loadGitFiles(navigateToFile);
        } catch (error) {
            console.error("[handlePushButton] Git push error:", error);
        } finally {
            window.BaseUtils.hideLoading();
        }
    } catch (error) {
        console.error("[handlePushButton] Error:", error);
        window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
    }
};

/**
 * Handle Pull Button action
 */
export const handlePullButton = async (navigateToFile) => {
    console.log("[handlePullButton] Start");

    try {
        if (!getProjectId()) {
            window.showAlert(RD_MESSAGES.PROJECT_ID_NOT_FOUND, "error");
            return;
        }

        const projectData = await getProject(getProjectId());
        const projectInfo = projectData.data || projectData;
        const repoUrl = projectInfo.git?.repository;

        if (!repoUrl) {
            window.showAlert(RD_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");
            return;
        }

        const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

        window.BaseUtils.showLoading();
        try {
            const result = await pullGitDataAPI({
                projectId: getProjectId(),
                userName,
                tokenPassword,
                forceOverride: false,
                apiBaseUrl: UTC_CONFIG.API_BASE_URL,
                projectsEndpoint: UTC_CONFIG.PROJECTS_ENDPOINT,
                defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
                showAlert: window.showAlert,
            });

            if (result && result.isConflict && result.conflictFiles) {
                const forcePullOverride = async () => {
                    window.BaseUtils.showLoading();
                    try {
                        await pullGitDataAPI({
                            projectId: getProjectId(),
                            userName,
                            tokenPassword,
                            forceOverride: true,
                            apiBaseUrl: UTC_CONFIG.API_BASE_URL,
                            projectsEndpoint: UTC_CONFIG.PROJECTS_ENDPOINT,
                            defaultErrorMessage: RD_MESSAGES.FILE_LOAD_FAILED,
                            showAlert: window.showAlert,
                        });
                        window.showAlert(RD_MESSAGES.GIT_PULL_SUCCESS, "success");
                        await loadGitFiles(navigateToFile);
                    } catch (error) {
                        console.error("[handlePullButton] Force pull error:", error);
                        throw error;
                    } finally {
                        window.BaseUtils.hideLoading();
                    }
                };

                await showConflictModal(result.conflictFiles, {
                    projectId: getProjectId(),
                    source: "pull",
                    onUseRemoteVersion: forcePullOverride,
                });
                return;
            }

            window.showAlert(RD_MESSAGES.GIT_PULL_SUCCESS, "success");
            await loadGitFiles(navigateToFile);
        } catch (error) {
            console.error("[handlePullButton] Git pull error:", error);
        } finally {
            window.BaseUtils.hideLoading();
        }
    } catch (error) {
        console.error("[handlePullButton] Error:", error);
        window.showAlert(RD_MESSAGES.COMMON_ERROR, "error");
    }
};