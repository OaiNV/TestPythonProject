/**
 * CREATE PROJECT
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
    setupDirectoryToggle,
    setupDirectoryInputValidation,
    appendBasicInfo,
    appendGitInfo,
    appendMembers,
    appendProgrammingInfo,
    appendDirectories,
    appendAIProgramming,
} from './create_project_base.js';

import { CREATE_PROJECT_MESSAGES } from "../commons/error_messages.js";
import { validateProjectData, validateFile } from '../project_detail/project_detail_helpers.js';
import { GitAuthDialog } from "../commons/git_auth_dialog.js";
import { BaseSpecification, GitProvider, GitDefaults } from "../commons/constants.js";
import { saveGitCredentials } from "../commons/git_credentials_storage.js";

// ============================================
// GET PROJECT ID FROM URL
// ============================================

const getProjectIdFromURL = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 2]; // /projects/{id}/edit
};

// ============================================
// CREATE-SPECIFIC STATE
// ============================================

let uploadedFiles = [];

const getBaseSpecificationValue = () => {
    const baseSpecSelect = document.getElementById("baseSpecification");
    return baseSpecSelect?.value || BaseSpecification.REQUIREMENT;
};

const isSourceCodeBaseSpec = () => getBaseSpecificationValue() === BaseSpecification.SOURCE_CODE;

const updateRepositoryRequirement = (isRequired) => {
    const requiredMark = document.getElementById("repositoryRequiredMark");
    if (requiredMark) {
        requiredMark.style.display = isRequired ? "inline" : "none";
    }

    const repoInput = document.getElementById("gitRepositoryInput");
    if (repoInput) {
        repoInput.required = isRequired;
        repoInput.setAttribute("aria-required", String(isRequired));
    }
};

const getGitRepositoryValue = () => {
    const repoInput = document.getElementById("gitRepositoryInput");
    return repoInput?.value.trim() || "";
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
    setupGitAuthDialogs();
    await loadUsersFromAPI();
    renderUserSearchResults(state.allUsers);
    renderMemberList(state.memberUsers);

    // Setup common handlers (from base)
    setupFormValidation();
    setupProgrammingLanguageChange();
    setupUserSearch();
    setupMemberSearch();
    setupClickSelection();
    setupTransferButtons();
    setupDirectoryToggle();
    setupDirectoryInputValidation();

    // Setup create-specific handlers
    setupBaseSpecificationChange();
    setupFileUpload();
    setupDirectoryValidation();
    setupSaveButton();
    setupCancelButton();
    renderRegisteredFiles();

    validateForm(false);
};
// ============================================
// API CALL - CREATE PROJECT
// ============================================

const createProject = async (formData) => {
    console.log("[API] POST Create Project");

    try {
        const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.PROJECTS_ENDPOINT}`;

        // Use apiRequest directly for FormData (not apiPost which stringifies)
        const response = await window.APIClient.request(url, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            const detailMessage = data.error_message ? ` ${data.error_message}` : "";
            const errorMsg = CREATE_PROJECT_MESSAGES.CREATE_ERROR + detailMessage;
            showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }
        return data;
    } catch (error) {
        if (!error.message) showAlert(CREATE_PROJECT_MESSAGES.CREATE_ERROR, "error");
        throw error;
    }
};

// ============================================
// BASE SPECIFICATION HANDLING
// ============================================

const updateBaseSpecificationUI = (value) => {
    const uploadSection = document.getElementById("uploadSection");
    const gitSection = document.getElementById("gitSection");
    const registeredFilesSection = document.getElementById("registeredFilesSection");

    if (!uploadSection || !gitSection || !registeredFilesSection) return;

    const config = {
        [BaseSpecification.SOURCE_CODE]: { upload: "none", git: "block", registeredFiles: "none" },
        file_upload: { upload: "block", git: "none", registeredFiles: "block" }
    };

    const visibility = config[value] || config.file_upload;

    uploadSection.style.display = visibility.upload;
    gitSection.style.display = visibility.git;
    registeredFilesSection.style.display = visibility.registeredFiles;

    const requiresRepository = value === BaseSpecification.SOURCE_CODE;
    updateRepositoryRequirement(requiresRepository);

    if (!requiresRepository) {
        state.gitAuthData = null;
    }

    if (value === BaseSpecification.SOURCE_CODE) {
        toggleSrcDirectory(true);
    } else {
        toggleSrcDirectory(false);
    }

    // Re-validate form after base spec change to update save button state
    validateForm(false);
};

const setupBaseSpecificationChange = () => {
    const baseSpecSelect = document.getElementById("baseSpecification");
    if (!baseSpecSelect) return;

    baseSpecSelect.addEventListener("change", async (e) => {
        const value = e.target.value;
        const previousValue = baseSpecSelect.dataset.previousValue || BaseSpecification.REQUIREMENT;

        if (uploadedFiles.length > 0 && value !== previousValue) {
            const confirmed = await confirm(
                CREATE_PROJECT_MESSAGES.BASE_SPEC_CHANGE_TITLE,
                CREATE_PROJECT_MESSAGES.BASE_SPEC_CHANGE_MESSAGE
            );

            if (confirmed) {
                clearUploadedFiles();
                baseSpecSelect.dataset.previousValue = value;
                updateBaseSpecificationUI(value);
                return;
            }
            baseSpecSelect.value = previousValue;
            return;
        }

        baseSpecSelect.dataset.previousValue = value;
        updateBaseSpecificationUI(value);
    });

    // Initialize previous value
    baseSpecSelect.dataset.previousValue = baseSpecSelect.value || BaseSpecification.REQUIREMENT;
    updateBaseSpecificationUI(baseSpecSelect.value);
};

// ============================================
// FILE UPLOAD HANDLING
// ============================================

const setupFileUpload = () => {
    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("fileInput");

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        handleFileUpload(files);
    });
};

const isDuplicateFile = (file) => {
    return uploadedFiles.some(f =>
        f.name === file.name &&
        f.size === file.size &&
        f.lastModified === file.lastModified
    );
};

const validateAndNotify = (file) => {
    const { valid, message } = validateFile(file);
    if (!valid) {
        showAlert(message, "error");
        return false;
    }
    return true;
};

const handleFileUpload = (files) => {
    const fileInput = document.getElementById("fileInput");
    const section = document.getElementById("registeredFilesSection");

    for (const file of files) {
        if (isDuplicateFile(file)) continue;
        if (!validateAndNotify(file)) continue;
        uploadedFiles.push(file);
    }

    renderRegisteredFiles();

    if (section) {
        section.style.display = uploadedFiles.length ? "block" : "none";
    }

    if (fileInput) fileInput.value = "";
};

const getRegisteredFilesHTML = (files) => {
    if (!Array.isArray(files) || files.length === 0) {
        return `<div class="file-item empty">ファイルがありません</div>`;
    }

    return files.map((file, index) => `
        <div class="file-item" data-index="${index}">
            <button class="btn-remove" title="削除">×</button>
            <span class="file-name">${escapeHtml(file.name)}</span>
        </div>
    `).join("");
};

const renderRegisteredFiles = () => {
    const container = document.getElementById("registeredFilesList");
    if (!container) return;

    const section = document.getElementById("registeredFilesSection");
    if (section) section.style.display = "block";

    container.innerHTML = getRegisteredFilesHTML(uploadedFiles);

    container.onclick = (e) => {
        const btn = e.target.closest(".btn-remove");
        if (!btn) return;

        const index = +btn.closest(".file-item").dataset.index;
        if (!isNaN(index)) {
            uploadedFiles.splice(index, 1);
            renderRegisteredFiles();
        }
    };
};

const clearUploadedFiles = () => {
    uploadedFiles = [];
    renderRegisteredFiles();
    document.getElementById("registeredFilesSection").style.display = "none";
    document.getElementById("fileInput").value = "";
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

        const allFilled = Array.from(directoryInputs).every(
            (input) => input.value.trim() !== ""
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
// FORM VALIDATION - HELPER FUNCTIONS
// ============================================

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

const updateSaveButtonState = (btn, enabled) => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.5";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
};

const focusFirstInvalidField = () => {
    const projectName = document.getElementById("projectName");
    const gitRepo = document.getElementById("gitRepositoryInput");
    const programmingLanguage = document.getElementById("programmingLanguage");
    const directoryInputs = document.querySelectorAll(".directory-list input");

    if (!projectName?.value.trim()) {
        projectName.focus();
        showAlert(CREATE_PROJECT_MESSAGES.PROJECT_NAME_REQUIRED, "error");
        return;
    }

    if (isSourceCodeBaseSpec() && !gitRepo?.value.trim()) {
        gitRepo.focus();
        showAlert(CREATE_PROJECT_MESSAGES.GIT_REPO_REQUIRED, "error");
        return;
    }

    if (!programmingLanguage?.value) {
        programmingLanguage.focus();
        showAlert(CREATE_PROJECT_MESSAGES.PROGRAMMING_LANGUAGE_REQUIRED, "error");
        return;
    }

    const emptyDir = Array.from(directoryInputs).find(input => !input.value.trim());
    if (emptyDir) {
        emptyDir.focus();
        showAlert(CREATE_PROJECT_MESSAGES.ENTER_ALL_DIRECTORIES, "error");
    }
};

// ============================================
// FORM VALIDATION
// ============================================

const validateForm = (showErrors = false) => {
    try {
        if (showErrors) {
            console.info("[validateForm] Start with error display");
        }

        const saveBtn = document.getElementById("saveBtn");
        if (!saveBtn) {
            if (showErrors) console.warn("[validateForm] Save button not found");
            return false;
        }

        const projectDataValid = validateProjectSection(showErrors);
        const gitDataValid = validateGitSection(showErrors);
        const languageFrameworkValid = validateLanguageFramework(showErrors);
        const directoriesValid = validateDirectories(showErrors);

        const isFormValid = projectDataValid && gitDataValid && languageFrameworkValid && directoriesValid;

        updateSaveButtonState(saveBtn, isFormValid);

        if (showErrors) {
            console.info("[validateForm] Completed", { isFormValid });
        }
        return isFormValid;
    } catch (error) {
        console.error("[validateForm] Error:", error);
        return false;
    }
};

const validateProjectSection = (showErrors = false) => {
    const projectName = document.getElementById("projectName")?.value.trim();
    const description = document.getElementById("description")?.value.trim();

    const result = validateProjectData(projectName, description);
    if (!result.valid) {
        if (showErrors) {
            console.warn("[validateForm] Project validation failed", { message: result.message });
        }
        return false;
    }
    return true;
};

const validateGitSection = (showErrors = false) => {
    if (!isSourceCodeBaseSpec()) {
        return true;
    }

    const gitRepoUrl = getGitRepositoryValue();
    const result = validateGitFields(gitRepoUrl);
    if (!result.valid) {
        if (showErrors) {
            console.warn("[validateForm] Git validation failed", { message: result.message });
        }
        return false;
    }
    return true;
};

const validateLanguageFramework = (showErrors = false) => {
    const programmingLanguage = document.getElementById("programmingLanguage")?.value;
    const frameworkTest = document.getElementById("frameworkTest")?.value;
    if (!programmingLanguage || !frameworkTest) {
        if (showErrors) {
            console.warn("[validateForm] Programming language or framework not selected");
        }
        return false;
    }
    return true;
};

const validateDirectories = (showErrors = false) => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    const allFilled = Array.from(directoryInputs).every(input => input.value.trim() !== "");
    if (!allFilled) {
        if (showErrors) {
            console.warn("[validateForm] Some directories are empty");
        }
        return false;
    }
    return true;
};


// ============================================
// SAVE BUTTON - VALIDATE WITH ERRORS WHEN CLICK
// ============================================

const setupSaveButton = () => {
    const saveBtn = document.getElementById("saveBtn");
    if (!saveBtn) return;

    saveBtn.addEventListener("click", async () => {
        console.log("[Save Button] Clicked");

        const isValid = validateForm(true);

        if (!isValid) {
            focusFirstInvalidField();
            return;
        }

        const data = getProjectFormData();
        const validation = validateFormData(data);

        if (!validation.valid) {
            showAlert(validation.message, "error");
            return;
        }

        console.log("[Save Button] All validations passed");

        // Show git auth dialog if gitRepositoryInput has data
        const gitRepoValue = getGitRepositoryValue();
        if (gitRepoValue) {
            showGitAuthDialog();
        } else {
            await proceedWithProjectCreation();
        }
    });
};

const setupFormValidation = () => {
    const debouncedValidateForm = debounce(() => validateForm(false), 250);

    setInputAttributes(document.getElementById("projectName"), {
        maxlength: VALIDATION.PROJECT_NAME_MAX,
        minlength: VALIDATION.PROJECT_NAME_MIN
    });
    setInputAttributes(document.getElementById("description"), {
        maxlength: VALIDATION.DESCRIPTION_MAX
    });
    const gitInputs = document.querySelectorAll('.form-input-x');
    setInputAttributes(gitInputs[1], { maxlength: VALIDATION.BRANCH_NAME_MAX });

    getInputsToWatch().forEach(input => attachValidationListeners(input, debouncedValidateForm));

    // Initial state
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = "0.5";
        saveBtn.style.cursor = "not-allowed";
    }
};

// ============================================
// GIT AUTH DIALOG
// ============================================

const setupGitAuthDialogs = () => {
    window.gitAuthDialog = new GitAuthDialog({
        onSuccess: async (authData) => {
            state.gitAuthData = authData;
            await proceedWithProjectCreation();
        },
        onCancel: () => {
            state.gitAuthData = null;
            hideLoading();
        },
        onError: (message) => {
            showAlert(message, "error");
        }
    });
};

const showGitAuthDialog = () => {
    const repoUrl = getGitRepositoryValue();
    console.log("[GitAuthDialog] repoUrl =", repoUrl);
    window.gitAuthDialog.showDialog(repoUrl);
};

const proceedWithProjectCreation = async () => {
    try {
        showLoading();

        const formData = collectFormData();

        const result = await createProject(formData);

        const projectId = result.data?.id || result.project_id || result.id;
        if (projectId && state.gitAuthData) {
            const repoValue = getGitRepositoryValue();
            const repoUrl = repoValue || null;

            let userName = null;
            let password = null;

            if (state.gitAuthData.type === GitProvider.GITHUB) {
                userName = GitDefaults.GITHUB_USER_NAME;
                password = state.gitAuthData.pat || null;
            } else if (state.gitAuthData.type === GitProvider.GITBUCKET) {
                userName = state.gitAuthData.username || null;
                password = state.gitAuthData.password || null;
            }

            if (userName && password) {
                saveGitCredentials(projectId, userName, password, repoUrl);
            }
        }

        hideLoading();
        showAlert(CREATE_PROJECT_MESSAGES.CREATE_SUCCESS, "success");

        if (projectId) {
            setTimeout(() => {
                window.location.href = `/projects/${projectId}`;
            }, 1500);
        } else {
            setTimeout(() => {
                window.location.href = "/projects";
            }, 1500);
        }

    } catch (error) {
        hideLoading();

        if (!error.message) {
            showAlert(CREATE_PROJECT_MESSAGES.CREATE_ERROR, "error");
        }
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
    baseSpec: getBaseSpecificationValue(),
    directories: [...document.querySelectorAll(".directory-list input")].map(i => i.value.trim())
});

const validateFormData = (data) => {
    const { projectName, gitRepoUrl, programmingLanguage, frameworkTest, directories, baseSpec } = data;

    const projectCheck = validateProjectData(projectName);
    if (!projectCheck.valid) return projectCheck;

    if (baseSpec === BaseSpecification.SOURCE_CODE) {
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

const toggleSrcDirectory = (disabled) => {
    const srcInput = document.querySelector(
        '.directory-list input[value="SRC"]'
    );
    if (!srcInput) return;

    srcInput.disabled = disabled;

    const wrapper = srcInput.closest(".input-with-text-a");
    if (wrapper) {
        wrapper.classList.toggle("directory-disabled", disabled);
    }
};

const appendBaseSpecAndFiles = (projectData, formData) => {
    const baseSpecEl = document.getElementById("baseSpecification");
    const baseSpec = baseSpecEl ? baseSpecEl.value : "";
    projectData.base_specification = baseSpec;

    // Git specification (only for source_code)
    if (baseSpec === BaseSpecification.SOURCE_CODE) {
        const gitSettingsEl = document.getElementById("gitSettings");
        projectData.git_specification = gitSettingsEl ? gitSettingsEl.value || "" : "";
    }

    // Append files to FormData (only for requirement)
    if (baseSpec === BaseSpecification.REQUIREMENT && uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach((file) => {
            formData.append("upload_files", file);
        });
    }
};

const collectFormData = () => {
    const formData = new FormData();

    // Build project data object
    const projectData = {};

    // Use helper functions to build projectData
    appendBasicInfo(projectData);
    appendGitInfo(projectData, state.gitAuthData);
    appendMembers(projectData);
    appendProgrammingInfo(projectData);
    appendDirectories(projectData);
    appendAIProgramming(projectData);

    // Base specification and files
    appendBaseSpecAndFiles(projectData, formData);

    // Debug: log projectData before stringify
    const projectDataJson = JSON.stringify(projectData);

    // Append project_data as JSON string
    formData.append("project_data", projectDataJson);

    // Debug: log FormData entries
    for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + (pair[1] instanceof File ? pair[1].name : pair[1]));
    }

    return formData;
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
            window.location.href = `/projects`;
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