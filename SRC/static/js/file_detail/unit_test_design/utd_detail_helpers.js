/**
 * Unit Test Design Detail Helpers Module
 * Helper functions for parsing, formatting, URL extraction, etc.
 */

import { RD_MESSAGES } from '../../commons/error_messages.js';
import { isValidFileId as isValidFileIdHelper } from '../source_code/source_detail_helpers.js';

/**
 * Extract project ID and file ID from URL
 * Format: /projects/{project_id}/utd/{file_id}
 * @returns {Object} Object with projectId and fileId
 */
export const extractIdsFromUrl = () => {
    const pathParts = window.location.pathname.split("/");
    const projectIndex = pathParts.indexOf("projects");
    if (projectIndex === -1) return { projectId: null, fileId: null };

    const projectId = pathParts[projectIndex + 1];
    const utdIndex = pathParts.indexOf("utd");
    if (utdIndex === -1) return { projectId: null, fileId: null };

    const fileId = pathParts[utdIndex + 1];
    return { projectId, fileId };
};

/**
 * Extract repository name from repository URL
 * @param {string} repoUrl - Repository URL
 * @returns {string} Repository name
 */
export const extractRepoName = (repoUrl) => {
    if (!repoUrl) return RD_MESSAGES.REPOSITORY_NAME;

    const repoName = repoUrl.replace(/\.git$/, "");
    const match = repoName.match(/(?:[/:])([^/]+)$/);
    return (match && match[1]) || repoName;
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export const escapeHtml = (text) => {
    if (!text) return "";
    if (window.BaseUtils?.baseEscapeHtml) {
        return window.BaseUtils.baseEscapeHtml(text);
    }
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Parse markdown to HTML
 * @param {string} content - Markdown content
 * @returns {string} HTML content
 */
export const parseMarkdownToHtml = (content) => {
    if (!content) return "";

    if (typeof marked !== "undefined") {
        return marked.parse(content);
    }

    const escapedContent = escapeHtml(content);
    return `<pre>${escapedContent}</pre>`;
};

/**
 * Format JSON string with proper indentation
 * @param {string} jsonString - JSON string to format
 * @returns {string} Formatted JSON string or original string if not valid JSON
 */
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

/**
 * Check if file ID is valid
 * @param {string} fileId - File ID to validate
 * @returns {boolean} True if valid
 */
export const isValidFileId = (fileId) => {
    if (!fileId || fileId === "null" || fileId === "undefined") return false;

    try {
        return isValidFileIdHelper(fileId);
    } catch {
        return false;
    }
};

/**
 * Detect programming language from file name
 * @param {string} fileName - File name
 * @returns {string} Language name
 */
export const detectLanguageFromFileName = (fileName) => {
    if (!fileName) return "Python";

    if (fileName.endsWith(".java")) return "Java";
    if (fileName.endsWith(".cs")) return "Csharp";
    if (fileName.endsWith(".py")) return "Python";

    return "Python";
};

/**
 * Get regex patterns for code parsing based on language
 * @param {string} language - Programming language
 * @returns {Object} Object with classPattern, methodPattern, globalMethodPattern
 */
export const getCodeParsingPatterns = (language) => {
    const patterns = {
        Python: {
            classPattern: /^\s*class\s+(\w+)/,
            methodPattern: /^\s+def\s+(\w+)\s*\(/,
            globalMethodPattern: /^def\s+(\w+)\s*\(/,
        },
        Java: {
            classPattern: /^\s*(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/,
            methodPattern: /^\s+(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?\w+\s+(\w+)\s*\(/,
            globalMethodPattern: /^\s*(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
        },
        Csharp: {
            classPattern: /^\s*(?:public\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/,
            methodPattern: /^\s+(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
            globalMethodPattern: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
        },
        default: {
            classPattern: /^\s*class\s+(\w+)/,
            methodPattern: /^\s+def\s+(\w+)\s*\(|^\s+\w+\s+(\w+)\s*\(/,
            globalMethodPattern: /^def\s+(\w+)\s*\(|^\s*(?:public|private|protected)?\s*\w+\s+(\w+)\s*\(/,
        }
    };

    try {
        const key = language in patterns ? language : "default";
        return patterns[key];
    } catch {
        return patterns.default;
    }
};

/**
 * Create maps for existing classes and methods lookup
 * @param {Array} existingClasses - Existing classes
 * @param {Array} existingGlobalMethods - Existing global methods
 * @returns {Object} Object with existingClassMap and existingGlobalMethodMap
 */
export const createExistingDataMaps = (existingClasses = [], existingGlobalMethods = []) => {
    try {
        const existingClassMap = new Map(existingClasses.filter(c => c.class_name).map(c => [c.class_name, c]));
        const existingGlobalMethodMap = new Map(existingGlobalMethods.filter(m => m.method_name).map(m => [m.method_name, m]));
        return { existingClassMap, existingGlobalMethodMap };
    } catch {
        return { existingClassMap: new Map(), existingGlobalMethodMap: new Map() };
    }
};

/**
 * Create or preserve class from parsed code
 * @param {string} className - Class name
 * @param {Map} existingClassMap - Map of existing classes
 * @param {number} classCounter - Class counter for new IDs
 * @returns {Object} Class object
 */
export const createOrPreserveClass = (className, existingClassMap, classCounter) => {
    if (!className) return null;

    const existingClass = existingClassMap.get(className);

    if (existingClass) {
        return {
            ...existingClass,
            methods: existingClass.methods ? [...existingClass.methods] : [],
        };
    }

    return {
        class_id: `class-${className}-${Date.now()}-${classCounter}`,
        class_name: className,
        methods: [],
    };
};

/**
 * Add method to class if not exists
 * @param {Object} currentClass - Current class object
 * @param {string} methodName - Method name
 * @param {number} methodCounter - Method counter for new IDs
 */
export const addMethodToClass = (currentClass, methodName, methodCounter) => {
    if (!currentClass || !methodName) return;

    const existingMethod = currentClass.methods.find(m => m.method_name === methodName);
    if (!existingMethod) {
        currentClass.methods.push({
            method_id: `method-${methodName}-${Date.now()}-${methodCounter}`,
            method_name: methodName,
        });
    }
};

/**
 * Check if global method already exists
 * @param {Array} globalMethods - Global methods array
 * @param {string} methodName - Method name
 * @returns {boolean} True if method exists
 */
const isGlobalMethodExists = (globalMethods, methodName) => {
    return globalMethods.some(m => m.method_name === methodName);
};

/**
 * Create new global method object
 * @param {string} methodName - Method name
 * @param {number} methodCounter - Method counter for new IDs
 * @returns {Object} New global method object
 */
const createNewGlobalMethod = (methodName, methodCounter) => {
    return {
        method_id: `global-method-${methodName}-${Date.now()}-${methodCounter}`,
        method_name: methodName,
    };
};

/**
 * Add existing global method to array
 * @param {Array} globalMethods - Global methods array
 * @param {Object} existingMethod - Existing method object
 */
const addExistingGlobalMethod = (globalMethods, existingMethod) => {
    globalMethods.push({ ...existingMethod });
};

/**
 * Add global method if not exists
 * @param {Array} globalMethods - Global methods array
 * @param {string} methodName - Method name
 * @param {Map} existingGlobalMethodMap - Map of existing global methods
 * @param {number} methodCounter - Method counter for new IDs
 */
export const addGlobalMethod = (globalMethods, methodName, existingGlobalMethodMap, methodCounter) => {
    if (!methodName || isGlobalMethodExists(globalMethods, methodName)) {
        return;
    }

    const existingMethod = existingGlobalMethodMap.get(methodName);
    if (existingMethod) {
        addExistingGlobalMethod(globalMethods, existingMethod);
    } else {
        const newMethod = createNewGlobalMethod(methodName, methodCounter);
        globalMethods.push(newMethod);
    }
};

/**
 * Check if line is empty or comment
 * @param {string} trimmedLine - Trimmed line
 * @returns {boolean} True if line is empty or comment
 */
export const isLineEmptyOrComment = (trimmedLine) => {
    if (!trimmedLine) return true;
    return ["//", "#", "/*", "*"].some(prefix => trimmedLine.startsWith(prefix));
};

/**
 * Process class declaration line
 * @param {string} line - Code line
 * @param {RegExp} classPattern - Class pattern regex
 * @param {Map} existingClassMap - Map of existing classes
 * @param {Array} classes - Classes array
 * @param {number} classCounter - Class counter
 * @returns {Object|null} Object with currentClass, classIndentLevel, inClassScope or null
 */
export const processClassDeclaration = (line, classPattern, existingClassMap, classes, classCounter) => {
    if (!line || !classPattern) return null;

    const classMatch = line.match(classPattern);
    if (!classMatch) return null;

    const className = classMatch[1];
    const currentClass = createOrPreserveClass(className, existingClassMap, classCounter);
    if (!currentClass) return null;

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
 * @param {number} methodCounter - Method counter
 * @returns {Object|null} Updated class scope state or null
 */
export const processClassMethod = (line, methodPattern, currentClass, classIndentLevel, methodCounter) => {
    if (!currentClass || !line) return null;

    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) return { inClassScope: true, currentClass };

    if (currentIndent <= classIndentLevel) return { inClassScope: false, currentClass: null };

    const methodMatch = line.match(methodPattern);
    if (methodMatch) {
        const methodName = methodMatch[1] || methodMatch[2];
        if (methodName) addMethodToClass(currentClass, methodName, methodCounter);
    }

    return { inClassScope: true, currentClass };
};

/**
 * Process global method line
 * @param {string} line - Code line
 * @param {RegExp} globalMethodPattern - Global method pattern regex
 * @param {Array} globalMethods - Global methods array
 * @param {Map} existingGlobalMethodMap - Map of existing global methods
 * @param {number} methodCounter - Method counter
 * @returns {number} Updated method counter
 */
const processGlobalMethodLine = (line, globalMethodPattern, globalMethods, existingGlobalMethodMap, methodCounter) => {
    if (!line || !globalMethodPattern) return methodCounter;

    const globalMethodMatch = line.match(globalMethodPattern);
    if (globalMethodMatch) {
        const methodName = globalMethodMatch[1] || globalMethodMatch[2];
        if (methodName) {
            addGlobalMethod(globalMethods, methodName, existingGlobalMethodMap, methodCounter);
            return methodCounter + 1;
        }
    }

    return methodCounter;
};

let currentClass = null;
let classIndentLevel = -1;
let inClassScope = false;
let classCounter = 0;
let methodCounter = 0;
let lines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (isLineEmptyOrComment(trimmedLine)) continue;

    const classResult = processClassDeclaration(line, patterns.classPattern, existingClassMap, classes, classCounter);
    if (classResult) {
        currentClass = classResult.currentClass;
        classIndentLevel = classResult.classIndentLevel;
        inClassScope = classResult.inClassScope;
        classCounter++;
        continue;
    }

    if (inClassScope && currentClass) {
        const methodResult = processClassMethod(line, patterns.methodPattern, currentClass, classIndentLevel, methodCounter);
        if (methodResult) {
            inClassScope = methodResult.inClassScope;
            currentClass = methodResult.currentClass;
            if (methodResult.inClassScope) methodCounter++;
        }
        continue;
    }

    if (!inClassScope) {
        methodCounter = processGlobalMethodLine(line, patterns.globalMethodPattern, globalMethods, existingGlobalMethodMap, methodCounter);
    }
};

/**
 * Parse code to extract classes and methods (UTD-specific, preserves existing IDs)
 * @param {string} code - Source code
 * @param {string} language - Programming language (Python, Java, C#, etc.)
 * @param {Array} existingClasses - Existing classes from fileData (to preserve IDs)
 * @param {Array} existingGlobalMethods - Existing global methods from fileData (to preserve IDs)
 * @returns {Object} Object with classes and global_methods (with preserved IDs)
 */
export const parseCodeForUTD = (code, language = "Python", existingClasses = [], existingGlobalMethods = []) => {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
        return { classes: [], global_methods: [] };
    }

    const classes = [];
    const globalMethods = [];
    const lines = code.split("\n");
    const patterns = getCodeParsingPatterns(language);
    const { existingClassMap, existingGlobalMethodMap } = createExistingDataMaps(existingClasses, existingGlobalMethods);

    processCodeLines(lines, patterns, existingClassMap, existingGlobalMethodMap, classes, globalMethods);

    return { classes, global_methods: globalMethods };
};

/**
 * Find existing method unit test design
 * @param {Array} unitTestDesigns - Unit test designs array
 * @param {string} methodId - Method ID
 * @returns {Object|undefined} Found unit test design or undefined
 */
const findMethodUnitTestDesign = (unitTestDesigns, methodId) => {
    return unitTestDesigns.find((utd) => utd.method_id === methodId);
};

/**
 * Find existing class unit test design
 * @param {Array} unitTestDesigns - Unit test designs array
 * @param {string} classId - Class ID
 * @returns {Object|undefined} Found unit test design or undefined
 */
const findClassUnitTestDesign = (unitTestDesigns, classId) => {
    return unitTestDesigns.find((utd) => utd.class_id === classId && !utd.method_id);
};

/**
 * Create new method unit test design object
 * @param {string} methodId - Method ID
 * @param {string} classId - Class ID
 * @param {string} codeContent - Code content
 * @returns {Object} New unit test design object
 */
const createMethodUnitTestDesign = (methodId, classId, codeContent) => {
    return {
        method_id: methodId,
        class_id: classId || null,
        unit_test_design_json: codeContent,
        decision_table: null,
        test_pattern: null,
    };
};

/**
 * Create new class unit test design object
 * @param {string} classId - Class ID
 * @param {string} codeContent - Code content
 * @returns {Object} New unit test design object
 */
const createClassUnitTestDesign = (classId, codeContent) => {
    return {
        class_id: classId,
        method_id: null,
        unit_test_design_json: codeContent,
        decision_table: null,
        test_pattern: null,
    };
};

/**
 * Update existing unit test design with new content
 * @param {Object} unitTestDesign - Unit test design object
 * @param {string} codeContent - Code content
 */
const updateUnitTestDesignContent = (unitTestDesign, codeContent) => {
    unitTestDesign.unit_test_design_json = codeContent;
};

/**
 * Find or create unit test design and update content
 * @param {Array} unitTestDesigns - Unit test designs array
 * @param {Object|undefined} existingDesign - Existing unit test design or undefined
 * @param {Object} newDesign - New unit test design object to create if not exists
 * @param {string} codeContent - Code content
 */
const findOrCreateAndUpdateDesign = (unitTestDesigns, existingDesign, newDesign, codeContent) => {
    if (existingDesign) {
        updateUnitTestDesignContent(existingDesign, codeContent);
    } else {
        unitTestDesigns.push(newDesign);
    }
};

/**
 * Update unit test design JSON for method
 * @param {Array} unitTestDesigns - Unit test designs array
 * @param {string} methodId - Method ID
 * @param {string} classId - Class ID
 * @param {string} codeContent - Code content
 */
export const updateMethodUnitTestDesign = (unitTestDesigns, methodId, classId, codeContent) => {
    if (!unitTestDesigns || !methodId) return;

    const unitTestDesign = findMethodUnitTestDesign(unitTestDesigns, methodId);
    const newDesign = createMethodUnitTestDesign(methodId, classId, codeContent);
    findOrCreateAndUpdateDesign(unitTestDesigns, unitTestDesign, newDesign, codeContent);
};

/**
 * Update unit test design JSON for class
 * @param {Array} unitTestDesigns - Unit test designs array
 * @param {string} classId - Class ID
 * @param {string} codeContent - Code content
 */
export const updateClassUnitTestDesign = (unitTestDesigns, classId, codeContent) => {
    if (!unitTestDesigns || !classId) return;

    const unitTestDesign = findClassUnitTestDesign(unitTestDesigns, classId);
    const newDesign = createClassUnitTestDesign(classId, codeContent);
    findOrCreateAndUpdateDesign(unitTestDesigns, unitTestDesign, newDesign, codeContent);
};
