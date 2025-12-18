/**
 * Unit Test Design Detail State Management
 * Manages state and constants for unit test design detail page
 */

// #region Constants
export const PARSE_DEBOUNCE_MS = 500;
export const COLLECTION_NAME_UTD = "unit_test_design";
export const UTD_CONFIG = {
    API_BASE_URL: "/api",
    PROJECTS_ENDPOINT: "/projects",
    TIMEOUT: 30000,
};
// #endregion

// #region State Management
let utdState = {
    projectId: null,
    fileId: null,
    fileData: null,
    syncStatus: "",
    codeContent: "",
    previewContent: "",
    isCodeExpanded: false,
    isPreviewExpanded: false,
    gitFiles: [],
    expandListenersAttached: false,
    selectedClassId: null,
    selectedMethodId: null,
    selectedMethodData: null,
    hasUnsavedChanges: false,
    isEditorReadOnly: false,
    currentViewType: null,
    originalContent: "",
};

let expandedClasses = new Set();
let expandedFolders = new Set();
let currentUnitTestId = null;

export const setCurrentUnitTestId = (id) => {
    currentUnitTestId = id;
};

export const getCurrentUnitTestId = () => {
    return currentUnitTestId;
};
// #region State Getters
export const getState = () => utdState;

export const getProjectId = () => utdState.projectId;

export const getFileId = () => utdState.fileId;

export const getFileData = () => utdState.fileData;

export const getCodeContent = () => utdState.codeContent;

export const getPreviewContent = () => utdState.previewContent;

export const getSyncStatus = () => utdState.syncStatus;

export const isCodeExpanded = () => utdState.isCodeExpanded;

export const isPreviewExpanded = () => utdState.isPreviewExpanded;

export const getGitFiles = () => utdState.gitFiles;

export const areExpandListenersAttached = () => utdState.expandListenersAttached;

export const getSelectedClassId = () => utdState.selectedClassId;

export const getSelectedMethodId = () => utdState.selectedMethodId;

export const getSelectedMethodData = () => utdState.selectedMethodData;

export const getExpandedClasses = () => expandedClasses;

export const getExpandedFolders = () => expandedFolders;
// #endregion

// #region State Setters
export const setProjectId = (projectId) => {
    utdState.projectId = projectId;
};

export const setFileId = (fileId) => {
    utdState.fileId = fileId;
};

export const setFileData = (fileData) => {
    utdState.fileData = fileData;
};

export const setCodeContent = (content) => {
    utdState.codeContent = content;
};

export const setPreviewContent = (content) => {
    utdState.previewContent = content;
};

export const setSyncStatus = (status) => {
    utdState.syncStatus = status;
};

export const setIsCodeExpanded = (expanded) => {
    utdState.isCodeExpanded = expanded;
};

export const setIsPreviewExpanded = (expanded) => {
    utdState.isPreviewExpanded = expanded;
};

export const setGitFiles = (files) => {
    utdState.gitFiles = files;
};

export const setExpandListenersAttached = (attached) => {
    utdState.expandListenersAttached = attached;
};

export const setSelectedClassId = (id) => {
    utdState.selectedClassId = id;
};

export const setSelectedMethodId = (id) => {
    utdState.selectedMethodId = id;
};

export const setSelectedMethodData = (data) => {
    utdState.selectedMethodData = data;
};

export const clearSelection = () => {
    utdState.selectedClassId = null;
    utdState.selectedMethodId = null;
    utdState.selectedMethodData = null;
};

export const addExpandedClass = (classId) => {
    console.log(`[addExpandedClass] Start - classId=${classId}`);
    expandedClasses.add(classId);
    console.log("[addExpandedClass] Success");
};

export const removeExpandedClass = (classId) => {
    console.log(`[removeExpandedClass] Start - classId=${classId}`);
    expandedClasses.delete(classId);
    console.log("[removeExpandedClass] Success");
};

export const addExpandedFolder = (folderId) => {
    console.log(`[addExpandedFolder] Start - folderId=${folderId}`);
    expandedFolders.add(folderId);
    console.log("[addExpandedFolder] Success");
};

export const removeExpandedFolder = (folderId) => {
    console.log(`[removeExpandedFolder] Start - folderId=${folderId}`);
    expandedFolders.delete(folderId);
    console.log("[removeExpandedFolder] Success");
};

export const getHasUnsavedChanges = () => utdState.hasUnsavedChanges;
export const setHasUnsavedChanges = (hasChanges) => {
    utdState.hasUnsavedChanges = hasChanges;
};
export const getIsEditorReadOnly = () => utdState.isEditorReadOnly;
export const setIsEditorReadOnly = (isReadOnly) => {
    utdState.isEditorReadOnly = isReadOnly;
};

export const getCurrentViewType = () => utdState.currentViewType;
export const setCurrentViewType = (viewType) => {
    utdState.currentViewType = viewType;
};
export const getOriginalContent = () => utdState.originalContent;
export const setOriginalContent = (content) => {
    utdState.originalContent = content;
};
// #endregion

