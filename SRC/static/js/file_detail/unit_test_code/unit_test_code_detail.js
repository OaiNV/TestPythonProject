/**
 * Unit Test Code Detail Page Main Entry Point
 * Initializes and coordinates all unit test code detail page functionality
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { loadFileTree } from '../source_code/source_detail_data.js';
import { extractIdsFromUrl } from './utc_detail_helpers.js';
import { loadFileData } from './utc_detail_data.js';
import {
    navigateToUTCFile,
    handleTabSwitch,
    handleBackButton,
    handleSaveCode,
    handleCopyCode,
    setupLiveCodeParsing,
    setupGitButtons,
    updateTabContentVisibility
} from './utc_detail_event.js';
import { setProjectId, setFileId } from './utc_detail_state.js';

/**
 * Setup all event listeners
 */
const setupEventListeners = (navigateToFile) => {
    handleTabSwitch(navigateToFile);
    handleBackButton();
    handleSaveCode();
    handleCopyCode();
    setupLiveCodeParsing(navigateToFile);
    setupGitButtons(navigateToFile);
};

/**
 * Initialize the page
 */
const init = async () => {
    console.log("[init] Start");

    try {
        const { projectId, fileId } = extractIdsFromUrl();

        if (!projectId || !fileId) {
            window.showAlert(RD_MESSAGES.INVALID_URL_PARAMETERS, "error");
            window.location.href = "/projects";
            return;
        }

        setProjectId(projectId);
        setFileId(fileId);

        const navigateToFile = (newFileId) => navigateToUTCFile(newFileId, navigateToFile);

        setupEventListeners(navigateToFile);

        updateTabContentVisibility("tabContent-code");

        await loadFileTree(navigateToFile, projectId);

        await loadFileData(navigateToFile);

    } catch (error) {
        window.showAlert(RD_MESSAGES.PAGE_INIT_FAILED, "error");
    }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}