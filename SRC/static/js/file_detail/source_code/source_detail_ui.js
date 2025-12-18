/**
 * Source Detail UI Module
 * Handles all UI rendering functions
 */

// #region Imports
import { SRC_MESSAGES } from '../../commons/error_messages.js';
import { renderSidebarFileList, getFileSyncStatus, hasValidCommitId } from '../../commons/file_List.js';
import {
    getFileId,
    getFileData,
    getCodeContent,
    getOriginalContent,
    hasUnsavedChanges,
    setCodeContent,
    setOriginalContent,
    setHasUnsavedChanges,
    getFileDataCache,
    getExpandedFolders,
    addExpandedFolder,
    removeExpandedFolder,
    cacheFileData,
    setSelectedClassId,
    setSelectedMethodId,
    setSelectedMethodData,
    clearSelection,
    getSelectedClassId,
    getSelectedMethodId,
    getSelectedMethodData,
    setCurrentPreviewTab,
    getProjectId,
} from './source_detail_state.js';
import {
    extractRepoName,
    getLanguageImagePath,
    includeSymbolsIfSelected,
    isValidFileId,
    filterFilesWithSyncStatus,
    filterNonPushedFiles,
} from './source_detail_helpers.js';
import { getProject } from './source_detail_api.js';
// #endregion

// #region Constants
let expandedClasses = new Set();
let previewAreaAvailabilityCache = null;
let previewAreaWarningLogged = false;
// #endregion

// #region Public Functions - Expanded Classes Management
/**
 * Get expanded classes set
 * @returns {Set} Expanded classes set
 */
export const getExpandedClasses = () => expandedClasses;

/**
 * Add class to expanded set
 * @param {string} classId - Class ID
 */
export const addExpandedClass = (classId) => {
    if (!classId) return;
    try {
        expandedClasses.add(classId);
    } catch (error) {
        // Silent fail
    }
};

/**
 * Remove class from expanded set
 * @param {string} classId - Class ID
 */
export const removeExpandedClass = (classId) => {
    if (!classId) return;
    try {
        expandedClasses.delete(classId);
    } catch (error) {
        // Silent fail
    }
};
// #endregion

// #region Private Functions - Preview Helpers
/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
const escapeHtml = (text) => {
    if (!text || typeof text !== 'string') return "";
    try {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    } catch {
        return text || "";
    }
};

/**
 * Normalize line breaks in text
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
const normalizeLineBreaks = (text) => {
    if (!text || typeof text !== 'string') return text || "";
    try {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    } catch {
        return text || "";
    }
};

/**
 * Set preview text content
 * @param {string} elementId - Element ID
 * @param {string} value - Text value
 * @param {string} fallback - Fallback text
 */
const setPreviewTextContent = (elementId, value, fallback = SRC_MESSAGES.NO_PREVIEW_AVAILABLE) => {
    if (!elementId) return;
    try {
        const element = document.getElementById(elementId);
        if (!element) return;
        if (elementId === "unitTestCode") {
            if (value) {
                const normalizedText = normalizeLineBreaks(value);
                element.innerHTML = `<pre><code>${escapeHtml(normalizedText)}</code></pre>`;
            } else {
                element.innerHTML = fallback;
            }
        } else {
            const textValue = value || fallback;
            const normalizedText = normalizeLineBreaks(textValue);
            element.textContent = normalizedText;
        }
    } catch {
        // Silent fail
    }
};

/**
 * Format JSON string with indentation
 * @param {string} jsonString - JSON string
 * @returns {string} Formatted JSON string
 */
const formatJSONString = (jsonString) => {
    if (!jsonString || typeof jsonString !== 'string') return jsonString;
    try {
        const jsonObj = JSON.parse(jsonString);
        return JSON.stringify(jsonObj, null, 2);
    } catch {
        return jsonString;
    }
};

/**
 * Set preview JSON content with proper formatting
 * @param {string} elementId - Element ID
 * @param {string} jsonString - JSON string value
 * @param {string} fallback - Fallback JSON string
 */
const setPreviewJSONContent = (elementId, jsonString, fallback = "決定表とテストサンプルがありません") => {
    if (!elementId) return;
    const element = document.getElementById(elementId);
    if (!element) return;

    if (jsonString) {
        const formattedJson = formatJSONString(jsonString);
        element.innerHTML = `<pre><code>${escapeHtml(formattedJson)}</code></pre>`;
    } else {
        element.innerHTML = `<p class="empty-state">${escapeHtml(fallback)}</p>`;
    }
};
;

/**
 * Set preview HTML content
 * @param {string} elementId - Element ID
 * @param {string} value - HTML value
 * @param {string} fallbackHtml - Fallback HTML
 */
const setPreviewHtmlContent = (elementId, value, fallbackHtml = `<p class="empty-state">${SRC_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`) => {
    if (!elementId) return;
    try {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.innerHTML = value || fallbackHtml;
    } catch {
        // Silent fail
    }
};

/**
 * Parse markdown to HTML
 * @param {string} markdownValue - Markdown value
 * @returns {string} HTML content
 */
const parseMarkdownToHtml = (markdownValue) => {
    if (!markdownValue || typeof markdownValue !== 'string') return "";
    try {
        const normalizedMarkdown = normalizeLineBreaks(markdownValue);
        if (typeof marked !== "undefined") {
            return marked.parse(normalizedMarkdown);
        }
        return `<pre>${escapeHtml(normalizedMarkdown)}</pre>`;
    } catch {
        return `<pre>${escapeHtml(markdownValue || "")}</pre>`;
    }
};

/**
 * Set preview markdown content (parse markdown to HTML)
 * @param {string} elementId - Element ID
 * @param {string} markdownValue - Markdown value
 * @param {string} fallbackHtml - Fallback HTML
 */
