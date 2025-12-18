/**
 * UPDATE PROJECT
 * Extends project_form_base.js
 */

import {
    PROJECT_CONFIG,
    VALIDATION,
    state,
    debounce,
    validateDirectoryName,
    validateGitFields,
    loadUsersFromAPI,
    renderUserSearchResults,
    renderMemberList,
    setupUserSearch,
    setupMemberSearch,
    setupClickSelection,
    setupTransferButtons,
    setupProgrammingLanguageChange,
    setupDirectoryInputValidation,
    appendBasicInfo,
    appendGitInfo,
    appendMembers,
    appendProgrammingInfo,
    appendDirectories,
    appendAIProgramming,
} from './create_project_base.js';

import { CREATE_PROJECT_MESSAGES, PROJECT_MESSAGES } from "../commons/error_messages.js";
import { validateProjectData } from '../project_detail/project_detail_helpers.js';
import { getGitAuth } from "../commons/git_auth_helper.js";

// ============================================
// GET PROJECT ID FROM URL
// ============================================

const getProjectIdFromURL = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 2]; // /projects/{id}/edit
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getGitRepositoryValue = () => {
    const repoInput = document.getElementById("gitRepositoryInput");
    return repoInput?.value.trim() || "";
};

const getGitBranchValue = () => {
    const branchInput = document.getElementById("gitBranchInput");
    return branchInput?.value.trim() || "";
};

const hasGitInfo = () => {
    const repoValue = getGitRepositoryValue();
    const branchValue = getGitBranchValue();
    return repoValue.trim() && branchValue.trim();
};

const isGitFieldsEnabled = () => {
    const gitInputs = document.querySelectorAll("#git-url input");
    return gitInputs.length > 0 && !gitInputs[0].disabled;
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        showLoading();
        await initializeApp();
    } catch (error) {
        console.error("Error initializing app:", error);
        showAlert(CREATE_PROJECT_MESSAGES.INIT_ERROR, "error");
    } finally {
        hideLoading();
    }
});

const initializeApp = async () => {
    const projectId = getProjectIdFromURL();

    await loadUsersFromAPI();

    // Setup common handlers (from base)
    setupFormValidation();
    setupProgrammingLanguageChange();
    setupUserSearch();
    setupMemberSearch();
    setupClickSelection();
    setupTransferButtons();
    setupDirectoryToggle();
    setupDirectoryInputValidation();

    // Load project data after handlers are setup
    await loadProjectData(projectId);

    renderUserSearchResults(state.allUsers);
    renderMemberList(state.memberUsers);

    // Setup update-specific handlers
    setupDirectoryValidation();
    setupSaveButton();
    setupCancelButton();

    validateForm(false);
};

// ============================================
// API CALL - LOAD PROJECT DATA
// ============================================

