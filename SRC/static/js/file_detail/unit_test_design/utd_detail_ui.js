/**
 * Unit Test Design Detail UI Module
 * Handles all UI rendering functions
 */

import { RD_MESSAGES, SRC_MESSAGES } from '../../commons/error_messages.js';
import { renderSidebarFileList, getFileSyncStatus, hasValidCommitId } from '../../commons/file_List.js';
import { getLanguageImagePath } from '../source_code/source_detail_helpers.js';
import {
    getFileId,
    getFileData,
    getSelectedClassId,
    getSelectedMethodId,
    setCodeContent,
    setPreviewContent,
    getExpandedFolders,
    addExpandedFolder,
    removeExpandedFolder,
    addExpandedClass,
    removeExpandedClass,
    getExpandedClasses,
    setIsEditorReadOnly
} from './utd_detail_state.js';
import {
    escapeHtml,
    parseMarkdownToHtml,
    formatJSONString,
    isValidFileId,
    extractRepoName,
} from './utd_detail_helpers.js';
import { getProject } from './utd_detail_api.js';
import { getProjectId } from './utd_detail_state.js';
import { setEditorReadOnly } from './utd_detail_events.js';
// #region Public Functions - Header Rendering
/**
 * Render file name in header
 * @param {Object} fileData - File data
 */
export const renderFileName = (fileData) => {
    if (!fileData) return;
    const fileNameEl = document.getElementById("fileName");
    if (fileNameEl) fileNameEl.textContent = fileData.file_name || RD_MESSAGES.FILE_NAME;
};

/**
 * Render repository name
 * @param {Object} projectInfo - Project info
 */
export const renderRepoName = (projectInfo) => {
    if (!projectInfo) return;
    const repoNameEl = document.getElementById("repoName");
    if (!repoNameEl) return;

    const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name || "";
    repoNameEl.textContent = extractRepoName(repoUrl) || "-";
};

/**
 * Render branch name
 * @param {Object} projectInfo - Project info
 */
export const renderBranchName = (projectInfo) => {
    if (!projectInfo) return;
    const branchNameEl = document.getElementById("branchName");
    if (!branchNameEl) return;

    const branchName = projectInfo.git?.branch || projectInfo.branch_name || projectInfo.branch || RD_MESSAGES.BRANCH_NAME;
    branchNameEl.textContent = branchName || "-";
};

/**
 * Render language icon
 * @param {Object} projectInfo - Project info
 */
export const renderLanguageIcon = (projectInfo) => {
    if (!projectInfo) return;
    const languageIconContainer = document.getElementById("languageIconContainer");
    if (!languageIconContainer) return;

    const language = projectInfo.language || projectInfo.programming_language || "";
    const imgPath = getLanguageImagePath(language);

    languageIconContainer.innerHTML = imgPath
        ? `<img src="/static/images/${imgPath}" alt="${language}" class="language-logo" style="width: 24px; height: 24px; margin-right: 8px;" />`
        : "";
};

/**
 * Render repository information in header
 * @param {Object} projectData - Project data
 */
export const renderRepoInfo = (projectData) => {
    console.log("[renderRepoInfo] Start");

    try {
        if (!projectData) {
            console.warn("[renderRepoInfo] Missing projectData");
            return;
        }

        const projectInfo = projectData.data || projectData;
        renderRepoName(projectInfo);
        renderBranchName(projectInfo);
        renderLanguageIcon(projectInfo);

        console.log("[renderRepoInfo] Success");
    } catch (error) {
        console.error("[renderRepoInfo] Error:", error);
    }
};

/**
 * Render commit date in header
 * @param {Object} fileData - File data
 */
export const renderCommitDate = (fileData) => {
    if (!fileData) return;
    const updateDateEl = document.getElementById("updateDate");
    if (!updateDateEl) return;

    const commitDate = fileData.updated_at || fileData.created_at || new Date().toISOString();
    updateDateEl.textContent = window.BaseUtils?.formatDate(commitDate) || "";
};

