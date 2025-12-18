/**
 * Source Detail Events Module
 * Handles all event listeners and action handlers
 */

import { SRC_MESSAGES } from '../../commons/error_messages.js';
import { showCommitMessageModal } from '../../commons/commit_modal.js';
import {
    getProjectId,
    getFileId,
    hasUnsavedChanges,
    getOriginalContent,
    getCurrentTab,
    setCurrentTab,
    setCurrentPreviewTab,
    isCodeExpanded,
    isPreviewExpanded,
    setIsCodeExpanded,
    setIsPreviewExpanded,
    setExpandListenersAttached,
    areExpandListenersAttached,
    setCodeInputDebounceTimer,
    getCodeInputDebounceTimer,
    getFileData,
    setFileData,
    setCodeContent,
    setOriginalContent,
    setHasUnsavedChanges,
    cacheFileData,
    getFileDataCache,
    clearSelection,
} from './source_detail_state.js';
import {
    getSourceFile,
    saveSourceFile,
    getProject,
    generatePD,
    generateUTD,
    generateUTC,
    gitPush,
    gitPull,
    createIssue,
} from './source_detail_api.js';
import {
    renderHeader,
    renderCodeEditor,
    renderPreview,
    renderCodeTabContent,
    updateSaveButtonState,
} from './source_detail_ui.js';
import { parseCodeBasic } from './source_detail_helpers.js';
import { loadGitFiles } from './source_detail_data.js';

/**
 * Handle tab click
 * @param {HTMLElement} tab - Tab element
 * @param {Function} loadTabContent - Function to load tab content
 */
const onTabClick = (tab, loadTabContent) => {
    const targetTab = tab.getAttribute("data-tab");
    if (!targetTab) return;

    // Update current tab state
    if (targetTab === "tabContent-code") {
        setCurrentTab("code");
    } else if (targetTab === "tabContent-batchProcessing") {
        setCurrentTab("batchProcessing");
    } else if (targetTab === "tabContent-git") {
        setCurrentTab("git");
    }

    updateTabActiveState(tab, targetTab);
    updateTabContentVisibility(targetTab);
    if (loadTabContent) {
        loadTabContent(targetTab);
    }
};

/**
 * Update active state of tabs (only for left panel tabs)
 * @param {HTMLElement} activeTab - Active tab element
 * @param {string} targetTab - Target tab ID
 */
const updateTabActiveState = (activeTab, targetTab) => {
    // Only update left panel tabs, not preview tabs
    const leftPanelTabs = document.querySelectorAll(".rd-left-panel .rd-tab");
    const leftPanelTabContents = document.querySelectorAll(".rd-left-panel .rd-tab-content");

    leftPanelTabs.forEach(t => t.classList.remove("active"));
    leftPanelTabContents.forEach(tc => {
        tc.classList.remove("active");
        tc.style.display = "none";
    });

    activeTab.classList.add("active");
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.add("active");
        targetContent.style.display = "block";
    }
};

/**
 * Update visibility of tab content sections (only left panel tabs, not preview tabs)
 * @param {string} targetTab - Target tab ID
 */
export const updateTabContentVisibility = (targetTab) => {
    const leftPanelTabContents = document.querySelectorAll(".rd-left-panel .rd-tab-content");
    leftPanelTabContents.forEach(content => {
        content.style.display = "none";
        content.classList.remove("active");
    });

    const targetContent = document.getElementById(targetTab);
    if (targetContent?.closest(".rd-left-panel")) {
        targetContent.style.display = "block";
        targetContent.classList.add("active");
    }

    const leftPanel = document.querySelector(".rd-left-panel");
    leftPanel?.classList.toggle("git-tab-active", targetTab === "tabContent-git");
};

/**
 * Handle tab switching (only for left panel tabs: Code, Batch Processing, Git)
 * @param {Function} loadGitFiles - Function to load tab content
 */
export const handleTabSwitch = (loadTabContent) => {
    const leftPanelTabs = document.querySelectorAll(".rd-left-panel .rd-tab");
    if (!leftPanelTabs.length) return;

    leftPanelTabs.forEach(tab => tab.addEventListener("click", () => onTabClick(tab, loadTabContent)));
};

/**
 * Handle back button click
 */
export const handleBackButton = () => {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;

    backBtn.addEventListener("click", () => {
        const projectId = getProjectId();

        // Get tab from URL query parameter to preserve it when navigating back
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab") || "sourceCode";

        if (projectId) {
            // Navigate back with tab parameter to restore the tab
            window.location.href = `/projects/${projectId}?tab=${tab}`;
        } else {
            window.location.href = "/projects";
        }
    });
};

const attachClickListener = (btnId, handler) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", handler);
};
/**
 * Handle save code button
 */
export const handleSaveCode = () => attachClickListener("saveCodeBtn", async () => await onSaveCode());

