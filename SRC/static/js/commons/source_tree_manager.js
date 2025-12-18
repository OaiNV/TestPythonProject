/**
 * Source Tree Manager Module
 * Reusable component for handling folder tree and file list UI
 * Can be used across multiple tabs/screens
 */

// import { showAlert, showLoading, hideLoading } from '../project_detail/project_detail_ui.js';
import { SourceTreeManager as FileListSourceTreeManager } from './file_List.js';

/**
 * SourceTreeManager Class
 * Manages a single instance of folder tree + file list
 */
export class SourceTreeManager {
  constructor(config) {
    // Required DOM element IDs
    this.treeId = config.treeId;
    this.headerId = config.headerId;
    this.pathId = config.pathId;
    this.listId = config.listId;

    // Optional configuration
    this.onFolderSelect = config.onFolderSelect || null;
    this.onFileView = config.onFileView || null;
    this.customFileRowBuilder = config.customFileRowBuilder || null;
    this.customSubfolderRowBuilder = config.customSubfolderRowBuilder || null;

    // Internal state
    this.folderTreeData = [];
    this.currentFiles = [];
    this.currentSelectedFolder = null;
    this.expandedFolders = new Set(); // Track expanded folder IDs

    // Selection state - track selected files and folders
    this.selectedFileIds = new Set();
    this.selectedFolderIds = new Set();

    console.log('[SourceTreeManager] Initialized with config:', config);
  }

  // #region Public API Methods

  /**
   * Load and render folder tree + files data
   * @param {Array} folders - Array of folder objects
   * @param {Array} files - Array of file objects
   */
  loadData(folders, files) {
    console.log('[SourceTreeManager.loadData] folders:', folders?.length, 'files:', files?.length);

    this.folderTreeData = folders || [];
    this.currentFiles = files || [];

    this.renderTree(this.folderTreeData);
  }

  /**
   * Load files in a specific folder
   * @param {string} folderId - Folder ID
   */
  loadFolder(folderId) {
    console.log('[SourceTreeManager.loadFolder] folderId:', folderId);

    if (!folderId) {
      console.error('[SourceTreeManager.loadFolder] Missing folder ID');
      return;
    }

    try {
      // Filter subfolders by parent_folder_id
      const subfolders = this.folderTreeData.filter(
        folder => folder.parent_folder_id === folderId
      );

      // Filter files by folder_id
      const filteredFiles = this.currentFiles.filter(
        file => file.folder_id === folderId
      );

      // Sort alphabetically
      const sortedSubfolders = this._sortByName(subfolders, 'folder_name');
      const sortedFiles = this._sortByName(filteredFiles, 'file_name');

      this.currentSelectedFolder = folderId;
      this.renderFileList(sortedSubfolders, sortedFiles, folderId);

      console.log('[SourceTreeManager.loadFolder] Success');
    } catch (error) {
      console.error('[SourceTreeManager.loadFolder] Error:', error);
      showAlert('Failed to load folder contents', 'error');
    }
  }

