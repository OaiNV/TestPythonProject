/**
 * UTC Event Handlers
 * Handles all user interactions and events
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { saveUnitTestCodeFile } from './utc_detail_api.js';
import { renderHeader, renderCodeEditor, renderGitFileList } from './utc_detail_ui.js';
import { renderCodeTabContent } from './utc_detail_tree_handlers.js';
import { loadGitFiles, loadFileDataForNavigation } from './utc_detail_data.js';
import { handlePushButton, handlePullButton } from './utc_detail_git.js';
import { detectLanguageFromFileName, extractIdsFromUrl } from './utc_detail_helpers.js';
import { parseCodeBasic } from '../source_code/source_detail_helpers.js';
import {
    getProjectId,
    getFileId,
    setFileId,
    getFileData,
    setFileData,
    setSyncStatus,
    getCodeContent,
    setCodeContent,
    getIsEditorReadOnly,
    setIsEditorReadOnly,
    getCurrentViewType,
    setCurrentViewType,
    getOriginalContent,
    setOriginalContent,
    getHasUnsavedChanges,
    setHasUnsavedChanges
} from './utc_detail_state.js';

/**
 * Handle tab click
 */
const onTabClick = (tab, navigateToFile) => {
    const targetTab = tab.getAttribute("data-tab");
    if (!targetTab) return;

    updateTabActiveState(tab, targetTab);
    updateTabContentVisibility(targetTab);
    loadTabContent(targetTab, navigateToFile);
};

/**
 * Update active state of tabs
 */
const updateTabActiveState = (activeTab, targetTab) => {
    const tabs = document.querySelectorAll(".rd-tab");
    const tabContents = document.querySelectorAll(".rd-tab-content");

    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(tc => tc.classList.remove("active"));

    activeTab.classList.add("active");
    const targetContent = document.getElementById(targetTab);
    if (targetContent) targetContent.classList.add("active");
};

/**
 * Update visibility of tab content sections
 */
export const updateTabContentVisibility = (targetTab) => {
    const panelContent = document.querySelector(".rd-left-panel-content");
    if (!panelContent) return;

    const allTabContents = panelContent.querySelectorAll(".rd-tab-content");
    allTabContents.forEach(tabContent => {
        tabContent.classList.remove("active");
        tabContent.style.display = "none";
    });

    const targetTabContent = document.getElementById(targetTab);
    if (targetTabContent) {
        targetTabContent.classList.add("active");
        targetTabContent.style.display = "block";
    }
};

/**
 * Load content for selected tab
 */
const loadTabContent = (targetTab, navigateToFile) => {
    if (targetTab === "tabContent-git") {
        if (getProjectId()) {
            loadGitFiles(navigateToFile);
        } else {
            renderGitFileList([]);
        }
    }
};

/**
 * Check for unsaved changes before navigation
 */
const checkUnsavedChanges = async () => {
    try {
        if (!getHasUnsavedChanges()) return true;

        return await window.confirm(
            RD_MESSAGES.UNSAVED_CHANGES_TITLE,
            RD_MESSAGES.UNSAVED_CHANGES_MESSAGE
        );
    } catch {
        return false;
    }
};

/**
 * Navigate to a different UTC file
 */
