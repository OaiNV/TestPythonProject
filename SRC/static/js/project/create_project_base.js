/**
 * PROJECT FORM BASE
 * Shared functionality for Create & Update Project
 */
import { CREATE_PROJECT_MESSAGES } from "../commons/error_messages.js";
import { GitProvider, GitDefaults } from "../commons/constants.js";
// CONFIGURATION
export const PROJECT_CONFIG = {
    API_BASE_URL: "/api",
    USERS_ENDPOINT: "/users",
    PROJECTS_ENDPOINT: "/projects",
    TIMEOUT: 30000,
};

// Framework mapping
export const FRAMEWORK_MAP = {
    Java: ["JUnit", "TestNG"],
    Python: ["pytest", "unittest"],
    "C#": ["NUnit", "MSTest", "xUnit"],
};

// Validation patterns
export const VALIDATION = {
    PROJECT_NAME_MIN: 1,
    PROJECT_NAME_MAX: 50,
    DESCRIPTION_MAX: 500,
    BRANCH_NAME_MAX: 255,
    GIT_PASSWORD_MAX: 255,
    DIRECTORY_NAME_MIN: 1,
    DIRECTORY_NAME_MAX: 100,
    DIRECTORY_PATTERN: /^[a-zA-Z0-9_.\/-]+$/,
};

// GLOBAL STATE
export const state = {
    allUsers: [],
    memberUsers: [],
    gitAuthData: null,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function
 */
export const debounce = (fn, delay = 250) => {
    let timer;
    return function (...args) {
        const context = this;
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(context, args), delay);
    };
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate directory name
 */
export const validateDirectoryName = (dirName) => {
    try {
        if (!dirName || dirName.trim() === "") return { valid: true };

        if (dirName.length < VALIDATION.DIRECTORY_NAME_MIN ||
            dirName.length > VALIDATION.DIRECTORY_NAME_MAX ||
            !VALIDATION.DIRECTORY_PATTERN.test(dirName) ||
            dirName.startsWith('.') || dirName.endsWith('.') ||
            /\s/.test(dirName)) {

            return {
                valid: false,
                message: CREATE_PROJECT_MESSAGES.INVALID_DIRECTORY_NAME,
            };
        }

        return { valid: true };
    } catch (error) {
        console.error('[validateDirectoryName] Error:', error);
        throw error;
    }
};

/**
 * Validate git fields
 */
export const validateGitFields = (repoUrl) => {
    if (!repoUrl || repoUrl.trim() === "") {
        return {
            valid: false,
            message: CREATE_PROJECT_MESSAGES.GIT_REPO_REQUIRED,
        };
    }
    return { valid: true };
};

// ============================================
// API CALLS
// ============================================

/**
 * Load users from API
 */
export const loadUsersFromAPI = async () => {
    console.log("[API] GET Users");

    try {
        const url = `${PROJECT_CONFIG.API_BASE_URL}${PROJECT_CONFIG.USERS_ENDPOINT}`;
        const response = await window.APIClient.get(url);
        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error_message || CREATE_PROJECT_MESSAGES.LOAD_USERS_ERROR;
            showAlert(errorMsg, "error");
            throw new Error(errorMsg);
        }

        state.allUsers = data.users || data || [];
        state.memberUsers = [];
    } catch (error) {
        console.error("[API] GET Users Error:", error);
        if (!error.message) showAlert(CREATE_PROJECT_MESSAGES.LOAD_USERS_ERROR, "error");
        throw error;
    }
};

// ============================================
// UI RENDERING - USERS & MEMBERS
// ============================================

/**
 * Render user search results
 */
const getUserItemHTML = (user) => {
    const initial = (user.user_name || user.email || "U").charAt(0).toUpperCase();
    return `
        <div class="user-item" data-id="${user.user_id}">
            <div class="user-avatar">${initial}</div>
            <span title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</span>
        </div>
    `;
};

const getNoUserFoundHTML = () => `
    <div class="user-item empty" style="color:#999;padding:20px;">
        ユーザーが見つかりません
    </div>
`;

export const renderUserSearchResults = (list = []) => {
    const container = document.getElementById("userSearchResults");
    if (!container) return;

    const filtered = list.filter(u => !state.memberUsers.some(m => m.user_id === u.user_id));

    container.innerHTML = filtered.length
        ? filtered.map(getUserItemHTML).join("")
        : getNoUserFoundHTML();
};

/**
 * Render member list
 */
const getMemberItemHTML = (member) => {
    const initial = (member.user_name || member.email || "U").charAt(0).toUpperCase();
    return `
        <div class="user-item member-item" data-id="${member.user_id}">
            <div class="user-avatar">${initial}</div>
            <span title="${escapeHtml(member.email)}">${escapeHtml(member.email)}</span>
        </div>
    `;
};

