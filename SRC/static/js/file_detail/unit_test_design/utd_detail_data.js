/**
 * Unit Test Design Detail Data Module
 * Handles all data loading functions
 */

import { RD_MESSAGES, SRC_MESSAGES } from '../../commons/error_messages.js';
import {
    getProjectId,
    getFileId,
    setFileId,
    getFileData,
    setFileData,
    getCodeContent,
    setCodeContent,
    getSelectedClassId,
    getSelectedMethodId,
    setSelectedClassId,
    setSelectedMethodId,
    setSelectedMethodData,
    addExpandedClass,
    setCurrentUnitTestId,
    setIsEditorReadOnly,
    setCurrentViewType,
    setHasUnsavedChanges,
} from './utd_detail_state.js';
import { renderHeader, renderCodeEditor, renderPreview, buildFileNodeStructure, findNodeInTree, createTreeNodeElement, updateTreeActiveState } from './utd_detail_ui.js';
import { getUnitTestDesignFile, getProject, getUnitTestDesignDocumentsList } from './utd_detail_api.js';
import { renderGitFileList, updateGitBranchInfo } from './utd_detail_ui.js';
import { onFileClick, onClassClick, onMethodClick, buildPreviewDataFromUnitTestDesign, getMethodDetailDesignData, buildPreviewDataFromDetailDesign } from './utd_detail_tree_handlers.js';

// #region Public Functions - File Data Loading
/**
 * Load unit test design file data
 */
