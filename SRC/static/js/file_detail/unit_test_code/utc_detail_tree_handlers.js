/**
 * UTC Tree Handlers
 * Handles tree node click events for file/class/method navigation
 */

import { renderCodeEditor } from './utc_detail_ui.js';
import { RD_MESSAGES } from '../../commons/error_messages.js';
import { createTreeNodeElement } from '../source_code/source_detail_ui.js';
import { getFileData, getFileId, getProjectId, setIsEditorReadOnly, setCurrentViewType, setHasUnsavedChanges } from './utc_detail_state.js';

/**
 * Handle file name click - show full source code in code editor (READ-ONLY)
 */
export const onFileClick = (fileNode) => {
    console.log(`[onFileClick] Start - fileId=${fileNode?.id}, fileName=${fileNode?.name}`);

    try {
        if (!fileNode || !fileNode.file_data) {
            console.warn("[onFileClick] Missing file node or file data");
            return;
        }

        const fileData = fileNode.file_data;
        const fullSourceCode = fileData.source_code || fileData.content || "";

        // Set editor to READ-ONLY mode for file view
        setIsEditorReadOnly(true);
        setCurrentViewType('file');
        setHasUnsavedChanges(false); // Reset unsaved changes
        renderCodeEditor(fullSourceCode, true);

        // Hide save button when viewing file
        const saveBtn = document.getElementById("saveCodeBtn");
        if (saveBtn) {
            saveBtn.style.display = "none";
        }

        console.log("[onFileClick] Success - displayed full source code (READ-ONLY)");
    } catch (error) {
        console.error("[onFileClick] Error:", error);
    }
};

/**
 * Handle class click - show unit test code for class in code editor (READ-ONLY)
 */
export const onClassClick = (classNode) => {
    console.log(`[onClassClick] Start - classId=${classNode?.id}`);

    try {
        if (!classNode || !classNode.class_data) {
            console.warn("[onClassClick] Missing class node or class data");
            return;
        }

        const classData = classNode.class_data;
        const classContent = classData.class_content || "";

        // Set editor to READ-ONLY mode for class view
        setIsEditorReadOnly(true);
        setCurrentViewType('class');
        setHasUnsavedChanges(false); // Reset unsaved changes
        renderCodeEditor(classContent, true);

        // Hide save button when viewing class
        const saveBtn = document.getElementById("saveCodeBtn");
        if (saveBtn) {
            saveBtn.style.display = "none";
        }

        console.log("[onClassClick] Success - displayed class unit test code (READ-ONLY)");
    } catch (error) {
        console.error("[onClassClick] Error:", error);
    }
};

/**
 * Find unit test code for method
 * @param {Object} fileData - File data
 * @param {string} methodId - Method ID
 * @returns {Object|null} Unit test code or null
 */
const findUnitTestCodeForMethod = (fileData, methodId) => {
    if (!fileData?.unit_test_codes || !Array.isArray(fileData.unit_test_codes)) {
        return null;
    }
    return fileData.unit_test_codes.find((utc) => utc.method_id === methodId) || null;
};

/**
 * Handle method click - show unit test code for method in code editor (EDITABLE)
 */
export const onMethodClick = (methodNode) => {
    console.log(`[onMethodClick] Start - methodId=${methodNode?.id}`);

    try {
        if (!methodNode || !methodNode.method_data) {
            console.warn("[onMethodClick] Missing method node or method data");
            return;
        }

        const fileData = getFileData();
        const methodData = methodNode.method_data;
        const methodContent = methodData.method_content || "";

        // Find unit test code for this method
        const utc = findUnitTestCodeForMethod(fileData, methodNode.id);
        
        // Update URL with unit_test_id if available
        if (utc?.unit_test_id) {
            const projectId = getProjectId();
            if (projectId) {
                const urlParams = new URLSearchParams(window.location.search);
                const newUrl = `/projects/${projectId}/utc/${utc.unit_test_id}${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
                window.history.pushState({}, "", newUrl);
                console.log(`[onMethodClick] Updated URL with unit_test_id: ${utc.unit_test_id}`);
            }
        }

        // Use unit_test_code content if available, otherwise use method_content
        const content = utc?.unit_test_code || utc?.ut_code_content || methodContent;

        // Set editor to EDITABLE mode for method view
        setIsEditorReadOnly(false);
        setCurrentViewType('method');
        setHasUnsavedChanges(false);
        renderCodeEditor(content, false);

        // Initially hide save button (will show when user makes changes)
        const saveBtn = document.getElementById("saveCodeBtn");
        if (saveBtn) {
            saveBtn.style.display = "none";
        }

        console.log("[onMethodClick] Success - displayed method unit test code (EDITABLE)");
    } catch (error) {
        console.error("[onMethodClick] Error:", error);
    }
};

/**
 * Render Code tab content (current file with classes/functions)
 */
export const renderCodeTabContent = (navigateToFile) => {
    console.log("[renderCodeTabContent] Start");

    try {
        const structureListEl = document.getElementById("codeNavigatorList");
        if (!structureListEl) {
            console.warning("[renderCodeTabContent] Structure list element not found");
            return;
        }

        const fileData = getFileData();
        const fileId = getFileId();

        if (!fileData || !fileId) {
            structureListEl.innerHTML = `<p class="empty-state">${RD_MESSAGES.FILE_NOT_LOADED}</p>`;
            return;
        }

        structureListEl.innerHTML = "";

        const fileName = fileData.file_name || fileData.file_path?.split("/").pop() || RD_MESSAGES.UNKNOWN_FILE;
        const originalSource = fileData.source_code || fileData.content || "";

        // Build children structure with class_data and method_data
        const children = [];
        const classes = fileData.classes || [];

        classes.forEach((cls) => {
            const classChildren = [];
            const methods = cls.methods || [];
            methods.forEach((method) => {
                classChildren.push({
                    id: method.method_id,
                    name: method.method_name,
                    type: "method",
                    method_data: method,
                    class_id: cls.class_id,
                });
            });

            children.push({
                id: cls.class_id,
                name: cls.class_name,
                type: "class",
                class_data: cls,
                children: classChildren,
            });
        });

        const globalMethods = fileData.global_methods || [];
        globalMethods.forEach((method) => {
            children.push({
                id: method.method_id,
                name: method.method_name,
                type: "global-method",
                method_data: method,
            });
        });

        const fileNode = {
            id: fileId,
            name: fileName,
            type: "file",
            file_data: {
                ...fileData,
                source_code: originalSource,
                content: originalSource,
            },
            children: children,
        };

        const element = createTreeNodeElement(fileNode, navigateToFile, onFileClick, onClassClick, onMethodClick);
        if (element) {
            structureListEl.appendChild(element);

            // Override click handler for file name to show full source code
            const fileItem = element.querySelector(`.structure-item.file[data-node-id="${fileId}"]`);
            if (fileItem) {
                // Clone element to remove all existing event listeners
                const clonedItem = fileItem.cloneNode(true);

                // Preserve all attributes and classes
                Array.from(fileItem.attributes).forEach(attr => {
                    clonedItem.setAttribute(attr.name, attr.value);
                });
                clonedItem.className = fileItem.className;
                clonedItem.style.cssText = fileItem.style.cssText;

                // Replace the original with cloned element
                fileItem.parentNode.replaceChild(clonedItem, fileItem);

                // Add custom click handler to show full source code
                clonedItem.addEventListener("click", (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onFileClick(fileNode);
                });

                clonedItem.style.cursor = "pointer";
            }
        }

        console.log("[renderCodeTabContent] Success");
    } catch (error) {
        console.error("[renderCodeTabContent] Error:", error);
    }
};