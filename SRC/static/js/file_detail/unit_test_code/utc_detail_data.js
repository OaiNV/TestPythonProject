/**
 * UTC Data Loading Functions
 * Handles data loading and processing for unit test code
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { getUnitTestCodeFile, getProject, getUnitTestCodeDocumentsList } from './utc_detail_api.js';
import { renderHeader, renderCodeEditor, renderGitFileList } from './utc_detail_ui.js';
import { renderCodeTabContent } from './utc_detail_tree_handlers.js';
import { injectUnitTestContentIntoSymbols } from './utc_detail_helpers.js';
import { updateGitBranchInfo } from './utc_detail_git.js';
import {
    getProjectId,
    getFileId,
    setFileId,
    setFileData,
    setSyncStatus,
    setGitFiles,
    setIsEditorReadOnly,
    setCurrentViewType,
    setHasUnsavedChanges,
    setSelectedClassId,
    setSelectedMethodId,
    setSelectedMethodData,
    getCodeContent
} from './utc_detail_state.js';

/**
 * Validate file data inputs
 */
export const validateFileDataInputs = () => {
    return !!(getProjectId() && getFileId());
};

/**
 * Load and process file data
 */
export const loadAndProcessFileData = async () => {
    const fileData = await getUnitTestCodeFile(getProjectId(), getFileId());
    if (!fileData) return null;

    injectUnitTestContentIntoSymbols(fileData);
    setFileData(fileData);
    setSyncStatus(fileData.sync_status || "");

    return fileData;
};

/**
 * Load project data safely with error handling
 */
export const loadProjectDataSafely = async () => {
    try {
        return await getProject(getProjectId());
    } catch {
        // Fail silently, returning null if project cannot be loaded
        return null;
    }
};

/**
 * Render file data UI components
 */
export const renderFileDataUI = (fileData, projectData, navigateToFile) => {
    renderHeader(fileData, projectData);

    const content = fileData.unit_test_code || fileData.ut_code_content || fileData.content || "";
    renderCodeEditor(content, false);

    renderCodeTabContent(navigateToFile);
};

/**
 * Load unit test code file data
 */
export const loadFileData = async (navigateToFile) => {
    if (!validateFileDataInputs()) return;

    window.BaseUtils.showLoading();

    try {
        const fileId = getFileId();
        const fileData = await loadAndProcessFileData();
        if (!fileData) return;

        const projectData = await loadProjectDataSafely();
        
        // Check if fileId (from URL) matches a unit_test_id in unit_test_codes
        // If yes, render unit_test_code instead of source_code
        let unitTestCode = null;
        if (fileId && fileData?.unit_test_codes) {
            unitTestCode = fileData.unit_test_codes.find(
                (utc) => utc.unit_test_id === fileId
            );
        }

        if (unitTestCode) {
            // fileId is a unit_test_id - keep it in state for saving
            // Don't change to source_code_id, so save will use unit_test_id
            console.log("[loadFileData] fileId is unit_test_id, rendering unit_test_code:", fileId);
            
            // Set state - keep fileId as unit_test_id for saving
            setFileId(fileId); // Keep unit_test_id, don't change to source_code_id
            setCurrentViewType('method');
            setIsEditorReadOnly(false); // Allow editing unit_test_code
            setHasUnsavedChanges(false);

            // Find method node if method_id exists
            if (unitTestCode.method_id) {
                setSelectedMethodId(unitTestCode.method_id);
                setSelectedClassId(unitTestCode.class_id || null);
                
                // Find method data from fileData structure
                let methodData = null;
                if (unitTestCode.class_id) {
                    const cls = fileData.classes?.find(c => c.class_id === unitTestCode.class_id);
                    if (cls) {
                        methodData = cls.methods?.find(m => m.method_id === unitTestCode.method_id);
                    }
                } else {
                    methodData = fileData.global_methods?.find(m => m.method_id === unitTestCode.method_id);
                }
                if (methodData) {
                    setSelectedMethodData(methodData);
                }
            }

            // Render unit_test_code to editor
            const content = unitTestCode.unit_test_code || unitTestCode.ut_code_content || "";
            renderHeader(fileData, projectData);
            renderCodeEditor(content, false); // Allow editing
            
            // Setup editor change listener to show save button on changes
            _setupEditorChangeListener();
        } else {
            // fileId is source_code_id - update to newFileId if different
            const newFileId = fileData.file_id || fileId;
            setFileId(newFileId);
            // Render source_code as default
        renderFileDataUI(fileData, projectData, navigateToFile);
        }

        renderCodeTabContent(navigateToFile);
    } catch (error) {
        window.showAlert(RD_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Load Git files (all unit test code documents in the project)
 */
export const loadGitFiles = async (navigateToFile) => {
    if (!getProjectId()) return;

    try {
        const files = await getUnitTestCodeDocumentsList(getProjectId());
        setGitFiles(files || []);
        renderGitFileList(files || []);
        await updateGitBranchInfo(files || []);
    } catch {
        window.showAlert(RD_MESSAGES.GIT_FILES_LOAD_FAILED, "error");
        renderGitFileList([]);
    }
};

/**
 * Load file data for navigation
 */
export const loadFileDataForNavigation = async (newFileId) => {
    try {
        const fileData = await getUnitTestCodeFile(getProjectId(), newFileId);
        if (!fileData) return null;

        injectUnitTestContentIntoSymbols(fileData);
        const projectData = await loadProjectDataSafely();

        return { fileData, projectData };
    } catch (error) {
        throw error;
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
