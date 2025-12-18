/**
 * UTC Helper Functions
 * Utility functions for unit test code operations
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { getFileSyncStatus, hasValidCommitId } from '../../commons/file_List.js';
import { UT_CONTENT_DELIMITER } from './utc_detail_state.js';

/**
 * Extract project ID and file ID from URL
 * Format: /projects/{project_id}/utc/{file_id}
 */
export const extractIdsFromUrl = () => {
    console.log("[extractIdsFromUrl] Start");

    try {
        const pathParts = window.location.pathname.split("/");
        const projectIndex = pathParts.indexOf("projects");

        if (projectIndex === -1) {
            console.warn("[extractIdsFromUrl] Invalid URL structure - no 'projects' found");
            return { projectId: null, fileId: null };
        }

        const projectId = pathParts[projectIndex + 1];

        const utcIndex = pathParts.indexOf("utc");
        if (utcIndex !== -1) {
            const fileId = pathParts[utcIndex + 1];
            console.log(`[extractIdsFromUrl] Success - projectId=${projectId}, fileId=${fileId}`);
            return { projectId, fileId };
        }

        console.warn("[extractIdsFromUrl] Invalid URL structure - no 'utc' found");
        return { projectId: null, fileId: null };
    } catch (error) {
        console.error("[extractIdsFromUrl] Error:", error);
        return { projectId: null, fileId: null };
    }
};

/**
 * Extract repository name from repository URL
 */
export const extractRepoName = (repoUrl) => {
    if (!repoUrl) return RD_MESSAGES.REPOSITORY_NAME;

    try {
        let repoName = repoUrl.replace(/\.git$/, "");
        const match = repoName.match(/(?:[/:])([^/]+)$/);
        return match && match[1] ? match[1] : repoName;
    } catch (error) {
        console.error("[extractRepoName] Error:", error);
        return repoUrl || RD_MESSAGES.REPOSITORY_NAME;
    }
};

/**
 * Filter out files that only have commit_id but no sync status icon
 */
export const filterFilesWithSyncStatus = (files) => {
    if (!files || !Array.isArray(files)) return [];

    return files.filter(file => {
        const fileHasCommitId = hasValidCommitId(file);
        const syncStatus = getFileSyncStatus(file);

        if (fileHasCommitId && (syncStatus === '' || syncStatus === 'synced')) {
            return false;
        }

        return true;
    });
};

/**
 * Filter out files with sync_status = 'push'
 */
export const filterNonPushedFiles = (files) => {
    if (!files || !Array.isArray(files)) return [];

    return files.filter(file => {
        const syncStatus = getFileSyncStatus(file);
        return syncStatus !== 'push';
    });
};

/**
 * Detect programming language from file name
 */
export const detectLanguageFromFileName = (fileName) => {
    if (!fileName) return "Python";

    if (fileName.endsWith(".java")) {
        return "Java";
    } else if (fileName.endsWith(".cs")) {
        return "Csharp";
    } else if (fileName.endsWith(".py")) {
        return "Python";
    }

    return "Python";
};

/**
 * Get all files from gitFileList div (no filtering)
 */
export const getAllFilesFromGitFileList = () => {
    console.log("[getAllFilesFromGitFileList] Start");

    try {
        const gitFileList = document.getElementById("gitFileList");
        if (!gitFileList) {
            console.warning("[getAllFilesFromGitFileList] gitFileList element not found");
            return [];
        }

        const fileItems = gitFileList.querySelectorAll(".file-item");
        if (!fileItems || fileItems.length === 0) {
            return [];
        }

        const fileIds = Array.from(fileItems)
            .map(item => item.dataset.fileId)
            .filter(id => id);

        console.log(`[getAllFilesFromGitFileList] Found ${fileIds.length} files`);
        return fileIds;
    } catch (error) {
        console.error("[getAllFilesFromGitFileList] Error:", error);
        return [];
    }
};

/**
 * Inject UT content into classes and methods
 */
