/**
 * Source Code Detail Page JavaScript (Refactored)
 * Main entry point - imports and initializes all modules
 */

// Import state management
import * as State from './source_detail_state.js';

// Import API functions
import * as API from './source_detail_api.js';

// Import helper functions
import * as Helpers from './source_detail_helpers.js';

// Import UI functions
import * as UI from './source_detail_ui.js';

// Import event handlers
import * as Events from './source_detail_events.js';

// Import data loading functions
import * as Data from './source_detail_data.js';

// Import common utilities
import { SRC_MESSAGES } from '../../commons/error_messages.js';
import { extractIdsFromUrl } from './source_detail_helpers.js';

/**
 * Setup all event listeners
 */
const setupEventListeners = () => {
    try {
        const navigateToFile = (newFileId) =>
            Events.navigateToFile(newFileId, () => {
                UI.renderCodeTabContent(navigateToFile, UI.onFileClick, UI.onClassClick, UI.onMethodClick);
            });

        Events.handleTabSwitch((targetTab) => {
            Data.loadTabContent(
                targetTab,
                () => UI.renderCodeTabContent(navigateToFile, UI.onFileClick, UI.onClassClick, UI.onMethodClick),
                () => Data.loadGitFiles(),
                navigateToFile
            );
        });

        Events.handleBackButton();
        Events.handleSaveCode();
        Events.handleExpandCode();
        Events.handleExpandPreview();
        Events.handleCopyCode();
        Events.handleReloadPreview();
        Events.handleGeneratePD();
        Events.handleGenerateUTD();
        Events.handleGenerateUTC();
        Events.handleGitPush();
        Events.handleGitPull();
        Events.handleSubmitIssue();
        Events.handlePreviewTabs();

        const codeEditor = document.getElementById("rdCodeEditor");
        if (codeEditor) {
            codeEditor.addEventListener("input", () => Events.onCodeInput(null));
        }
    } catch (error) {
        console.error("[setupEventListeners] Error:", error);
    }
};


/**
 * Show default action section
 */
const showDefaultActionSection = () => {
    try {
        const actionSection = document.getElementById("rdActionSection");
        if (actionSection) actionSection.style.display = "flex";
    } catch (error) {
        console.error("[showDefaultActionSection] Error:", error);
    }
};
/**
 * Initialize the page
 */
const init = async () => {
    try {
        const { projectId, fileId } = extractIdsFromUrl();
        if (!projectId || !fileId) {
            window.showAlert(SRC_MESSAGES.INVALID_URL_PARAMETERS, "error");
            window.location.href = "/projects";
            return;
        }

        State.setProjectId(projectId);
        State.setFileId(fileId);

        const navigateToFile = (newFileId) =>
            Events.navigateToFile(newFileId, () => {
                UI.renderCodeTabContent(navigateToFile, UI.onFileClick, UI.onClassClick, UI.onMethodClick);
            });

        setupEventListeners();
        showDefaultActionSection();

        await Promise.all([
            Data.loadFileData(() => UI.renderCodeTabContent(navigateToFile, UI.onFileClick, UI.onClassClick, UI.onMethodClick)),
            Data.loadFileTree(navigateToFile)
        ]);
    } catch (error) {
        console.error("[init] Error:", error);
        window.showAlert(SRC_MESSAGES.PAGE_INIT_FAILED, "error");
    }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}