  /**
   * Refresh current view
   */
  refresh() {
    console.log('[SourceTreeManager.refresh] Start');

    this.renderTree(this.folderTreeData);

    if (this.currentSelectedFolder) {
      this.loadFolder(this.currentSelectedFolder);
    }

    console.log('[SourceTreeManager.refresh] Complete');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentSelectedFolder: this.currentSelectedFolder,
      folderTreeData: this.folderTreeData,
      currentFiles: this.currentFiles
    };
  }

  /**
   * Get optimized selected items for download
   * Only returns folder_ids for selected folders, and file_ids for files not in selected folders
   * @returns {Object} Object with fileIds and folderIds arrays
   */
  getSelectedItems() {
    const folderIds = Array.from(this.selectedFolderIds).filter(id => !!id);

    // Get all files that are selected
    const allSelectedFileIds = Array.from(this.selectedFileIds).filter(id => !!id);

    // Build set of all selected folder IDs (including all subfolders recursively)
    const allSelectedFolderIdsSet = new Set(folderIds);
    folderIds.forEach(folderId => {
      // Add all subfolders recursively
      const subfolderIds = this._getAllSubfolderIds(folderId);
      subfolderIds.forEach(subfolderId => allSelectedFolderIdsSet.add(subfolderId));
    });

    // Filter file IDs: only keep files that are NOT in any selected folder (or its subfolders)
    const optimizedFileIds = allSelectedFileIds.filter(fileId => {
      const file = this.currentFiles.find(f => (f.id === fileId || f.file_id === fileId));
      if (!file) {
        console.warn(`[SourceTreeManager.getSelectedItems] File not found: ${fileId}`);
        return true; // Keep if file not found (shouldn't happen)
      }

      const fileFolderId = file.folder_id;
      if (!fileFolderId) {
        return true; // Keep if file has no folder
      }

      // Check if file's folder is in the selected folders set
      if (allSelectedFolderIdsSet.has(fileFolderId)) {
        return false; // File is in a selected folder, exclude it
      }

      return true; // File is not in any selected folder, keep it
    });

    console.log(`[SourceTreeManager.getSelectedItems] Optimized - folders: ${folderIds.length}, files: ${optimizedFileIds.length} (from ${allSelectedFileIds.length} total selected files)`);

    return {
      fileIds: optimizedFileIds,
      folderIds: folderIds
    };
  }

  /**
   * Clear selection and reset view
   */
  clearSelection() {
    this.currentSelectedFolder = null;
    this._removeAllFolderSelections();
    this._renderEmptyFileList();
  }

  // #endregion

  // #region Tree Rendering

  /**
   * Render folder tree
   * @param {Array} folders - Array of folder objects
   */
  renderTree(folders) {
    console.log('[SourceTreeManager.renderTree] folders:', folders?.length);

    // For specific trees, force-expand all folders by default on each render
    if (this.treeId === 'sourceTree' || this.treeId === 'utd-sourceTree' || this.treeId === 'utc-sourceTree') {
      try {
        this._forceExpandAllFolders(folders);
      } catch (err) {
        console.error('[SourceTreeManager.renderTree] Failed to force expand:', err);
      }
    }

    const treeContainer = document.getElementById(this.treeId);
    if (!treeContainer) {
      console.error('[SourceTreeManager.renderTree] Container not found:', this.treeId);
      return;
    }

    if (!folders || folders.length === 0) {
      this._renderEmptyTree();
      return;
    }

    const tree = this._buildFolderTree(folders);
    treeContainer.innerHTML = this._renderTreeNodes(tree);
    this._attachTreeEvents();

    console.log('[SourceTreeManager.renderTree] Complete');
  }

  /**
   * Build hierarchical tree from flat folder list
   */
  _buildFolderTree(folders) {
    const folderMap = {};
    const rootFolders = [];

    folders.forEach(folder => {
      folderMap[folder.folder_id] = { ...folder, children: [] };
    });

    folders.forEach(folder => {
      if (folder.parent_folder_id && folderMap[folder.parent_folder_id]) {
        folderMap[folder.parent_folder_id].children.push(folderMap[folder.folder_id]);
      } else {
        rootFolders.push(folderMap[folder.folder_id]);
      }
    });

    // Store hierarchical tree for later use
    this.hierarchicalTree = rootFolders;

    return rootFolders;
  }

  /**
   * Get folder icon - using folder.svg
   */
  _getFolderIcon() {
    return `<img src="/static/images/folder.png" alt="folder" class="folder-icon-img" width="16" height="16" style="vertical-align: text-bottom;">`;
  }

  /**
   * Render tree nodes recursively
   */
  _renderTreeNodes(nodes, level = 0) {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const toggleClass = hasChildren ? '' : 'empty';
      const folderId = node.folder_id || '';
      const isExpanded = this.expandedFolders.has(folderId);
      const folderIcon = this._getFolderIcon();

      return `
        <div class="tree-folder-item" data-level="${level}">
          <div class="tree-folder" 
               data-folder-id="${folderId}" 
               data-folder-name="${node.folder_name || ''}"
               data-has-children="${hasChildren}">
            <span class="tree-folder-toggle ${toggleClass} ${isExpanded ? 'expanded' : ''}">▶</span>
            <span class="tree-folder-icon">${folderIcon}</span>
            <span class="tree-folder-name">${node.folder_name || 'Unnamed Folder'}</span>
          </div>
          ${hasChildren ? `
            <div class="tree-folder-children ${isExpanded ? 'visible' : ''}" data-parent-id="${folderId}">
              ${this._renderTreeNodes(node.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Render empty tree state
   */
  _renderEmptyTree() {
    const treeContainer = document.getElementById(this.treeId);
    if (treeContainer) {
      treeContainer.innerHTML = `
        <div class="tree-empty-message">
          <p>No folders found</p>
        </div>
      `;
    }
  }

  /**
   * Force expand all folders (used for treeId="sourceTree")
   * @param {Array} folders
   */
  _forceExpandAllFolders(folders) {
    console.log('[SourceTreeManager._forceExpandAllFolders] Start');
    try {
      if (!folders || !Array.isArray(folders) || folders.length === 0) {
        console.warn('[SourceTreeManager._forceExpandAllFolders] No folders to expand');
        return;
      }
      // Ensure the set exists and add all folder ids
      if (!this.expandedFolders) {
        this.expandedFolders = new Set();
      }
      folders.forEach(f => {
        const id = f?.folder_id;
        if (id) {
          this.expandedFolders.add(id);
        }
      });
      console.log(`[SourceTreeManager._forceExpandAllFolders] Expanded ${this.expandedFolders.size} folders`);
    } catch (error) {
      console.error('[SourceTreeManager._forceExpandAllFolders] Error:', error);
      throw error;
    }
  }

  // #endregion

  // #region File List Rendering

  /**
   * Render file list
   * @param {Array} subfolders - Subfolders in current folder
   * @param {Array} files - Files in current folder
   * @param {string} folderId - Current folder ID
   */
  renderFileList(subfolders, files, folderId) {
    console.log('[SourceTreeManager.renderFileList] subfolders:', subfolders?.length, 'files:', files?.length);

    const listContainer = document.getElementById(this.listId);
    if (!listContainer) {
      console.error('[SourceTreeManager.renderFileList] Container not found:', this.listId);
      return;
    }

    this._updateFileListHeader(folderId);

    const tableHTML = this._buildFileTableHTML(subfolders, files);
    listContainer.innerHTML = tableHTML;

    this._attachFileListEvents();

    // Update checkboxes based on selection state after rendering
    this._updateVisibleCheckboxes();

    console.log('[SourceTreeManager.renderFileList] Complete');
  }

  /**
   * Update file list header
   */
  _updateFileListHeader(folderId) {
    const headerElem = document.getElementById(this.pathId);
    const headerContainer = document.getElementById(this.headerId);

    if (headerElem) {
      const folderPath = this.buildFolderPath(folderId);
      headerElem.textContent = folderPath || folderId || 'Unknown folder';
    }

    if (headerContainer) {
      headerContainer.style.display = 'flex';
    }
  }

  /**
   * Build file table HTML
   */
  _buildFileTableHTML(subfolders, files) {
    const subfolderRows = (subfolders || [])
      .map(folder => this._buildSubfolderRow(folder))
      .join('');

    const fileRows = (files || [])
      .map(file => this._buildFileRow(file))
      .join('');

    return `
      <table class="source-file-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Commit ID</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${subfolderRows}
          ${fileRows}
        </tbody>
      </table>
    `;
  }

  /**
   * Build subfolder row HTML
   */
  _buildSubfolderRow(folder) {
    // Use custom builder if provided
    if (this.customSubfolderRowBuilder) {
      return this.customSubfolderRowBuilder(folder, this);
    }

    // Default implementation
    const folderId = folder.folder_id || '';
    const folderName = folder.folder_name || '';
    const displayName = folderName || this.buildFolderPath(folderId) || 'Unnamed Folder';
    const latestCommit = this._getFolderLatestCommit(folderId);
    const latestUpdate = this._getFolderLatestUpdate(folderId);
    const isChecked = this.selectedFolderIds.has(folderId) ? 'checked' : '';

    console.log(`[_buildSubfolderRow] 🔍 Folder: ${folderName} (${folderId})`);
    console.log(`[_buildSubfolderRow] 📋 selectedFolderIds.has('${folderId}'): ${this.selectedFolderIds.has(folderId)}`);
    console.log(`[_buildSubfolderRow] ✅ isChecked: '${isChecked}'`);

    const checkboxHtml = `
      <input 
        type="checkbox" 
        class="folder-checkbox" 
        data-folder-id="${folderId}"
        ${isChecked}
      >
    `;


    return `
      <tr data-folder-id="${folderId}" class="subfolder-row">
        <td>
          <div class="file-name-cell">
            ${checkboxHtml}
            <img src="/static/images/folder.png" alt="folder" class="folder-icon-img" width="16" height="16" style="vertical-align: text-bottom;">
            <span class="folder-name-text">${displayName}</span>
          </div>
        </td>
        <td>
          ${latestCommit ? `
            <div class="commit-id-cell">
              <img src="/static/images/commit-git.png" alt="commit" class="commit-icon-img">
              <span class="commit-id-badge">${SourceTreeManager.formatCommitId(latestCommit)}</span>
            </div>
          ` : '—'}
        </td>
        <td>${latestUpdate ? this._formatDate(latestUpdate) : '—'}</td>
      </tr>
    `;
  }

  /**
   * Build file row HTML
   */
  _buildFileRow(file) {
    // Use custom builder if provided
    if (this.customFileRowBuilder) {
      return this.customFileRowBuilder(file, this);
    }

    console.log('🔍 File object:', file);
    console.log('🔍 file.id:', file.id);
    console.log('🔍 file.file_name:', file.file_name);
    const fileId = file.id || file.file_id || '';

    if (!fileId) {
      console.warn('⚠️ File missing ID:', file);
    }

    // Default implementation
    const fileName = file.file_name || '';
    const commitId = SourceTreeManager.formatCommitId(file.commit_id);
    const normalizedSyncStatus = SourceTreeManager.getFileSyncStatus(file);
    const syncStatus = SourceTreeManager.getSyncStatusIcons(normalizedSyncStatus);
    const updatedAt = this._formatDate(file.updated_at);
    const isChecked = this.selectedFileIds.has(fileId) ? 'checked' : '';

    // Check if file is deleted (delete_push or delete_pull)
    // Check if file is deleted (delete_push or delete_pull)
    // normalizedSyncStatus is already computed above
    const isDeleted = normalizedSyncStatus === 'delete_push' || normalizedSyncStatus === 'delete_pull';
    const deletedClass = isDeleted ? 'deleted-row' : '';

    return `
      <tr data-file-id="${fileId}" class="file-row ${deletedClass}">
        <td>
          <div class="file-name-cell">
            <input type="checkbox" class="file-checkbox" data-file-id="${fileId}" ${isChecked}>
            <img src="/static/images/file.png" alt="file" class="file-icon-img">
            <span class="file-name-text">${fileName}</span>
          </div>
        </td>
        <td>
          <div class="commit-id-cell">
            <img src="/static/images/commit-git.png" alt="commit" class="commit-icon-img">
            <span class="commit-id-badge">${commitId}</span>
            <span class="sync-status-badge">${syncStatus}</span>
          </div>
        </td>
        <td>${updatedAt}</td>
      </tr>
    `;
  }

  /**
   * Render empty file list
   */
  _renderEmptyFileList() {
    const headerContainer = document.getElementById(this.headerId);
    const listContainer = document.getElementById(this.listId);

    if (headerContainer) {
      headerContainer.style.display = 'none';
    }

    if (listContainer) {
      listContainer.innerHTML = `
        <div class="empty-file-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 7H7C5.89543 7 5 7.89543 5 9V18C5 19.1046 5.89543 20 7 20H16C17.1046 20 18 19.1046 18 18V9C18 7.89543 17.1046 7 16 7H14M9 7V5C9 4.44772 9.44772 4 10 4H13C13.5523 4 14 4.44772 14 5V7M9 7H14" stroke="#cbd5e0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>このフォルダにはファイルがありません</p>
        </div>
      `;
    }
  }

  // #endregion

  // #region Event Handlers

  /**
   * Attach tree event handlers
   */
  _attachTreeEvents() {
    const folders = document.querySelectorAll(`#${this.treeId} .tree-folder`);
    const toggles = document.querySelectorAll(`#${this.treeId} .tree-folder-toggle:not(.empty)`);

    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleToggleClick(toggle);
      });
    });

    folders.forEach(folder => {
      folder.addEventListener('click', async (e) => {
        await this._handleFolderClick(e, folder);
      });
    });
  }

  /**
   * Handle toggle click
   */
  _handleToggleClick(toggle) {
    const folderItem = toggle.closest('.tree-folder-item');
    const childrenContainer = folderItem?.querySelector('.tree-folder-children');
    const folder = toggle.closest('.tree-folder');
    const folderId = folder?.dataset.folderId;

    if (!childrenContainer || !folderId) return;

    const isVisible = childrenContainer.classList.contains('visible');

    if (isVisible) {
      childrenContainer.classList.remove('visible');
      toggle.classList.remove('expanded');
      this.expandedFolders.delete(folderId);
    } else {
      childrenContainer.classList.add('visible');
      toggle.classList.add('expanded');
      this.expandedFolders.add(folderId);
    }
  }

  /**
   * Handle folder click
   */
  async _handleFolderClick(e, folder) {
    if (e.target.classList.contains('tree-folder-toggle')) {
      return;
    }

    e.preventDefault();

    this._removeAllFolderSelections();
    folder.classList.add('selected');

    const folderId = folder.dataset.folderId;
    const hasChildren = folder.dataset.hasChildren === 'true';

    if (hasChildren) {
      this._autoExpandFolder(folder);
    }

    // Call custom handler if provided
    if (this.onFolderSelect) {
      await this.onFolderSelect(folderId, this);
    } else {
      this.loadFolder(folderId);
    }
  }

  /**
   * Remove selection from all folders
   */
  _removeAllFolderSelections() {
    document.querySelectorAll(`#${this.treeId} .tree-folder`).forEach(f =>
      f.classList.remove('selected')
    );
  }

  /**
   * Auto-expand folder
   */
  _autoExpandFolder(folder) {
    const folderItem = folder.closest('.tree-folder-item');
    const childrenContainer = folderItem?.querySelector('.tree-folder-children');
    const toggle = folder.querySelector('.tree-folder-toggle');
    const folderId = folder.dataset.folderId;

    if (childrenContainer && !childrenContainer.classList.contains('visible')) {
      childrenContainer.classList.add('visible');
      if (toggle) toggle.classList.add('expanded');
      if (folderId) this.expandedFolders.add(folderId);
    }
  }

  /**
   * Attach file list event handlers
   */
  _attachFileListEvents() {
    const listContainer = document.getElementById(this.listId);
    if (!listContainer) return;

    // Folder row click
    listContainer.querySelectorAll('.subfolder-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Nếu click vào checkbox, chỉ xử lý checkbox
        if (e.target.closest('.folder-checkbox')) return;

        const folderId = row.dataset.folderId;
        if (folderId) {
          this.loadFolder(folderId);
          this.focusFolderInTree(folderId);
        }
      });
    });

    // File row click
    listContainer.querySelectorAll('.file-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.file-checkbox')) return;

        const fileId = row.dataset.fileId;
        if (fileId) {
          this._handleViewFile(fileId);
        }
      });
    });

    // Checkbox change handler
    if (!listContainer.dataset.cascadeListenerAdded) {
      listContainer.dataset.cascadeListenerAdded = 'true';
      listContainer.addEventListener('change', (e) => {
        const target = e.target;

        if (target.classList.contains('folder-checkbox') && !target.dataset.cascadeProcessing) {
          target.dataset.cascadeProcessing = 'true';
          this._handleFolderCheckboxChange(target);
          setTimeout(() => delete target.dataset.cascadeProcessing, 100);
        }

        if (target.classList.contains('file-checkbox')) {
          this._handleFileCheckboxChange(target);
        }
      });
    }
  }


  /**
   * Handle folder checkbox change - cascade selection
   * @param {HTMLElement} checkbox - Folder checkbox element
   */
  _handleFolderCheckboxChange(checkbox) {
    const folderId = checkbox.dataset.folderId;
    const isChecked = checkbox.checked;

    if (!folderId) {
      console.warn('[SourceTreeManager._handleFolderCheckboxChange] Missing folderId');
      return;
    }

    console.log(`[SourceTreeManager._handleFolderCheckboxChange] folderId=${folderId}, isChecked=${isChecked}`);

    // Get all subfolders recursively
    const allSubfolderIds = this._getAllSubfolderIds(folderId);
    console.log(`[SourceTreeManager._handleFolderCheckboxChange] Found ${allSubfolderIds.length} subfolders:`, allSubfolderIds);

    // Get all files in this folder and subfolders
    const allFileIds = this._getAllFileIdsInFolder(folderId, allSubfolderIds);
    console.log(`[SourceTreeManager._handleFolderCheckboxChange] Found ${allFileIds.length} files:`, allFileIds);

    // Update selection state
    if (isChecked) {
      this.selectedFolderIds.add(folderId);
      allSubfolderIds.forEach(id => this.selectedFolderIds.add(id));
      allFileIds.forEach(id => this.selectedFileIds.add(id));
      console.log(`[SourceTreeManager._handleFolderCheckboxChange] Added to selection - folders: ${allSubfolderIds.length + 1}, files: ${allFileIds.length}`);
    } else {
      this.selectedFolderIds.delete(folderId);
      allSubfolderIds.forEach(id => this.selectedFolderIds.delete(id));
      allFileIds.forEach(id => this.selectedFileIds.delete(id));
      console.log(`[SourceTreeManager._handleFolderCheckboxChange] Removed from selection - folders: ${allSubfolderIds.length + 1}, files: ${allFileIds.length}`);
    }

    // Update visible checkboxes in current view
    this._updateVisibleCheckboxes();

    // Update parent folder states based on children selection
    this._updateParentFolderStates(folderId);

    // Trigger updateSelectedFiles to update download buttons
    // Pass optimized selection to avoid relying only on visible DOM checkboxes
    setTimeout(() => {
      if (window.updateSelectedFiles && typeof window.updateSelectedFiles === 'function') {
        try {
          window.updateSelectedFiles(this.getSelectedItems());
        } catch (err) {
          // Fallback to calling without args
          window.updateSelectedFiles();
        }
      }
    }, 0);
  }

  /**
   * Handle file checkbox change
   * @param {HTMLElement} checkbox - File checkbox element
   */
  _handleFileCheckboxChange(checkbox) {
    const fileId = checkbox.dataset.fileId;
    const isChecked = checkbox.checked;

    if (!fileId) {
      console.warn('[SourceTreeManager._handleFileCheckboxChange] Missing fileId');
      return;
    }

    // Update selection state
    if (isChecked) {
      this.selectedFileIds.add(fileId);
    } else {
      this.selectedFileIds.delete(fileId);
    }

    // Find file's folder and update parent folder states
    const file = this.currentFiles.find(f => (f.id === fileId || f.file_id === fileId));
    if (file && file.folder_id) {
      this._updateParentFolderStates(file.folder_id);
    }

    // Update visible checkboxes in current view
    this._updateVisibleCheckboxes();

    // Pass optimized selection when available
    setTimeout(() => {
      if (window.updateSelectedFiles && typeof window.updateSelectedFiles === 'function') {
        try {
          window.updateSelectedFiles(this.getSelectedItems());
        } catch (err) {
          window.updateSelectedFiles();
        }
      }
    }, 0);
  }

  /**
   * Update visible checkboxes based on selection state
   */
  _updateVisibleCheckboxes() {
    const listContainer = document.getElementById(this.listId);
    if (!listContainer) return;

    // Update folder checkboxes
    listContainer.querySelectorAll('.folder-checkbox').forEach(checkbox => {
      const folderId = checkbox.dataset.folderId;
      if (folderId) {
        checkbox.checked = this.selectedFolderIds.has(folderId);
      }
    });

    // Update file checkboxes
    listContainer.querySelectorAll('.file-checkbox').forEach(checkbox => {
      const fileId = checkbox.dataset.fileId;
      if (fileId) {
        checkbox.checked = this.selectedFileIds.has(fileId);
      }
    });
  }

  /**
 * Update parent folder states based on children selection
 * Parent folder should be checked only if ALL children are checked
 * @param {string} folderId - Folder ID to start checking from
 */
  _updateParentFolderStates(folderId) {
    if (!folderId) return;

    // First check if THIS folder should remain checked based on its children
    const thisAllChildrenSelected = this._areAllChildrenSelected(folderId);

    if (thisAllChildrenSelected) {
      // All children are selected, so this folder should be checked
      if (!this.selectedFolderIds.has(folderId)) {
        this.selectedFolderIds.add(folderId);
        console.log(`[SourceTreeManager._updateParentFolderStates] ✓ Folder ${folderId} checked (all children selected)`);
      }
    } else {
      // Not all children selected, so this folder should be unchecked
      if (this.selectedFolderIds.has(folderId)) {
        this.selectedFolderIds.delete(folderId);
        console.log(`[SourceTreeManager._updateParentFolderStates] ✗ Folder ${folderId} unchecked (not all children selected)`);
      }
    }

    // Find parent folder
    const folder = this.folderTreeData.find(f => f.folder_id === folderId);
    if (!folder || !folder.parent_folder_id) return;

    const parentFolderId = folder.parent_folder_id;

    // Check if all children of parent are selected
    const allChildrenSelected = this._areAllChildrenSelected(parentFolderId);

    console.log(`[SourceTreeManager._updateParentFolderStates] Checking parent ${parentFolderId}, allChildrenSelected: ${allChildrenSelected}`);

    // Update parent folder selection state
    if (allChildrenSelected) {
      this.selectedFolderIds.add(parentFolderId);
      console.log(`[SourceTreeManager._updateParentFolderStates] ✓ Parent ${parentFolderId} checked (all children selected)`);
    } else {
      this.selectedFolderIds.delete(parentFolderId);
      console.log(`[SourceTreeManager._updateParentFolderStates] ✗ Parent ${parentFolderId} unchecked (not all children selected)`);
    }

    // Update visible checkboxes to reflect parent state change
    this._updateVisibleCheckboxes();

    // Recursively update grandparent and above
    this._updateParentFolderStates(parentFolderId);
  }

  /**
   * Check if all children (subfolders and files) of a folder are selected
   * Parent folder is considered "selected" only if ALL its descendants are selected
   * @param {string} folderId - Folder ID
   * @returns {boolean} True if all children are selected
   */
  _areAllChildrenSelected(folderId) {
    if (!folderId) return false;

    // Get direct subfolders
    const directSubfolders = this.folderTreeData.filter(
      folder => folder.parent_folder_id === folderId
    );

    // Get direct files - ensure we're getting ALL files in the folder
    const directFiles = this.currentFiles.filter(
      file => file.folder_id === folderId
    );

    console.log(`[_areAllChildrenSelected] 🔍 Checking folderId: ${folderId}`);
    console.log(`[_areAllChildrenSelected] 📁 Direct subfolders (${directSubfolders.length}):`, directSubfolders.map(s => `${s.folder_name}(${s.folder_id})`));
    console.log(`[_areAllChildrenSelected] 📄 Direct files (${directFiles.length}):`, directFiles.map(f => `${f.file_name}(${f.id || f.file_id})`));

    // If no children at all, consider it as "all selected" (empty set)
    if (directSubfolders.length === 0 && directFiles.length === 0) {
      console.log(`[_areAllChildrenSelected] ❌ No children found, returning false`);
      return false; // Empty folder should not be auto-checked
    }

    // Check if all direct subfolders are selected (recursively check their children too)
    const selectedSubfolders = [];
    const unselectedSubfolders = [];
    directSubfolders.forEach(subfolder => {
      // A subfolder is considered "selected" only if it's in selectedFolderIds
      // AND all its children are also selected (recursive check)
      const isInSelectedSet = this.selectedFolderIds.has(subfolder.folder_id);
      const allChildrenSelected = this._areAllChildrenSelected(subfolder.folder_id);
      const isFullySelected = isInSelectedSet && allChildrenSelected;

      if (isFullySelected) {
        selectedSubfolders.push(subfolder.folder_name);
      } else {
        unselectedSubfolders.push(subfolder.folder_name);
        console.log(`[_areAllChildrenSelected] 🔴 Subfolder ${subfolder.folder_name} not fully selected (inSet: ${isInSelectedSet}, allChildren: ${allChildrenSelected})`);
      }
    });
    const allSubfoldersSelected = unselectedSubfolders.length === 0;

    // Check if all direct files are selected
    const selectedFiles = [];
    const unselectedFiles = [];
    directFiles.forEach(file => {
      const fileId = file.id || file.file_id;
      const isSelected = this.selectedFileIds.has(fileId);
      if (isSelected) {
        selectedFiles.push(file.file_name);
      } else {
        unselectedFiles.push(file.file_name);
      }
    });
    const allFilesSelected = unselectedFiles.length === 0;

    const result = allSubfoldersSelected && allFilesSelected;

    console.log(`[_areAllChildrenSelected] ✅ Selected subfolders: [${selectedSubfolders.join(', ')}]`);
    console.log(`[_areAllChildrenSelected] ❌ Unselected subfolders: [${unselectedSubfolders.join(', ')}]`);
    console.log(`[_areAllChildrenSelected] ✅ Selected files: [${selectedFiles.join(', ')}]`);
    console.log(`[_areAllChildrenSelected] ❌ Unselected files: [${unselectedFiles.join(', ')}]`);
    console.log(`[_areAllChildrenSelected] 🎯 Result: ${result} (all subfolders: ${allSubfoldersSelected}, all files: ${allFilesSelected})`);

    return result;
  }

  /**
   * Get all subfolder IDs recursively
   * @param {string} parentFolderId - Parent folder ID
   * @returns {Array<string>} Array of subfolder IDs
   */
  _getAllSubfolderIds(parentFolderId) {
    const subfolderIds = [];

    if (!this.folderTreeData || this.folderTreeData.length === 0) {
      console.warn('[SourceTreeManager._getAllSubfolderIds] No folder tree data');
      return subfolderIds;
    }

    const findSubfolders = (folderId) => {
      const subfolders = this.folderTreeData.filter(
        folder => folder.parent_folder_id === folderId
      );

      console.log(`[SourceTreeManager._getAllSubfolderIds] Found ${subfolders.length} direct subfolders for folderId=${folderId}`);

      subfolders.forEach(subfolder => {
        if (subfolder.folder_id) {
          subfolderIds.push(subfolder.folder_id);
          // Recursively find subfolders of this subfolder
          findSubfolders(subfolder.folder_id);
        }
      });
    };

    findSubfolders(parentFolderId);
    console.log(`[SourceTreeManager._getAllSubfolderIds] Total subfolders found: ${subfolderIds.length}`);
    return subfolderIds;
  }

  /**
   * Get all file IDs in a folder and its subfolders
   * @param {string} folderId - Folder ID
   * @param {Array<string>} subfolderIds - Array of subfolder IDs
   * @returns {Array<string>} Array of file IDs
   */
  _getAllFileIdsInFolder(folderId, subfolderIds) {
    const allFolderIds = [folderId, ...subfolderIds];
    const fileIds = [];

    allFolderIds.forEach(fId => {
      const filesInFolder = this.currentFiles.filter(
        file => (file.folder_id === fId || file.id === fId)
      );
      filesInFolder.forEach(file => {
        // Use file.id (primary) or file.file_id (fallback)
        const fileId = file.id || file.file_id;
        if (fileId) {
          fileIds.push(fileId);
          console.log(`[SourceTreeManager._getAllFileIdsInFolder] Found file: ${fileId} in folder: ${fId}`);
        }
      });
    });

    console.log(`[SourceTreeManager._getAllFileIdsInFolder] Total files found: ${fileIds.length}`);
    return fileIds;
  }

  /**
   * Handle view file click
   */
  _handleViewFile(fileId) {
    if (this.onFileView) {
      this.onFileView(fileId, this);
    } else {
      showAlert('File detail view not configured', 'info');
    }
  }

  // #endregion

  // #region Helper Methods

  /**
   * Build folder path
   */
  buildFolderPath(folderId) {
    if (!folderId || !this.folderTreeData || this.folderTreeData.length === 0) {
      return '';
    }

    const findFolderById = (folders, id) => {
      return folders.find(folder => folder.folder_id === id);
    };

    const pathParts = [];
    let currentFolder = findFolderById(this.folderTreeData, folderId);

    while (currentFolder) {
      pathParts.unshift(currentFolder.folder_name);

      if (currentFolder.parent_folder_id) {
        currentFolder = findFolderById(this.folderTreeData, currentFolder.parent_folder_id);
      } else {
        break;
      }
    }

    return pathParts.join('/');
  }

  /**
   * Sort items by name
   */
  _sortByName(items, nameField) {
    if (!items || !Array.isArray(items)) return [];

    return [...items].sort((a, b) => {
      const nameA = (a[nameField] || '').toLowerCase();
      const nameB = (b[nameField] || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get folder latest commit
   */
  _getFolderLatestCommit(folderId) {
    if (!folderId || !this.currentFiles || this.currentFiles.length === 0) {
      return null;
    }

    // Get all subfolders recursively
    const subfolderIds = this._getAllSubfolderIds(folderId);

    // Get all files in this folder and all subfolders
    // We can reuse _getAllFileIdsInFolder logic but we need the actual file objects
    const allFolderIds = [folderId, ...subfolderIds];

    let latestFile = null;

    allFolderIds.forEach(fId => {
      const filesInFolder = this.currentFiles.filter(
        file => (file.folder_id === fId)
      );

      filesInFolder.forEach(file => {
        if (!file.updated_at) return;

        if (!latestFile || !latestFile.updated_at) {
          latestFile = file;
        } else {
          if (new Date(file.updated_at) > new Date(latestFile.updated_at)) {
            latestFile = file;
          }
        }
      });
    });

    return latestFile?.commit_id || null;
  }

  /**
   * Get folder latest update
   */
  _getFolderLatestUpdate(folderId) {
    if (!folderId || !this.currentFiles || this.currentFiles.length === 0) {
      return null;
    }

    // Get all subfolders recursively
    const subfolderIds = this._getAllSubfolderIds(folderId);

    // Get all files in this folder and all subfolders
    const allFolderIds = [folderId, ...subfolderIds];

    let latestDate = null;

    allFolderIds.forEach(fId => {
      const filesInFolder = this.currentFiles.filter(
        file => (file.folder_id === fId)
      );

      filesInFolder.forEach(file => {
        if (!file.updated_at) return;

        if (!latestDate) {
          latestDate = file.updated_at;
        } else {
          if (new Date(file.updated_at) > new Date(latestDate)) {
            latestDate = file.updated_at;
          }
        }
      });
    });

    return latestDate;
  }

  /**
   * Format date
   */
  _formatDate(date) {
    if (!date) return 'N/A';

    try {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
      return 'Invalid Date';
    }
  }

  /**
   * Focus folder in tree when clicking folder in file list
   * @param {string} folderId - Folder ID to focus
   */
  focusFolderInTree(folderId) {
    console.log('[SourceTreeManager.focusFolderInTree] folderId:', folderId);

    if (!folderId) {
      console.warning('[SourceTreeManager.focusFolderInTree] Missing folder ID');
      return;
    }

    try {
      // Find the folder element in tree
      const folderElement = document.querySelector(`#${this.treeId} .tree-folder[data-folder-id="${folderId}"]`);

      if (!folderElement) {
        console.warning('[SourceTreeManager.focusFolderInTree] Folder not found in tree:', folderId);
        // Expand parent folders to make this folder visible
        this._expandParentFolders(folderId);
        // Try again after expanding
        const retryElement = document.querySelector(`#${this.treeId} .tree-folder[data-folder-id="${folderId}"]`);
        if (retryElement) {
          this._selectAndScrollToFolder(retryElement);
        }
        return;
      }

      this._selectAndScrollToFolder(folderElement);

      console.log('[SourceTreeManager.focusFolderInTree] Success');
    } catch (error) {
      console.error('[SourceTreeManager.focusFolderInTree] Error:', error);
    }
  }

  /**
   * Select and scroll to folder element
   */
  _selectAndScrollToFolder(folderElement) {
    // Remove previous selection
    this._removeAllFolderSelections();

    // Add selection
    folderElement.classList.add('selected');

    // Expand parent folders if needed
    let current = folderElement.closest('.tree-folder-children');
    while (current) {
      const parentId = current.dataset.parentId;
      if (parentId) {
        const parentFolder = document.querySelector(`#${this.treeId} .tree-folder[data-folder-id="${parentId}"]`);
        if (parentFolder) {
          this._autoExpandFolder(parentFolder);
        }
      }
      current = current.parentElement?.closest('.tree-folder-children');
    }

    // Scroll into view
    folderElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Expand parent folders to make target folder visible
   */
  _expandParentFolders(folderId) {
    if (!folderId || !this.hierarchicalTree || this.hierarchicalTree.length === 0) {
      return;
    }

    const findFolderById = (folders, id, path = []) => {
      for (const folder of folders) {
        const currentPath = [...path, folder.folder_id];
        if (folder.folder_id === id) {
          return { folder, path: currentPath.slice(0, -1) }; // Exclude self from path
        }
        if (folder.children && folder.children.length > 0) {
          const found = findFolderById(folder.children, id, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findFolderById(this.hierarchicalTree, folderId);
    if (!result) return;

    // Expand all parents in the path
    result.path.forEach(parentId => {
      const parentElement = document.querySelector(`#${this.treeId} .tree-folder[data-folder-id="${parentId}"]`);
      if (parentElement) {
        this._autoExpandFolder(parentElement);
      }
    });
  }

  // #endregion
}

// Import static methods from file_List.js helper class
SourceTreeManager.formatCommitId = FileListSourceTreeManager.formatCommitId;
SourceTreeManager.getSyncStatusIcons = FileListSourceTreeManager.getSyncStatusIcons;
SourceTreeManager.getFileSyncStatus = FileListSourceTreeManager.getFileSyncStatus;

console.log('[source_tree_manager.js] Module loaded ✅');