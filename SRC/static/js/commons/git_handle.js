import { PROJECT_MESSAGES, HTTP_MESSAGES, GIT_ERROR_MESSAGES } from "./error_messages.js";
import {
  saveGitCredentials,
  removeGitCredentials,
} from "./git_credentials_storage.js";
import { getProjectData, getRepoUrl } from "../project_detail/project_detail_state.js";
import { PROJECT_CONFIG } from "../project_detail/project_detail_config.js";

const getListBranches = async (
  projectId,
  userName,
  tokenPassword = null,
  repoUrl = null
) => {
  console.log("[API] POST List Branches - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/git/list-branch`;
    const body = {
      user_name: userName,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");

      removeGitCredentials(projectId);

      throw new Error(errorMsg);
    }

    // Save credentials on 200 response
    const repoUrl = getRepoUrl();
    if (repoUrl) {
      saveGitCredentials(projectId, userName, tokenPassword, repoUrl);
      console.log("[API] Credentials saved to localStorage");
    }

    return data;
  } catch (error) {
    console.error("[API] POST List Branches Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

const pullGitData = async (
  projectId,
  userName,
  tokenPassword = null,
  forceOverride = false
) => {
  console.log(
    "[API] POST Pull Git Data - projectId:",
    projectId,
    "forceOverride:",
    forceOverride
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/git/pull`;
    const body = {
      user_name: userName,
      force_override: forceOverride,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409 && data.conflict_files) {
        let conflictFiles = [];

        if (data.conflict_files && Array.isArray(data.conflict_files)) {
          conflictFiles = data.conflict_files;
        } else if (
          data.detail &&
          data.detail.conflict_files &&
          Array.isArray(data.detail.conflict_files)
        ) {
          conflictFiles = data.detail.conflict_files;
        } else if (
          data.data &&
          data.data.conflict_files &&
          Array.isArray(data.data.conflict_files)
        ) {
          conflictFiles = data.data.conflict_files;
        }

        console.log(
          "[API] POST Pull Git Data Conflict - conflictFiles found:",
          conflictFiles.length,
          "data structure:",
          Object.keys(data)
        );

        return {
          isConflict: true,
          conflictFiles: conflictFiles,
          statusCode: data.statusCode || 409,
          message:
            data.message ||
            "Conflict detected. Some files could not be merged automatically.",
        };
      }

      const errorMsg =
        data.error_message ||
        data.message ||
        PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");

      if (GIT_ERROR_MESSAGES.some(msg => errorMsg.includes(msg))) {
        removeGitCredentials(projectId);
        console.log("[API] Git credentials removed due to git error");
      }

      throw new Error(errorMsg);
    }

    const projectData = getProjectData();
    const repoUrl = projectData?.git?.repository;
    if (repoUrl) {
      saveGitCredentials(projectId, userName, tokenPassword, repoUrl);
      console.log("[API] Credentials saved to localStorage");
    }

    console.log("[API] POST Pull Git Data Success");
    return data;
  } catch (error) {
    console.error("[API] POST Pull Git Data Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

const checkRepoChanges = async (
  projectId,
  userName,
  tokenPassword = null
) => {
  console.log("[API] POST Check Repo Changes - projectId:", projectId);

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/git/check-changes`;
    const body = {
      user_name: userName,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message ||
        data.message ||
        PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      console.error("[API] POST Check Repo Changes Error:", errorMsg);
      
      if (GIT_ERROR_MESSAGES.some(msg => errorMsg.includes(msg))) {
        removeGitCredentials(projectId);
        console.log("[API] Git credentials removed due to git error");
      }
      
      throw new Error(errorMsg);
    }

    const repoUrl = getRepoUrl();
    console.log(8888888, repoUrl);
    
    if (repoUrl) {
      saveGitCredentials(projectId, userName, tokenPassword, repoUrl);
      console.log("[API] Credentials saved to localStorage");
    }

    console.log("[API] POST Check Repo Changes Success");
    return data;
  } catch (error) {
    console.error("[API] POST Check Repo Changes Error:", error);
    throw error;
  }
};

const changeBranch = async (
  projectId,
  branchName,
  userName,
  tokenPassword = null,
  force = false
) => {
  console.log(
    "[API] POST Change Branch - projectId:",
    projectId,
    "branchName:",
    branchName,
    "force:",
    force
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/git/change-branch`;
    const body = {
      branch_name: branchName,
      user_name: userName,
      force: force,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error_message ||
        data.message ||
        PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");

      if (GIT_ERROR_MESSAGES.some(msg => errorMsg.includes(msg))) {
        removeGitCredentials(projectId);
        console.log("[API] Git credentials removed due to git error");
      }

      throw new Error(errorMsg);
    }

    const repoUrl = getRepoUrl();
    if (repoUrl) {
      saveGitCredentials(projectId, userName, tokenPassword, repoUrl);
      console.log("[API] Credentials saved to localStorage");
    }

    console.log("[API] POST Change Branch Success");
    return data;
  } catch (error) {
    console.error("[API] POST Change Branch Error:", error);
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

const pushGitDocuments = async (
  projectId,
  fileIds,
  commitMessage,
  userName,
  tokenPassword,
  endpointPath
) => {
  console.log(
    "[API] POST Push Git Documents - projectId:",
    projectId,
    "fileIds:",
    fileIds,
    "endpointPath:",
    endpointPath
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/${endpointPath}/git/push`;
    const body = {
      id: fileIds,
      commit_message: commitMessage.trim(),
      user_name: userName,
    };

    if (tokenPassword) {
      body.token_password = tokenPassword;
    }

    const response = await window.APIClient.post(url, body);
    const data = await response.json();

    if (response.status === 409) {
      console.log(
        "[API] POST Push Git Documents - 409 Response Data:",
        JSON.stringify(data, null, 2)
      );
    }

    if (!response.ok) {
      if (response.status === 409) {
        let conflictFiles = [];

        if (data.conflict_files && Array.isArray(data.conflict_files)) {
          conflictFiles = data.conflict_files;
        } else if (
          data.detail &&
          data.detail.conflict_files &&
          Array.isArray(data.detail.conflict_files)
        ) {
          conflictFiles = data.detail.conflict_files;
        } else if (
          data.data &&
          data.data.conflict_files &&
          Array.isArray(data.data.conflict_files)
        ) {
          conflictFiles = data.data.conflict_files;
        }

        console.log(
          "[API] POST Push Git Documents Conflict - endpointPath:",
          endpointPath,
          "conflictFiles found:",
          conflictFiles.length,
          "data structure:",
          Object.keys(data)
        );

        return {
          isConflict: true,
          conflictFiles: conflictFiles,
          statusCode: data.statusCode || 409,
          message:
            data.message ||
            "Conflict detected. Some files could not be merged automatically.",
        };
      }

      console.log("datadata ", data);
      

      const errorMsg =
        data.error_message ||
        data.message ||
        PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      showAlert(errorMsg, "error");
      
      if (GIT_ERROR_MESSAGES.some(msg => errorMsg.includes(msg))) {
        removeGitCredentials(projectId);
        console.log("[API] Git credentials removed due to git error");
      }
      
      throw new Error(errorMsg);
    }

    const repoUrl = getRepoUrl();
    if (repoUrl) {
      saveGitCredentials(projectId, userName, tokenPassword, repoUrl);
      console.log("[API] Credentials saved to localStorage");
    }

    console.log(
      "[API] POST Push Git Documents Success - endpointPath:",
      endpointPath
    );
    return data;
  } catch (error) {
    console.error(
      "[API] POST Push Git Documents Error - endpointPath:",
      endpointPath,
      "error:",
      error
    );
    if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
    throw error;
  }
};

export const GitHandleAPI = {
  getListBranches,
  pullGitData,
  pushGitDocuments,
  checkRepoChanges,
  changeBranch,
};

export {
  getListBranches,
  pullGitData,
  pushGitDocuments,
  checkRepoChanges,
  changeBranch,
};
