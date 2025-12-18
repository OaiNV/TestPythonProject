/**
 * UTC UI Rendering Functions
 * Handles all UI rendering for unit test code detail page
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { renderSidebarFileList } from '../../commons/file_List.js';
import { getLanguageImagePath } from '../source_code/source_detail_helpers.js';
import { extractRepoName, filterFilesWithSyncStatus } from './utc_detail_helpers.js';
import { getCodeContent, setCodeContent, setIsEditorReadOnly, setOriginalContent, setHasUnsavedChanges } from './utc_detail_state.js';

/**
 * Render file name in header
 */
export const renderFileName = (fileData) => {
    const fileNameEl = document.getElementById("fileName");
    if (fileNameEl && fileData) {
        fileNameEl.textContent = fileData.file_name || RD_MESSAGES.FILE_NAME;
    }
};

/**
 * Render repository name
 */
export const renderRepoName = (projectInfo) => {
    console.log("[renderRepoName] Start - projectInfo:", projectInfo);

    const repoNameEl = document.getElementById("repoName");
    if (!repoNameEl) {
        console.warn("[renderRepoName] repoName element not found");
        return;
    }

    if (!projectInfo) {
        console.warn("[renderRepoName] projectInfo is null, keeping default text");
        return;
    }

    const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name || "";
    const repoName = extractRepoName(repoUrl);
    repoNameEl.textContent = repoName || "-";
    console.log(`[renderRepoName] Set repoName=${repoName} from repoUrl=${repoUrl}`);
};

/**
 * Render branch name
 */
export const renderBranchName = (projectInfo) => {
    console.log("[renderBranchName] Start - projectInfo:", projectInfo);

    const branchNameEl = document.getElementById("branchName");
    if (!branchNameEl) {
        console.warn("[renderBranchName] branchName element not found");
        return;
    }

    if (!projectInfo) {
        console.warn("[renderBranchName] projectInfo is null, keeping default text");
        return;
    }

    const branchName = projectInfo.git?.branch || projectInfo.branch_name || projectInfo.branch || RD_MESSAGES.BRANCH_NAME;
    branchNameEl.textContent = branchName || "-";
    console.log(`[renderBranchName] Set branchName=${branchName}`);
};

/**
 * Render language icon
 */
export const renderLanguageIcon = (projectInfo) => {
    const languageIconContainer = document.getElementById("languageIconContainer");
    if (!languageIconContainer) {
        return;
    }

    if (!projectInfo) {
        console.warn("[renderLanguageIcon] projectInfo is null, keeping default state");
        return;
    }

    const language = projectInfo.language || projectInfo.programming_language || "";
    const imgPath = getLanguageImagePath(language);

    if (imgPath) {
        languageIconContainer.innerHTML = `
            <img 
                src="/static/images/${imgPath}" 
                alt="${language}" 
                class="language-logo" 
                style="width: 24px; height: 24px; margin-right: 8px;"
            />
        `;
    } else {
        languageIconContainer.innerHTML = "";
    }
};

/**
 * Render repository information in header
 */
export const renderRepoInfo = (projectData) => {
    console.log("[renderRepoInfo] Start - projectData:", projectData);

    try {
        if (!projectData) {
            console.warn("[renderRepoInfo] projectData is null, keeping default texts");
            return;
        }

        const projectInfo = projectData.data || projectData;
        console.log("[renderRepoInfo] projectInfo:", projectInfo);

        renderRepoName(projectInfo);
        renderBranchName(projectInfo);
        renderLanguageIcon(projectInfo);

        console.log("[renderRepoInfo] Success");
    } catch (error) {
        console.error("[renderRepoInfo] Error:", error);
    }
};

/**
 * Render commit date in header
 */
export const renderCommitDate = (fileData) => {
    const updateDateEl = document.getElementById("updateDate");
    if (!updateDateEl) return;
    if (!fileData) return;

    const commitDate = fileData.updated_at || fileData.created_at;
    if (commitDate) {
        updateDateEl.textContent = window.BaseUtils?.formatDate(commitDate) || "";
    } else {
        updateDateEl.textContent = window.BaseUtils?.formatDate(new Date().toISOString()) || "";
    }
};

/**
 * Render file header information
 */
export const renderHeader = (fileData, projectData) => {
    console.log("[renderHeader] Start");

    if (!fileData) {
        console.warn("[renderHeader] Missing fileData");
        return;
    }

    try {
        renderFileName(fileData);
        renderRepoInfo(projectData);
        renderCommitDate(fileData);
        console.log("[renderHeader] Success");
    } catch (error) {
        console.error("[renderHeader] Error:", error);
    }
};

/**
 * Render code editor content
 */
export const renderCodeEditor = (content, isReadOnly = false) => {
    console.log("[renderCodeEditor] Start - isReadOnly:", isReadOnly);

    try {
        const codeEditor = document.getElementById("rdCodeEditor");
        if (!codeEditor) {
            console.warn("[renderCodeEditor] Code editor element not found");
            return;
        }

        codeEditor.value = content || "";
        codeEditor.readOnly = isReadOnly;

        // Update visual styling based on read-only state
        if (isReadOnly) {

        } else {
            codeEditor.style.backgroundColor = "";
            codeEditor.style.cursor = "text";
        }

        // Update state
        setCodeContent(content || "");
        setOriginalContent(content || ""); // Save original content for change detection
        setIsEditorReadOnly(isReadOnly);
        console.log("[renderCodeEditor] Success");
    } catch (error) {
        console.error("[renderCodeEditor] Error:", error);
    }
};

/**
 * Render Git file list using common component
 */
export const renderGitFileList = (files) => {
    console.log("[renderGitFileList] Start");

    if (!files || !Array.isArray(files)) {
        console.warning("[renderGitFileList] Invalid files parameter");
        return;
    }

    try {
        const filteredFiles = filterFilesWithSyncStatus(files);
        console.log(`[renderGitFileList] Filtered ${filteredFiles.length} files from ${files.length} total`);
        renderSidebarFileList("gitFileList", filteredFiles, false);
        console.log("[renderGitFileList] Success");
    } catch (error) {
        console.error("[renderGitFileList] Error:", error);
    }
};