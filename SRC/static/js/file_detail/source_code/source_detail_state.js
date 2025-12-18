/**
 * Source Detail State Management
 * Manages state and constants for source detail page
 */

// #region Constants
export const SRC_CONFIG = {
    API_BASE_URL: "/api",
    PROJECTS_ENDPOINT: "/projects",
    TIMEOUT: 30000,
};
// #endregion

// #region State Management
let srcState = {
    projectId: null,
    fileId: null,
    fileData: null,
    codeContent: "",
    originalContent: "",
    hasUnsavedChanges: false,
    fileTree: [],
    gitFiles: [],
    currentTab: "code",
    currentPreviewTab: "pd",
    isCodeExpanded: false,
    isPreviewExpanded: false,
    expandListenersAttached: false,
    fileDataCache: {}, // Cache for file data (fileId -> fileData) to show classes/methods for all files
    codeInputDebounceTimer: null, // Timer for debouncing code input
    expandedFolders: null, // Set of expanded folder IDs
    selectedClassId: null, // Currently selected class ID
    selectedMethodId: null, // Currently selected method ID
    selectedMethodData: null, // Currently selected method data (for unit_test)
};

// #region State Getters
export const getState = () => srcState;

export const getProjectId = () => srcState.projectId;

export const getFileId = () => srcState.fileId;

export const getFileData = () => srcState.fileData;

export const getCodeContent = () => srcState.codeContent;

export const getOriginalContent = () => srcState.originalContent;

export const hasUnsavedChanges = () => srcState.hasUnsavedChanges;

export const getFileTree = () => srcState.fileTree;

export const getGitFiles = () => srcState.gitFiles;

export const getCurrentTab = () => srcState.currentTab;

export const getCurrentPreviewTab = () => srcState.currentPreviewTab;

export const isCodeExpanded = () => srcState.isCodeExpanded;

export const isPreviewExpanded = () => srcState.isPreviewExpanded;

export const areExpandListenersAttached = () => srcState.expandListenersAttached;

export const getFileDataCache = () => srcState.fileDataCache;

export const getCodeInputDebounceTimer = () => srcState.codeInputDebounceTimer;

export const getExpandedFolders = () => srcState.expandedFolders;

export const getSelectedClassId = () => srcState.selectedClassId;

export const getSelectedMethodId = () => srcState.selectedMethodId;

export const getSelectedMethodData = () => srcState.selectedMethodData;
// #endregion

// #region State Setters
export const setProjectId = (projectId) => {
    srcState.projectId = projectId;
};

export const setFileId = (fileId) => {
    srcState.fileId = fileId;
};

export const setFileData = (fileData) => {
    srcState.fileData = fileData;
};

export const setCodeContent = (content) => {
    srcState.codeContent = content;
};

export const setOriginalContent = (content) => {
    srcState.originalContent = content;
};

export const setHasUnsavedChanges = (hasChanges) => {
    srcState.hasUnsavedChanges = hasChanges;
};

export const setFileTree = (tree) => {
    srcState.fileTree = tree;
};

export const setGitFiles = (files) => {
    srcState.gitFiles = files;
};

export const setCurrentTab = (tab) => {
    srcState.currentTab = tab;
};

export const setCurrentPreviewTab = (tab) => {
    srcState.currentPreviewTab = tab;
};

export const setIsCodeExpanded = (expanded) => {
    srcState.isCodeExpanded = expanded;
};

export const setIsPreviewExpanded = (expanded) => {
    srcState.isPreviewExpanded = expanded;
};

export const setExpandListenersAttached = (attached) => {
    srcState.expandListenersAttached = attached;
};

export const setCodeInputDebounceTimer = (timer) => {
    srcState.codeInputDebounceTimer = timer;
};

export const setExpandedFolders = (folders) => {
    srcState.expandedFolders = folders;
};

export const addExpandedFolder = (folderId) => {
    if (!srcState.expandedFolders) {
        srcState.expandedFolders = new Set();
    }
    srcState.expandedFolders.add(folderId);
};

export const removeExpandedFolder = (folderId) => {
    if (srcState.expandedFolders) {
        srcState.expandedFolders.delete(folderId);
    }
};

export const cacheFileData = (fileId, fileData) => {
    if (fileId) {
        srcState.fileDataCache[fileId] = fileData;
    }
};

export const setSelectedClassId = (classId) => {
    srcState.selectedClassId = classId;
};

export const setSelectedMethodId = (methodId) => {
    srcState.selectedMethodId = methodId;
};

export const setSelectedMethodData = (methodData) => {
    srcState.selectedMethodData = methodData;
};

export const clearSelection = () => {
    srcState.selectedClassId = null;
    srcState.selectedMethodId = null;
    srcState.selectedMethodData = null;
};
// #endregion
