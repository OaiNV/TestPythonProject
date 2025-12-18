/**
 * Project Detail State Management
 * Centralized state management for project detail page
 */

// #region State Variables
const ProjectState = {
  // Project data
  projectData: null,
  currentProjectId: null,

  // Comments
  projectComments: [],
  currentCommentPage: 1,
  totalCommentPages: 1,
  isLoadingComments: false,
  isSendingComment: false,

  // Files
  requirementFiles: [],
  basicDesignFiles: [],
  selectedFileIds: [],

  // UI State
  currentTab: 'basicDesign',
  projectEventListenersInitialized: false,

  // Detail Design
  detailDesignData: {
    class: [],
    method: [],
    interface: [],
    folder: [],
    activityDiagram: []
  },

  // Sort State
  sortState: {
    requirement: { column: null, direction: 'asc' },
    basicDesign: { column: null, direction: 'asc' }
  }
};
// #endregion

// #region Getters
/**
 * Get current project ID
 * @returns {string|null} Current project ID
 */
const getProjectId = () => ProjectState.currentProjectId;

/**
 * Get current project data
 * @returns {Object|null} Project data
 */
const getProjectData = () => ProjectState.projectData;

/**
 * Get repository URL from project data
 * @returns {string|null} Repository URL or null if not found
 */
const getRepoUrl = () => {
  const projectData = ProjectState.projectData;
  return projectData?.git?.repository || null;
};

/**
 * Get selected file IDs
 * @returns {Array<string>} Array of selected file IDs
 */
const getSelectedFileIds = () => ProjectState.selectedFileIds;

/**
 * Get current tab
 * @returns {string} Current tab name
 */
const getCurrentTab = () => ProjectState.currentTab;

/**
 * Get requirement files
 * @returns {Array} Array of requirement files
 */
const getRequirementFiles = () => ProjectState.requirementFiles;

/**
 * Get basic design files
 * @returns {Array} Array of basic design files
 */
const getBasicDesignFiles = () => ProjectState.basicDesignFiles;

/**
 * Get comments
 * @returns {Array} Array of comments
 */
const getComments = () => ProjectState.projectComments;

/**
 * Get detail design data
 * @returns {Object} Detail design data object
 */
const getDetailDesignData = () => ProjectState.detailDesignData;
// #endregion

// #region Setters
/**
 * Set current project ID
 * @param {string} projectId - Project ID
 */
const setProjectId = (projectId) => {
  ProjectState.currentProjectId = projectId;
};

/**
 * Set project data
 * @param {Object} data - Project data
 */
const setProjectData = (data) => {
  ProjectState.projectData = data;
};

/**
 * Set requirement files
 * @param {Array} files - Array of files
 */
const setRequirementFiles = (files) => {
  ProjectState.requirementFiles = files || [];
};

/**
 * Set basic design files
 * @param {Array} files - Array of files
 */
const setBasicDesignFiles = (files) => {
  ProjectState.basicDesignFiles = files || [];
};

/**
 * Set selected file IDs
 * @param {Array<string>} fileIds - Array of file IDs
 */
const setSelectedFileIds = (fileIds) => {
  ProjectState.selectedFileIds = fileIds;
};

/**
 * Set current tab
 * @param {string} tabName - Tab name
 */
const setCurrentTab = (tabName) => {
  ProjectState.currentTab = tabName;
};

/**
 * Set comments
 * @param {Array} comments - Array of comments
 */
const setComments = (comments) => {
  ProjectState.projectComments = comments || [];
};

/**
 * Add comment to list
 * @param {Object} comment - Comment object
 */
const addComment = (comment) => {
  ProjectState.projectComments.push(comment);
};

/**
 * Prepend comments to list (for loading older comments)
 * @param {Array} comments - Array of comments
 */
const prependComments = (comments) => {
  ProjectState.projectComments = [...comments, ...ProjectState.projectComments];
};

/**
 * Set comment page info
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total pages
 */
const setCommentPageInfo = (currentPage, totalPages) => {
  ProjectState.currentCommentPage = currentPage;
  ProjectState.totalCommentPages = totalPages;
};

/**
 * Set loading comments flag
 * @param {boolean} isLoading - Loading state
 */
const setLoadingComments = (isLoading) => {
  ProjectState.isLoadingComments = isLoading;
};

/**
 * Set sending comment flag
 * @param {boolean} isSending - Sending state
 */
const setSendingComment = (isSending) => {
  ProjectState.isSendingComment = isSending;
};

/**
 * Set detail design data for specific section
 * @param {string} sectionType - Section type (class, method, interface, folder, activityDiagram  )
 * @param {Array} data - Data array
 */
const setDetailDesignData = (sectionType, data) => {
  if (ProjectState.detailDesignData[sectionType] !== undefined) {
    ProjectState.detailDesignData[sectionType] = data || [];
  }
};

/**
 * Check if event listeners are initialized
 * @returns {boolean} Initialization status
 */
const isEventListenersInitialized = () => ProjectState.projectEventListenersInitialized;

/**
 * Set event listeners initialization status
 * @param {boolean} status - Initialization status
 */
const setEventListenersInitialized = (status) => {
  ProjectState.projectEventListenersInitialized = status;
};

/**
 * Get sort state for table type
 * @param {string} type - Table type (requirement, basicDesign)
 * @returns {Object} Sort state object
 */
const getSortState = (type) => ProjectState.sortState[type];

/**
 * Set sort state for table type
 * @param {string} type - Table type
 * @param {string} column - Column name
 * @param {string} direction - Sort direction (asc/desc)
 */
const setSortState = (type, column, direction) => {
  if (ProjectState.sortState[type]) {
    ProjectState.sortState[type].column = column;
    ProjectState.sortState[type].direction = direction;
  }
};
// #endregion

// Export all state management functions
export {
  // Getters
  getProjectId,
  getProjectData,
  getRepoUrl,
  getSelectedFileIds,
  getCurrentTab,
  getRequirementFiles,
  getBasicDesignFiles,
  getComments,
  getDetailDesignData,
  getSortState,
  isEventListenersInitialized,

  // Setters
  setProjectId,
  setProjectData,
  setRequirementFiles,
  setBasicDesignFiles,
  setSelectedFileIds,
  setCurrentTab,
  setComments,
  addComment,
  prependComments,
  setCommentPageInfo,
  setLoadingComments,
  setSendingComment,
  setDetailDesignData,
  setEventListenersInitialized,
  setSortState,

  // Direct access to state (for complex operations)
  ProjectState
};