/**
 * Render file header information
 * @param {Object} fileData - File data
 * @param {Object} projectData - Project data
 */
export const renderHeader = (fileData, projectData) => {
    if (!fileData) return;

    renderFileName(fileData);
    if (projectData) renderRepoInfo(projectData);
    renderCommitDate(fileData);
};
// #endregion

// #region Public Functions - Code Editor Rendering
/**
 * Render code editor content
 * @param {string} content - Content to render
 */
export const renderCodeEditor = (content, readOnly = true) => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return;

    const tempListener = codeEditor._saveListener;
    if (tempListener) {
        codeEditor.removeEventListener("input", tempListener);
    }

    const formattedContent = formatJSONString(content || "");
    codeEditor.value = formattedContent;
    setCodeContent(formattedContent);
    setEditorReadOnly(readOnly);

    if (tempListener && !readOnly) {
        codeEditor.addEventListener("input", tempListener);
    }
};
// #endregion

// #region Public Functions - Preview Rendering
/**
 * Render preview fallback (raw content)
 * @param {string} content - Content to display
 */
export const renderPreviewFallback = (content) => {
    const previewEl = document.getElementById("rdPreview");
    if (!previewEl) return;

    const escapedContent = window.BaseUtils?.baseEscapeHtml(content || "") || content || "";
    previewEl.innerHTML = `<pre>${escapedContent}</pre>`;
    setPreviewContent(content);
};

/**
 * Render PD section HTML
 * @param {Object} pdData - PD data object
 * @returns {string} HTML content
 */
export const renderPDSection = (pdData) => {
    if (!pdData) return "";

    let htmlContent = '<div class="utd-preview-section" id="utd-pd-section">';
    htmlContent += '<h3 class="utd-section-title">PD (詳細設計)</h3>';

    if (pdData.class_description) {
        htmlContent += `<div class="utd-preview-item"><h4>クラス説明</h4>${parseMarkdownToHtml(pdData.class_description)}</div>`;
    }
    if (pdData.method_design) {
        htmlContent += `<div class="utd-preview-item"><h4>メソッド設計</h4>${parseMarkdownToHtml(pdData.method_design)}</div>`;
    }
    if (pdData.interface_design) {
        htmlContent += `<div class="utd-preview-item"><h4>インターフェース設計</h4>${parseMarkdownToHtml(pdData.interface_design)}</div>`;
    }
    if (pdData.activity_diagram) {
        let imageSrc = pdData.activity_diagram;
        if (!imageSrc.startsWith("data:")) imageSrc = `data:image/png;base64,${imageSrc}`;
        htmlContent += `<div class="utd-preview-item"><h4>アクティビティ図</h4><img src="${imageSrc}" alt="Activity Diagram" style="max-width: 100%;" /></div>`;
    }

    htmlContent += '</div>';
    return htmlContent;
};

/**
 * Render UTD section HTML
 * @param {Object} utdData - UTD data object
 * @returns {string} HTML content
 */
export const renderUTDSection = (utdData) => {
    if (!utdData) return "";

    let htmlContent = '<div class="utd-preview-section" id="utd-utd-section">';
    htmlContent += '<h3 class="utd-section-title">UTD (単体試験設計)</h3>';

    if (utdData.decision_table) {
        htmlContent += `<div class="utd-preview-item">${parseMarkdownToHtml(utdData.decision_table)}</div>`;
    }
    if (utdData.test_pattern) {
        htmlContent += `<div class="utd-preview-item">${parseMarkdownToHtml(utdData.test_pattern)}</div>`;
    }

    htmlContent += '</div>';
    return htmlContent;
};

/**
 * Render UTC section HTML
 * @param {Object} utcData - UTC data object
 * @returns {string} HTML content
 */
export const renderUTCSection = (utcData) => {
    if (!utcData?.unit_test_code) return "";

    return `<div class="utd-preview-section" id="utd-utc-section">
        <h3 class="utd-section-title">UTC (単体試験コード)</h3>
        <div class="utd-preview-item"><h4>Unit Test Code</h4>
        <pre><code>${escapeHtml(utcData.unit_test_code)}</code></pre></div>
    </div>`;
};

