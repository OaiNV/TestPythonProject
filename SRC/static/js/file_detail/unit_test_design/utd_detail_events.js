/**
 * Unit Test Design Detail Events Module
 * Handles all event handlers
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import {
    getProjectId,
    getFileId,
    getCodeContent,
    setCodeContent,
    getSelectedMethodId,
    getSelectedClassId,
    getFileData,
    setFileData,
    setSelectedClassId,
    setSelectedMethodId,
    setSelectedMethodData,
    getCurrentUnitTestId,
    setCurrentUnitTestId
} from './utd_detail_state.js';
import { renderCodeEditor, renderPreview, updateTabActiveState, updateTabContentVisibility } from './utd_detail_ui.js';
import { getSourceCodeIdForSave, saveUnitTestDesignFile } from './utd_detail_api.js';
import { loadFileData, navigateToUTDFile, renderCodeTabContent, loadGitFiles } from './utd_detail_data.js';

// #region Public Functions - Tab Handlers
/**
 * Handle tab click
 * @param {HTMLElement} tab - Tab element
 */
export const onTabClick = async (tab) => {
    if (!tab) return;

    const targetTab = tab.getAttribute("data-tab");
    if (!targetTab) return;

    updateTabActiveState(tab, targetTab);
    updateTabContentVisibility(targetTab);
    await loadTabContent(targetTab);
};

/**
 * Create navigate to file callback
 * @returns {Function} Navigate to file callback function
 */
const createNavigateToFileCallback = () => {
    return async (newFileId) => {
        await navigateToUTDFile(newFileId, createNavigateToFileCallback());
    };
};

/**
 * Load code tab content
 */
const loadCodeTabContent = () => {
    const fileData = getFileData();
    const fileId = getFileId();
    if (!fileData || !fileId) return;

    const navigateToFile = createNavigateToFileCallback();
    renderCodeTabContent(navigateToFile);
};

/**
 * Load git tab content
 */
const loadGitTabContent = async () => {
    const projectId = getProjectId();
    if (!projectId) return;

    const navigateToFile = createNavigateToFileCallback();
    await loadGitFiles(navigateToFile);
};

/**
 * Load content for selected tab
 * @param {string} targetTab - Target tab ID
 */
export const loadTabContent = async (targetTab) => {
    if (targetTab === "tabContent-code") {
        loadCodeTabContent();
    } else if (targetTab === "tabContent-git") {
        await loadGitTabContent();
    }
};
// #endregion

// #region Public Functions - Button Handlers
/**
 * Handle back button click
 */
export const handleBackButton = () => {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;

    backBtn.addEventListener("click", () => {
        const projectId = getProjectId();

        // Get tab from URL query parameter to preserve it when navigating back
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab") || "unitTestSpec";

        if (projectId) {
            // Navigate back with tab parameter to restore the tab
            window.location.href = `/projects/${projectId}?tab=${tab}`;
        } else {
            window.location.href = "/projects";
        }
    });
};

/**
 * Handle save code button
 */
export const handleSaveCode = () => {
    const saveBtn = document.getElementById("saveCodeBtn");
    if (!saveBtn) return;

    saveBtn.addEventListener("click", onSaveCode);
};

/**
 * Handle expand code and preview buttons
 */
export const handleExpandCode = () => {
    document.addEventListener("click", (e) => {
        if (e.target.closest("#expandCodeBtn")) onExpandCodeClick(e);
        if (e.target.closest("#expandPreviewBtn")) onExpandPreviewClick(e);
    });
};

/**
 * Handle copy code button
 */
export const handleCopyCode = () => {
    const copyBtn = document.getElementById("copyCodeBtn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async () => {
        await onCopyCode();
    });
};

/**
 * Handle generate unit test code button
 */
export const handleGenerateUnitTestCode = () => {
    const generateBtn = document.getElementById("generateUnitTestCodeBtn");
    if (!generateBtn) return;

    generateBtn.addEventListener("click", async () => {
        await onGenerateUnitTestCode();
    });
};
// #endregion

// #region Public Functions - Action Handlers
/**
 * Validate save code inputs
 * @returns {Object|null} Object with codeEditor, projectId, fileId, content or null if invalid
 */
const validateSaveCodeInputs = () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) {
        window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
        return null;
    }

    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || !fileId) {
        window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
        return null;
    }

    const content = codeEditor.value;
    return { codeEditor, projectId, fileId, content };
};

// Helper function để set read-only cho code editor
export const setEditorReadOnly = (readOnly = true) => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return;

    codeEditor.readOnly = readOnly;

    if (readOnly) {
        // codeEditor.style.backgroundColor = "#f5f5f5";
        // codeEditor.style.cursor = "not-allowed";
    } else {
        codeEditor.style.backgroundColor = "";
        codeEditor.style.cursor = "";
    }
};

/**
 * Determine selection type
 * @param {string} selectedMethodId - Selected method ID
 * @param {string} selectedClassId - Selected class ID
 * @returns {Object} Object with isMethod and isClass flags
 */
const determineSelectionType = (selectedMethodId, selectedClassId) => {
    const isMethod = !!selectedMethodId;
    const isClass = !!selectedClassId && !selectedMethodId;
    return { isMethod, isClass };
};

/**
 * Find or create UTD target
 * @param {Object} fileData - File data object
 * @param {boolean} isMethod - Is method flag
 * @param {boolean} isClass - Is class flag
 * @param {string} selectedMethodId - Selected method ID
 * @param {string} selectedClassId - Selected class ID
 * @returns {Object|null} UTD target object or null
 */
