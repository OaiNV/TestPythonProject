/**
 * Unit Test Design Detail Tree Handlers Module
 * Handles tree node click events (file, class, method)
 */

import {
    getFileData,
    getProjectId,
    getFileId,
    setSelectedClassId,
    setSelectedMethodId,
    setSelectedMethodData,
    getCurrentUnitTestId,
    setCurrentUnitTestId,
    setIsEditorReadOnly,
    setHasUnsavedChanges,
    setCurrentViewType,
    getCodeContent
} from './utd_detail_state.js';
import { renderCodeEditor, renderPreview, updateTreeActiveState } from './utd_detail_ui.js';

// #region Private Functions - Preview Data Builders
/**
 * Find unit test design for method
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID
 * @returns {Object|null} Unit test design or null
 */
export const findUnitTestDesignForMethod = (fileData, methodId) => {
    if (!fileData?.unit_test_designs || !Array.isArray(fileData.unit_test_designs)) {
        return null;
    }
    return fileData.unit_test_designs.find((utd) => utd.method_id === methodId) || null;
};

/**
 * Find unit test design for class
 * @param {Object} fileData - File data
 * @param {string} classId - Class ID
 * @returns {Object|null} Unit test design or null
 */
export const findUnitTestDesignForClass = (fileData, classId) => {
    if (!fileData?.unit_test_designs || !Array.isArray(fileData.unit_test_designs)) {
        return null;
    }
    return fileData.unit_test_designs.find((utd) => utd.class_id === classId && !utd.method_id) || null;
};

/**
 * Build preview data from detail design
 * @param {Array} detailDesign - Detail design array
 * @returns {Object} Preview data object
 */
export const buildPreviewDataFromDetailDesign = (detailDesign) => {
    if (!detailDesign || detailDesign.length === 0) return {};

    const firstDetailDesign = detailDesign[0];
    const { description_group, detailed_design_group, interface_design_group, activity_diagram_group } = firstDetailDesign;

    if (!description_group && !detailed_design_group && !interface_design_group && !activity_diagram_group) {
        return {};
    }

    return {
        pd: {
            class_description: description_group?.description || null,
            method_design: detailed_design_group?.detailed_design || null,
            interface_design: interface_design_group?.interface_design || null,
            activity_diagram: activity_diagram_group?.activity_diagram_image || null,
        },
    };
};

/**
 * Build preview data from unit test design
 * @param {Object} unitTestDesign - Unit test design object
 * @returns {Object} Preview data object
 */
export const buildPreviewDataFromUnitTestDesign = (unitTestDesign) => {
    if (!unitTestDesign) return {};

    return {
        utd: {
            decision_table: unitTestDesign.decision_table || null,
            test_pattern: unitTestDesign.test_pattern || null,
        },
    };
};

/**
 * Build preview data for class
 * @param {Object} classData - Class data
 * @param {Object} fileData - File data
 * @param {string} classId - Class ID
 * @returns {Object} Preview data object
 */
export const buildClassPreviewData = (classData, fileData, classId) => {
    const previewData = {};

    const pdData = buildPreviewDataFromDetailDesign(classData.detail_design || []);
    if (Object.keys(pdData).length > 0) {
        Object.assign(previewData, pdData);
    }

    const unitTestDesign = findUnitTestDesignForClass(fileData, classId);
    if (unitTestDesign) {
        const utdData = buildPreviewDataFromUnitTestDesign(unitTestDesign);
        if (Object.keys(utdData).length > 0) {
            Object.assign(previewData, utdData);
        }
    }

    return previewData;
};

/**
 * Get class detail design data
 * @param {Object} fileData - File data
 * @param {string} classId - Class ID
 * @returns {Object|null} Detail design data or null
 */
const getClassDetailDesignData = (fileData, classId) => {
    if (!fileData || !classId) return null;

    const classData = fileData.classes?.find(cls => cls.class_id === classId);
    if (classData?.detail_design?.length > 0) {
        return classData.detail_design[0];
    }

    return null;
};

/**
 * Get method detail design data from method data
 * @param {Object} methodData - Method data
 * @returns {Object|null} Detail design data or null
 */
const getMethodDetailDesignFromMethod = (methodData) => {
    if (methodData?.detail_design?.length > 0) {
        return methodData.detail_design[0];
    }
    return null;
};

/**
 * Get detail design data for method
 * @param {Object} methodNode - Method node
 * @param {Object} methodData - Method data
 * @param {Object} fileData - File data
 * @returns {Object|null} Detail design data or null
 */
export const getMethodDetailDesignData = (methodNode, methodData, fileData) => {
    if (!fileData) return null;

    if (methodNode.class_id) {
        return getClassDetailDesignData(fileData, methodNode.class_id);
    }

    return getMethodDetailDesignFromMethod(methodData);
};

/**
 * Build preview data from old unit test structure (fallback)
 * @param {Object} methodData - Method data
 * @returns {Object} Preview data object
 */
const buildPreviewDataFromOldUnitTest = (methodData) => {
    const previewData = {};
    const unitTest = methodData.unit_test || [];

    if (unitTest.length === 0) return previewData;

    const firstUnitTest = unitTest[0];
    const { unit_test_design_group: unitTestDesignGroup, ut_code_group: utCodeGroup } = firstUnitTest;

    if (unitTestDesignGroup) {
        previewData.utd = {
            decision_table: unitTestDesignGroup.decision_table || null,
            test_pattern: unitTestDesignGroup.test_pattern || null,
        };
    }

    if (utCodeGroup) {
        previewData.utc = {
            unit_test_code: utCodeGroup.ut_code_content || "",
        };
    }

    return previewData;
};