/**
 * Render preview object data with tabs (PD, UTD, UTC)
 * @param {Object} previewData - Preview data object with pd, utd, utc properties
 * @param {HTMLElement} previewEl - Preview container element
 */
export const renderPreviewObjectData = (previewData, previewEl) => {
    if (!previewEl) return;

    let htmlContent = '<div class="utd-preview-container">';
    let hasContent = false;

    if (previewData.pd) { hasContent = true; htmlContent += renderPDSection(previewData.pd); }
    if (previewData.utd) { hasContent = true; htmlContent += renderUTDSection(previewData.utd); }
    if (previewData.utc) { hasContent = true; htmlContent += renderUTCSection(previewData.utc); }

    htmlContent += '</div>';

    if (!hasContent) {
        previewEl.innerHTML = `<p>${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
        setPreviewContent("");
    } else {
        previewEl.innerHTML = htmlContent;
        setPreviewContent(previewData);
    }
};

/**
 * Render preview content for unit test design
 * Supports both string content and object preview data with tabs (PD, UTD, UTC)
 * @param {string|Object} content - Content to render
 */
export const renderPreview = (content) => {
    const previewEl = document.getElementById("rdPreview");
    if (!previewEl) return;

    if (typeof content === 'object' && content !== null) {
        renderPreviewObjectData(content, previewEl);
        return;
    }

    if (!content || content.trim() === "") {
        previewEl.innerHTML = `<p>${RD_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`;
        setPreviewContent("");
        return;
    }

    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const isJson = (normalizedContent.startsWith("{") && normalizedContent.endsWith("}")) ||
        (normalizedContent.startsWith("[") && normalizedContent.endsWith("]"));

    let htmlContent;
    if (isJson) {
        try {
            const jsonObj = JSON.parse(normalizedContent);
            htmlContent = `<pre><code>${escapeHtml(JSON.stringify(jsonObj, null, 2))}</code></pre>`;
        } catch {
            htmlContent = `<pre><code>${escapeHtml(normalizedContent)}</code></pre>`;
        }
    } else {
        const codeKeywords = /\b(def|class|import|from|if|else|for|while|return|async|await)\b/;
        const looksLikeCode = codeKeywords.test(normalizedContent);
        htmlContent = looksLikeCode ? `<pre><code>${escapeHtml(normalizedContent)}</code></pre>` :
            parseMarkdownToHtml(normalizedContent);
    }

    previewEl.innerHTML = htmlContent;
    setPreviewContent(content);
};
// #endregion

// #region Public Functions - Git File List Rendering
/**
 * Filter out files that only have commit_id but no sync status icon
 * @param {Array} files - Files array
 * @returns {Array} Filtered files
 */
export const filterFilesWithSyncStatus = (files) => {
    if (!Array.isArray(files)) return [];
    return files.filter(file => {
        const fileHasCommitId = hasValidCommitId(file);
        const syncStatus = getFileSyncStatus(file);
        return !(fileHasCommitId && (syncStatus === "" || syncStatus === "synced"));
    });
};

/**
 * Filter out files with sync_status = 'push'
 * @param {Array} files - Files array
 * @returns {Array} Filtered files
 */
export const filterNonPushedFiles = (files) => {
    if (!Array.isArray(files)) return [];
    return files.filter(file => getFileSyncStatus(file) !== "push");
};

/**
 * Render Git file list using common component
 * @param {Array} files - Files array
 */
export const renderGitFileList = (files) => {
    if (!Array.isArray(files)) return;
    const filteredFiles = filterFilesWithSyncStatus(files);
    renderSidebarFileList("gitFileList", filteredFiles, false);
};
// #endregion

// #region Public Functions - Git Branch Info
/**
 * Update branch name in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 */
export const updateBranchName = (gitContent, projectInfo) => {
    if (!gitContent || !projectInfo) return;
    const branchNameEl = gitContent.querySelector("#branchName");
    if (!branchNameEl) return;
    const branchName =
        projectInfo.git?.branch ||
        projectInfo.branch_name ||
        projectInfo.branch ||
        RD_MESSAGES.DEFAULT_BRANCH_NAME;
    branchNameEl.textContent = branchName;
};

/**
 * Update branch date in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 * @param {Array} files - Files array
 */
export const updateBranchDate = (gitContent, projectInfo, files) => {
    if (!gitContent) return;
    const branchDateEl = gitContent.querySelector("#branchDate");
    if (!branchDateEl) return;

    let branchDate =
        projectInfo?.updated_at ||
        projectInfo?.last_commit_date ||
        projectInfo?.created_at;

    const filteredFiles = filterNonPushedFiles(files || []);
    if (filteredFiles.length > 0) {
        const latestFile = filteredFiles.reduce((latest, file) => {
            return new Date(file.updated_at || 0) > new Date(latest.updated_at || 0) ? file : latest;
        }, filteredFiles[0]);
        branchDate = latestFile.updated_at || branchDate;
    }

    branchDateEl.textContent = branchDate
        ? window.BaseUtils?.formatDateTime(branchDate)
        : RD_MESSAGES.DEFAULT_DATE;
};

/**
 * Set default branch information
 */
export const setDefaultBranchInfo = () => {
    const gitContent = document.getElementById("rdGitContent");
    if (!gitContent) return;

    const branchNameEl = gitContent.querySelector("#branchName");
    const branchDateEl = gitContent.querySelector("#branchDate");

    if (branchNameEl) branchNameEl.textContent = RD_MESSAGES.DEFAULT_BRANCH_NAME;
    if (branchDateEl) branchDateEl.textContent = RD_MESSAGES.DEFAULT_DATE;
};

/**
 * Update Git branch information in sidebar
 * @param {Array} files - Files array
 */
export const updateGitBranchInfo = async (files) => {
    const projectId = getProjectId();
    if (!projectId) {
        setDefaultBranchInfo();
        return;
    }

    const projectData = await getProject(projectId);
    const projectInfo = projectData.data || projectData;

    const gitContent = document.getElementById("rdGitContent");
    if (!gitContent) return;

    updateBranchName(gitContent, projectInfo);
    updateBranchDate(gitContent, projectInfo, files);
};
// #endregion

// #region Public Functions - Tree Node Creation
/**
 * Get badge label based on node type
 * @param {string} nodeType - Node type
 * @param {string} displayName - Display name
 * @returns {string} Badge label
 */
const getBadgeLabel = (nodeType, displayName) => {
    if (!nodeType) return "•";

    const badgeMap = {
        "global-method": "gm",
        "class": "C",
        "method": "M",
        "folder": "▸",
    };

    return badgeMap[nodeType] || (displayName?.trim().charAt(0).toUpperCase() || "•");
};

/**
 * Create file icon element
 * @returns {HTMLElement} Image element
 */
const createFileIcon = () => {
    const img = document.createElement("img");
    img.src = "/static/images/file.svg";
    img.className = "file-icon";
    img.alt = "File icon";
    img.width = 16;
    img.height = 16;
    img.style.display = "block";
    img.style.flexShrink = "0";
    img.style.visibility = "visible";
    img.style.opacity = "1";
    return img;
};

/**
 * Create base node item element
 * @param {Object} node - Node data
 * @returns {HTMLElement} Item element
 */
const createNodeItem = (node) => {
    if (!node?.id) return null;

    const item = document.createElement("div");
    const nodeType = node.type || "file";
    item.className = `structure-item ${nodeType}`;
    item.setAttribute("data-node-id", node.id);

    const displayName = node.name || SRC_MESSAGES.FILE_NAME;

    if (nodeType === "file") {
        item.classList.add("file", "has-svg-icon");
        const img = createFileIcon();
        if (img) item.appendChild(img);

        const nameSpan = document.createElement("span");
        nameSpan.className = "name";
        nameSpan.textContent = displayName;
        item.appendChild(nameSpan);
    } else {
        item.dataset.badge = getBadgeLabel(nodeType, displayName);
        item.innerHTML = `<span class="name">${displayName}</span>`;
    }

    return item;
};
/**
 * Get initial display state for children container
 * @param {string} nodeType - Node type
 * @param {string} nodeId - Node ID
 * @returns {Object} Display state object
 */
const getChildrenDisplayState = (nodeType, nodeId) => {
    const expandedClasses = getExpandedClasses();
    if (nodeType === "folder") {
        const expandedFolders = getExpandedFolders();
        const shouldDisplay = expandedFolders?.has(nodeId) || false;
        return { shouldDisplay, shouldAddExpanded: shouldDisplay };
    } else if (nodeType === "class") {
        const wasExpanded = expandedClasses.has(nodeId);
        const shouldDisplay = expandedClasses.size === 0 || wasExpanded;
        return { shouldDisplay, shouldAddExpanded: shouldDisplay };
    }
    return { shouldDisplay: true, shouldAddExpanded: false };
};

/**
 * Create children container for node
 * @param {Object} node - Node data
 * @param {HTMLElement} item - Item element
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} createTreeNodeElement - Function to create tree node element
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 * @param {boolean} skipSymbolHydration - Skip symbol hydration flag
 * @returns {HTMLElement|null} Children container element
 */
const createNodeChildren = (
    node,
    item,
    navigateToFile,
    createTreeNodeElement,
    onFileClick,
    onClassClick,
    onMethodClick,
    skipSymbolHydration
) => {
    if (!node?.children?.length) return null;

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "structure-children";

    const { shouldDisplay, shouldAddExpanded } = getChildrenDisplayState(node.type, node.id);
    childrenContainer.style.display = shouldDisplay ? "block" : "none";

    if (shouldAddExpanded) {
        item.classList.add("expanded");
        if (node.type === "class") addExpandedClass(node.id);
    }

    node.children.forEach((child) => {
        const childElement = createTreeNodeElement(child, navigateToFile, onFileClick, onClassClick, onMethodClick, skipSymbolHydration);
        if (childElement) childrenContainer.appendChild(childElement);
    });

    return childrenContainer;
};
/** 
 * Set active state for current file node
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {string} nodeId - Node ID
 * @param {string} currentFileId - Current file ID
 */
const setFileNodeActiveState = (item, container, nodeId, currentFileId) => {
    if (nodeId === currentFileId) {
        item.classList.add("active");
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
};

/**
 * Setup click handler for valid file node
 * @param {HTMLElement} item - Item element
 * @param {Object} node - Node data
 * @param {string} currentFileId - Current file ID
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} onFileClick - Function to handle file click
 */
const setupValidFileClickHandler = (item, node, currentFileId, navigateToFile, onFileClick) => {
    item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (node.id !== currentFileId) {
            navigateToFile(node.id);
        } else {
            onFileClick?.(node);
        }
    });
};

/**
 * Set disabled state for invalid file node
 * @param {HTMLElement} item - Item element
 */
const setFileNodeDisabledState = (item) => {
    item.style.cursor = "default";
    item.style.opacity = "0.6";
};

/**
 * Setup file node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} onFileClick - Function to handle file click
 */
const setupFileNodeClickHandler = (item, container, node, navigateToFile, onFileClick) => {
    if (!item || !node) return;

    const currentFileId = getFileId();
    setFileNodeActiveState(item, container, node.id, currentFileId);

    if (isValidFileId(node.id) && navigateToFile) {
        setupValidFileClickHandler(item, node, currentFileId, navigateToFile, onFileClick);
    } else {
        setFileNodeDisabledState(item);
    }
};
/**
 * Set active state for selected class node
 * @param {HTMLElement} item - Item element
 * @param {string} nodeId - Node ID
 * @param {string} selectedClassId - Selected class ID
 */
const setClassNodeActiveState = (item, nodeId, selectedClassId) => {
    if (nodeId === selectedClassId) {
        item.classList.add("active");
    }
};

/**
 * Toggle children container visibility
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {string} nodeId - Node ID
 */
const toggleClassChildrenContainer = (item, container, nodeId) => {
    const childrenContainer = container.querySelector(":scope > .structure-children");
    if (!childrenContainer) return;

    const isExpanded = childrenContainer.style.display === "block";
    childrenContainer.style.display = isExpanded ? "none" : "block";
    item.classList.toggle("expanded", !isExpanded);

    if (isExpanded) {
        removeExpandedClass(nodeId);
    } else {
        addExpandedClass(nodeId);
    }
};

/**
 * Handle class node click event
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} onClassClick - Function to handle class click
 */
const handleClassNodeClick = (item, container, node, onClassClick) => {
    item.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleClassChildrenContainer(item, container, node.id);
        onClassClick?.(node);
    });
};

/**
 * Setup class node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} onClassClick - Function to handle class click
 */
const setupClassNodeClickHandler = (item, container, node, onClassClick) => {
    if (!item || !node) return;

    const selectedClassId = getSelectedClassId();
    setClassNodeActiveState(item, node.id, selectedClassId);
    item.style.cursor = "pointer";
    handleClassNodeClick(item, container, node, onClassClick);
};
/**
 * Setup method node click handler
 * @param {HTMLElement} item - Item element
 * @param {Object} node - Node data
 * @param {Function} onMethodClick - Function to handle method click
 */
const setupMethodNodeClickHandler = (item, node, onMethodClick) => {
    if (!item || !node) return;
    if (node.id === getSelectedMethodId()) item.classList.add("active");
    item.style.cursor = "pointer";

    item.addEventListener("click", (e) => {
        e.stopPropagation();
        onMethodClick?.(node);
    });
};

/**
 * Toggle folder children container visibility
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {string} nodeId - Node ID
 */
const toggleFolderChildrenContainer = (item, container, nodeId) => {
    const childrenContainer = container.querySelector(":scope > .structure-children");
    if (!childrenContainer) return;

    const isVisible = childrenContainer.style.display === "block";
    childrenContainer.style.display = isVisible ? "none" : "block";
    item.classList.toggle("expanded", !isVisible);

    if (isVisible) {
        removeExpandedFolder(nodeId);
    } else {
        addExpandedFolder(nodeId);
    }
};

/**
 * Handle folder node click event
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 */
const handleFolderNodeClick = (item, container, node) => {
    item.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFolderChildrenContainer(item, container, node.id);
    });
};

/**
 * Setup folder node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 */
const setupFolderNodeClickHandler = (item, container, node) => {
    if (!item || !node) return;
    handleFolderNodeClick(item, container, node);
};

/**
 * Setup node click handlers based on type
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 */
const setupNodeClickHandlers = (item, container, node, navigateToFile, onFileClick, onClassClick, onMethodClick) => {
    if (!item || !node) return;

    switch (node.type) {
        case "file":
            setupFileNodeClickHandler(item, container, node, navigateToFile, onFileClick);
            break;
        case "class":
            setupClassNodeClickHandler(item, container, node, onClassClick);
            break;
        case "method":
        case "global-method":
            setupMethodNodeClickHandler(item, node, onMethodClick);
            break;
        case "folder":
            setupFolderNodeClickHandler(item, container, node);
            break;
        default:
            item.style.cursor = "default";
    }
};

/**
 * Create tree node element
 * @param {Object} node - Node data
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 * @param {boolean} skipSymbolHydration - Skip symbol hydration flag
 * @returns {HTMLElement|null} Container element
 */
export const createTreeNodeElement = (node, navigateToFile, onFileClick, onClassClick, onMethodClick, skipSymbolHydration = false) => {
    if (!node) return null;

    const container = document.createElement("div");
    container.className = "structure-node";

    const item = createNodeItem(node);
    if (!item) return null;

    setupNodeClickHandlers(item, container, node, navigateToFile, onFileClick, onClassClick, onMethodClick);
    container.appendChild(item);

    const childrenContainer = createNodeChildren(node, item, navigateToFile, createTreeNodeElement, onFileClick, onClassClick, onMethodClick, skipSymbolHydration);
    if (childrenContainer) container.appendChild(childrenContainer);

    return container;
};

/**
 * Helper function to find node in tree by ID
 * @param {Object} node - Tree node
 * @param {string} targetId - Target ID
 * @returns {Object|null} Found node or null
 */
export const findNodeInTree = (node, targetId) => {
    if (!node || !targetId) return null;
    if (node.id === targetId) return node;

    return (node.children || []).reduce((found, child) => found || findNodeInTree(child, targetId), null);
};

/**
 * Build tree node structure from file data
 * @param {Object} fileData - File data
 * @param {string} fileId - File ID
 * @returns {Object} File node structure
 */
export const buildFileNodeStructure = (fileData, fileId) => {
    if (!fileData || !fileId) return null;

    const children = [
        ...(fileData.classes || []).map(cls => ({
            id: cls.class_id,
            name: cls.class_name,
            type: "class",
            class_data: cls,
            children: (cls.methods || []).map(m => ({
                id: m.method_id,
                name: m.method_name,
                type: "method",
                method_data: m,
                class_id: cls.class_id,
                file_data: fileData,
            })),
            file_data: fileData,
        })),
        ...(fileData.global_methods || []).map(m => ({
            id: m.method_id,
            name: m.method_name,
            type: "global-method",
            method_data: m,
            file_data: fileData,
        }))
    ];

    return {
        id: fileId,
        name: fileData.file_name || fileData.file_path?.split("/").pop() || "Unknown",
        type: "file",
        file_data: fileData,
        children
    };
};

/**
 * Check if Code tab is active and visible
 * @returns {boolean} True if tab is active and visible
 */
export const isCodeTabActive = () => {
    const codeTab = document.getElementById("tabContent-code");
    if (!codeTab) return false;

    const isHidden = codeTab.style.display === "none" ||
        (!codeTab.classList.contains("active") && window.getComputedStyle(codeTab).display === "none");

    return !isHidden;
};

/**
 * Update active state in tree
 */
export const updateTreeActiveState = () => {
    const treeContainer = document.getElementById("codeNavigatorList");
    if (!treeContainer) return;

    const allItems = treeContainer.querySelectorAll(".structure-item");
    allItems.forEach(item => item.classList.remove("active"));

    const selectedClassId = getSelectedClassId();
    const selectedMethodId = getSelectedMethodId();

    if (selectedClassId) {
        const classItem = treeContainer.querySelector(`[data-node-id="${selectedClassId}"]`);
        classItem?.classList.add("active");
    }

    if (selectedMethodId) {
        const methodItem = treeContainer.querySelector(`[data-node-id="${selectedMethodId}"]`);
        methodItem?.classList.add("active");
    }
};

/**
 * Update active state of tabs
 * @param {HTMLElement} activeTab - Active tab element
 * @param {string} targetTab - Target tab ID
 */
export const updateTabActiveState = (activeTab, targetTabId) => {
    const tabs = document.querySelectorAll(".rd-tab");
    const tabContents = document.querySelectorAll(".rd-tab-content");

    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(tc => tc.classList.remove("active"));

    activeTab?.classList.add("active");
    document.getElementById(targetTabId)?.classList.add("active");
};

/**
 * Update visibility of tab content sections
 * @param {string} targetTab - Target tab ID
 */
export const updateTabContentVisibility = (targetTabId) => {
    const panel = document.querySelector(".rd-left-panel-content");
    if (!panel) return;

    const tabContents = panel.querySelectorAll(".rd-tab-content");
    tabContents.forEach(tc => {
        tc.classList.remove("active");
        tc.style.display = "none";
    });

    const targetContent = document.getElementById(targetTabId);
    if (targetContent) {
        targetContent.classList.add("active");
        targetContent.style.display = "block";
    }
};
// #endregion