const setPreviewMarkdownContent = (elementId, markdownValue, fallbackHtml = `<p class="empty-state">${SRC_MESSAGES.NO_PREVIEW_AVAILABLE}</p>`) => {
    if (!elementId) return;
    try {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (!markdownValue || markdownValue.trim() === "") {
            element.innerHTML = fallbackHtml;
            return;
        }

        const htmlContent = parseMarkdownToHtml(markdownValue);
        element.innerHTML = htmlContent;
    } catch {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = fallbackHtml;
        }
    }
};

/**
 * Create image element for activity diagram
 * @param {string} imageSrc - Image source
 * @returns {HTMLElement} Image element
 */
const createActivityDiagramImage = (imageSrc) => {
    if (!imageSrc) return null;
    try {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.alt = "Activity Diagram";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "0 auto";

        img.onerror = () => {
            const el = document.getElementById("activityDiagram");
            if (el) {
                el.innerHTML = '<p class="empty-state">画像の読み込みに失敗しました</p>';
            }
        };

        return img;
    } catch {
        return null;
    }
};

/**
 * Set activity diagram preview as image
 * @param {string|null} base64Str - Base64 string of the image
 */
const setActivityDiagramPreview = (base64Str) => {
    try {
        const el = document.getElementById("activityDiagram");
        if (!el) return;

        el.innerHTML = "";
        if (!base64Str) {
            el.innerHTML = '<p class="empty-state">図がありません</p>';
            return;
        }

        let imageSrc = base64Str;
        if (!base64Str.startsWith("data:")) {
            imageSrc = `data:image/png;base64,${base64Str}`;
        }

        const img = createActivityDiagramImage(imageSrc);
        if (img) {
            el.appendChild(img);
        }
    } catch {
        const el = document.getElementById("activityDiagram");
        if (el) {
            el.innerHTML = '<p class="empty-state">画像の表示に失敗しました</p>';
        }
    }
};
// #endregion

// #region Private Functions - Preview Area Check
/**
 * Determine if preview elements exist in the DOM
 * @returns {boolean} True if preview area is available
 */
const isPreviewAreaAvailable = () => {
    try {
        if (previewAreaAvailabilityCache === true) {
            previewAreaWarningLogged = false;
            return true;
        }

        const requiredIds = [
            "classDescription",
            "methodDesign",
            "interfaceDesign",
            "activityDiagram",
            "decisionJSON",
            "decisionTable",
            "testPattern",
            "unitTestCode",
        ];

        const isAvailable = requiredIds.every((id) => document.getElementById(id));
        previewAreaAvailabilityCache = isAvailable ? true : null;

        if (isAvailable) {
            previewAreaWarningLogged = false;
        }

        return isAvailable;
    } catch {
        previewAreaAvailabilityCache = null;
        return false;
    }
};
// #endregion

// #region Private Functions - Preview Data Builders
/**
 * Build preview data from detail design
 * @param {Array} detailDesign - Detail design array
 * @returns {Object} Preview data object
 */
const buildPreviewDataFromDetailDesign = (detailDesign) => {
    try {
        if (!detailDesign || detailDesign.length === 0) return {};

        const firstDetailDesign = detailDesign[0];
        const descriptionGroup = firstDetailDesign.description_group || null;
        const detailedDesignGroup = firstDetailDesign.detailed_design_group || null;
        const interfaceDesignGroup = firstDetailDesign.interface_design_group || null;
        const activityDiagramGroup = firstDetailDesign.activity_diagram_group || null;

        if (!descriptionGroup && !detailedDesignGroup && !interfaceDesignGroup && !activityDiagramGroup) {
            return {};
        }

        return {
            pd: {
                class_description: descriptionGroup?.description || null,
                method_design: detailedDesignGroup?.detailed_design || null,
                interface_design: interfaceDesignGroup?.interface_design || null,
                activity_diagram: activityDiagramGroup?.activity_diagram_image || null,
            },
        };
    } catch {
        return {};
    }
};

/**
 * Build preview data from unit test
 * @param {Array} unitTest - Unit test array
 * @returns {Object} Preview data object
 */
const buildPreviewDataFromUnitTest = (unitTest) => {
    try {
        if (!unitTest || unitTest.length === 0) return {};

        const firstUnitTest = unitTest[0];
        const unitTestDesignGroup = firstUnitTest.unit_test_design_group || null;
        const utCodeGroup = firstUnitTest.ut_code_group || null;

        const previewData = {};

        if (unitTestDesignGroup) {
            previewData.utd = {
                decision_json: unitTestDesignGroup.unit_test_design_json || "{}",
                decision_table: unitTestDesignGroup.decision_table || null,
                test_pattern: unitTestDesignGroup.test_pattern || null,
            };
        }

        if (utCodeGroup) {
            previewData.utc = {
                unit_test_code: utCodeGroup.ut_code_content || "",
            };
        }

        return previewData;
    } catch {
        return {};
    }
};

/**
 * Get class detail design data
 * @param {Object} fileData - File data
 * @param {string} classId - Class ID
 * @returns {Object|null} Detail design data or null
 */
const getClassDetailDesignData = (fileData, classId) => {
    if (!fileData || !classId) return null;

    const classes = fileData.classes || [];
    const classData = classes.find(cls => cls.class_id === classId);
    if (classData?.detail_design?.length > 0) {
        return classData.detail_design[0];
    }

    return null;
};

/**
 * Get method detail design data from method data
 * @param {Object} methodData - Method data
 * @returns {Object|null} Detail design data or null
 */
const getMethodDetailDesignFromMethod = (methodData) => {
    if (methodData?.detail_design?.length > 0) {
        return methodData.detail_design[0];
    }
    return null;
};

/**
 * Get detail design data for method
 * @param {Object} methodNode - Method node
 * @param {Object} methodData - Method data
 * @param {Object} fileData - File data
 * @returns {Object|null} Detail design data or null
 */
const getMethodDetailDesignData = (methodNode, methodData, fileData) => {
    try {
        if (!fileData) return null;

        if (methodNode.class_id) {
            return getClassDetailDesignData(fileData, methodNode.class_id);
        }

        return getMethodDetailDesignFromMethod(methodData);
    } catch {
        return null;
    }
};