/**
 * Build preview data for method
 * @param {Object} methodNode - Method node
 * @param {Object} methodData - Method data
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID
 * @returns {Object} Preview data object
 */
const buildMethodPreviewData = (methodNode, methodData, fileData, methodId) => {
    const previewData = {};
    const detailDesignData = getMethodDetailDesignData(methodNode, methodData, fileData);

    if (detailDesignData) {
        const pdData = buildPreviewDataFromDetailDesign([detailDesignData]);
        if (Object.keys(pdData).length > 0) Object.assign(previewData, pdData);
    }

    const unitTestDesign = findUnitTestDesignForMethod(fileData, methodId);
    if (unitTestDesign) {
        const utdData = buildPreviewDataFromUnitTestDesign(unitTestDesign);
        if (Object.keys(utdData).length > 0) Object.assign(previewData, utdData);
    } else {
        const oldUnitTestData = buildPreviewDataFromOldUnitTest(methodData);
        if (Object.keys(oldUnitTestData).length > 0) Object.assign(previewData, oldUnitTestData);
    }

    return previewData;
};
// #endregion

// #region Public Functions - Tree Click Handlers
/**
 * Handle file click - show full source code
 * @param {Object} fileNode - File node data
 */
export const onFileClick = (fileNode) => {
    if (!fileNode) return;

    const fileData = fileNode.file_data || getFileData();
    if (!fileData) return;

    const fullSourceCode = fileData.source_code || "";

    setSelectedClassId(null);
    setSelectedMethodId(null);
    setCurrentUnitTestId(null);

    setIsEditorReadOnly(true);
    setCurrentViewType('file');
    setHasUnsavedChanges(false);
    renderCodeEditor(fullSourceCode, true);

    const saveBtn = document.getElementById("saveCodeBtn");
    if (saveBtn) {
        saveBtn.style.display = "none";
    }

    const codeEditor = document.getElementById("rdCodeEditor");
    if (codeEditor && codeEditor._saveListener) {
        codeEditor.removeEventListener("input", codeEditor._saveListener);
        codeEditor._saveListener = null;
    }

    renderPreview(fullSourceCode);
    updateTreeActiveState();
};

/**
 * Handle class click - show class content
 * @param {Object} classNode - Class node data
 * @param {boolean} skipTreeUpdate - Skip tree update
 * @param {boolean} skipEditorUpdate - Skip editor update (when restoring during parse)
 */
const toggleSaveButton = (visible) => {
    const btn = document.getElementById("saveCodeBtn");
    if (btn) btn.style.display = visible ? "inline-block" : "none";
};

export const setupEditorChangeListener = () => {
    const editor = document.getElementById("rdCodeEditor");
    if (!editor) return;

    if (editor._saveListener) {
        editor.removeEventListener("input", editor._saveListener);
    }

    const inputHandler = () => {
        const hasChanged = editor.value !== getCodeContent();
        setHasUnsavedChanges(hasChanged);
        toggleSaveButton(hasChanged);
    };

    editor.addEventListener("input", inputHandler);
    editor._saveListener = inputHandler;
};

const updateEditorAndPreview = ({
    content,
    previewData,
    readonly = false,
    skipEditorUpdate = false
}) => {
    toggleSaveButton(false);
    setHasUnsavedChanges(false);
    setIsEditorReadOnly(readonly);

    if (!skipEditorUpdate) {
        renderCodeEditor(content, !readonly);
    }

    renderPreview(
        previewData && Object.keys(previewData).length > 0
            ? previewData
            : null
    );

    setupEditorChangeListener();
};

export const onClassClick = (classNode, skipTreeUpdate = false, skipEditorUpdate = false) => {
    if (!classNode?.class_data) return;

    const { class_data: classData, file_data } = classNode;
    const fileData = file_data || getFileData();
    const classContent = classData.class_content || "";

    setSelectedClassId(classNode.id);
    setSelectedMethodId(null);
    setSelectedMethodData(null);
    setCurrentViewType("class");
    const utd = findUnitTestDesignForClass(fileData, classNode.id);
    setCurrentUnitTestId(utd?.unit_test_id || null);

    const previewData = buildClassPreviewData(classData, fileData, classNode.id);

    updateEditorAndPreview({
        content: utd?.unit_test_design_json || classContent,
        previewData,
        readonly: false,
        skipEditorUpdate
    });

    if (!skipTreeUpdate) updateTreeActiveState();
};

export const onMethodClick = (methodNode, skipTreeUpdate = false, skipEditorUpdate = false) => {
    if (!methodNode?.method_data) return;

    const { method_data: methodData, file_data } = methodNode;
    const fileData = file_data || getFileData();
    const methodContent = methodData.method_content || "";

    setSelectedClassId(methodNode.class_id || null);
    setSelectedMethodId(methodNode.id);
    setSelectedMethodData(methodData);

    const utd = findUnitTestDesignForMethod(fileData, methodNode.id);
    setCurrentUnitTestId(utd?.unit_test_id || null);

    // Update URL with unit_test_id if available
    if (utd?.unit_test_id) {
        const projectId = getProjectId();
        if (projectId) {
            const urlParams = new URLSearchParams(window.location.search);
            const newUrl = `/projects/${projectId}/utd/${utd.unit_test_id}${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
            window.history.pushState({}, "", newUrl);
            console.log(`[onMethodClick] Updated URL with unit_test_id: ${utd.unit_test_id}`);
        }
    }

    const previewData = buildMethodPreviewData(
        methodNode,
        methodData,
        fileData,
        methodNode.id
    );

    updateEditorAndPreview({
        content: utd?.unit_test_design_json || methodContent,
        previewData,
        readonly: false,
        skipEditorUpdate
    });

    if (!skipTreeUpdate) updateTreeActiveState();
};
// #endregion

