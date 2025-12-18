/**
 * Project Detail - Detail Design Module
 * Handles detail design tab functionality
 */

import { ProjectAPI } from './project_detail_api.js';
import {
  getProjectId,
  setDetailDesignData,
  getDetailDesignData,
  ProjectState
} from './project_detail_state.js';
import { renderDetailDesignTable } from './project_detail_ui.js';
import { renderSidebarFileList } from '../commons/file_List.js';

// Constants - Section type to API type mapping
const SECTION_TYPE_MAP = {
  class: "CD", // クラス設計
  method: "MD", // メソッド設計
  interface: "ID", // インターフェース設計
  folder: "FS", // フォルダ構成
  activityDiagram: "AC", // アクティビティ図
};

// Cache for detail design data
let detailDesignCache = null;
let cachedProjectId = null;

// Flag to track if tab has been initialized (clicked)
let isDetailDesignTabInitialized = false;

// Store checkbox states for each section
// Format: { sectionType: { fileId: true/false } }
let checkboxStates = {
  class: {},
  method: {},
  interface: {},
  folder: {},
  activityDiagram: {}
};

// #region Load Detail Design Files
/**
 * Load files for specific detail design section
 * @param {string} projectId - Project ID
 * @param {string} sectionType - Section type (class, method, interface, folder, activityDiagram)
 */
const loadDetailDesignFiles = async (projectId, sectionType) => {
  console.log(`[DetailDesign] Loading files for section: ${sectionType}`);

  if (!projectId) {
    console.warning("[DetailDesign] Missing project_id input");
    setDetailDesignData(sectionType, []);
    renderDetailDesignTable(sectionType, []);
    return;
  }

  try {
    const apiType = SECTION_TYPE_MAP[sectionType];
    if (!apiType) {
      console.error(`[DetailDesign] Invalid section type: ${sectionType}`);
      setDetailDesignData(sectionType, []);
      renderDetailDesignTable(sectionType, []);
      return;
    }

    let allDetailDesigns = [];

    // Reuse cached data if projectId matches
    if (detailDesignCache && cachedProjectId === projectId) {
      console.log(`[DetailDesign] Using cached data for project: ${projectId}`);
      allDetailDesigns = detailDesignCache;
    } else {
      console.log(`[DetailDesign] Fetching data from API for project: ${projectId}`);
      const response = await ProjectAPI.getDetailDesign(projectId);
      allDetailDesigns = response.data?.detail_design_list || [];

      renderSidebarFileList('fileList', allDetailDesigns, true);

      // Update cache
      detailDesignCache = allDetailDesigns;
      cachedProjectId = projectId;
    }

    const filteredList = allDetailDesigns.filter(item => item.type === apiType);

    const listData = filteredList.map(item => ({
      id: item.id,
      file_name: item.file_name,
      commit_id: item.commit_id || "",
      sync_status: item.sync_status || "",
      status: item.status || "",
      updated_at: item.updated_at,
      created_at: item.created_at,
    }));

    setDetailDesignData(sectionType, listData);
    renderDetailDesignTable(sectionType, listData);

    restoreCheckboxStates(sectionType);

    console.log(
      `[DetailDesign] Loaded ${listData.length} files for ${sectionType} (type: ${apiType})`
    );
  } catch (error) {
    console.error(`[DetailDesign] Error loading ${sectionType} files:`, error);
    setDetailDesignData(sectionType, []);
    renderDetailDesignTable(sectionType, []);
  }
};
// #endregion

// #region Detail Design Navigation
/**
 * Setup navigation for Detail Design tab
 * Handles switching between クラス設計, メソッド設計, インターフェース設計, フォルダ構成, アクティビティ図
 */
const setupDetailDesignNavigation = () => {
  console.log('[DetailDesign] Setup navigation');

  try {
    const navButtons = document.querySelectorAll('.detail-design-nav-btn');
    const sections = document.querySelectorAll('.detail-design-section');

    if (navButtons.length === 0 || sections.length === 0) {
      console.log('[DetailDesign] Navigation elements not found, skipping setup');
      return;
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        handleDetailDesignNavClick(btn, navButtons, sections);
      });
    });

    console.log('[DetailDesign] Navigation setup complete');

  } catch (error) {
    console.error('[setupDetailDesignNavigation] Error:', error);
  }
};

/**
 * Handle detail design navigation button click
 * @param {HTMLElement} btn - Clicked button
 * @param {NodeList} navButtons - All navigation buttons
 * @param {NodeList} sections - All section elements
 */