const getNoMembersHTML = () => `
    <div class="user-item empty" style="text-align:center;color:#999;padding:20px;">
        メンバーがいません
    </div>
`;

export const renderMemberList = (list = []) => {
    const container = document.getElementById("memberList");
    if (!container) return;

    container.innerHTML = list.length
        ? list.map(getMemberItemHTML).join("")
        : getNoMembersHTML();
};

// ============================================
// EVENT HANDLERS - SEARCH
// ============================================

/**
 * Setup user search
 */
export const setupUserSearch = () => {
    const input = document.getElementById("userSearchInput");
    const btn = document.getElementById("userSearchBtn");
    if (!input || !btn) return;

    const doSearch = () => {
        const keyword = input.value.trim().toLowerCase();
        if (!keyword) {
            renderUserSearchResults(state.allUsers);
            return;
        }

        const filtered = state.allUsers.filter(
            (u) =>
                u.email?.toLowerCase().includes(keyword) ||
                u.user_name?.toLowerCase().includes(keyword)
        );
        renderUserSearchResults(filtered);
    };

    input.addEventListener("input", doSearch);
};

/**
 * Setup member search
 */
export const setupMemberSearch = () => {
    const input = document.getElementById("memberSearchInput");
    const btn = document.getElementById("memberSearchBtn");
    if (!input || !btn) return;

    const doSearch = () => {
        const keyword = input.value.trim().toLowerCase();
        if (!keyword) {
            renderMemberList(state.memberUsers);
            return;
        }

        const filtered = state.memberUsers.filter(
            (m) =>
                m.email?.toLowerCase().includes(keyword) ||
                m.user_name?.toLowerCase().includes(keyword)
        );
        renderMemberList(filtered);
    };

    input.addEventListener("input", doSearch);
};

// ============================================
// EVENT HANDLERS - MEMBER TRANSFER
// ============================================

const clearSelection = () => {
    document.querySelectorAll("#userSearchResults .user-item").forEach(i => i.classList.remove("selected"));
    document.querySelectorAll("#memberList .member-item").forEach(i => i.classList.remove("selected"));
};

const selectUserItem = (userItem) => {
    clearSelection();
    userItem.classList.add("selected");
};

const selectMemberItem = (memberItem) => {
    clearSelection();
    memberItem.classList.add("selected");
};

const addUserToMembers = (userId) => {
    const user = state.allUsers.find(u => u.user_id == userId);
    if (user && !state.memberUsers.some(m => m.user_id == userId)) {
        state.memberUsers.push(user);
    }
};

const removeMember = (memberId) => {
    state.memberUsers = state.memberUsers.filter(m => m.user_id != memberId);
};

const transferSelection = () => {
    const selectedUser = document.querySelector("#userSearchResults .user-item.selected");
    const selectedMember = document.querySelector("#memberList .member-item.selected");

    if (selectedUser) {
        addUserToMembers(selectedUser.dataset.id);
    }

    if (selectedMember) {
        removeMember(selectedMember.dataset.id);
    }

    renderMemberList(state.memberUsers);
    renderUserSearchResults(state.allUsers);
};

export const setupClickSelection = () => {
    document.addEventListener("click", (e) => {
        const transferBtn = e.target.closest(".btn-transfer");

        const userItem = e.target.closest("#userSearchResults .user-item");
        if (userItem && !userItem.classList.contains("empty")) {
            return selectUserItem(userItem);
        }

        const memberItem = e.target.closest("#memberList .member-item");
        if (memberItem && !memberItem.classList.contains("empty")) {
            return selectMemberItem(memberItem);
        }

        if (!transferBtn) clearSelection();
    });
};

export const setupTransferButtons = () => {
    const btn = document.querySelector(".btn-transfer");
    if (!btn) return;
    btn.addEventListener("click", transferSelection);
};

// ============================================
// FORM HANDLING - PROGRAMMING LANGUAGE
// ============================================

export const setupProgrammingLanguageChange = () => {
    const langSelect = document.getElementById("programmingLanguage");
    const frameworkSelect = document.getElementById("frameworkTest");

    if (!langSelect || !frameworkSelect) return;

    langSelect.addEventListener("change", (e) => {
        const lang = e.target.value;
        frameworkSelect.innerHTML = '<option value="" disabled selected>選択してください</option>';

        if (lang && FRAMEWORK_MAP[lang]) {
            FRAMEWORK_MAP[lang].forEach((fw) => {
                const option = document.createElement("option");
                option.value = fw;
                option.textContent = fw;
                frameworkSelect.appendChild(option);
            });
        }
    });
};

// ============================================
// FORM HANDLING - DIRECTORY
// ============================================