/**
 * Handle expand code and preview buttons
 */
export const handleExpandCode = () => {
    if (areExpandListenersAttached()) return;

    document.addEventListener("click", (e) => {
        e.target.closest("#expandCodeBtn") && onExpandCodeClick(e);
        e.target.closest("#expandPreviewBtn") && onExpandPreviewClick(e);
    });

    setExpandListenersAttached(true);
};

/**
 * Handle expand preview button
 */
export const handleExpandPreview = () => {
};

/**
 * Handle copy code button
 */
export const handleCopyCode = () => attachClickListener("copyCodeBtn", async () => await onCopyCode());

/**
 * Handle reload preview button
 */
export const handleReloadPreview = () => attachClickListener("reloadPreviewBtn", async () => await onReloadPreview());


const attachClickHandler = (btnId, handler) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", handler);
};
/**
 * Handle generate detailed design button
 */
export const handleGeneratePD = () => attachClickHandler("generateDetailedDesignBtn", async () => await onGeneratePD());

/**
 * Handle generate unit test spec button
 */
export const handleGenerateUTD = () => attachClickHandler("generateUnitTestSpecBtn", async () => await onGenerateUTD());

/**
 * Handle generate unit test code button
 */
export const handleGenerateUTC = () => attachClickHandler("generateUnitTestCodeBtn", async () => await onGenerateUTC());

/**
 * Handle Git push button
 */
export const handleGitPush = () => attachClickHandler("pushBtn", async () => await onGitPush());

/**
 * Handle Git pull button
 */
export const handleGitPull = () => attachClickHandler("pullBtn", async () => await onGitPull());

/**
 * Handle submit issue button
 */
export const handleSubmitIssue = () => attachClickHandler("submitIssueBtn", async () => await onSubmitIssue());

/**
 * Handle preview tabs
 */
export const handlePreviewTabs = () => {
    const tabConfigs = [
        { tab: document.getElementById("tabPD"), content: document.getElementById("pdContent"), name: "pd" },
        { tab: document.getElementById("tabUTD"), content: document.getElementById("utdContent"), name: "utd" },
        { tab: document.getElementById("tabUTC"), content: document.getElementById("utcContent"), name: "utc" },
    ];

    tabConfigs.forEach(({ tab, content, name }) => {
        if (!tab || !content) return;
        tab.addEventListener("click", (e) => {
            e.stopPropagation();

            tabConfigs.forEach(({ content: c, tab: t }) => {
                c.style.display = "none";
                c.classList.remove("active");
                t?.classList.remove("active");
            });

            content.style.display = "block";
            content.classList.add("active");
            tab.classList.add("active");

            setCurrentPreviewTab(name);
        });
    });
};

/**
 * Handle save code action
 */
export const onSaveCode = async () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    const projectId = getProjectId();
    const fileId = getFileId();

    if (!codeEditor) return window.showAlert(SRC_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");
    if (!projectId || !fileId) return window.showAlert(SRC_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");

    const content = codeEditor.value;

    window.BaseUtils.showLoading();
    try {
        await saveSourceFile(projectId, fileId, content);
        await loadGitFiles();
        setCodeContent(content);
        setOriginalContent(content);
        setHasUnsavedChanges(false);
        updateSaveButtonState();
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Handle code editor input with debounce for real-time parsing
 * @param {Function} renderCodeTabContent - Function to render code tab content
 */
export const onCodeInput = (renderCodeTabContent) => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return;

    const currentContent = codeEditor.value;
    setCodeContent(currentContent);
    setHasUnsavedChanges(currentContent !== getOriginalContent());
    updateSaveButtonState();

    if (!renderCodeTabContent) return;

    clearTimeout(getCodeInputDebounceTimer());
    const timer = setTimeout(() => {
        try {
            let fileData = getFileData() || { file_id: getFileId(), file_name: "Unknown", classes: [], global_methods: [] };
            setFileData(fileData);

            const fileName = fileData.file_name || "";
            const language = fileName.endsWith(".java") ? "Java" : fileName.endsWith(".cs") ? "Csharp" : "Python";

            const parsed = parseCodeBasic(currentContent, language);
            fileData.classes = parsed.classes || [];
            fileData.global_methods = parsed.global_methods || [];
            setFileData(fileData);

            const fileId = getFileId();
            if (fileId) {
                const fileDataCache = getFileDataCache();
                cacheFileData(fileId, { ...fileDataCache[fileId], classes: parsed.classes || [], global_methods: parsed.global_methods || [] });
            }

            renderCodeTabContent();
        } catch { }
    }, 500);

    setCodeInputDebounceTimer(timer);
};

// Handle expand/collapse container
const toggleContainerExpansion = (section) => {
    const container = document.querySelector(".code-preview-container");
    if (!container) return;

    const isCode = section === "code";
    const isPreview = section === "preview";
    const expanded = isCode ? isCodeExpanded() : isPreviewExpanded();

    setIsCodeExpanded(isCode ? !expanded : false);
    setIsPreviewExpanded(isPreview ? !expanded : false);

    container.classList.remove("code-expanded", "preview-expanded");
    if (!expanded) container.classList.add(`${section}-expanded`);
};

/**
 * Handle expand code button click
 * @param {Event} e - Click event
 */
export const onExpandCodeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleContainerExpansion("code");
};

/**
 * Handle expand preview button click
 * @param {Event} e - Click event
 */
export const onExpandPreviewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleContainerExpansion("preview");
};

