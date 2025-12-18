/**
 * UTC State Management
 * Manages the global state for unit test code detail page
 */

// #region Constants
export const PARSE_DEBOUNCE_MS = 500;
export const COLLECTION_NAME_UTC = "unit_test_code";
export const UTC_CONFIG = {
    API_BASE_URL: "/api",
    PROJECTS_ENDPOINT: "/projects",
    TIMEOUT: 30000,
};
export const UT_CONTENT_DELIMITER = "\n\n# ===== UNIT TEST CODE =====\n\n";
// #endregion

// #region State
let utcState = {
    projectId: null,
    fileId: null,
    fileData: null,
    syncStatus: "",
    codeContent: "",
    gitFiles: [],
    isEditorReadOnly: false, // Track if editor is in read-only mode
    currentViewType: null, // Track current view: 'method', 'class', 'file'
    originalContent: "", // Track original content to detect changes
    hasUnsavedChanges: false, // Track if there are unsaved changes
    selectedClassId: null,
    selectedMethodId: null,
    selectedMethodData: null,
};
// #endregion

// #region State Getters and Setters
export const getState = () => utcState;

export const setState = (updates) => {
    utcState = { ...utcState, ...updates };
};

export const getProjectId = () => utcState.projectId;
export const setProjectId = (projectId) => {
    utcState.projectId = projectId;
};

export const getFileId = () => utcState.fileId;
export const setFileId = (fileId) => {
    utcState.fileId = fileId;
};

export const getFileData = () => utcState.fileData;
export const setFileData = (fileData) => {
    utcState.fileData = fileData;
};

export const getSyncStatus = () => utcState.syncStatus;
export const setSyncStatus = (syncStatus) => {
    utcState.syncStatus = syncStatus;
};

export const getCodeContent = () => utcState.codeContent;
export const setCodeContent = (codeContent) => {
    utcState.codeContent = codeContent;
};

export const getGitFiles = () => utcState.gitFiles;
export const setGitFiles = (gitFiles) => {
    utcState.gitFiles = gitFiles;
};

export const getIsEditorReadOnly = () => utcState.isEditorReadOnly;
export const setIsEditorReadOnly = (isReadOnly) => {
    utcState.isEditorReadOnly = isReadOnly;
};

export const getCurrentViewType = () => utcState.currentViewType;
export const setCurrentViewType = (viewType) => {
    utcState.currentViewType = viewType;
};

export const getOriginalContent = () => utcState.originalContent;
export const setOriginalContent = (content) => {
    utcState.originalContent = content;
};

export const getHasUnsavedChanges = () => utcState.hasUnsavedChanges;
export const setHasUnsavedChanges = (hasChanges) => {
    utcState.hasUnsavedChanges = hasChanges;
};

export const getSelectedClassId = () => utcState.selectedClassId;
export const setSelectedClassId = (classId) => {
    utcState.selectedClassId = classId;
};

export const getSelectedMethodId = () => utcState.selectedMethodId;
export const setSelectedMethodId = (methodId) => {
    utcState.selectedMethodId = methodId;
};

export const getSelectedMethodData = () => utcState.selectedMethodData;
export const setSelectedMethodData = (methodData) => {
    utcState.selectedMethodData = methodData;
};
// #endregion