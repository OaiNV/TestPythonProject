/**
 * Unit Test Design Detail Page JavaScript
 * Main entry point - imports and initializes all modules
 */

import { RD_MESSAGES } from "../../commons/error_messages.js";
import { loadFileTree } from "../source_code/source_detail_data.js";

// Import all modules
import * as UTDState from "./utd_detail_state.js";
import * as UTDAPI from "./utd_detail_api.js";
import * as UTDHelpers from "./utd_detail_helpers.js";
import * as UTDUI from "./utd_detail_ui.js";
import * as UTDEvents from "./utd_detail_events.js";
import * as UTDData from "./utd_detail_data.js";

// Import Git handlers
import { handlePushButton, handlePullButton, setupGitButtons } from "./utd_detail_git.js";

// #region Public Functions - Initialization
/**
 * Extract project ID and file ID from URL
 * Format: /projects/{project_id}/utd/{file_id}
 */
const extractIdsFromUrl = () => {
    try {
        const parts = window.location.pathname.split("/");

        const getIdAfter = (keyword) => {
            const index = parts.indexOf(keyword);
            return index !== -1 ? parts[index + 1] || null : null;
        };

        const projectId = getIdAfter("projects");
        const fileId = getIdAfter("utd");

        if (!projectId) {
            console.warn("[extractIdsFromUrl] Missing projectId in URL");
        }

        if (!fileId) {
            console.warn("[extractIdsFromUrl] Missing fileId (utd) in URL");
        }

        console.log(`[extractIdsFromUrl] Result: projectId=${projectId}, fileId=${fileId}`);

        return { projectId, fileId };
    } catch (error) {
        console.error("[extractIdsFromUrl] Error:", error);
        return { projectId: null, fileId: null };
    }
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
    try {
        UTDEvents.handleTabSwitch();
        UTDEvents.handleBackButton();
        UTDEvents.handleSaveCode();
        UTDEvents.handleExpandCode();
        UTDEvents.handleCopyCode();
        UTDEvents.setupLivePreview();
        UTDEvents.handleGenerateUnitTestCode();
        setupGitButtons();
    } catch (error) {
        console.error("[setupEventListeners] Error:", error);
    }
};

/**
 * Initialize the page
 */
const init = async () => {
    try {
        const { projectId, fileId } = extractIdsFromUrl();

        if (!projectId || !fileId) {
            window.showAlert(RD_MESSAGES.INVALID_URL_PARAMETERS, "error");
            window.location.href = "/projects";
            return;
        }

        UTDState.setProjectId(projectId);
        UTDState.setFileId(fileId);
        const navigateToFile = (newFileId) => UTDData.navigateToUTDFile(newFileId);

        setupEventListeners();

        UTDUI.updateTabContentVisibility("tabContent-code");

        await loadFileTree(navigateToFile, projectId);

        await UTDData.loadFileData();

        console.log("[init] Success");
    } catch (error) {
        console.error("[init] Error:", error);
        window.showAlert(RD_MESSAGES.PAGE_INIT_FAILED, "error");
    }
};
// #endregion
export const initializeSaveButton = () => {
    const saveBtn = document.getElementById("saveCodeBtn");
    if (saveBtn) {
        saveBtn.style.display = "none";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initializeSaveButton();
});
// Wait for APIClient to be ready before initializing
const waitForAPIClient = () => {
    if (window.APIClient) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }
    } else {
        setTimeout(waitForAPIClient, 50);
    }
};

waitForAPIClient();