const loadProjectData = async (projectId) => {
    console.log("[API] GET Project Data", projectId);

    try {
        const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
        const response = await window.APIClient.get(url);
        const res = await response.json();
        if (!response.ok) {
            const errorMsg = res.error_message || CREATE_PROJECT_MESSAGES.PROJECT_LOAD_FAIL;
            showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        populateFormWithData(res.data);
    } catch (error) {
        console.error("[API] GET Project Data Error:", error);
        if (!error.message) showAlert(CREATE_PROJECT_MESSAGES.PROJECT_LOAD_FAIL, "error");
        throw error;
    }
};
// ============================================
// DISABLE/ENABLE GIT FIELDS (Branch & Repository URL)
// ============================================
const disableGitUrlAndBranch = () => {
    const gitInputs = document.querySelectorAll("#git-url input");
    gitInputs.forEach(input => {
        input.disabled = true;
        input.classList.add("disabled-field");
    });
};

const enableGitUrlAndBranch = () => {
    const gitInputs = document.querySelectorAll("#git-url input");
    gitInputs.forEach(input => {
        input.disabled = false;
        input.classList.remove("disabled-field");
    });
};

// ============================================
// POPULATE FORM WITH EXISTING DATA
// ============================================
// Populate Basic Info
const populateBasicInfo = (projectData) => {
    const projectNameInput = document.getElementById("projectName");
    const descriptionInput = document.getElementById("description");

    if (projectNameInput) projectNameInput.value = projectData.name || "";
    if (descriptionInput) descriptionInput.value = projectData.description || "";
};

// Populate Git Info
const populateGitInfo = (projectData) => {
    const repoInput = document.getElementById("gitRepositoryInput");
    const branchInput = document.getElementById("gitBranchInput");
    const repoValue = projectData.git?.repository || "";
    const branchValue = projectData.git?.branch || "";

    if (repoInput) repoInput.value = repoValue;
    if (branchInput) branchInput.value = branchValue;

    const gitSmallInputs = document.querySelectorAll(".form-input-sm");
    if (gitSmallInputs[0]) gitSmallInputs[0].value = projectData.ai_programming?.user_name || "";
    if (gitSmallInputs[1]) gitSmallInputs[1].value = projectData.ai_programming?.password || projectData.ai_programming?.token;

    // Enable git fields if repository or branch is empty, otherwise disable
    if (!repoValue.trim() || !branchValue.trim()) {
        enableGitUrlAndBranch();
    } else {
        disableGitUrlAndBranch();
    }
};

// Populate Programming Language & Framework
const populateLanguageFramework = (projectData) => {
    const langSelect = document.getElementById("programmingLanguage");
    const frameworkSelect = document.getElementById("frameworkTest");

    if (!langSelect || !frameworkSelect) return;

    const { language, framework } = projectData;
    if (!language) return;

    langSelect.value = language;
    langSelect.dispatchEvent(new Event("change", { bubbles: true }));

    if (!framework) return;

    trySetFramework(frameworkSelect, framework);
};

const trySetFramework = (frameworkSelect, framework, retries = 10, delay = 100) => {
    if (!frameworkSelect || !framework) return;

    const optionExists = Array.from(frameworkSelect.options).some(
        (opt) => opt.value === framework
    );

    if (optionExists) {
        frameworkSelect.value = framework;
        return;
    }

    if (retries > 0) {
        setTimeout(() => trySetFramework(frameworkSelect, framework, retries - 1, delay), delay);
    } else {
        console.warn(
            `[populateLanguageFramework] Framework '${framework}' not found after retries`
        );
    }
};

// Populate Directories
const populateDirectories = (projectData) => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    const dirKeys = ['rd', 'bd', 'pd', 'cd', 'md', 'id', 'fs', 'ac', 'source_code', 'utd', 'utc'];

    // Store initial directory values for comparison
    state.initialDirectories = {};

    // Check if base_specification is "source_code" to disable src directory
    const baseSpecification = projectData.base_specification;
    const shouldDisableSrc = baseSpecification === "source_code";

    directoryInputs.forEach((input, idx) => {
        if (idx < dirKeys.length) {
            const key = dirKeys[idx];
            const directory = projectData.directory || {};
            const value = directory[key] || "";
            input.value = value;
            // Store initial value
            state.initialDirectories[key] = value;

            // Disable src directory input if base_specification is "source_code"
            if (key === 'source_code' && shouldDisableSrc) {
                input.disabled = true;
                input.classList.add("disabled-field");
                console.log("[populateDirectories] Disabled SRC directory - base_specification is source_code");
            }
        }
    });
};

// Populate Members
const populateMembers = (projectData) => {
    // API returns "share" field, not "shared_members"
    const shareList = projectData.share || projectData.shared_members || [];

    if (Array.isArray(shareList) && shareList.length > 0) {
        state.memberUsers = shareList.map(email => {
            return state.allUsers.find(u => u.email === email) || { email, user_id: email };
        });
        renderMemberList(state.memberUsers);
        renderUserSearchResults(state.allUsers);
    }
};

// Main Function
const populateFormWithData = (apiResponse) => {
    const projectData = apiResponse.data || apiResponse;

    populateBasicInfo(projectData);
    populateGitInfo(projectData);
    populateLanguageFramework(projectData);
    populateDirectories(projectData);
    populateMembers(projectData);
};


// ============================================
// API CALL - UPDATE PROJECT
// ============================================