export const setupDirectoryToggle = () => {
    const directoryRow = document.querySelector(".form-row-setting label:has(.toggle-icon)");
    const directoryList = document.querySelector(".directory-list");
    const toggleIcon = document.querySelector(".toggle-icon");
    const memberSection = document.querySelector("#memberSection");

    if (!directoryRow || !directoryList || !memberSection || !toggleIcon) return;

    const DIRECTORY_OPEN_HEIGHT = "491px";
    const DIRECTORY_CLOSED_HEIGHT = "0px";
    const MEMBER_OPEN_HEIGHT = "877px";
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

export const setupDirectoryInputValidation = () => {
    const directoryInputs = document.querySelectorAll(".directory-list input");
    const allowedPattern = /^[a-zA-Z0-9_.\/-]*$/;

    const sanitizeValue = (value) => {
        value = value.replace(/[^a-zA-Z0-9_.\/-]/g, '');
        return value.slice(0, 100);
    };

    const isValid = (value) => {
        return value.length >= 1 && value.length <= 100 && allowedPattern.test(value);
    };

    directoryInputs.forEach(input => {
        input.addEventListener("input", () => {
            const sanitized = sanitizeValue(input.value);
            input.value = sanitized;

            input.classList.toggle("input-error", !isValid(sanitized));
        });

        input.addEventListener("blur", () => {
            input.classList.toggle("input-error", !isValid(input.value));
        });
    });
};

// ============================================
// FORM DATA COLLECTION
// ============================================

export const appendBasicInfo = (projectData) => {
    const projectNameEl = document.getElementById("projectName");
    const descriptionEl = document.getElementById("description");
    projectData.name = projectNameEl ? projectNameEl.value.trim() : "";
    projectData.description = descriptionEl ? descriptionEl.value.trim() : "";
};

export const appendGitInfo = (projectData, gitAuthData = null) => {
    const repoInput = document.getElementById("gitRepositoryInput");
    const branchInput = document.getElementById("gitBranchInput");
    const repoUrl = (repoInput?.value || "").trim();
    
    projectData.git_spec = {
        repository_url: repoUrl,
        branch_name: (branchInput?.value || "").trim(),
        user_name: null,
        token_password: null,
    };

    // Get user_name and token_password from Git Auth Data
    if (gitAuthData) {
        // Support new format from getGitAuth(): { user_name, token_password }
        if (gitAuthData.user_name && gitAuthData.token_password) {
            console.log("[appendGitInfo] Using new format - user_name and token_password");
            // Detect provider from repository URL
            const isGitHub = repoUrl.toLowerCase().includes("github.com");
            
            if (isGitHub) {
                // GitHub: default user_name is "DocifyCode", use token_password from gitAuthData
                projectData.git_spec.user_name = GitDefaults.GITHUB_USER_NAME;
                projectData.git_spec.token_password = gitAuthData.token_password;
            } else {
                // GitBucket or other: use user_name and token_password from gitAuthData
                projectData.git_spec.user_name = gitAuthData.user_name;
                projectData.git_spec.token_password = gitAuthData.token_password;
            }
        }
        // Support old format from GitAuthDialog: { type, pat, username, password }
        else if (gitAuthData.type === GitProvider.GITHUB) {
            // GitHub: default user_name is "DocifyCode", token_password is PAT
            projectData.git_spec.user_name = GitDefaults.GITHUB_USER_NAME;
            projectData.git_spec.token_password = gitAuthData.pat || null;
        } else if (gitAuthData.type === GitProvider.GITBUCKET) {
            // GitBucket: use username and password from dialog
            projectData.git_spec.user_name = gitAuthData.username || null;
            projectData.git_spec.token_password = gitAuthData.password || null;
        }
    }
};

export const appendAIProgramming = (projectData) => {
    const gitSmallInputs = document.querySelectorAll(".form-input-sm");
    projectData.ai_spec = {
        user_name: gitSmallInputs[0]?.value || "",
        token_password: gitSmallInputs[1]?.value || ""
    };
};

export const appendMembers = (projectData) => {
    projectData.share = state.memberUsers ? state.memberUsers.map(member => member.email) : [];
};

export const appendProgrammingInfo = (projectData) => {
    const programmingLanguageEl = document.getElementById("programmingLanguage");
    const frameworkTestEl = document.getElementById("frameworkTest");
    projectData.programming_language = programmingLanguageEl ? programmingLanguageEl.value : "";
    projectData.framework_test = frameworkTestEl ? frameworkTestEl.value : "";
};

export const appendDirectories = (projectData) => {
    const directories = document.querySelectorAll(".directory-list input");
    const dirNames = ["rd", "bd", "pd", "cd", "md", "id", "fs", "ac", "src", "utd", "utc"];
    projectData.directory_spec = {};
    directories.forEach((input, idx) => {
        if (idx < dirNames.length) {
            // Skip disabled inputs (like src when base_specification is source_code)
            if (input.disabled) {
                return;
            }
            projectData.directory_spec[dirNames[idx]] = input.value || input.placeholder || "";
        }
    });
};