const handleDetailDesignNavClick = (btn, navButtons, sections) => {
  try {
    const sectionId = btn.dataset.section;

    // Remove active class from all buttons
    navButtons.forEach(b => b.classList.remove('active'));

    // Add active class to clicked button
    btn.classList.add('active');

    // Hide all sections
    sections.forEach(s => s.classList.remove('active'));

    // Uncheck all "Select All" checkboxes when switching sections
    const selectAllCheckboxIds = [
      'selectAllCheckboxClass',
      'selectAllCheckboxMethod',
      'selectAllCheckboxInterface',
      'selectAllCheckboxFolder',
      'selectAllCheckboxActivityDiagram'
    ];

    selectAllCheckboxIds.forEach(checkboxId => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    // Show selected section
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
      targetSection.classList.add('active');
      console.log(`[DetailDesign] Switched to section: ${sectionId}`);

      // Load data for this section (cache will be used if available)
      const projectId = getProjectId();
      if (projectId) {
        loadDetailDesignFiles(projectId, sectionId);
      }
    }
  } catch (error) {
    console.error('[handleDetailDesignNavClick] Error:', error);
  }
};
// #endregion

// #region Initialize Detail Design Tab
/**
 * Initialize all detail design sections
 * @param {string} projectId - Project ID
 */
const initDetailDesignTab = async (projectId) => {
  console.log('[DetailDesign] Initializing all sections');

  try {
    // Check if tab has been initialized before
    if (!isDetailDesignTabInitialized) {
      isDetailDesignTabInitialized = true;
    }

    // Always reload data when clicking on tab to get latest data
    // Find active section or default to 'class'
    const activeSection = document.querySelector('.detail-design-section.active');
    let sectionType = 'class'; // Default section

    if (activeSection) {
      const sectionId = activeSection.id.replace('section-', '');
      sectionType = sectionId;
      console.log(`[DetailDesign] Found active section: ${sectionType}`);
    } else {
      console.log('[DetailDesign] No active section found, defaulting to class');
    }

    // Clear cache to force reload from API
    clearDetailDesignCache();

    // Load data for active section
    loadDetailDesignFiles(projectId, sectionType);

  } catch (error) {
    console.error('[initDetailDesignTab] Error:', error);
  }
};

/**
 * Clear detail design cache to force reload from API
 */
const clearDetailDesignCache = () => {
  console.log('[DetailDesign] Clearing cache');
  detailDesignCache = null;
  cachedProjectId = null;
};
// #endregion

// #region Checkbox State Management
/**
 * Save checkbox state for a specific file in a section
 * @param {string} sectionType - Section type
 * @param {string} fileId - File ID
 * @param {boolean} checked - Checkbox checked state
 */
const saveCheckboxState = (sectionType, fileId, checked) => {
  if (!checkboxStates[sectionType]) {
    checkboxStates[sectionType] = {};
  }
  checkboxStates[sectionType][fileId] = checked;
  console.log(`[DetailDesign] Saved checkbox state - section: ${sectionType}, fileId: ${fileId}, checked: ${checked}`);
};

/**
 * Restore checkbox states for a specific section
 * @param {string} sectionType - Section type
 */
const restoreCheckboxStates = (sectionType) => {
  console.log(`[DetailDesign] Restoring checkbox states for section: ${sectionType}`);

  const savedStates = checkboxStates[sectionType] || {};
  const tbody = document.querySelector(`#section-${sectionType} tbody`);

  if (!tbody) {
    console.log(`[DetailDesign] Tbody not found for section: ${sectionType}`);
    return;
  }

  // Restore individual file checkboxes
  Object.keys(savedStates).forEach(fileId => {
    const checkbox = tbody.querySelector(`.file-checkbox[data-file-id="${fileId}"]`);
    if (checkbox) {
      checkbox.checked = savedStates[fileId];
    }
  });

  // Update "Select All" checkbox state
  updateSelectAllCheckbox(sectionType, tbody);

  // Setup listeners for newly rendered checkboxes
  setupCheckboxStateListeners(sectionType);

  console.log(`[DetailDesign] Restored ${Object.keys(savedStates).length} checkbox states`);
};

/**
 * Update "Select All" checkbox based on individual checkbox states
 * @param {string} sectionType - Section type
 * @param {HTMLElement} tbody - Table body element
 */