const handleProjectFileAction = async (actionFn, renderKey, successMsg, failMsg) => {
    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || !fileId) return window.showAlert(SRC_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");

    window.BaseUtils.showLoading();
    try {
        const result = await actionFn(projectId, fileId);
        if (result && renderKey) renderPreview({ [renderKey]: result });
        if (result && successMsg) window.showAlert(successMsg, "success");
    } catch {
        failMsg && window.showAlert(failMsg, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Handle copy code action
 */
export const onCopyCode = async () => {
    const codeEditor = document.getElementById("rdCodeEditor");
    if (!codeEditor) return window.showAlert(SRC_MESSAGES.CODE_EDITOR_NOT_FOUND, "error");

    const text = codeEditor.value;
    try {
        if (window.BaseUtils?.copyToClipboard) await window.BaseUtils.copyToClipboard(text);
        else await navigator.clipboard.writeText(text);
    } catch {
        window.showAlert(SRC_MESSAGES.CODE_COPY_FAILED, "error");
    }
};

/**
 * Handle reload preview action
 */
export const onReloadPreview = async () =>
    handleProjectFileAction(getSourceFile, "preview", SRC_MESSAGES.PREVIEW_RELOADED, SRC_MESSAGES.PREVIEW_RELOAD_FAILED);

/**
 * Handle generate detailed design action
 */
export const onGeneratePD = async () => {
    const confirmed = await window.confirm(
        SRC_MESSAGES.DETAIL_DESIGN_GENERATE_TITLE,
        SRC_MESSAGES.DETAIL_DESIGN_GENERATE_CONFIRM
    );
    if (!confirmed) return;

    await handleProjectFileAction(generatePD, "pd", SRC_MESSAGES.DETAIL_DESIGN_GENERATE_SUCCESS, SRC_MESSAGES.DETAIL_DESIGN_GENERATE_FAILED);
};

/**
 * Handle generate unit test spec action
 */
export const onGenerateUTD = async () => {
    const confirmed = await window.confirm(
        SRC_MESSAGES.UNIT_TEST_SPEC_GENERATE_TITLE,
        SRC_MESSAGES.UNIT_TEST_SPEC_GENERATE_CONFIRM
    );
    if (!confirmed) return;

    await handleProjectFileAction(generateUTD, "utd", SRC_MESSAGES.UNIT_TEST_SPEC_GENERATE_SUCCESS, SRC_MESSAGES.UNIT_TEST_SPEC_GENERATE_FAILED);
};

/**
 * Handle generate unit test code action
 */
export const onGenerateUTC = async () => {
    const confirmed = await window.confirm(
        SRC_MESSAGES.UNIT_TEST_CODE_GENERATE_TITLE,
        SRC_MESSAGES.UNIT_TEST_CODE_GENERATE_CONFIRM
    );
    if (!confirmed) return;

    await handleProjectFileAction(generateUTC, "utc", SRC_MESSAGES.UNIT_TEST_CODE_GENERATE_SUCCESS, SRC_MESSAGES.UNIT_TEST_CODE_GENERATE_FAILED);
};

// #region Private Functions - Git File List
/**
 * Get all files from gitFileList div (no filtering)
 * @returns {Array<string>} Array of file IDs
 */
const getAllFilesFromGitFileList = () => {
    const gitFileList = document.getElementById("gitFileList");
    if (!gitFileList) return [];
    return Array.from(gitFileList.querySelectorAll(".file-item"))
        .map(item => item.dataset.fileId)
        .filter(Boolean);
};
// #endregion

/**
 * Handle Git push action
 */
export const onGitPush = async () => {
    const projectId = getProjectId();
    const fileIds = getAllFilesFromGitFileList();
    if (!projectId || !fileIds.length) return window.showAlert(SRC_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");

    const confirmed = await window.confirm(SRC_MESSAGES.GIT_PUSH_CONFIRM_TITLE, SRC_MESSAGES.GIT_PUSH_CONFIRM_MESSAGE);
    if (!confirmed) return;

    const commitMessage = await showCommitMessageModal();
    if (!commitMessage) return;

    window.BaseUtils.showLoading();
    try {
        const projectData = await getProject(projectId);
        const projectInfo = projectData.data || projectData;
        const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name;
        if (!repoUrl) return window.showAlert(SRC_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");

        const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

        await gitPush({ projectId, fileIds, commitMessage, repoUrl, userName, tokenPassword });
        await loadGitFiles();
    } catch {
        window.showAlert(SRC_MESSAGES.GIT_PUSH_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

const ensureProjectFile = (fileRequired = true) => {
    const projectId = getProjectId();
    const fileId = getFileId();
    if (!projectId || (fileRequired && !fileId)) {
        window.showAlert(SRC_MESSAGES.PROJECT_ID_OR_FILE_ID_MISSING, "error");
        return null;
    }
    return { projectId, fileId };
};
/**
 * Handle Git pull action
 */
export const onGitPull = async () => {
    const project = ensureProjectFile(false);
    if (!project) return;

    const confirmed = await window.confirm(SRC_MESSAGES.GIT_PULL_CONFIRM_TITLE, SRC_MESSAGES.GIT_PULL_CONFIRM_MESSAGE);
    if (!confirmed) return;

    window.BaseUtils.showLoading();
    try {
        const projectData = await getProject(project.projectId);
        const projectInfo = projectData.data || projectData;
        const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name;
        if (!repoUrl) return window.showAlert(SRC_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");

        const { userName, tokenPassword } = await window.getGitAuth(repoUrl);
        await gitPull({ projectId: project.projectId, repoUrl, userName, tokenPassword });

        window.location.reload();
    } catch (error) {
        console.error("[onGitPull] Pull error:", error);
        window.showAlert(SRC_MESSAGES.GIT_PULL_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
        // Don't change tab - keep current tab active
    }
};
/**
 * Handle submit issue action
 */
export const onSubmitIssue = async () => {
    console.log("[onSubmitIssue] Start");
    const project = ensureProjectFile(true);
    if (!project) return;

    const titleEl = document.getElementById("issueTitle");
    const contentEl = document.getElementById("issueContent");
    if (!titleEl || !contentEl) return window.showAlert(SRC_MESSAGES.ISSUE_TITLE_OR_CONTENT_MISSING, "error");

    const title = titleEl.value.trim();
    const content = contentEl.value.trim();
    if (!title || !content) return window.showAlert(SRC_MESSAGES.ISSUE_TITLE_OR_CONTENT_MISSING, "error");

    window.BaseUtils.showLoading();
    try {
        const projectData = await getProject(project.projectId);
        const projectInfo = projectData.data || projectData;
        const repoUrl = projectInfo.git?.repository || projectInfo.repository_name || projectInfo.repo_name;
        if (!repoUrl) return window.showAlert(SRC_MESSAGES.REPOSITORY_URL_NOT_FOUND, "warning");

        const { userName, tokenPassword } = await window.getGitAuth(repoUrl);

        await createIssue(project.projectId, project.fileId, title, content, null, userName, tokenPassword);
        titleEl.value = "";
        contentEl.value = "";
        // window.showAlert(SRC_MESSAGES.ISSUE_SUBMIT_SUCCESS, "success");
        console.log("[onSubmitIssue] Success");
    } catch (error) {
        console.error("[onSubmitIssue] Submit error:", error);
        window.showAlert(SRC_MESSAGES.ISSUE_SUBMIT_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};

/**
 * Navigate to another file
 * @param {string} newFileId - New file ID
 * @param {Function} renderCodeTabContent - Function to render code tab content
 */
export const navigateToFile = async (newFileId, renderCodeTabContent) => {
    if (!newFileId) return;

    if (hasUnsavedChanges()) {
        const confirmed = await window.confirm(SRC_MESSAGES.UNSAVED_CHANGES_TITLE, SRC_MESSAGES.UNSAVED_CHANGES_MESSAGE);
        if (!confirmed) return;
    }

    const project = ensureProjectFile(true);
    if (!project) return;

    if (newFileId === getFileId()) return;

    window.BaseUtils.showLoading();
    try {
        const [fileData, projectData] = await Promise.all([
            getSourceFile(project.projectId, newFileId),
            getProject(project.projectId),
        ]);

        setFileData(fileData);
        cacheFileData(newFileId, fileData);
        clearSelection();

        window.history.pushState({ projectId: project.projectId, fileId: newFileId }, "", `/projects/${project.projectId}/src/${newFileId}`);

        renderHeader(fileData, projectData);
        renderCodeEditor(fileData.source_code || fileData.content || "");
        if (fileData.preview) renderPreview(fileData.preview);
        renderCodeTabContent?.();
    } catch (error) {
        console.error("[navigateToFile] Error:", error);
        window.showAlert(SRC_MESSAGES.FILE_LOAD_FAILED, "error");
    } finally {
        window.BaseUtils.hideLoading();
    }
};