/**
 * Build preview data for class
 * @param {Object} classData - Class data
 * @returns {Object} Preview data object
 */
const buildClassPreviewData = (classData) => {
    try {
        if (!classData) return {};
        const detailDesign = classData.detail_design || [];
        return buildPreviewDataFromDetailDesign(detailDesign);
    } catch {
        return {};
    }
};

/**
 * Build preview data for method
 * @param {Object} methodNode - Method node
 * @param {Object} methodData - Method data
 * @param {Object} fileData - File data
 * @returns {Object} Preview data object
 */
const buildMethodPreviewData = (methodNode, methodData, fileData) => {
    try {
        const previewData = {};
        const detailDesignData = getMethodDetailDesignData(methodNode, methodData, fileData);

        if (detailDesignData) {
            const pdData = buildPreviewDataFromDetailDesign([detailDesignData]);
            Object.assign(previewData, pdData);
        }

        const unitTest = methodData.unit_test || [];
        if (unitTest.length > 0) {
            const utData = buildPreviewDataFromUnitTest(unitTest);
            Object.assign(previewData, utData);
        }

        return previewData;
    } catch {
        return {};
    }
};

/**
 * Get target tab name from preview data
 * @param {Object} previewData - Preview data object
 * @returns {string|null} Target tab name or null
 */
const getPreviewTargetTab = (previewData) => {
    try {
        if (!previewData || typeof previewData !== 'object') return null;
        if (previewData.pd) return "pd";
        if (previewData.utd) return "utd";
        if (previewData.utc) return "utc";
        return null;
    } catch {
        return null;
    }
};
// #endregion

// #region Private Functions - Preview Rendering
/**
 * Render PD section in preview
 * @param {Object} pdData - PD data
 */
const renderPDSection = (pdData) => {
    try {
        if (!pdData) {
            setPreviewMarkdownContent("classDescription", null, '<p class="empty-state">クラス説明がありません</p>');
            setPreviewMarkdownContent("methodDesign", null, '<p class="empty-state">メソッド設計がありません</p>');
            setPreviewMarkdownContent("interfaceDesign", null, '<p class="empty-state">図がありません</p>');
            setActivityDiagramPreview(null);
            return;
        }

        setPreviewMarkdownContent("classDescription", pdData.class_description, '<p class="empty-state">クラス説明がありません</p>');
        setPreviewMarkdownContent("methodDesign", pdData.method_design, '<p class="empty-state">メソッド設計がありません</p>');
        setPreviewMarkdownContent("interfaceDesign", pdData.interface_design, '<p class="empty-state">図がありません</p>');
        setActivityDiagramPreview(pdData.activity_diagram || null);
    } catch {
        // Silent fail
    }
};

/**
 * Render UTD section in preview
 * @param {Object} utdData - UTD data
 */
const renderUTDSection = (utdData) => {
    try {
        if (!utdData) {
            setPreviewJSONContent("decisionJSON", null), '<p class="empty-state">決定表とテストサンプルがありません</p>';
            setPreviewMarkdownContent("decisionTable", null, '<p class="empty-state">テーブルがありません</p>');
            setPreviewMarkdownContent("testPattern", null, '<p class="empty-state">パターンがありません</p>');
            return;
        }

        setPreviewJSONContent("decisionJSON", utdData.decision_json, '<p class="empty-state">決定表とテストサンプルがありません</p>');
        setPreviewMarkdownContent("decisionTable", utdData.decision_table, '<p class="empty-state">テーブルがありません</p>');
        setPreviewMarkdownContent("testPattern", utdData.test_pattern, '<p class="empty-state">パターンがありません</p>');
    } catch {
        // Silent fail
    }
};

/**
 * Render UTC section in preview
 * @param {Object} utcData - UTC data
 */
const renderUTCSection = (utcData) => {
    try {
        if (!utcData) {
            setPreviewTextContent("unitTestCode", null, '<p class="empty-state">データがありません</p>');
            return;
        }
        setPreviewTextContent("unitTestCode", utcData.unit_test_code, '<p class="empty-state">テストコードがありません</p>');
    } catch {
        // Silent fail
    }
};

/**
 * Render empty preview (all sections empty)
 */