export const injectUnitTestContentIntoSymbols = (fileData) => {
    console.log("[injectUnitTestContentIntoSymbols] Start");

    try {
        if (!fileData) {
            console.warn("[injectUnitTestContentIntoSymbols] Missing fileData");
            return;
        }

        const unitTests = fileData.unit_test_codes;
        if (!Array.isArray(unitTests) || unitTests.length === 0) {
            console.warn("[injectUnitTestContentIntoSymbols] No unit tests found");
            return;
        }

        const { classMap, methodMap } = buildUnitTestContentMaps(unitTests);
        const classes = fileData.classes || [];
        const globalMethods = fileData.global_methods || [];

        classes.forEach((cls) => {
            const classContents = classMap.get(String(cls.class_id));
            if (classContents && classContents.length > 0) {
                cls.class_content = combineUnitTestContents(classContents);
            }

            const methods = cls.methods || [];
            methods.forEach((method) => {
                const methodContents = methodMap.get(method.method_id);
                if (methodContents && methodContents.length > 0) {
                    method.method_content = combineUnitTestContents(methodContents);
                }
            });
        });

        globalMethods.forEach((method) => {
            const methodContents = methodMap.get(method.method_id);
            if (methodContents && methodContents.length > 0) {
                method.method_content = combineUnitTestContents(methodContents);
            }
        });

        console.log("[injectUnitTestContentIntoSymbols] Success");
    } catch (error) {
        console.error("[injectUnitTestContentIntoSymbols] Error:", error);
    }
};

/**
 * Build lookup maps for UT content grouped by class and method
 */
const buildUnitTestContentMaps = (unitTests) => {
    console.log("[buildUnitTestContentMaps] Start");

    const classMap = new Map();
    const methodMap = new Map();

    try {
        unitTests.forEach((test) => {
            const utValue = getUnitTestCodeValue(test);
            if (!utValue) {
                return;
            }

            if (test.class_id !== undefined && test.class_id !== null && test.class_id !== "") {
                const classId = String(test.class_id);
                const classEntries = classMap.get(classId) || [];
                classEntries.push(utValue);
                classMap.set(classId, classEntries);
            }

            if (test.method_id) {
                const methodEntries = methodMap.get(test.method_id) || [];
                methodEntries.push(utValue);
                methodMap.set(test.method_id, methodEntries);
            }
        });

        console.log("[buildUnitTestContentMaps] Success");
        return { classMap, methodMap };
    } catch (error) {
        console.error("[buildUnitTestContentMaps] Error:", error);
        return { classMap, methodMap };
    }
};

/**
 * Combine multiple UT code snippets into a single string
 */
const combineUnitTestContents = (contents) => {
    console.log("[combineUnitTestContents] Start");

    try {
        if (!Array.isArray(contents) || contents.length === 0) {
            return "";
        }

        const uniqueContents = contents.filter(Boolean);
        if (uniqueContents.length === 0) {
            return "";
        }

        const combined = uniqueContents.join(UT_CONTENT_DELIMITER);
        console.log("[combineUnitTestContents] Success");
        return combined;
    } catch (error) {
        console.error("[combineUnitTestContents] Error:", error);
        return contents.join("\n\n");
    }
};

/**
 * Extract ut_code_content value from a unit test record
 */
const getUnitTestCodeValue = (entry) => {
    console.log("[getUnitTestCodeValue] Start");

    try {
        if (!entry || typeof entry !== "object") {
            return "";
        }

        const value = entry.ut_code_content || entry.unit_test_code || entry.content || "";
        return value || "";
    } catch (error) {
        console.error("[getUnitTestCodeValue] Error:", error);
        return "";
    }
};

export const formatJSONString = (jsonString) => {
    if (!jsonString || typeof jsonString !== "string") return jsonString || "";

    const trimmed = jsonString.trim();
    if (!trimmed) return "";

    const isJsonLike = (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"));
    if (!isJsonLike) return jsonString;

    try {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return jsonString;
    }
};