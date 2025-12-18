/**
 * Source Detail Helpers Module
 * Helper functions for parsing, tree building, filtering, etc.
 */

import { SRC_MESSAGES } from '../../commons/error_messages.js';
import { hasValidCommitId, getFileSyncStatus } from '../../commons/file_List.js';
import { getFileId, getFileDataCache, getExpandedFolders, addExpandedFolder, removeExpandedFolder } from './source_detail_state.js';

/**
 * Check if an ID is a valid file ID (not a generated ID)
 * @param {string} id - ID to check
 * @returns {boolean} True if valid file ID
 */
export const isValidFileId = (id) => {
    if (!id || typeof id !== "string") return false;
    // Generated IDs start with "node-" followed by timestamp and random string
    // Valid file IDs are UUIDs or other formats from the backend
    // Exclude generated IDs that match pattern: node-{timestamp}-{random}
    if (id.startsWith("node-") && id.match(/^node-\d+-[a-f0-9]+$/)) {
        return false;
    }
    return true;
};

/**
 * Extract project ID and file ID from URL
 * @returns {Object} Object with projectId and fileId
 */
export const extractIdsFromUrl = () => {
    console.log("[extractIdsFromUrl] Start");

    try {
        const pathParts = window.location.pathname.split("/");
        const projectIndex = pathParts.indexOf("projects");
        const srcIndex = pathParts.indexOf("src");

        if (projectIndex === -1 || srcIndex === -1) {
            console.warn("[extractIdsFromUrl] Invalid URL structure");
            return { projectId: null, fileId: null };
        }

        const projectId = pathParts[projectIndex + 1];
        const fileId = pathParts[srcIndex + 1];

        console.log(`[extractIdsFromUrl] Success - projectId=${projectId}, fileId=${fileId}`);
        return { projectId, fileId };
    } catch (error) {
        console.error("[extractIdsFromUrl] Error:", error);
        return { projectId: null, fileId: null };
    }
};

/**
 * Extract repository name from repository URL
 * @param {string} repoUrl - Repository URL
 * @returns {string} Repository name
 */
export const extractRepoName = (repoUrl) => {
    if (!repoUrl) return SRC_MESSAGES.REPOSITORY_NAME;

    try {
        let repoName = repoUrl.replace(/\.git$/, "");
        const match = repoName.match(/(?:[/:])([^/]+)$/);
        return match && match[1] ? match[1] : repoName;
    } catch (error) {
        console.error("[extractRepoName] Error:", error);
        return repoUrl || SRC_MESSAGES.REPOSITORY_NAME;
    }
};

/**
 * Get language image path
 * @param {string} language - Programming language name
 * @returns {string} Image path
 */
export const getLanguageImagePath = (language) => {
    if (!language) return null;

    const langMap = {
        "C#": "csharp.png",
        "Python": "python.png",
        "Java": "java.png"
    };

    const normalizedLang = language.trim();
    return langMap[normalizedLang] || null;
};

/**
 * Normalize file tree response into uniform nodes
 * @param {Object|Array} data - Raw API response
 * @returns {Array} Normalized tree data
 */
export const normalizeFileTreeData = (data) => {
    console.log("[normalizeFileTreeData] Start");

    try {
        const baseItems = [];

        if (Array.isArray(data)) {
            baseItems.push(...data);
        } else if (data && typeof data === "object") {
            const candidateLists = [
                Array.isArray(data.folders) ? data.folders : [],
                Array.isArray(data.sources) ? data.sources : [],
                Array.isArray(data.files) ? data.files : [],
                Array.isArray(data.tree) ? data.tree : [],
            ];

            candidateLists.forEach((list) => baseItems.push(...list));
        }

        const normalized = processTreeItems(baseItems);
        console.log(`[normalizeFileTreeData] Success - nodes=${normalized.length}`);
        return normalized;
    } catch (error) {
        console.error("[normalizeFileTreeData] Error:", error);
        return [];
    }
};

/**
 * Recursively process tree items
 * @param {Array} items - Raw items
 * @returns {Array} Normalized items
 */