const renderEmptyPreview = () => {
    try {
        setPreviewMarkdownContent("classDescription", null, '<p class="empty-state">クラス説明がありません</p>');
        setPreviewMarkdownContent("methodDesign", null, '<p class="empty-state">メソッド設計がありません</p>');
        setPreviewMarkdownContent("interfaceDesign", null, '<p class="empty-state">図がありません</p>');
        setActivityDiagramPreview(null);
        setPreviewJSONContent("decisionJSON", null, '<p class="empty-state">決定表とテストサンプルがありません</p>');
        setPreviewMarkdownContent("decisionTable", null, '<p class="empty-state">テーブルがありません</p>');
        setPreviewMarkdownContent("testPattern", null, '<p class="empty-state">パターンがありません</p>');
        setPreviewTextContent("unitTestCode", null, '<p class="empty-state">テストコードがありません</p>');
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Preview Rendering
/**
 * Render preview content
 * @param {Object} preview - Preview data
 */
export const renderPreview = (preview) => {
    try {
        if (!isPreviewAreaAvailable()) {
            if (!previewAreaWarningLogged) {
                previewAreaWarningLogged = true;
            }
            return;
        }

        if (!preview) {
            renderEmptyPreview();
            return;
        }

        renderPDSection(preview.pd);
        renderUTDSection(preview.utd);
        renderUTCSection(preview.utc);
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Private Functions - Header Rendering
/**
 * Render file name in header
 * @param {Object} fileData - File data
 */
const renderFileName = (fileData) => {
    if (!fileData) return;
    try {
        const fileNameEl = document.getElementById("fileName");
        if (fileNameEl) {
            fileNameEl.textContent = fileData.file_name || SRC_MESSAGES.FILE_NAME;
        }
    } catch {
        // Silent fail
    }
};

/**
 * Render language icon in header
 * @param {Object} projectInfo - Project info
 */
const renderLanguageIcon = (projectInfo) => {
    if (!projectInfo) return;
    try {
        const languageIconContainer = document.getElementById("languageIconContainer");
        if (!languageIconContainer) return;

        const language = projectInfo.language || projectInfo.programming_language || "";
        const imgPath = getLanguageImagePath(language);
        languageIconContainer.innerHTML = imgPath
            ? `<img src="/static/images/${imgPath}" alt="${language}" class="language-logo" style="width: 24px; height: 24px; margin-right: 8px;" />`
            : "";
    } catch {
        // Silent fail
    }
};

/**
 * Render repository name in header
 * @param {Object} projectInfo - Project info
 */
const renderRepoName = (projectInfo) => {
    if (!projectInfo) return;
    try {
        const repoNameEl = document.getElementById("repoName");
        if (!repoNameEl) return;

        const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name || "";
        repoNameEl.textContent = extractRepoName(repoUrl);
    } catch {
        // Silent fail
    }
};

/**
 * Render branch name in header
 * @param {Object} projectInfo - Project info
 */
const renderBranchName = (projectInfo) => {
    if (!projectInfo) return;
    try {
        const branchNameEl = document.getElementById("branchName");
        if (!branchNameEl) return;

        branchNameEl.textContent = projectInfo.git?.branch || projectInfo.branch_name || projectInfo.branch || SRC_MESSAGES.BRANCH_NAME;
    } catch {
        // Silent fail
    }
};

/**
 * Render repository information in header
 * @param {Object} projectData - Project data
 */
const renderRepoInfo = (projectData) => {
    if (!projectData) return;
    try {
        const projectInfo = projectData.data || projectData;
        renderLanguageIcon(projectInfo);
        renderRepoName(projectInfo);
        renderBranchName(projectInfo);
    } catch {
        // Silent fail
    }
};

/**
 * Render commit date in header
 * @param {Object} fileData - File data
 */
const renderCommitDate = (fileData) => {
    if (!fileData) return;
    try {
        const updateDateEl = document.getElementById("updateDate");
        if (!updateDateEl) return;

        const commitDate = fileData.updated_at || fileData.created_at;
        const dateToFormat = commitDate || new Date().toISOString();
        updateDateEl.textContent = window.BaseUtils?.formatDate(dateToFormat) || "";
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Header Rendering
/**
 * Render file header information
 * @param {Object} fileData - File data
 * @param {Object} projectData - Project data
 */
export const renderHeader = (fileData, projectData) => {
    if (!fileData) return;
    try {
        renderFileName(fileData);
        if (projectData) renderRepoInfo(projectData);
        renderCommitDate(fileData);
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Code Editor
/**
 * Update save button state
 */
export const updateSaveButtonState = () => {
    try {
        const saveBtn = document.getElementById("saveCodeBtn");
        if (!saveBtn) return;

        const hasChanges = hasUnsavedChanges();
        if (hasChanges) {
            saveBtn.classList.add("has-changes");
            saveBtn.style.color = "#ef4444";
            saveBtn.style.display = "inline-block";
            saveBtn.disabled = false;
            saveBtn.style.opacity = "";
        } else {
            saveBtn.classList.remove("has-changes");
            saveBtn.style.color = "";
            saveBtn.style.display = "none";
            saveBtn.disabled = true;
            saveBtn.style.opacity = "0.6";
        }
    } catch {
        // Silent fail
    }
};

/**
 * Render code editor content
 * @param {string} content - Code content
 */
export const renderCodeEditor = (content) => {
    try {
        const codeEditor = document.getElementById("rdCodeEditor");
        if (!codeEditor) return;

        const codeContent = content || "";
        codeEditor.value = codeContent;
        setCodeContent(codeContent);
        setOriginalContent(codeContent);
        setHasUnsavedChanges(false);
        updateSaveButtonState();
        // default to editable when rendering full content
        setEditorReadonly(false);
    } catch {
        // Silent fail
    }
};
/**
 * Set code editor readonly state
 * @param {boolean} isReadonly - true to make readonly, false to make editable
 */
export const setEditorReadonly = (isReadonly) => {
    try {
        const codeEditor = document.getElementById("rdCodeEditor");
        if (codeEditor) {
            codeEditor.readOnly = !!isReadonly;
            codeEditor.classList.toggle("readonly", !!isReadonly);
        }

        const saveBtn = document.getElementById("saveCodeBtn");
        if (saveBtn) {
            if (isReadonly) {
                saveBtn.disabled = true;
                saveBtn.style.opacity = "0.6";
                saveBtn.style.display = "none";
            } else {
                // when editable, visibility is controlled by updateSaveButtonState
                saveBtn.disabled = !hasUnsavedChanges();
                saveBtn.style.opacity = hasUnsavedChanges() ? "" : "0.6";
                saveBtn.style.display = hasUnsavedChanges() ? "inline-block" : "none";
            }
        }
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Private Functions - Tree Node Helpers
/**
 * Get badge label based on node type
 * @param {string} nodeType - Node type
 * @param {string} displayName - Display name
 * @returns {string} Badge label
 */
const getBadgeLabel = (nodeType, displayName) => {
    if (!nodeType) return "•";
    try {
        const badgeMap = {
            "global-method": "gm",
            "class": "C",
            "method": "M",
            "folder": "▸",
        };
        return badgeMap[nodeType] || (displayName?.trim().charAt(0).toUpperCase() || "•");
    } catch {
        return "•";
    }
};

/**
 * Create file icon element
 * @returns {HTMLElement} Image element
 */
const createFileIcon = () => {
    try {
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
    } catch {
        return null;
    }
};

/**
 * Create base node item element
 * @param {Object} node - Node data
 * @returns {HTMLElement} Item element
 */
const createNodeItem = (node) => {
    if (!node || !node.id) return null;
    try {
        const item = document.createElement("div");
        const nodeType = node.type || "file";
        item.className = `structure-item ${nodeType}`;
        item.setAttribute("data-node-id", node.id);

        const displayName = node.name || SRC_MESSAGES.FILE_NAME;

        if (nodeType === "file") {
            item.classList.add("file", "has-svg-icon");
            delete item.dataset.badge;

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
    } catch {
        return null;
    }
};

/**
 * Get initial display state for children container
 * @param {string} nodeType - Node type
 * @param {string} nodeId - Node ID
 * @returns {Object} Display state object
 */
const getChildrenDisplayState = (nodeType, nodeId) => {
    try {
        switch (nodeType) {
            case "file":
                return { shouldDisplay: true, shouldAddExpanded: true };
            case "folder": {
                const shouldDisplay = getExpandedFolders()?.has(nodeId) || false;
                return { shouldDisplay, shouldAddExpanded: shouldDisplay };
            }
            case "class": {
                const wasExpanded = expandedClasses.has(nodeId);
                const shouldDisplay = expandedClasses.size === 0 || wasExpanded;
                return { shouldDisplay, shouldAddExpanded: shouldDisplay };
            }
            default:
                return { shouldDisplay: true, shouldAddExpanded: false };
        }
    } catch {
        return { shouldDisplay: true, shouldAddExpanded: false };
    }
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
const createNodeChildren = (node, item, navigateToFile, createTreeNodeElement, onFileClick, onClassClick, onMethodClick, skipSymbolHydration) => {
    if (!node || !node.children || node.children.length === 0) return null;
    try {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "structure-children";

        const displayState = getChildrenDisplayState(node.type, node.id);
        childrenContainer.style.display = displayState.shouldDisplay ? "block" : "none";

        if (displayState.shouldAddExpanded) {
            item.classList.add("expanded");
            if (node.type === "class") {
                addExpandedClass(node.id);
            }
        }

        node.children.forEach((child) => {
            try {
                const childElement = createTreeNodeElement(child, navigateToFile, onFileClick, onClassClick, onMethodClick, skipSymbolHydration);
                if (childElement) {
                    childrenContainer.appendChild(childElement);
                }
            } catch {
                // Silent fail for child creation
            }
        });

        return childrenContainer;
    } catch {
        return null;
    }
};
// #endregion

// #region Private Functions - Tree Node Click Handlers
/**
 * Setup file node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} navigateToFile - Navigate function
 * @param {Function} onFileClick - Function to handle file click
 */
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
    item.addEventListener("click", (event) => {
        event.stopPropagation();
        if (node.id !== currentFileId) {
            navigateToFile(node.id);
        } else if (onFileClick) {
            onFileClick(node);
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

    try {
        const currentFileId = getFileId();
        setFileNodeActiveState(item, container, node.id, currentFileId);

        if (isValidFileId(node.id) && navigateToFile) {
            setupValidFileClickHandler(item, node, currentFileId, navigateToFile, onFileClick);
        } else {
            setFileNodeDisabledState(item);
        }
    } catch {
        // Silent fail
    }
};

/**
 * Setup class node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Function} onClassClick - Function to handle class click
 */
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

    const isCurrentlyExpanded = childrenContainer.style.display === "block";
    childrenContainer.style.display = isCurrentlyExpanded ? "none" : "block";
    item.classList.toggle("expanded", !isCurrentlyExpanded);

    if (!isCurrentlyExpanded) {
        addExpandedClass(nodeId);
    } else {
        removeExpandedClass(nodeId);
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
    item.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleClassChildrenContainer(item, container, node.id);
        if (onClassClick) {
            onClassClick(node);
        }
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

    try {
        const selectedClassId = getSelectedClassId();
        setClassNodeActiveState(item, node.id, selectedClassId);
        item.style.cursor = "pointer";
        handleClassNodeClick(item, container, node, onClassClick);
    } catch {
        // Silent fail
    }
};

/**
 * Setup method node click handler
 * @param {HTMLElement} item - Item element
 * @param {Object} node - Node data
 * @param {Function} onMethodClick - Function to handle method click
 */
const setupMethodNodeClickHandler = (item, node, onMethodClick) => {
    if (!item || !node) return;
    try {
        const selectedMethodId = getSelectedMethodId();
        if (node.id === selectedMethodId) {
            item.classList.add("active");
        }

        item.style.cursor = "pointer";
        item.addEventListener("click", (event) => {
            event.stopPropagation();
            if (onMethodClick) {
                onMethodClick(node);
            }
        });
    } catch {
        // Silent fail
    }
};

/**
 * Setup folder node click handler
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 */
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

    if (!isVisible) {
        addExpandedFolder(nodeId);
    } else {
        removeExpandedFolder(nodeId);
    }
};

/**
 * Handle folder node click event
 * @param {HTMLElement} item - Item element
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 */
const handleFolderNodeClick = (item, container, node) => {
    item.addEventListener("click", (event) => {
        event.stopPropagation();
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

    try {
        handleFolderNodeClick(item, container, node);
    } catch {
        // Silent fail
    }
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
    try {
        const nodeType = node.type || "file";

        switch (nodeType) {
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
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Tree Node Creation
/**
 * Create DOM element for a tree node
 * @param {Object} node - Tree node data
 * @param {Function} navigateToFile - Function to navigate to file
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 * @param {boolean} skipSymbolHydration - Skip symbol hydration flag
 * @returns {HTMLElement|null} DOM element
 */
export const createTreeNodeElement = (node, navigateToFile, onFileClick, onClassClick, onMethodClick, skipSymbolHydration = false) => {
    if (!node) return null;
    try {
        const hydratedNode = skipSymbolHydration ? node : includeSymbolsIfSelected(node);
        const container = document.createElement("div");
        container.className = "structure-node";

        const item = createNodeItem(hydratedNode);
        if (!item) return null;

        setupNodeClickHandlers(item, container, hydratedNode, navigateToFile, onFileClick, onClassClick, onMethodClick);
        container.appendChild(item);

        const childrenContainer = createNodeChildren(hydratedNode, item, navigateToFile, createTreeNodeElement, onFileClick, onClassClick, onMethodClick, skipSymbolHydration);
        if (childrenContainer) {
            container.appendChild(childrenContainer);
        }

        return container;
    } catch {
        return null;
    }
};
// #endregion

// #region Private Functions - Tree Helpers
/**
 * Helper function to find node in tree by ID
 * @param {Object} node - Tree node
 * @param {string} targetId - Target ID
 * @returns {Object|null} Found node or null
 */
const findNodeInTree = (node, targetId) => {
    if (!node || !targetId) return null;
    try {
        if (node.id === targetId) return node;

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const found = findNodeInTree(child, targetId);
                if (found) return found;
            }
        }

        return null;
    } catch {
        return null;
    }
};

/**
 * Build file node structure from file data
 * @param {Object} fileData - File data
 * @param {string} fileId - File ID
 * @returns {Object} File node structure
 */
const buildFileNodeStructure = (fileData, fileId) => {
    if (!fileData || !fileId) return null;
    try {
        const children = [];
        const classes = fileData.classes || [];

        classes.forEach((cls) => {
            const classChildren = [];
            const methods = cls.methods || [];
            methods.forEach((method) => {
                classChildren.push({
                    id: method.method_id,
                    name: method.method_name,
                    type: "method",
                    method_data: method,
                    class_id: cls.class_id,
                });
            });

            children.push({
                id: cls.class_id,
                name: cls.class_name,
                type: "class",
                class_data: cls,
                children: classChildren,
            });
        });

        const globalMethods = fileData.global_methods || [];
        globalMethods.forEach((method) => {
            children.push({
                id: method.method_id,
                name: method.method_name,
                type: "global-method",
                method_data: method,
            });
        });

        return {
            id: fileId,
            name: fileData.file_name || fileData.file_path?.split("/").pop() || "Unknown",
            type: "file",
            file_data: fileData,
            children: children,
        };
    } catch {
        return null;
    }
};

/**
 * Restore method selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID to restore
 * @param {string} classId - Class ID to restore
 * @param {Object} methodData - Method data to restore
 * @param {Function} onMethodClick - Function to handle method click
 */
const restoreMethodSelection = (fileNode, fileData, methodId, classId, methodData, onMethodClick) => {
    if (!methodId || !fileNode) return;
    try {
        const methodNode = findNodeInTree(fileNode, methodId);
        if (!methodNode || !methodNode.method_data) {
            setSelectedClassId(null);
            setSelectedMethodId(null);
            setSelectedMethodData(null);
            return;
        }

        setSelectedClassId(classId);
        setSelectedMethodId(methodId);
        setSelectedMethodData(methodData || methodNode.method_data);

        if (!methodNode.file_data) {
            methodNode.file_data = fileData;
        }
        if (!methodNode.class_id && classId) {
            methodNode.class_id = classId;
        }

        const structureListEl = document.getElementById("codeNavigatorList");
        if (structureListEl && classId) {
            const classItem = structureListEl.querySelector(`[data-node-id="${classId}"]`);
            if (classItem) {
                const classNode = classItem.closest(".structure-node");
                if (classNode) {
                    const childrenContainer = classNode.querySelector(":scope > .structure-children");
                    if (childrenContainer) {
                        childrenContainer.style.display = "block";
                        classItem.classList.add("expanded");
                    }
                }
            }
        }

        setTimeout(() => {
            if (onMethodClick) {
                onMethodClick(methodNode, true);
            }
            updateTreeActiveState();
        }, 0);
    } catch {
        // Silent fail
    }
};

/**
 * Restore class selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {string} classId - Class ID to restore
 * @param {Function} onClassClick - Function to handle class click
 */
const restoreClassSelection = (fileNode, classId, onClassClick) => {
    if (!classId || !fileNode) return;
    try {
        const classNode = findNodeInTree(fileNode, classId);
        if (!classNode || !classNode.class_data) {
            setSelectedClassId(null);
            setSelectedMethodId(null);
            setSelectedMethodData(null);
            return;
        }

        setSelectedClassId(classId);
        setSelectedMethodId(null);
        setSelectedMethodData(null);

        setTimeout(() => {
            if (onClassClick) {
                onClassClick(classNode, true);
            }
            updateTreeActiveState();
        }, 0);
    } catch {
        // Silent fail
    }
};

/**
 * Restore method selection with class expansion
 * @param {string} classId - Class ID
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID
 * @param {Object} methodData - Method data
 * @param {Function} onMethodClick - Function to handle method click
 */
const restoreMethodSelectionWithExpansion = (classId, fileNode, fileData, methodId, methodData, onMethodClick) => {
    if (!classId || !methodId) return;

    addExpandedClass(classId);
    restoreMethodSelection(fileNode, fileData, methodId, classId, methodData, onMethodClick);
};

/**
 * Restore class selection with expansion
 * @param {string} classId - Class ID
 * @param {Object} fileNode - File node structure
 * @param {Function} onClassClick - Function to handle class click
 */
const restoreClassSelectionWithExpansion = (classId, fileNode, onClassClick) => {
    if (!classId) return;

    addExpandedClass(classId);
    restoreClassSelection(fileNode, classId, onClassClick);
};

/**
 * Restore selection after tree re-render
 * @param {Object} fileNode - File node structure
 * @param {Object} fileData - File data
 * @param {string} classId - Previous class ID
 * @param {string} methodId - Previous method ID
 * @param {Object} methodData - Previous method data
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 */
const restoreSelection = (fileNode, fileData, classId, methodId, methodData, onClassClick, onMethodClick) => {
    if (!classId && !methodId) return;
    try {
        if (methodId) {
            restoreMethodSelectionWithExpansion(classId, fileNode, fileData, methodId, methodData, onMethodClick);
        } else {
            restoreClassSelectionWithExpansion(classId, fileNode, onClassClick);
        }
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Code Tab Rendering
/**
 * Render current file with its classes/functions in Code tab
 * @param {Function} navigateToFile - Function to navigate to file
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 * @param {boolean} preserveSelection - Preserve selection flag
 */
export const renderCodeTabContent = (navigateToFile, onFileClick, onClassClick, onMethodClick, preserveSelection = true) => {
    try {
        const structureListEl = document.getElementById("codeNavigatorList");
        if (!structureListEl) return;

        const fileData = getFileData();
        const fileId = getFileId();

        if (!fileData || !fileId) {
            structureListEl.innerHTML = `<p class="empty-state">${SRC_MESSAGES.NO_FILES_AVAILABLE}</p>`;
            return;
        }

        const previousSelectedClassId = getSelectedClassId();
        const previousSelectedMethodId = getSelectedMethodId();
        const previousSelectedMethodData = getSelectedMethodData();
        structureListEl.innerHTML = "";

        const fileNode = buildFileNodeStructure(fileData, fileId);
        if (!fileNode) return;

        const element = createTreeNodeElement(fileNode, navigateToFile, onFileClick, onClassClick, onMethodClick, true);
        if (element) {
            structureListEl.appendChild(element);
        }

        if (preserveSelection && (previousSelectedClassId || previousSelectedMethodId)) {
            requestAnimationFrame(() => {
                restoreSelection(fileNode, fileData, previousSelectedClassId, previousSelectedMethodId, previousSelectedMethodData, onClassClick, onMethodClick);
            });
        }
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - File Tree Rendering
/**
 * Render file tree section
 * @param {Array} treeData - Normalized tree data
 * @param {Function} navigateToFile - Function to navigate to file
 * @param {Function} onFileClick - Function to handle file click
 * @param {Function} onClassClick - Function to handle class click
 * @param {Function} onMethodClick - Function to handle method click
 */
export const renderFileTree = (treeData, navigateToFile, onFileClick, onClassClick, onMethodClick) => {
    if (!Array.isArray(treeData)) return;
    try {
        const structureListEl = document.getElementById("codeNavigatorList");
        if (!structureListEl) return;

        if (treeData.length === 0) {
            structureListEl.innerHTML = `<p class="empty-state">${SRC_MESSAGES.NO_FILES_AVAILABLE}</p>`;
            return;
        }

        structureListEl.innerHTML = "";

        treeData.forEach((node) => {
            const element = createTreeNodeElement(node, navigateToFile, onFileClick, onClassClick, onMethodClick);
            if (element) {
                structureListEl.appendChild(element);
            }
        });
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Private Functions - Tree Active State
/**
 * Update active state in tree
 */
const updateTreeActiveState = () => {
    try {
        const structureListEl = document.getElementById("codeNavigatorList");
        if (!structureListEl) return;

        const allItems = structureListEl.querySelectorAll(".structure-item");
        allItems.forEach(item => item.classList.remove("active"));

        const selectedClassId = getSelectedClassId();
        const selectedMethodId = getSelectedMethodId();

        if (selectedClassId) {
            const classItem = structureListEl.querySelector(`[data-node-id="${selectedClassId}"]`);
            if (classItem) {
                classItem.classList.add("active");
            }
        }

        if (selectedMethodId) {
            const methodItem = structureListEl.querySelector(`[data-node-id="${selectedMethodId}"]`);
            if (methodItem) {
                methodItem.classList.add("active");
            }
        }
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Git File List Rendering
/**
 * Render Git file list
 * @param {Array} files - Array of files
 */
export const renderGitFileList = (files) => {
    if (!files || !Array.isArray(files)) return;
    try {
        const filteredFiles = filterFilesWithSyncStatus(files);
        renderSidebarFileList("gitFileList", filteredFiles, false);
    } catch {
        // Silent fail
    }
};
// #endregion

// #region Public Functions - Git Branch Info
/**
 * Update branch name in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 */
const updateBranchName = (gitContent, projectInfo) => {
    if (!gitContent || !projectInfo) return;
    try {
        const branchNameEl = gitContent.querySelector("#branchName");
        if (!branchNameEl) return;

        branchNameEl.textContent = projectInfo.git?.branch || projectInfo.branch_name || projectInfo.branch || "Branch Name";
    } catch {
        // Silent fail
    }
};

/**
 * Get latest date from filtered files
 * @param {Array} files - Array of files
 * @returns {string|null} Latest date or null
 */
const getLatestDateFromFiles = (files) => {
    if (!files || !Array.isArray(files) || files.length === 0) return null;
    try {
        const filteredFiles = filterNonPushedFiles(files, getFileSyncStatus);
        if (!filteredFiles || filteredFiles.length === 0) return null;

        const sortedFiles = [...filteredFiles].sort((a, b) => {
            const dateA = new Date(a.updated_at || 0);
            const dateB = new Date(b.updated_at || 0);
            return dateB - dateA;
        });

        return sortedFiles[0]?.updated_at || null;
    } catch {
        return null;
    }
};

/**
 * Format date to string with seconds
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
const formatDateWithSeconds = (dateString) => {
    if (!dateString) return "0000/00/00 00:00:00";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "0000/00/00 00:00:00";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    } catch {
        return "0000/00/00 00:00:00";
    }
};

/**
 * Update branch date in Git content
 * @param {HTMLElement} gitContent - Git content element
 * @param {Object} projectInfo - Project info
 * @param {Array} files - Array of files
 */
const updateBranchDate = (gitContent, projectInfo, files) => {
    if (!gitContent) return;
    try {
        const branchDateEl = gitContent.querySelector("#branchDate");
        if (!branchDateEl) return;

        let branchDate = projectInfo?.updated_at || projectInfo?.last_commit_date || projectInfo?.created_at;
        const latestFileDate = getLatestDateFromFiles(files);
        if (latestFileDate) {
            branchDate = latestFileDate;
        }

        branchDateEl.textContent = formatDateWithSeconds(branchDate);
    } catch {
        // Silent fail
    }
};

/**
 * Set default branch information
 */
const setDefaultBranchInfo = () => {
    try {
        const gitContent = document.getElementById("rdGitContent");
        if (!gitContent) return;

        const branchNameEl = gitContent.querySelector("#branchName");
        const branchDateEl = gitContent.querySelector("#branchDate");

        if (branchNameEl) {
            branchNameEl.textContent = "Branch Name";
        }
        if (branchDateEl) {
            branchDateEl.textContent = "0000/00/00 00:00:00";
        }
    } catch {
        // Silent fail
    }
};

/**
 * Update Git branch information in sidebar
 * @param {Array} files - Files array
 */
export const updateGitBranchInfo = async (files) => {
    try {
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
        updateBranchDate(gitContent, projectInfo, files || []);
    } catch {
        setDefaultBranchInfo();
    }
};
// #endregion

// #region Public Functions - Tree Click Handlers
/**
 * Handle file click - show full source code in code editor
 * @param {Object} fileNode - File node data
 */
export const onFileClick = (fileNode) => {
    try {
        const fileData = fileNode.file_data || getFileData();
        if (!fileData) return;

        const fullSourceCode = fileData.source_code || fileData.content || "";

        clearSelection();
        renderCodeEditor(fullSourceCode);
        setEditorReadonly(false);
        renderPreview(null);
        updateTreeActiveState();
    } catch {
        // Silent fail
    }
};

/**
 * Handle class click - show class content in code editor and update preview tabs
 * @param {Object} classNode - Class node data
 * @param {boolean} skipTreeUpdate - Skip tree update flag
 */
export const onClassClick = (classNode, skipTreeUpdate = false) => {
    try {
        if (!classNode || !classNode.class_data) return;

        const classData = classNode.class_data;
        const classContent = classData.class_content || "";

        setSelectedClassId(classNode.id);
        setSelectedMethodId(null);
        setSelectedMethodData(null);

        renderCodeEditor(classContent);
        setEditorReadonly(true);

        const previewData = buildClassPreviewData(classData);
        if (Object.keys(previewData).length > 0) {
            renderPreview(previewData);
            switchPreviewTab("pd");
        } else {
            renderPreview(null);
        }

        if (!skipTreeUpdate) {
            updateTreeActiveState();
        }
    } catch {
        // Silent fail
    }
};

/**
 * Handle method click - show method content in code editor and update preview tabs
 * @param {Object} methodNode - Method node data
 * @param {boolean} skipTreeUpdate - Skip tree update flag
 */
export const onMethodClick = (methodNode, skipTreeUpdate = false) => {
    try {
        if (!methodNode || !methodNode.method_data) return;

        const methodData = methodNode.method_data;
        const methodContent = methodData.method_content || "";
        const fileData = getFileData();

        if (methodNode.class_id) {
            setSelectedClassId(methodNode.class_id);
        } else {
            setSelectedClassId(null);
        }
        setSelectedMethodId(methodNode.id);
        setSelectedMethodData(methodData);

        renderCodeEditor(methodContent);
        setEditorReadonly(true);

        const previewData = buildMethodPreviewData(methodNode, methodData, fileData);
        const targetTab = getPreviewTargetTab(previewData);

        if (Object.keys(previewData).length > 0) {
            renderPreview(previewData);
            if (targetTab) {
                switchPreviewTab(targetTab);
            }
        } else {
            renderPreview(null);
        }

        if (!skipTreeUpdate) {
            updateTreeActiveState();
        }
    } catch {
        // Silent fail
    }
};
// #endregion

/**
 * Get preview tab configurations
 * @returns {Array} Array of tab configurations
 */
const getPreviewTabConfigs = () => {
    try {
        const tabPD = document.getElementById("tabPD");
        const tabUTD = document.getElementById("tabUTD");
        const tabUTC = document.getElementById("tabUTC");
        const pdContent = document.getElementById("pdContent");
        const utdContent = document.getElementById("utdContent");
        const utcContent = document.getElementById("utcContent");

        return [
            { tab: tabPD, content: pdContent, name: "pd" },
            { tab: tabUTD, content: utdContent, name: "utd" },
            { tab: tabUTC, content: utcContent, name: "utc" }
        ];
    } catch {
        return [];
    }
};

/**
 * Hide all preview tab contents
 * @param {Array} tabConfigs - Tab configurations
 */
const hideAllPreviewTabs = (tabConfigs) => {
    if (!tabConfigs || !Array.isArray(tabConfigs)) return;
    try {
        tabConfigs.forEach(({ content }) => {
            if (content) {
                content.classList.remove("active");
                content.style.display = "none";
            }
        });
    } catch {
        // Silent fail
    }
};

/**
 * Remove active state from all preview tabs
 * @param {Array} tabConfigs - Tab configurations
 */
const removeActiveFromAllTabs = (tabConfigs) => {
    if (!tabConfigs || !Array.isArray(tabConfigs)) return;
    try {
        tabConfigs.forEach(({ tab }) => {
            if (tab) {
                tab.classList.remove("active");
            }
        });
    } catch {
        // Silent fail
    }
};

/**
 * Show selected preview tab
 * @param {Array} tabConfigs - Tab configurations
 * @param {string} tabName - Tab name to show
 */
const showSelectedPreviewTab = (tabConfigs, tabName) => {
    if (!tabConfigs || !Array.isArray(tabConfigs) || !tabName) return;
    try {
        const selectedConfig = tabConfigs.find(config => config.name === tabName);
        if (!selectedConfig || !selectedConfig.tab || !selectedConfig.content) return;

        selectedConfig.tab.classList.add("active");
        selectedConfig.content.classList.add("active");
        selectedConfig.content.style.display = "block";
        setCurrentPreviewTab(tabName);
    } catch {
        // Silent fail
    }
};

/**
 * Switch preview tab programmatically
 * @param {string} tabName - Tab name (pd, utd, utc)
 */
export const switchPreviewTab = (tabName) => {
    if (!tabName) return;
    try {
        const tabConfigs = getPreviewTabConfigs();
        hideAllPreviewTabs(tabConfigs);
        removeActiveFromAllTabs(tabConfigs);
        showSelectedPreviewTab(tabConfigs, tabName);
    } catch {
        // Silent fail
    }
};