const findOrCreateUTDTarget = (fileData, isMethod, isClass, selectedMethodId, selectedClassId) => {
    if (!fileData) return null;

    fileData.unit_test_designs = fileData.unit_test_designs || [];

    let utdTarget = fileData.unit_test_designs.find((utd) => {
        if (isMethod) return utd.method_id === selectedMethodId;
        if (isClass) return utd.class_id === selectedClassId && !utd.method_id;
        return false;
    });

    if (!utdTarget && (isMethod || isClass)) {
        utdTarget = {
            method_id: isMethod ? selectedMethodId : null,
            class_id: isClass ? selectedClassId : null,
            unit_test_design_json: "",
            decision_table: null,
            test_pattern: null,
        };
        fileData.unit_test_designs.push(utdTarget);
    }

    return utdTarget;
};

/**
 * Update file data with content
 * @param {Object} fileData - File data object
 * @param {string} content - Content to save
 * @param {boolean} isMethod - Is method flag
 * @param {boolean} isClass - Is class flag
 * @param {Object} utdTarget - UTD target object
 */
const updateFileDataWithContent = (fileData, content, isMethod, isClass, utdTarget) => {
    if (!fileData) return;

    if (isMethod || isClass) {
        if (utdTarget) {
            utdTarget.unit_test_design_json = content;
        }
    } else {
        fileData.source_code = content;
    }

    setFileData(fileData);
};

/**
 * Save file to server
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} content - Content to save
 */
const saveFileToServer = async (projectId, fileId, content) => {
    const currentUnitTestId = getCurrentUnitTestId();
    const idToSave = currentUnitTestId || await getSourceCodeIdForSave(projectId, fileId);

    console.log('[saveFileToServer] Using ID:', idToSave);

    await saveUnitTestDesignFile(projectId, idToSave, content);
    setCodeContent(content);
};
/**
 * Handle save code action
 */
export const onSaveCode = async () => {
    const inputs = validateSaveCodeInputs();
    if (!inputs) return;

    const { projectId, fileId, content } = inputs;
    const fileData = getFileData();
    const selectedMethodId = getSelectedMethodId();
    const selectedClassId = getSelectedClassId();

    window.BaseUtils.showLoading();
    try {
        const { isMethod, isClass } = determineSelectionType(selectedMethodId, selectedClassId);
        const utdTarget = findOrCreateUTDTarget(fileData, isMethod, isClass, selectedMethodId, selectedClassId);
        updateFileDataWithContent(fileData, content, isMethod, isClass, utdTarget);
        await saveFileToServer(projectId, fileId, content);
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Handle expand code button click
 * @param {Event} e - Click event
 */
export const onExpandCodeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const container = document.querySelector(".code-preview-container");
    if (!container) return;

    const isCodeExpanded = container.classList.contains("code-expanded");
    container.classList.remove("code-expanded", "preview-expanded");
    if (!isCodeExpanded) container.classList.add("code-expanded");
};

/**
 * Handle expand preview button click
 * @param {Event} e - Click event
 */
export const onExpandPreviewClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const container = document.querySelector(".code-preview-container");
    if (!container) return;

    const isExpanded = container.classList.contains("preview-expanded");
    container.classList.remove("code-expanded", "preview-expanded");
    if (!isExpanded) container.classList.add("preview-expanded");
};

/**
 * Handle copy code action
 */
export const onCopyCode = async () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return window.showAlert(RD_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");

    const text = codeEditor.value;

    try {
        if (window.BaseUtils?.copyToClipboard) {
            await window.BaseUtils.copyToClipboard(text);
        } else {
            await navigator.clipboard.writeText(text);
        }
    } catch {
        window.showAlert(RD_MESSAGES.CODE_COPY_FAILED, "error");
    }
};

/**
 * Handle generate unit test code action
 */
export const onGenerateUnitTestCode = async () => {
    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || !fileId) return window.showAlert(RD_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");

    const confirmed = await window.confirm(
        RD_MESSAGES.UNIT_TEST_CODE_GENERATE_TITLE,
        RD_MESSAGES.UNIT_TEST_CODE_GENERATE_CONFIRM
    );
    if (!confirmed) return;

    window.BaseUtils.showLoading();
    try {
        window.showAlert(RD_MESSAGES.UNIT_TEST_CODE_GENERATE_IN_PROGRESS, "info");
        // TODO: Implement generate unit test code API call
    } catch {
        window.showAlert(RD_MESSAGES.UNIT_TEST_CODE_GENERATE_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};
// #endregion

// #region Public Functions - Tab Switch Handler
/**
 * Handle tab switching
 */
export const handleTabSwitch = () => {
    const tabs = document.querySelectorAll(".rd-tab");
    if (!tabs?.length) return;

    tabs.forEach((tab) => tab.addEventListener("click", () => onTabClick(tab)));
};
// #endregion

// #region Public Functions - Live Preview
/**
 * Check if preview should be rendered
 * @returns {boolean} True if preview should be rendered
 */
const shouldRenderPreview = () => {
    const selectedClassId = getSelectedClassId();
    const selectedMethodId = getSelectedMethodId();
    return !selectedClassId && !selectedMethodId;
};

/**
 * Update preview with debounce
 * @param {HTMLElement} codeEditor - Code editor element
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced preview update function
 */
const createDebouncedPreviewUpdater = (codeEditor, delay = 300) => {
    let previewTimeout;

    return () => {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
            const content = codeEditor.value;
            if (shouldRenderPreview()) {
                renderPreview(content);
            }
        }, delay);
    };
};

/**
 * Setup live preview for code editor
 */
export const setupLivePreview = () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return;

    const updatePreview = createDebouncedPreviewUpdater(codeEditor);
    codeEditor.addEventListener("input", updatePreview);
};
// #endregion