export const navigateToUTCFile = async (newFileId, navigateToFileCallback) => {
    if (!newFileId || newFileId === getFileId()) return;

    const hasUnsavedChanges = await checkUnsavedChanges();
    if (!hasUnsavedChanges) return;

    if (!getProjectId() || !newFileId) return;

    try {
        window.BaseUtils.showLoading();

        const { fileData, projectData } = await loadFileDataForNavigation(newFileId);
        if (!fileData) return;

        setFileId(newFileId);
        setFileData(fileData);
        setSyncStatus(fileData.sync_status || "");

        const newUrl = `/projects/${getProjectId()}/utc/${newFileId}`;
        window.history.pushState({ projectId: getProjectId(), fileId: newFileId }, "", newUrl);

        renderHeader(fileData, projectData);

        const content = fileData.unit_test_code || fileData.ut_code_content || fileData.content || "";
        setIsEditorReadOnly(false);
        setCurrentViewType('method');
        setHasUnsavedChanges(false);
        renderCodeEditor(content, false);

        if (navigateToFileCallback) renderCodeTabContent(navigateToFileCallback);
    } catch {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Handle save code action
 */
const onSaveCode = async () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) {
        window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
        return;
    }

    if (getIsEditorReadOnly()) {
        window.showAlert("Cannot save in read-only mode. Please select a method to edit.", "warning");
        return;
    }

    if (getCurrentViewType() !== 'method') {
        window.showAlert("Can only save changes when editing a method.", "warning");
        return;
    }

    if (!getHasUnsavedChanges()) {
        window.showAlert("No changes to save.", "info");
        return;
    }

    // Get fileId from URL path instead of state
    const { projectId: urlProjectId, fileId: urlFileId } = extractIdsFromUrl();
    
    if (!urlProjectId || !urlFileId) {
        window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
        return;
    }

    const content = codeEditor.value;
    window.BaseUtils.showLoading();

    try {
        // Use fileId from URL path for saving
        await saveUnitTestCodeFile(urlProjectId, urlFileId, content);

        setCodeContent(content);
        setOriginalContent(content);
        setHasUnsavedChanges(false);

        updateSaveButtonVisibility();
    } catch {
        // error handling done inside saveUnitTestCodeFile
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Handle copy code action
 */
const onCopyCode = async () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) {
        window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
        return;
    }

    try {
        if (window.BaseUtils?.copyToClipboard) {
            await window.BaseUtils.copyToClipboard(codeEditor.value);
        } else {
            await navigator.clipboard.writeText(codeEditor.value);
        }
    } catch {
        window.showAlert(RD_MESSAGES.CODE_COPY_FAILED, "error");
    }
};

/**
 * Update Save button visibility based on changes
 */
const updateSaveButtonVisibility = () => {
    const saveBtn = document.getElementById("saveCodeBtn");
    if (!saveBtn) return;

    const hasChanges = getHasUnsavedChanges();
    const isReadOnly = getIsEditorReadOnly();
    const viewType = getCurrentViewType();

    saveBtn.style.display = (hasChanges && !isReadOnly && viewType === 'method') ? "" : "none";
    saveBtn.disabled = !(hasChanges && !isReadOnly && viewType === 'method');
};

/**
 * Track content changes in code editor
 */
const setupContentChangeTracking = () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return;

    codeEditor.addEventListener("input", (e) => {
        const currentContent = e.target.value;
        setHasUnsavedChanges(currentContent !== getOriginalContent());
        updateSaveButtonVisibility();
    });
};

/**
 * Parse code content and update code tab
 */
const parseAndUpdateCodeTab = (codeContent, navigateToFile) => {
    const fileData = getFileData();
    if (!fileData) return;

    const language = detectLanguageFromFileName(fileData.file_name || "");
    const parsed = parseCodeBasic(codeContent, language);

    fileData.classes = parsed.classes || [];
    fileData.global_methods = parsed.global_methods || [];
    setFileData(fileData);

    renderCodeTabContent(navigateToFile);
};

/**
 * Handle tab switching
 */
export const handleTabSwitch = (navigateToFile) => {
    const tabs = document.querySelectorAll(".rd-tab");
    if (!tabs) return;

    tabs.forEach(tab => {
        tab.addEventListener("click", () => onTabClick(tab, navigateToFile));
    });
};

/**
 * Handle back button click
 */
export const handleBackButton = () => {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;

    backBtn.addEventListener("click", () => {
        const projectId = getProjectId();
        const tab = new URLSearchParams(window.location.search).get("tab") || "unitTestCode";
        window.location.href = projectId ? `/projects/${projectId}?tab=${tab}` : "/projects";
    });
};

/**
 * Handle save code button
 */
export const handleSaveCode = () => {
    const saveBtn = document.getElementById("saveCodeBtn");
    if (!saveBtn) return;

    saveBtn.addEventListener("click", onSaveCode);
    saveBtn.style.display = "none";
};

/**
 * Handle copy code button
 */
export const handleCopyCode = () => {
    const copyBtn = document.getElementById("copyCodeBtn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", onCopyCode);
};

/**
 * Setup live code parsing (disabled)
 */
export const setupLiveCodeParsing = (navigateToFile) => {
    setupContentChangeTracking();
};

/**
 * Setup Git buttons (pullBtn and pushBtn) event listeners
 */
export const setupGitButtons = (navigateToFile) => {
    const pullBtn = document.getElementById("pullBtn");
    const pushBtn = document.getElementById("pushBtn");

    if (pullBtn) {
        pullBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handlePullButton(navigateToFile);
        });
    }

    if (pushBtn) {
        pushBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handlePushButton(navigateToFile);
        });
    }
};