export const loadFileData = async () => {
    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || !fileId) return;

    window.BaseUtils.showLoading();

    try {
        const fileData = await getUnitTestDesignFile(projectId, fileId);
        if (!fileData) return;

        setFileData(fileData);
        setSelectedClassId(null);
        setSelectedMethodId(null);

        let projectData = null;
        projectData = await getProject(projectId).catch(() => null);

        const newFileId = fileData.file_id || fileId;
        setFileId(newFileId);

        // Check if fileId (from URL) matches a unit_test_id in unit_test_designs
        // If yes, render unit_test_design_json instead of source_code
        let unitTestDesign = null;
        if (fileId && fileData?.unit_test_designs) {
            unitTestDesign = fileData.unit_test_designs.find(
                (utd) => utd.unit_test_id === fileId
            );
        }

        if (unitTestDesign) {
            // fileId is a unit_test_id - render unit_test_design_json
            console.log("[loadFileData] fileId is unit_test_id, rendering unit_test_design:", fileId);

            // Set state
            setCurrentUnitTestId(unitTestDesign.unit_test_id);
            setCurrentViewType('method');
            setIsEditorReadOnly(false); // Allow editing unit_test_design_json
            setHasUnsavedChanges(false);

            // Find method node if method_id exists
            let methodNode = null;
            let methodData = null;
            if (unitTestDesign.method_id) {
                const fileNode = buildFileNodeStructure(fileData, newFileId);
                if (fileNode) {
                    methodNode = findNodeInTree(fileNode, unitTestDesign.method_id);
                    if (methodNode && methodNode.method_data) {
                        methodData = methodNode.method_data;
                        setSelectedClassId(methodNode.class_id || null);
                        setSelectedMethodId(methodNode.id);
                        setSelectedMethodData(methodData);
                    }
                }
            }

            // Build preview data
            let previewData = {};
            const utdData = buildPreviewDataFromUnitTestDesign(unitTestDesign);
            if (Object.keys(utdData).length > 0) {
                Object.assign(previewData, utdData);
            }

            // Add PD preview data if method node exists
            if (methodNode && methodData) {
                const detailDesignData = getMethodDetailDesignData(methodNode, methodData, fileData);
                if (detailDesignData) {
                    const pdData = buildPreviewDataFromDetailDesign([detailDesignData]);
                    if (Object.keys(pdData).length > 0) {
                        Object.assign(previewData, pdData);
                    }
                }
            }

            // Render unit_test_design_json to editor
            const content = unitTestDesign.unit_test_design_json || "";
            renderHeader(fileData, projectData);
            renderCodeEditor(content, true); // Allow editing
            renderPreview(
                previewData && Object.keys(previewData).length > 0
                    ? previewData
                    : null
            );

            // Setup editor change listener to show save button on changes
            _setupEditorChangeListener();
        } else {
            // fileId is source_code_id - render source_code as default
            const content = fileData.source_code || fileData.content || "";
            renderHeader(fileData, projectData);
            renderCodeEditor(content);
            await renderPreview(content);
        }

        renderCodeTabContent(
            async (id) => await navigateToUTDFile(id, null),
            false
        );

        // Update tree active state if unit_test_design was rendered
        if (unitTestDesign && unitTestDesign.method_id) {
            setTimeout(() => {
                updateTreeActiveState();
            }, 300);
        }
    } catch {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Load Git files (all unit test design documents in the project)
 * @param {Function} navigateToFile - Navigate function
 */
export const loadGitFiles = async (navigateToFile) => {
    const projectId = getProjectId();
    if (!projectId) return;

    try {
        const files = await getUnitTestDesignDocumentsList(projectId);
        renderGitFileList(files || []);
        await updateGitBranchInfo(files || []);
    } catch {
        window.showAlert(RD_MESSAGES.GIT_FILES_LOAD_FAILED, "error");
        renderGitFileList([]);
    }
};
// #endregion

// #region Public Functions - Navigation
/**
 * Check for unsaved changes before navigation
 * @returns {Promise<boolean>} True if can navigate, false otherwise
 */
export const checkUnsavedChanges = async () => {
    try {
        const codeEditor = document.getElementById("rdCodeEditor");
        const codeContent = getCodeContent();

        if (codeEditor?.readOnly) {
            return true;
        }

        if (!codeEditor || codeEditor.value === codeContent) {
            return true;
        }

        return await window.confirm(
            RD_MESSAGES.UNSAVED_CHANGES_TITLE,
            RD_MESSAGES.UNSAVED_CHANGES_MESSAGE
        );
    } catch {
        return false;
    }
};

/**
 * Load file and project data for navigation
 * @param {string} projectId
 * @param {string} newFileId
 * @returns {Promise<{fileData: Object, projectData: Object|null}|null>}
 */
export const loadFileDataForNavigation = async (projectId, newFileId) => {
    if (!projectId || !newFileId) return null;

    try {
        const fileData = await getUnitTestDesignFile(projectId, newFileId);
        if (!fileData) return null;

        let projectData = null;
        projectData = await getProject(projectId).catch(() => null);

        return { fileData, projectData };
    } catch {
        return null;
    }
};

/**
 * Navigate to a different UTD file
 * @param {string} newFileId
 * @param {Function} navigateToFileCallback
 */
export const navigateToUTDFile = async (newFileId, navigateToFileCallback) => {
    const currentFileId = getFileId();
    const projectId = getProjectId();

    if (!newFileId || newFileId === currentFileId || !projectId) return;

    const canNavigate = await checkUnsavedChanges();
    if (!canNavigate) return;

    window.BaseUtils.showLoading();

    try {
        const result = await loadFileDataForNavigation(projectId, newFileId);
        if (!result?.fileData) return;

        const { fileData, projectData } = result;

        renderHeader(fileData, projectData);
        setSelectedClassId(null);
        setSelectedMethodId(null);

        const content = fileData.source_code || fileData.content || fileData.utd_content?.content || "";
        renderCodeEditor(content);
        renderPreview(content);

        window.history.pushState(
            { projectId, fileId: newFileId },
            "",
            `/projects/${projectId}/utd/${newFileId}`
        );

        setFileId(newFileId);
        setFileData(fileData);

        if (navigateToFileCallback) {
            renderCodeTabContent(navigateToFileCallback);
        }
    } catch {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};
// #endregion

// #region Public Functions - Code Tab Rendering
/**
 * Restore method selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID to restore
 * @param {string} classId - Class ID to restore
 */
const restoreMethodSelection = (fileNode, fileData, methodId, classId) => {
    if (!methodId || !fileNode) return;

    const methodNode = findNodeInTree(fileNode, methodId);
    if (!methodNode?.method_data) {
        setSelectedClassId(null);
        setSelectedMethodId(null);
        setSelectedMethodData(null);
        return;
    }

    setSelectedClassId(classId);
    setSelectedMethodId(methodId);
    setSelectedMethodData(methodNode.method_data);

    methodNode.file_data ??= fileData;
    if (!methodNode.class_id && classId) methodNode.class_id = classId;

    const structureListEl = document.getElementById("codeNavigatorList");
    if (structureListEl && classId) {
        const classItem = structureListEl.querySelector(`[data-node-id="${classId}"]`);
        const classNode = classItem?.closest(".structure-node");
        const childrenContainer = classNode?.querySelector(":scope > .structure-children");
        if (childrenContainer) {
            childrenContainer.style.display = "block";
            classItem.classList.add("expanded");
        }
    }

    setTimeout(() => {
        onMethodClick(methodNode, true, true);
        updateTreeActiveState();
    }, 0);
};

/**
 * Restore class selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} classId - Class ID to restore
 */
const restoreClassSelection = (fileNode, fileData, classId) => {
    if (!classId || !fileNode) return;

    const classNode = findNodeInTree(fileNode, classId);
    if (!classNode?.class_data) {
        setSelectedClassId(null);
        setSelectedMethodId(null);
        setSelectedMethodData(null);
        return;
    }

    setSelectedClassId(classId);
    setSelectedMethodId(null);
    setSelectedMethodData(null);

    classNode.file_data ??= fileData;

    setTimeout(() => {
        onClassClick(classNode, true, true);
        updateTreeActiveState();
    }, 0);
};

/**
 * Restore selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} classId - Previous class ID
 * @param {string} methodId - Previous method ID
 */
const restoreSelection = (fileNode, fileData, classId, methodId) => {
    if (!classId && !methodId) return;

    if (methodId) {
        addExpandedClass(classId);
        restoreMethodSelection(fileNode, fileData, methodId, classId);
    } else if (classId) {
        addExpandedClass(classId);
        restoreClassSelection(fileNode, fileData, classId);
    }
};

/**
 * Render Code tab content (current file with classes/functions)
 * @param {Function} navigateToFile - Navigate function
 * @param {boolean} preserveSelection - Preserve selection flag
 */
export const renderCodeTabContent = (navigateToFile, preserveSelection = true) => {
    console.log("[renderCodeTabContent] Start");

    try {
        const structureListEl = document.getElementById("codeNavigatorList");
        if (!structureListEl) {
            console.warn("[renderCodeTabContent] Structure list element not found");
            return;
        }

        const fileData = getFileData();
        const fileId = getFileId();

        if (!fileData || !fileId) {
            console.warn("[renderCodeTabContent] Missing fileData or fileId");
            structureListEl.innerHTML = `<p class="empty-state">${SRC_MESSAGES.NO_FILES_AVAILABLE}</p>`;
            return;
        }

        const previousSelectedClassId = getSelectedClassId();
        const previousSelectedMethodId = getSelectedMethodId();
        structureListEl.innerHTML = "";

        const fileNode = buildFileNodeStructure(fileData, fileId);
        if (!fileNode) {
            console.warn("[renderCodeTabContent] Failed to build file node structure");
            return;
        }

        const element = createTreeNodeElement(fileNode, navigateToFile, onFileClick, onClassClick, onMethodClick, true);
        if (element) {
            structureListEl.appendChild(element);
        }

        if (preserveSelection && (previousSelectedClassId || previousSelectedMethodId)) {
            requestAnimationFrame(() => {
                restoreSelection(fileNode, fileData, previousSelectedClassId, previousSelectedMethodId);
            });
        }

        console.log("[renderCodeTabContent] Success");
    } catch (error) {
        console.error("[renderCodeTabContent] Error:", error);
    }
};

// #region Private Functions - Editor Change Listener
/**
 * Setup editor change listener to show save button on changes
 */
const _setupEditorChangeListener = () => {
    const editor = document.getElementById("rdCodeEditor");
    if (!editor) return;

    // Remove existing listener if any
    if (editor._saveListener) {
        editor.removeEventListener("input", editor._saveListener);
    }

    const inputHandler = () => {
        const currentContent = editor.value || "";
        const originalContent = getCodeContent() || "";
        const hasChanged = currentContent !== originalContent;
        setHasUnsavedChanges(hasChanged);

        // Toggle save button visibility
        const saveBtn = document.getElementById("saveCodeBtn");
        if (saveBtn) {
            saveBtn.style.display = hasChanged ? "inline-block" : "none";
        }
    };

    editor.addEventListener("input", inputHandler);
    editor._saveListener = inputHandler;
};
// #endregion

