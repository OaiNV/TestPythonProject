/**
 * Source Detail Data Loading Module
 * Handles all data loading functions
 */

import { SRC_MESSAGES } from '../../commons/error_messages.js';
import {
    getProjectId,
    getFileId,
    setFileData,
    setFileTree,
    setGitFiles,
    cacheFileData,
    setFileId,
    setHasUnsavedChanges,
    clearSelection,
} from './source_detail_state.js';
import { getSourceFile, getProject, getFileTree, getSourceFilesList } from './source_detail_api.js';
import { normalizeFileTreeData, parseCodeBasic } from './source_detail_helpers.js';
import {
    renderHeader,
    renderCodeEditor,
    renderPreview,
    renderCodeTabContent,
    renderFileTree,
    renderGitFileList,
    updateGitBranchInfo,
    onFileClick,
    onClassClick,
    onMethodClick,
} from './source_detail_ui.js';

// #region Private Functions - Helpers
/**
 * Detect language from file name
 * @param {string} fileName - File name
 * @returns {string} Language name
 */
const detectLanguageFromFileName = (fileName) => {
    if (!fileName) return "Python";
    if (fileName.endsWith(".java")) return "Java";
    if (fileName.endsWith(".cs")) return "Csharp";
    if (fileName.endsWith(".py")) return "Python";
    return "Python";
};

/**
 * Parse code if API doesn't have structure data
 * @param {Object} fileData - File data
 * @param {string} content - File content
 * @returns {Object} Updated file data
 */
const enrichFileDataWithParsedCode = (fileData, content) => {
    if (!fileData || !content) return fileData;

    const hasApiClasses = fileData.classes && fileData.classes.length > 0;
    const hasApiGlobalMethods = fileData.global_methods && fileData.global_methods.length > 0;

    if (hasApiClasses || hasApiGlobalMethods) {
        return fileData;
    }

    const fileName = fileData.file_name || "";
    const language = detectLanguageFromFileName(fileName);
    const parsed = parseCodeBasic(content, language);

    if (parsed.classes && parsed.classes.length > 0) {
        fileData.classes = parsed.classes;
    }
    if (parsed.global_methods && parsed.global_methods.length > 0) {
        fileData.global_methods = parsed.global_methods;
    }

    return fileData;
};

/**
 * Render file UI components
 * @param {Object} fileData - File data
 * @param {Object} projectData - Project data
 * @param {string} content - File content
 */
const renderFileUI = (fileData, projectData, content) => {
    renderHeader(fileData, projectData);
    renderCodeEditor(content);
    if (fileData.preview) {
        renderPreview(fileData.preview);
    }
};
// #endregion

// #region Public Functions - File Data Loading
/**
 * Load source code file data
 * @param {Function} renderCodeTabContent - Function to render code tab content
 */
export const loadFileData = async (renderCodeTabContent) => {
    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || !fileId) return;

    window.BaseUtils.showLoading();
    try {
        const [fileData, projectData] = await Promise.all([
            getSourceFile(projectId, fileId),
            getProject(projectId),
        ]);

        const content = fileData.source_code || fileData.content || "";
        const enrichedFileData = enrichFileDataWithParsedCode(fileData, content);

        setFileData(enrichedFileData);
        if (fileId) cacheFileData(fileId, enrichedFileData);

        clearSelection();
        renderFileUI(enrichedFileData, projectData, content);

        if (renderCodeTabContent) {
            const navigateToFile = (newFileId) => navigateToFile(newFileId);

            renderCodeTabContent(navigateToFile, onFileClick, onClassClick, onMethodClick);
        }
    } catch (error) {
        window.showAlert(SRC_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};
// #endregion

// #region Public Functions - File Tree Loading
/**
 * Load file tree and file list data
 * @param {Function} navigateToFile - Function to navigate to file
 */
export const loadFileTree = async (navigateToFile) => {
    const projectId = getProjectId();
    if (!projectId) return;

    try {
        const rawTreeData = await getFileTree(projectId);
        const normalizedTree = normalizeFileTreeData(rawTreeData);
        setFileTree(normalizedTree);
        renderFileTree(normalizedTree, navigateToFile, onFileClick, onClassClick, onMethodClick);
    } catch (error) {
        window.showAlert(SRC_MESSAGES.FILE_TREE_LOAD_FAILED, "error");
        renderFileTree([], navigateToFile, onFileClick, onClassClick, onMethodClick);
    }
};
// #endregion

// #region Public Functions - Git Files Loading
/**
 * Load Git files (all source code files in the project)
 */
export const loadGitFiles = async () => {
    const projectId = getProjectId();
    if (!projectId) return;

    try {
        const files = await getSourceFilesList(projectId);
        setGitFiles(files || []);
        renderGitFileList(files || []);
        await updateGitBranchInfo(files || []);
    } catch (error) {
        window.showAlert(SRC_MESSAGES.GIT_FILES_LOAD_FAILED, "error");
        renderGitFileList([]);
    }
};
// #endregion

// #region Public Functions - Tab Content Loading
/**
 * Load content for selected tab
 * @param {string} targetTab - Target tab ID
 * @param {Function} renderCodeTabContent - Function to render code tab content
 * @param {Function} loadGitFiles - Function to load git files
 * @param {Function} navigateToFile - Function to navigate to file
 */
export const loadTabContent = (targetTab, renderCodeTabContent, loadGitFiles, navigateToFile) => {
    if (targetTab === "tabContent-code") {
        if (!renderCodeTabContent) {
            return;
        }

        const navigateFn = navigateToFile || (async (newFileId) => {
            setFileId(newFileId);
            await loadFileData(renderCodeTabContent);
        });

        renderCodeTabContent(navigateFn, onFileClick, onClassClick, onMethodClick);
        return;
    }

    if (targetTab === "tabContent-git") {
        const projectId = getProjectId();
        if (projectId && loadGitFiles) {
            loadGitFiles();
        } else {
            renderGitFileList([]);
        }
    }
};
// #endregion
