import { PROJECT_MESSAGES, HTTP_MESSAGES } from "./error_messages.js";
import { getProjectData } from "../project_detail/project_detail_state.js";
import { PROJECT_CONFIG } from "../project_detail/project_detail_config.js";

const sanitizeProjectNameForFilename = (projectName) => {
  if (!projectName) return "project";
  return projectName;
};

const downloadFiles = async (
  url,
  body,
  defaultFilename = "download.zip",
  method = "POST"
) => {
  console.log(
    "[DownloadAPI] Download Files - method:",
    method,
    "url:",
    url,
    "body:",
    body
  );

  try {
    const response = await window.APIClient.request(url, {
      method,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
      throw new Error(errorMsg);
    }

    // Extract filename from Content-Disposition header if available
    let filename = defaultFilename;
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      // Try to extract filename from Content-Disposition header
      // Supports both: filename="file.png" and filename*=UTF-8''file.png
      const filenameMatch = contentDisposition.match(/filename\*?=["']?(?:UTF-8'')?([^"';]+)["']?/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1]);
        console.log("[DownloadAPI] Extracted filename from header:", filename);
      }
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    console.log(
      "[DownloadAPI] Download Files Success - filename:",
      filename
    );
  } catch (error) {
    console.error("[DownloadAPI] Download Files Error:", error);
    if (window.showAlert && !error.message) {
      window.showAlert(HTTP_MESSAGES[500], "error");
    }
    throw error;
  }
};

const downloadRequirementFiles = async (projectId, fileIds) => {
  console.log(
    "[DownloadAPI] Requirement Files - projectId:",
    projectId,
    "fileIds:",
    fileIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/requirement-documents/download`;
    const body = { file_id: fileIds };
    const projectData = getProjectData();
    const projectName =
      projectData?.name || projectData?.project_name || "project";
    const sanitizedName = sanitizeProjectNameForFilename(projectName);
    const filename = `${sanitizedName}-requirement.zip`;

    await downloadFiles(url, body, filename);
  } catch (error) {
    console.error("[DownloadAPI] Requirement Files Error:", error);
    throw error;
  }
};

const downloadBasicDesignFiles = async (projectId, fileIds) => {
  console.log(
    "[DownloadAPI] Basic Design Files - projectId:",
    projectId,
    "fileIds:",
    fileIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/basic-design/download`;
    const body = { file_id: fileIds };
    const projectData = getProjectData();
    const projectName =
      projectData?.name || projectData?.project_name || "project";
    const sanitizedName = sanitizeProjectNameForFilename(projectName);
    const filename = `${sanitizedName}-basic-design.zip`;

    await downloadFiles(url, body, filename);
  } catch (error) {
    console.error("[DownloadAPI] Basic Design Files Error:", error);
    throw error;
  }
};

const downloadFilesByPath = async (
  projectId,
  path,
  fileIds = [],
  folderIds = [],
  defaultFilename = "download.zip",
  logPrefix = "Download"
) => {
  console.log(
    `[DownloadAPI] ${logPrefix} - projectId:`,
    projectId,
    "path:",
    path,
    "fileIds:",
    fileIds,
    "folderIds:",
    folderIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/${path}/download`;
    const body = {};

    if (Array.isArray(fileIds) && fileIds.length > 0) {
      body.file_id = fileIds;
    }

    if (Array.isArray(folderIds) && folderIds.length > 0) {
      body.folder_id = folderIds;
    }

    const projectData = getProjectData();
    const projectName =
      projectData?.name || projectData?.project_name || "project";
    const sanitizedName = sanitizeProjectNameForFilename(projectName);
    const fileType = defaultFilename.replace(".zip", "");
    const filename = `${sanitizedName}-${fileType}.zip`;

    await downloadFiles(url, body, filename);
  } catch (error) {
    console.error(`[DownloadAPI] ${logPrefix} Error:`, error);
    throw error;
  }
};

const downloadSourceCode = async (projectId, fileIds = [], folderIds = []) => {
  return downloadFilesByPath(
    projectId,
    "source",
    fileIds,
    folderIds,
    "source-code.zip",
    "Download Source Code"
  );
};

const downloadUnitTestDocument = async (
  projectId,
  fileIds = [],
  folderIds = []
) => {
  return downloadFilesByPath(
    projectId,
    "utd",
    fileIds,
    folderIds,
    "unit-test-document.zip",
    "Download Unit Test Document"
  );
};

const downloadUnitTestCode = async (
  projectId,
  fileIds = [],
  folderIds = []
) => {
  return downloadFilesByPath(
    projectId,
    "utc",
    fileIds,
    folderIds,
    "unit-test-code.zip",
    "Download Unit Test Code"
  );
};

const downloadDetailDesignFiles = async (projectId, fileIds) => {
  console.log(
    "[DownloadAPI] Detail Design Files - projectId:",
    projectId,
    "fileIds:",
    fileIds
  );

  try {
    const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/detail-design/download`;
    const body = { file_id: fileIds };
    const projectData = getProjectData();
    const projectName =
      projectData?.name || projectData?.project_name || "project";
    const sanitizedName = sanitizeProjectNameForFilename(projectName);
    const filename = `${sanitizedName}-detail-design.zip`;

    await downloadFiles(url, body, filename);
  } catch (error) {
    console.error("[DownloadAPI] Detail Design Files Error:", error);
    throw error;
  }
};

const downloadConflictFiles = async (projectId, conflictFiles = []) => {
  console.log(
    "[DownloadAPI] Conflict Files - projectId:",
    projectId,
    "files:",
    conflictFiles
  );

  if (!projectId) {
    throw new Error("PROJECT_ID_REQUIRED");
  }

  if (!Array.isArray(conflictFiles) || conflictFiles.length === 0) {
    throw new Error("CONFLICT_FILES_REQUIRED");
  }

  const sanitizedFiles = conflictFiles
    .filter((file) => file && file.id)
    .map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      collection_name: file.collection_name,
    }));

  if (sanitizedFiles.length === 0) {
    throw new Error("CONFLICT_FILES_REQUIRED");
  }

  const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}/download/conflict`;
  await downloadFiles(url, { conflict_files: sanitizedFiles }, "conflict-files.zip");
};

export const DownloadFilesAPI = {
  downloadFiles,
  downloadConflictFiles,
  downloadRequirementFiles,
  downloadBasicDesignFiles,
  downloadFilesByPath,
  downloadSourceCode,
  downloadUnitTestDocument,
  downloadUnitTestCode,
  downloadDetailDesignFiles,
};

export {
  downloadFiles,
  downloadConflictFiles,
  downloadRequirementFiles,
  downloadBasicDesignFiles,
  downloadFilesByPath,
  downloadSourceCode,
  downloadUnitTestDocument,
  downloadUnitTestCode,
  downloadDetailDesignFiles,
};
