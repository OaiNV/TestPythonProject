/**
 * Git Authentication Helper
 * Provides a shared getGitAuth implementation for all pages.
 */

import { GitAuthDialog } from "./git_auth_dialog.js";
import { getGitCredentials } from "./git_credentials_storage.js";

// #region Constants
const LOG_PREFIX = "[GitAuthHelper]";
const DIALOG_RETRY_DELAY_MS = 200;
const DIALOG_MAX_ATTEMPTS = 25;
let gitAuthDialogInstance = null;
// #endregion

// #region Private Functions
const extractProjectIdFromPath = () => {
  console.info(`${LOG_PREFIX} [extractProjectIdFromPath] Start`);

  try {
    if (typeof window === "undefined") {
      console.warn(`${LOG_PREFIX} [extractProjectIdFromPath] window unavailable`);
      return null;
    }

    const pathName = window?.location?.pathname || "";
    if (!pathName) {
      console.warn(`${LOG_PREFIX} [extractProjectIdFromPath] Missing pathname`);
      return null;
    }

    const segments = pathName.split("/").filter(Boolean);
    const projectIndex = segments.indexOf("projects");
    if (projectIndex === -1 || projectIndex === segments.length - 1) {
      console.warn(`${LOG_PREFIX} [extractProjectIdFromPath] Project ID not found`);
      return null;
    }

    const projectId = segments[projectIndex + 1];
    console.info(`${LOG_PREFIX} [extractProjectIdFromPath] Success - projectId=${projectId}`);
    return projectId;
  } catch (error) {
    console.error(`${LOG_PREFIX} [extractProjectIdFromPath] Error:`, error);
    return null;
  }
};

const getSavedGitAuth = () => {
  console.info(`${LOG_PREFIX} [getSavedGitAuth] Start`);

  try {
    if (typeof window === "undefined") {
      console.warn(`${LOG_PREFIX} [getSavedGitAuth] window unavailable`);
      return null;
    }

    const projectId = extractProjectIdFromPath();
    if (!projectId) {
      console.warn(`${LOG_PREFIX} [getSavedGitAuth] Missing projectId`);
      return null;
    }

    const credentials = getGitCredentials(projectId);
    if (credentials?.user_name && credentials?.token_password) {
      console.info(`${LOG_PREFIX} [getSavedGitAuth] Success - projectId=${projectId}`);
      return {
        userName: credentials.user_name,
        tokenPassword: credentials.token_password,
      };
    }

    console.info(`${LOG_PREFIX} [getSavedGitAuth] No stored credentials - projectId=${projectId}`);
    return null;
  } catch (error) {
    console.error(`${LOG_PREFIX} [getSavedGitAuth] Error:`, error);
    return null;
  }
};

const waitForDialogElements = async () => {
  console.info(`${LOG_PREFIX} [waitForDialogElements] Start`);

  try {
    if (typeof document === "undefined") {
      console.error(`${LOG_PREFIX} [waitForDialogElements] document unavailable`);
      throw new Error("DOCUMENT_NOT_AVAILABLE");
    }

    for (let attempt = 0; attempt < DIALOG_MAX_ATTEMPTS; attempt += 1) {
      const patDialog = document.getElementById("gitPatDialog");
      const bucketDialog = document.getElementById("gitBucketDialog");

      if (patDialog && bucketDialog) {
        console.info(`${LOG_PREFIX} [waitForDialogElements] Success - attempt=${attempt}`);
        return true;
      }

      if (document.readyState === "loading" && attempt === 0) {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve, { once: true });
        });
        continue;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, DIALOG_RETRY_DELAY_MS);
      });
    }

    const error = new Error("Git dialog elements not available");
    console.warn(`${LOG_PREFIX} [waitForDialogElements] Exhausted attempts`);
    throw error;
  } catch (error) {
    console.error(`${LOG_PREFIX} [waitForDialogElements] Error:`, error);
    throw error;
  }
};

const ensureGitAuthDialog = async () => {
  console.info(`${LOG_PREFIX} [ensureGitAuthDialog] Start`);

  try {
    if (typeof window === "undefined") {
      console.error(`${LOG_PREFIX} [ensureGitAuthDialog] window unavailable`);
      throw new Error("WINDOW_NOT_AVAILABLE");
    }

    if (gitAuthDialogInstance) {
      console.info(`${LOG_PREFIX} [ensureGitAuthDialog] Reuse existing instance`);
      return gitAuthDialogInstance;
    }

    await waitForDialogElements();
    gitAuthDialogInstance = new GitAuthDialog({
      onSuccess: () => {},
      onCancel: () => {},
      onError: () => {},
    });

    console.info(`${LOG_PREFIX} [ensureGitAuthDialog] Success`);
    return gitAuthDialogInstance;
  } catch (error) {
    console.error(`${LOG_PREFIX} [ensureGitAuthDialog] Error:`, error);
    throw error;
  }
};
// #endregion

// #region Public Functions
export const getGitAuth = async (repoUrl) => {
  console.info(`${LOG_PREFIX} [getGitAuth] Start`);

  try {
    if (typeof window === "undefined") {
      console.error(`${LOG_PREFIX} [getGitAuth] window unavailable`);
      throw new Error("WINDOW_NOT_AVAILABLE");
    }

    if (!repoUrl) {
      console.warn(`${LOG_PREFIX} [getGitAuth] Missing repoUrl`);
    }

    const savedCredentials = getSavedGitAuth();
    if (savedCredentials) {
      console.info(`${LOG_PREFIX} [getGitAuth] Using saved credentials`);
      console.info(`${LOG_PREFIX} [getGitAuth] Success`);
      return savedCredentials;
    }

    const dialog = await ensureGitAuthDialog();
    const credentials = await dialog.showDialogPromise(repoUrl);
    console.info(`${LOG_PREFIX} [getGitAuth] Success`);
    return credentials;
  } catch (error) {
    console.error(`${LOG_PREFIX} [getGitAuth] Error:`, error);
    throw error;
  }
};

window.getGitAuth = getGitAuth;
window.getGitAuthDialog = ensureGitAuthDialog;
// #endregion