const updateSelectAllCheckbox = (sectionType, tbody) => {
  const selectAllCheckboxMap = {
    class: 'selectAllCheckboxClass',
    method: 'selectAllCheckboxMethod',
    interface: 'selectAllCheckboxInterface',
    folder: 'selectAllCheckboxFolder',
    activityDiagram: 'selectAllCheckboxActivityDiagram'
  };

  const selectAllCheckboxId = selectAllCheckboxMap[sectionType];
  if (!selectAllCheckboxId) return;

  const selectAllCheckbox = document.getElementById(selectAllCheckboxId);
  if (!selectAllCheckbox) return;

  const allCheckboxes = tbody.querySelectorAll('.file-checkbox');
  const checkedCheckboxes = tbody.querySelectorAll('.file-checkbox:checked');

  selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
};

/**
 * Setup checkbox change listeners to save states
 * @param {string} sectionType - Section type
 */
const setupCheckboxStateListeners = (sectionType) => {
  const tbody = document.querySelector(`#section-${sectionType} tbody`);
  if (!tbody) return;

  // Listen for checkbox changes
  const checkboxes = tbody.querySelectorAll('.file-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fileId = e.target.dataset.fileId;
      const checked = e.target.checked;
      if (fileId) {
        saveCheckboxState(sectionType, fileId, checked);
      }
    });
  });

  console.log(`[DetailDesign] Setup ${checkboxes.length} checkbox listeners for section: ${sectionType}`);
};

/**
 * Clear checkbox states for a specific section or all sections
 * @param {string} sectionType - Section type (optional, clears all if not provided)
 */
const clearCheckboxStates = (sectionType = null) => {
  if (sectionType) {
    checkboxStates[sectionType] = {};
    console.log(`[DetailDesign] Cleared checkbox states for section: ${sectionType}`);
  } else {
    checkboxStates = {
      class: {},
      method: {},
      interface: {},
      folder: {},
      activityDiagram: {}
    };
    console.log('[DetailDesign] Cleared all checkbox states');
  }
};

/**
 * Get selected file IDs from checkbox states for a specific section
 * @param {string} sectionType - Section type (class, method, interface, folder, activityDiagram)
 * @returns {Array<string>} Array of selected file IDs
 */
const getSelectedFileIdsFromCheckboxStates = (sectionType) => {
  console.log(`[DetailDesign] Getting selected file IDs for section: ${sectionType}`);

  const savedStates = checkboxStates[sectionType] || {};
  const selectedFileIds = [];

  // Get all file IDs that are checked (value is true)
  Object.keys(savedStates).forEach(fileId => {
    if (savedStates[fileId] === true) {
      selectedFileIds.push(fileId);
    }
  });

  console.log(`[DetailDesign] Found ${selectedFileIds.length} selected file IDs in section: ${sectionType}`);
  return selectedFileIds;
};

/**
 * Get all selected file IDs from all detail design sections
 * @returns {Array<string>} Array of all selected file IDs across all sections
 */
const getAllSelectedFileIdsFromCheckboxStates = () => {
  console.log('[DetailDesign] Getting all selected file IDs from all sections');

  const allSelectedFileIds = [];
  const sections = ['class', 'method', 'interface', 'folder', 'activityDiagram'];

  sections.forEach(sectionType => {
    const sectionFileIds = getSelectedFileIdsFromCheckboxStates(sectionType);
    allSelectedFileIds.push(...sectionFileIds);
  });

  console.log(`[DetailDesign] Total selected file IDs across all sections: ${allSelectedFileIds.length}`);
  return allSelectedFileIds;
};

/**
 * Handle select all checkbox for a specific section and update checkbox states
 * @param {boolean} isChecked - Whether the checkboxes should be checked or unchecked
 * @param {string} sectionType - Section type (class, method, interface, folder, activityDiagram)
 */
const handleSelectAllForSection = (isChecked, sectionType) => {
  console.log(`[DetailDesign] handleSelectAllForSection - sectionType: ${sectionType}, isChecked: ${isChecked}`);

  const tbody = document.querySelector(`#section-${sectionType} tbody`);
  if (!tbody) {
    console.warn(`[DetailDesign] Tbody not found for section: ${sectionType}`);
    return;
  }

  // Get all checkboxes in this section
  const checkboxes = tbody.querySelectorAll('.file-checkbox:not([disabled])');

  // Update DOM and checkbox states
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    const fileId = checkbox.dataset.fileId;
    if (fileId) {
      saveCheckboxState(sectionType, fileId, isChecked);
    }
  });
};
// #endregion

// Export detail design functions
export {
  loadDetailDesignFiles,
  setupDetailDesignNavigation,
  handleDetailDesignNavClick,
  initDetailDesignTab,
  clearDetailDesignCache,
  saveCheckboxState,
  restoreCheckboxStates,
  clearCheckboxStates,
  getSelectedFileIdsFromCheckboxStates,
  getAllSelectedFileIdsFromCheckboxStates,
  handleSelectAllForSection,
};