const updateProject = async (projectId, updateData) => {
    console.log('[API] PUT Project - projectId:', projectId);

    try {
        const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}/${projectId}`;
        const response = await window.APIClient.put(url, updateData);
        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error_message || PROJECT_MESSAGES.COMMON_ERROR_MESSAGE;
            showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        showAlert(PROJECT_MESSAGES.PROJECT_UPDATED, "success");
        return data;
    } catch (error) {
        console.error('[API] PUT Project Error:', error);
        if (!error.message) showAlert(HTTP_MESSAGES[500], "error");
        throw error;
    }
};

// ============================================
// DIRECTORY VALIDATION
// ============================================

const setupDirectoryValidation = () => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    const saveBtn = document.getElementById("saveBtn");
    if (!saveBtn) return;

    const validateAll = () => {
        if (directoryInputs.length === 0) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = "0.5";
            saveBtn.style.cursor = "not-allowed";
            return;
        }

        // Only validate enabled inputs (skip disabled ones like src when base_specification is source_code)
        const allFilled = Array.from(directoryInputs).every(
            (input) => input.disabled || input.value.trim() !== ""
        );
        saveBtn.disabled = !allFilled;
        saveBtn.style.opacity = allFilled ? "1" : "0.5";
        saveBtn.style.cursor = allFilled ? "pointer" : "not-allowed";
    };

    directoryInputs.forEach((input) => {
        input.setAttribute("maxlength", VALIDATION.DIRECTORY_NAME_MAX);

        input.addEventListener("input", (e) => {
            const value = e.target.value;
            const validation = validateDirectoryName(value);

            if (!validation.valid) {
                e.target.setCustomValidity(validation.message);
                e.target.classList.add("error");
            } else {
                e.target.setCustomValidity("");
                e.target.classList.remove("error");
            }

            validateAll();
        });
    });

    validateAll();
};

// ============================================
// FORM VALIDATION
// ============================================

const validateForm = () => {
    try {
        const saveBtn = document.getElementById("saveBtn");
        if (!saveBtn) return false;

        const projectDataValid = validateProjectSection();
        const gitDataValid = validateGitSection();
        const languageFrameworkValid = validateLanguageFramework();
        const directoriesValid = validateDirectories();

        const isFormValid = projectDataValid && gitDataValid && languageFrameworkValid && directoriesValid;
        updateSaveButtonState(saveBtn, isFormValid);
        return isFormValid;
    } catch (error) {
        console.error("[validateForm] Error:", error);
        return false;
    }
};

const validateProjectSection = () => {
    const projectName = document.getElementById("projectName")?.value.trim();
    const description = document.getElementById("description")?.value.trim();

    const result = validateProjectData(projectName, description);
    if (!result.valid) return false;
    return true;
};

const validateGitSection = () => {
    // Only validate if git fields are enabled (not disabled)
    if (!isGitFieldsEnabled()) {
        return true;
    }

    const gitRepoUrl = getGitRepositoryValue();
    // Only validate if repository has value
    if (!gitRepoUrl.trim()) {
        return true;
    }

    const result = validateGitFields(gitRepoUrl);
    if (!result.valid) return false;
    return true;
};

const validateLanguageFramework = () => {
    const programmingLanguage = document.getElementById("programmingLanguage")?.value;
    const frameworkTest = document.getElementById("frameworkTest")?.value;
    if (!programmingLanguage || !frameworkTest) return false;
    return true;
};

const validateDirectories = () => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    return Array.from(directoryInputs).every(input => input.value.trim() !== "");
};

const updateSaveButtonState = (btn, enabled) => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.5";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
};

const setInputAttributes = (input, attrs) => {
    if (!input) return;
    Object.entries(attrs).forEach(([key, val]) => input.setAttribute(key, val));
};

const attachValidationListeners = (input, debouncedValidate) => {
    if (!input) return;
    ["input", "change"].forEach(event =>
        input.addEventListener(event, debouncedValidate)
    );
};

const getInputsToWatch = () => {
    const requiredIds = ["projectName", "description", "programmingLanguage", "frameworkTest"];
    const requiredFields = requiredIds.map(id => document.getElementById(id)).filter(Boolean);
    const extraFields = document.querySelectorAll('.form-input-x, .form-input-sm');
    return [...requiredFields, ...extraFields];
};

const setupFormValidation = () => {
    const debouncedValidateForm = debounce(validateForm, 250);

    setInputAttributes(document.getElementById("projectName"), {
        maxlength: VALIDATION.PROJECT_NAME_MAX,
        minlength: VALIDATION.PROJECT_NAME_MIN
    });
    setInputAttributes(document.getElementById("description"), {
        maxlength: VALIDATION.DESCRIPTION_MAX
    });

    const gitInputs = document.querySelectorAll('.form-input-x');
    if (gitInputs[1]) setInputAttributes(gitInputs[1], { maxlength: VALIDATION.BRANCH_NAME_MAX });

    getInputsToWatch().forEach(input => attachValidationListeners(input, debouncedValidateForm));
};

const proceedWithProjectUpdate = async () => {
    try {
        showLoading();
        const projectId = getProjectIdFromURL();
        const formData = collectFormData();
        await updateProject(projectId, formData);

        setTimeout(() => {
            window.location.href = `/projects/${projectId}`;
        }, 1500);
    } catch (error) {
        console.error("Update project error:", error);
    } finally {
        hideLoading();
    }
};

// ============================================
// SAVE & CANCEL BUTTONS
// ============================================

const getProjectFormData = () => ({
    projectName: document.getElementById("projectName")?.value.trim() || "",
    description: document.getElementById("description")?.value.trim() || "",
    programmingLanguage: document.getElementById("programmingLanguage")?.value || "",
    frameworkTest: document.getElementById("frameworkTest")?.value || "",
    gitRepoUrl: getGitRepositoryValue(),
    directories: [...document.querySelectorAll(".directory-list input")].map(i => i.value.trim())
});

const validateFormData = (data) => {
    const { projectName, gitRepoUrl, programmingLanguage, frameworkTest, directories } = data;

    const projectCheck = validateProjectData(projectName);
    if (!projectCheck.valid) return projectCheck;

    // Only validate git if fields are enabled and have value
    if (isGitFieldsEnabled() && gitRepoUrl.trim()) {
        const gitCheck = validateGitFields(gitRepoUrl);
        if (!gitCheck.valid) return gitCheck;
    }

    if (!programmingLanguage)
        return { valid: false, message: CREATE_PROJECT_MESSAGES.PROGRAMMING_LANGUAGE_REQUIRED };

    if (!frameworkTest)
        return { valid: false, message: CREATE_PROJECT_MESSAGES.FRAMEWORK_TEST_REQUIRED };

    for (const dir of directories) {
        const dirCheck = validateDirectoryName(dir);
        if (!dirCheck.valid) return dirCheck;
    }

    return { valid: true };
};

// Check if directory values have changed
const getDirectoryChanges = () => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    const dirKeys = ['rd', 'bd', 'pd', 'cd', 'md', 'id', 'fs', 'ac', 'source_code', 'utd', 'utc'];
    const changes = [];

    directoryInputs.forEach((input, idx) => {
        if (idx < dirKeys.length) {
            const key = dirKeys[idx];
            // Skip disabled inputs (like src when base_specification is source_code)
            if (input.disabled) {
                return;
            }
            const initialValue = state.initialDirectories?.[key] || "";
            const currentValue = input.value.trim();

            if (initialValue !== currentValue) {
                changes.push({
                    key: key.toUpperCase(),
                    from: initialValue || "(空)",
                    to: currentValue || "(空)"
                });
            }
        }
    });

    return changes;
};

// Show directory change confirm modal
const showDirectoryChangeConfirm = async (changes) => {
    const title = CREATE_PROJECT_MESSAGES.DIRECTORY_CHANGE_TITLE;
    const changeList = changes.map(change =>
        `+ ${change.key}: 「${change.from}」から「${change.to}」へ変更`
    ).join("\n");
    const message = `${CREATE_PROJECT_MESSAGES.DIRECTORY_CHANGE_MESSAGE}\n${changeList}`;

    return await confirm(title, message, true);
};

const setupSaveButton = () => {
    const saveBtn = document.getElementById("saveBtn");
    if (!saveBtn) return;

    saveBtn.addEventListener("click", async () => {
        const data = getProjectFormData();
        const validation = validateFormData(data);

        if (!validation.valid) {
            showAlert(validation.message, "error");
            return;
        }

        // Check if directory values have changed
        const directoryChanges = getDirectoryChanges();

        // Get repository URL value
        const repoValue = getGitRepositoryValue();

        // If directories have changed and git repository has data, show confirm modal first
        if (directoryChanges.length > 0 && repoValue.trim()) {
            const confirmed = await showDirectoryChangeConfirm(directoryChanges);
            if (!confirmed) {
                return; // User cancelled
            }
        }

        // If repository URL exists and (git fields enabled OR directory changed), get git auth
        // This handles case where git info might be in localStorage when editing directory
        if (repoValue.trim() && (isGitFieldsEnabled() || directoryChanges.length > 0)) {
            try {
                const { userName, tokenPassword } = await getGitAuth(repoValue);
                state.gitAuthData = {
                    user_name: userName,
                    token_password: tokenPassword
                };
                await proceedWithProjectUpdate();
            } catch (error) {
                console.error("[setupSaveButton] Git auth error:", error);
                if (error.message !== "Authentication cancelled") {
                    showAlert(error.message || "Git authentication failed", "error");
                }
            }
        } else {
            showLoading();
            await proceedWithProjectUpdate();
        }
    });
};

const collectFormData = () => {
    // Build project data object (update API expects JSON, not FormData)
    const projectData = {};

    // Use helper functions to build projectData
    appendBasicInfo(projectData);
    appendGitInfo(projectData, state.gitAuthData);
    appendMembers(projectData);
    appendProgrammingInfo(projectData);
    appendDirectories(projectData);
    appendAIProgramming(projectData);

    // Clean up git_spec: only keep if has valid repository URL and credentials
    if (projectData.git_spec) {
        const repoValue = (projectData.git_spec.repository_url || "").trim();
        const branchValue = (projectData.git_spec.branch_name || "").trim();

        if (!repoValue) {
            console.log("No repository URL, removing git_spec");

            // No repository URL, remove git_spec
            delete projectData.git_spec;
        } else if (!projectData.git_spec.user_name || !projectData.git_spec.token_password) {
            // Repository URL exists but missing credentials - remove git_spec to avoid backend validation error
            // This happens when user hasn't filled the Git auth dialog yet
            console.log("[collectFormData] Repository URL provided but missing credentials, removing git_spec");
            delete projectData.git_spec;
        } else {
            // All required fields present, keep git_spec
            projectData.git_spec.repository_url = repoValue;
            projectData.git_spec.branch_name = branchValue;
        }
    }

    return projectData;
};

const setupCancelButton = () => {
    const cancelBtn = document.getElementById("cancelBtn");
    if (!cancelBtn) return;

    const confirmNavigation = async () => {
        return await confirm(
            CREATE_PROJECT_MESSAGES.CONFIRM_CANCEL_UPDATE_TITLE,
            CREATE_PROJECT_MESSAGES.CONFIRM_CANCEL_UPDATE_MESSAGE
        );
    };

    cancelBtn.addEventListener("click", async () => {
        const projectId = getProjectIdFromURL();
        const confirmed = await confirmNavigation();
        if (confirmed) {
            window.location.href = `/projects/${projectId}`;
        }
    });

    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', async (event) => {
        const confirmed = await confirmNavigation();
        if (confirmed) {
            window.history.back();
        } else {
            window.history.pushState(null, '', window.location.href);
        }
    });
};

const setupDirectoryToggle = () => {
    const directoryRow = document.querySelector(".form-row-setting label:has(.toggle-icon)");
    const directoryList = document.querySelector(".directory-list");
    const toggleIcon = document.querySelector(".toggle-icon");
    const memberSection = document.querySelector("#memberSection");

    if (!directoryRow || !directoryList || !memberSection || !toggleIcon) return;

    const DIRECTORY_OPEN_HEIGHT = "491px";
    const DIRECTORY_CLOSED_HEIGHT = "0px";
    const MEMBER_OPEN_HEIGHT = "944px";
    const MEMBER_CLOSED_HEIGHT = "403px";
    const TRANSITION_DURATION = "0.4s";

    directoryRow.style.cursor = "pointer";

    directoryRow.addEventListener("click", () => {
        const isOpen = directoryList.classList.toggle("open");
        toggleIcon.textContent = isOpen ? "▲" : "▼";

        directoryList.style.maxHeight = isOpen ? DIRECTORY_OPEN_HEIGHT : DIRECTORY_CLOSED_HEIGHT;
        directoryList.style.opacity = isOpen ? "1" : "0";

        memberSection.style.transition = `height ${TRANSITION_DURATION} ease`;
        memberSection.style.overflow = "hidden";
        memberSection.style.height = isOpen ? MEMBER_OPEN_HEIGHT : MEMBER_CLOSED_HEIGHT;
    });
};