const processTreeItems = (items = []) => {
    try {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => {
            const childrenSource = item.children || item.files || item.items || item.folders || [];
            const normalizedChildren = processTreeItems(childrenSource);
            const derivedType = (item.type || "").toLowerCase();
            const isFolder = derivedType === "folder" || normalizedChildren.length > 0;
            const nodeId = item.id || item.file_id || item.path || `${item.name || "node"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            // Extract file name from path if name is not available
            let nodeName = item.name || item.file_name || item.title;
            if (!nodeName && item.path) {
                nodeName = item.path.split("/").pop() || item.path;
            }
            if (!nodeName && nodeId && !nodeId.startsWith("node-")) {
                nodeName = nodeId;
            }
            if (!nodeName) {
                nodeName = "Unknown";
            }

            const node = {
                id: nodeId,
                name: nodeName,
                type: isFolder ? "folder" : "file",
                children: normalizedChildren,
            };

            // If it's a file, preserve classes and global_methods from API response if available
            if (!isFolder) {
                if (item.classes && Array.isArray(item.classes)) {
                    node.classes = item.classes;
                }
                if (item.global_methods && Array.isArray(item.global_methods)) {
                    node.global_methods = item.global_methods;
                }
            }

            return node;
        });
    } catch (error) {
        console.error("[processTreeItems] Error:", error);
        return [];
    }
};

/**
 * Build symbol nodes (class/method) for a specific file
 * @param {Object} fileData - File data object
 * @returns {Array} Symbol nodes
 */
export const buildFileSymbolNodesFromData = (fileData) => {
    console.log("[buildFileSymbolNodesFromData] Start");

    try {
        if (!fileData) {
            return [];
        }

        const symbols = [];
        const classes = fileData.classes || [];

        classes.forEach((cls) => {
            const classNode = {
                id: cls.class_id || `class-${Math.random().toString(16).slice(2)}`,
                name: cls.class_name || "Class",
                type: "class",
                children: [],
                class_data: cls, // Preserve class data
            };

            // Only use methods from API - don't parse or add methods that aren't in the API response
            const methods = cls.methods || [];
            classNode.children = methods.map((method) => ({
                id: method.method_id || `method-${Math.random().toString(16).slice(2)}`,
                name: method.method_name || "Method",
                type: "method",
                method_data: method, // Preserve method data
                class_id: cls.class_id,
            }));

            symbols.push(classNode);
        });

        const globalMethods = fileData.global_methods || [];
        globalMethods.forEach((method) => {
            symbols.push({
                id: method.method_id || `global-method-${Math.random().toString(16).slice(2)}`,
                name: method.method_name || "Global Method",
                type: "global-method",
                method_data: method, // Preserve method data
            });
        });

        console.log(`[buildFileSymbolNodesFromData] Success - symbols=${symbols.length}`);
        return symbols;
    } catch (error) {
        console.error("[buildFileSymbolNodesFromData] Error:", error);
        return [];
    }
};

/**
 * Merge symbol nodes into file node if file has classes/methods data
 * @param {Object} node - Tree node
 * @returns {Object} Node with symbols when applicable
 */
export const includeSymbolsIfSelected = (node) => {
    try {
        if (!node || node.type !== "file") {
            return node;
        }

        // Check if node has classes/methods from API response
        const hasClasses = node.classes && Array.isArray(node.classes) && node.classes.length > 0;
        const hasGlobalMethods = node.global_methods && Array.isArray(node.global_methods) && node.global_methods.length > 0;

        if (hasClasses || hasGlobalMethods) {
            // Build symbols from node's classes/methods
            const symbolNodes = buildFileSymbolNodesFromData({
                classes: node.classes || [],
                global_methods: node.global_methods || [],
            });

            if (symbolNodes && symbolNodes.length > 0) {
                const existingChildren = Array.isArray(node.children) ? [...node.children] : [];
                return {
                    ...node,
                    children: [...existingChildren, ...symbolNodes],
                };
            }
        }

        // Fallback: Check if file data is cached
        const fileDataCache = getFileDataCache();
        const cachedFileData = fileDataCache[node.id];
        if (cachedFileData) {
            const symbolNodes = buildFileSymbolNodesFromData(cachedFileData);
            if (symbolNodes && symbolNodes.length > 0) {
                const existingChildren = Array.isArray(node.children) ? [...node.children] : [];
                return {
                    ...node,
                    children: [...existingChildren, ...symbolNodes],
                };
            }
        }

        return node;
    } catch (error) {
        console.error("[includeSymbolsIfSelected] Error:", error);
        return node;
    }
};

/**
 * Parse code to extract classes and methods (basic regex-based parsing)
 * @param {string} code - Source code
 * @param {string} language - Programming language (Python, Java, C#, etc.)
 * @returns {Object} Object with classes and global_methods
 */
/**
 * Get regex patterns for code parsing based on language
 * @param {string} language - Programming language
 * @returns {Object} Object with classPattern, methodPattern, globalMethodPattern
 */
const getBasicCodeParsingPatterns = (language) => {
    switch (language) {
        case "Python":
            return {
                classPattern: /^\s*class\s+(\w+)/,
                methodPattern: /^\s+def\s+(\w+)\s*\(/,
                globalMethodPattern: /^def\s+(\w+)\s*\(/,
            };
        case "Java":
            return {
                classPattern: /^\s*(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/,
                methodPattern: /^\s+(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?\w+\s+(\w+)\s*\(/,
                globalMethodPattern: /^\s*(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
            };
        case "Csharp":
        case "C#":
            return {
                classPattern: /^\s*(?:public\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/,
                methodPattern: /^\s+(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
                globalMethodPattern: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
            };
        default:
            return {
                classPattern: /^\s*class\s+(\w+)/,
                methodPattern: /^\s+def\s+(\w+)\s*\(|^\s+\w+\s+(\w+)\s*\(/,
                globalMethodPattern: /^def\s+(\w+)\s*\(|^\s*(?:public|private|protected)?\s*\w+\s+(\w+)\s*\(/,
            };
    }
};

/**
 * Check if line is empty or comment
 * @param {string} trimmedLine - Trimmed line
 * @returns {boolean} True if line is empty or comment
 */
const isLineEmptyOrCommentBasic = (trimmedLine) => {
    if (!trimmedLine) return true;
    return ["//", "#", "/*", "*"].some(prefix => trimmedLine.startsWith(prefix));
};

/**
 * Create class object from match
 * @param {string} className - Class name
 * @param {number} lineIndex - Line index
 * @returns {Object} Class object
 */
const createClassFromMatch = (className, lineIndex) => {
    return {
        class_id: `class-${className}-${lineIndex}`,
        class_name: className,
        methods: [],
    };
};

/**
 * Process class declaration line
 * @param {string} line - Code line
 * @param {RegExp} classPattern - Class pattern regex
 * @param {Array} classes - Classes array
 * @param {number} lineIndex - Line index
 * @returns {Object|null} Object with currentClass, classIndentLevel, inClassScope or null
 */
const processBasicClassDeclaration = (line, classPattern, classes, lineIndex) => {
    const classMatch = line.match(classPattern);
    if (!classMatch) return null;

    const className = classMatch[1];
    const currentClass = createClassFromMatch(className, lineIndex);
    classes.push(currentClass);
    const classIndentLevel = line.search(/\S/);
    return { currentClass, classIndentLevel, inClassScope: true };
};

/**
 * Process method line inside class
 * @param {string} line - Code line
 * @param {RegExp} methodPattern - Method pattern regex
 * @param {Object} currentClass - Current class object
 * @param {number} classIndentLevel - Class indentation level
 * @param {number} lineIndex - Line index
 * @returns {Object|null} Updated class scope state or null
 */
const processBasicClassMethod = (line, methodPattern, currentClass, classIndentLevel, lineIndex) => {
    if (!currentClass) return null;

    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) return { inClassScope: true, currentClass };

    if (currentIndent <= classIndentLevel) {
        return { inClassScope: false, currentClass: null };
    }

    const methodMatch = line.match(methodPattern);
    if (methodMatch) {
        const methodName = methodMatch[1] || methodMatch[2];
        if (methodName && !currentClass.methods.some(m => m.method_name === methodName)) {
            currentClass.methods.push({
                method_id: `method-${methodName}-${lineIndex}`,
                method_name: methodName,
            });
        }
    }

    return { inClassScope: true, currentClass };
};

/**
 * Process global method line
 * @param {string} line - Code line
 * @param {RegExp} globalMethodPattern - Global method pattern regex
 * @param {Array} globalMethods - Global methods array
 * @param {number} lineIndex - Line index
 */
const processBasicGlobalMethodLine = (line, globalMethodPattern, globalMethods, lineIndex) => {
    const globalMethodMatch = line.match(globalMethodPattern);
    if (globalMethodMatch) {
        const methodName = globalMethodMatch[1] || globalMethodMatch[2];
        if (methodName && !globalMethods.some(m => m.method_name === methodName)) {
            globalMethods.push({
                method_id: `global-method-${methodName}-${lineIndex}`,
                method_name: methodName,
            });
        }
    }
};

/**
 * Process all code lines to extract classes and methods
 * @param {Array} lines - Code lines array
 * @param {Object} patterns - Code parsing patterns
 * @param {Array} classes - Classes array to populate
 * @param {Array} globalMethods - Global methods array to populate
 * @returns {void}
 */
const processBasicCodeLines = (lines, patterns, classes, globalMethods) => {
    let currentClass = null;
    let classIndentLevel = -1;
    let inClassScope = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (isLineEmptyOrCommentBasic(trimmedLine)) continue;

        const classResult = processBasicClassDeclaration(line, patterns.classPattern, classes, i);
        if (classResult) {
            currentClass = classResult.currentClass;
            classIndentLevel = classResult.classIndentLevel;
            inClassScope = classResult.inClassScope;
            continue;
        }

        if (inClassScope && currentClass) {
            const methodResult = processBasicClassMethod(line, patterns.methodPattern, currentClass, classIndentLevel, i);
            if (methodResult) {
                inClassScope = methodResult.inClassScope;
                currentClass = methodResult.currentClass;
            }
            continue;
        }

        if (!inClassScope) {
            processBasicGlobalMethodLine(line, patterns.globalMethodPattern, globalMethods, i);
        }
    }
};

/**
 * Log parsing results
 * @param {Array} classes - Classes array
 * @param {Array} globalMethods - Global methods array
 */
const logParsingResults = (classes, globalMethods) => {
    console.log(`[parseCodeBasic] Success - classes=${classes.length}, globalMethods=${globalMethods.length}`);
    if (classes.length > 0) {
        console.log(`[parseCodeBasic] Classes:`, classes.map(c => c.class_name));
    }
    if (globalMethods.length > 0) {
        console.log(`[parseCodeBasic] Global methods:`, globalMethods.map(m => m.method_name));
    }
};

/**
 * Parse code to extract classes and methods (basic version)
 * @param {string} code - Source code
 * @param {string} language - Programming language (Python, Java, C#, etc.)
 * @returns {Object} Object with classes and global_methods
 */
export const parseCodeBasic = (code, language = "Python") => {
    console.log(`[parseCodeBasic] Start - language=${language}, codeLength=${code?.length || 0}`);

    try {
        if (!code || typeof code !== "string" || code.trim().length === 0) {
            return { classes: [], global_methods: [] };
        }

        const classes = [];
        const globalMethods = [];
        const lines = code.split("\n");
        const patterns = getBasicCodeParsingPatterns(language);

        processBasicCodeLines(lines, patterns, classes, globalMethods);
        logParsingResults(classes, globalMethods);

        return { classes, global_methods: globalMethods };
    } catch (error) {
        console.error("[parseCodeBasic] Error:", error);
        return { classes: [], global_methods: [] };
    }
};

/**
 * Filter out files that only have commit_id but no sync status icon
 * @param {Array} files - Array of file objects
 * @returns {Array} Filtered files
 */
export const filterFilesWithSyncStatus = (files) => {
    if (!files || !Array.isArray(files)) return [];

    return files.filter(file => {
        const fileHasCommitId = hasValidCommitId(file);
        const syncStatus = getFileSyncStatus(file);

        if (fileHasCommitId && (syncStatus === "" || syncStatus === "synced")) {
            return false;
        }

        return true;
    });
};

/**
 * Filter out files with sync_status = 'push'
 * @param {Array} files - Array of file objects
 * @returns {Array} Filtered files
 */
export const filterNonPushedFiles = (files) => {
    if (!files || !Array.isArray(files)) return [];

    return files.filter(file => {
        const syncStatus = getFileSyncStatus(file);
        return syncStatus !== "push";
    });
};
