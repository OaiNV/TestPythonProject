/**
 * User Management JavaScript
 * Handles user listing, search, add, edit, delete functionality
 * ES6+ Functional Approach
 */

import { USER_MESSAGES } from "./commons/error_messages.js";
// Configuration constants
const USER_CONFIG = {
  API_BASE_URL: "/api",
  USERS_ENDPOINT: "/users",
  TIMEOUT: 30000,
};

// Get MAX_LENGTH values from template
const MAX_LENGTH_EMAIL = parseInt(
  document.querySelector('meta[name="max-length-email"]')?.content || "254"
);
const MAX_LENGTH_NAME = parseInt(
  document.querySelector('meta[name="max-length-name"]')?.content || "100"
);
const MAX_LENGTH_PASS = parseInt(
  document.querySelector('meta[name="max-length-pass"]')?.content || "64"
);

// Global state
let currentSearch = "";
let users = [];

// DOM Elements
const DOM_ELEMENTS = {
  usersTableBody: document.getElementById("usersTableBody"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  addUserBtn: document.getElementById("addUserBtn"),
  addUserModal: document.getElementById("addUserModal"),
  addUserForm: document.getElementById("addUserForm"),
  confirmAddUserBtn: document.getElementById("confirmAddUser"),
  cancelAddUserBtn: document.getElementById("cancelAddUser"),
  alertContainer: document.getElementById("alertContainer"),
};

// Form field elements
const FORM_FIELDS = {
  userName: document.getElementById("userName"),
  userEmail: document.getElementById("userEmail"),
  userPassword: document.getElementById("userPassword"),
  userPasswordConfirm: document.getElementById("userPasswordConfirm"),
};

/**
 * Initialize user management functionality
 */
const initUserManagement = async () => {
  console.log("[UserManagement] Initializing user management");
  setupUserEventListeners();
  await loadUsers();
};

/**
 * Set up all event listeners
 */
const setupUserEventListeners = () => {
  // Search functionality
  DOM_ELEMENTS.searchBtn?.addEventListener("click", handleSearch);
  DOM_ELEMENTS.searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });

  // Add user modal
  DOM_ELEMENTS.addUserBtn?.addEventListener("click", showAddUserModal);
  DOM_ELEMENTS.confirmAddUserBtn?.addEventListener("click", handleAddUser);
  DOM_ELEMENTS.cancelAddUserBtn?.addEventListener("click", hideAddUserModal);

  // Form validation
  DOM_ELEMENTS.addUserForm?.addEventListener("input", validateForm);

  // Individual field validation
  Object.keys(FORM_FIELDS).forEach((fieldId) => {
    const field = FORM_FIELDS[fieldId];
    if (field) {
      field.addEventListener("blur", () => {
        validateField(fieldId);
        validateForm();
      });
      field.addEventListener("input", () => {
        validateField(fieldId);
        validateForm();
      });
    }
  });
};

/**
 * Load users from API
 */
const loadUsers = async () => {
  showLoading();

  try {
    const params = new URLSearchParams();

    if (currentSearch) {
      params.append("search", currentSearch);
    }

    const url = `${USER_CONFIG.API_BASE_URL}${USER_CONFIG.USERS_ENDPOINT}${params.toString() ? "?" + params.toString() : ""
      }`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getUserAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    users = data || [];

    renderUsersTable();
  } catch (error) {
    console.error("[loadUsers] Error loading users:", error);
    showAlert(USER_MESSAGES.LOAD_USERS_ERROR, "error");
  } finally {
    hideLoading();
  }
};

/**
 * Render users table
 */
const renderUsersTable = () => {
  if (users.length === 0) {
    DOM_ELEMENTS.usersTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
                    ユーザーが見つかりません
                </td>
            </tr>
        `;
    return;
  }

  DOM_ELEMENTS.usersTableBody.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td title="${escapeUserHtml(user.email)}">${escapeUserHtml(user.email)}</td>
          <td title="${escapeUserHtml(user.user_name)}">${escapeUserHtml(user.user_name)}</td>
          <td>${formatUserDate(user.created_at)}</td>
        </tr>
    `
    )
    .join("");
};

/**
 * Handle search
 */
const handleSearch = async () => {
  currentSearch = DOM_ELEMENTS.searchInput.value.trim();
  await loadUsers();
};

/**
 * Show add user modal
 */
const showAddUserModal = () => {
  DOM_ELEMENTS.addUserModal?.classList.add("show");
  DOM_ELEMENTS.addUserForm?.reset();

  // Clear all error messages
  Object.keys(FORM_FIELDS).forEach((fieldId) => {
    clearFieldError(fieldId);
  });

  DOM_ELEMENTS.confirmAddUserBtn.disabled = true;
};

/**
 * Hide add user modal
 */
const hideAddUserModal = () => {
  DOM_ELEMENTS.addUserModal?.classList.remove("show");
  DOM_ELEMENTS.addUserForm?.reset();

  // Clear all error messages
  Object.keys(FORM_FIELDS).forEach((fieldId) => {
    clearFieldError(fieldId);
  });
};

/**
 * Handle add user
 */
const handleAddUser = async () => {
  if (!validateForm()) {
    return;
  }

  const formData = new FormData(DOM_ELEMENTS.addUserForm);
  const hashedPassword = await window.hashUtil.hashPassword(formData.get("userPassword"));
  const userData = {
    email: formData.get("userEmail"),
    user_name: formData.get("userName"),
    password: hashedPassword,
  };

  showLoading();

  try {
    const response = await fetch(
      `${USER_CONFIG.API_BASE_URL}${USER_CONFIG.USERS_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getUserAuthToken()}`,
        },
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      showAlert(`${errorData.error_message}`, "error");
    } else {
      showAlert(USER_MESSAGES.CREATE_USER_SUCCESS, "success");
      hideAddUserModal();
      await loadUsers();
    }
  } catch (error) {
    showAlert(`${error.message}`, "error");
  } finally {
    hideLoading();
  }
};

/**
 * Validate individual field
 */
const validateField = (fieldId) => {
  const field = FORM_FIELDS[fieldId];
  if (!field) return false;

  const value = field.value.trim();
  const errorElement = document.getElementById(`${fieldId}Error`);

  // Clear previous error
  clearFieldError(fieldId);

  let isValid = true;
  let errorMessage = "";

  switch (fieldId) {
    case "userName":
      if (!value) {
        errorMessage = USER_MESSAGES.USERNAME_REQUIRED;
        isValid = false;
      } else if (value.length > MAX_LENGTH_NAME) {
        errorMessage = USERNAME_MAX_LENGTH(MAX_LENGTH_NAME);
        isValid = false;
      }
      break;

    case "userEmail":
      if (!value) {
        errorMessage = USER_MESSAGES.EMAIL_REQUIRED;
        isValid = false;
      } else if (!isValidEmailFormat(value)) {
        errorMessage = USER_MESSAGES.EMAIL_INVALID;
        isValid = false;
      } else if (value.length > MAX_LENGTH_EMAIL) {
        errorMessage = USER_MESSAGES.EMAIL_MAX_LENGTH;
        isValid = false;
      }
      break;

    case "userPassword":
      if (!value) {
        errorMessage = USER_MESSAGES.PASSWORD_REQUIRED;
        isValid = false;
      } else if (value.length < 8) {
        errorMessage = USER_MESSAGES.PASSWORD_MIN_LENGTH;
        isValid = false;
      } else if (value.length > MAX_LENGTH_PASS) {
        errorMessage = USER_MESSAGES.PASSWORD_MAX_LENGTH;
        isValid = false;
      }
      break;

    case "userPasswordConfirm":
      const password = FORM_FIELDS.userPassword.value;
      if (!value) {
        errorMessage = USER_MESSAGES.PASSWORD_CONFIRM_REQUIRED;
        isValid = false;
      } else if (value !== password) {
        errorMessage = USER_MESSAGES.PASSWORD_CONFIRM_MISMATCH;
        isValid = false;
      }
      break;
  }

  // Show error if invalid
  if (!isValid) {
    showFieldError(fieldId, errorMessage);
  }

  return isValid;
};

/**
 * Validate email format
 */
const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Show field error
 */
const showFieldError = (fieldId, message) => {
  const field = FORM_FIELDS[fieldId];
  const errorElement = document.getElementById(`${fieldId}Error`);

  if (field && errorElement) {
    field.style.borderColor = "#e74c3c";
    errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    console.error(
      `[showFieldError] Field or error element not found for ${fieldId}`
    );
  }
};

/**
 * Clear field error
 */
const clearFieldError = (fieldId) => {
  const field = FORM_FIELDS[fieldId];
  const errorElement = document.getElementById(`${fieldId}Error`);

  if (field && errorElement) {
    field.style.borderColor = "";
    errorElement.textContent = "";
    errorElement.style.display = "none";
  } else {
    console.error(
      `[clearFieldError] Field or error element not found for ${fieldId}`
    );
  }
};

/**
 * Validate form
 */
const validateForm = () => {
  const email = FORM_FIELDS.userEmail.value.trim();
  const userName = FORM_FIELDS.userName.value.trim();
  const password = FORM_FIELDS.userPassword.value;
  const passwordConfirm = FORM_FIELDS.userPasswordConfirm.value;

  // Default: button is disabled
  DOM_ELEMENTS.confirmAddUserBtn.disabled = true;

  // Check if all fields are filled
  const allFieldsFilled = userName && email && password && passwordConfirm;

  if (!allFieldsFilled) {
    return false;
  }

  // Check individual field validations
  const nameValid = userName.length <= MAX_LENGTH_NAME;
  const emailValid =
    email.length <= MAX_LENGTH_EMAIL && isValidEmailFormat(email);
  const passValid = password.length >= 8 && password.length <= MAX_LENGTH_PASS;
  const passConfirmValid = passwordConfirm === password;

  const allFieldsValid =
    nameValid && emailValid && passValid && passConfirmValid;

  // Only enable button if ALL validations pass
  DOM_ELEMENTS.confirmAddUserBtn.disabled = !allFieldsValid;

  return allFieldsValid;
};

/**
 * Get auth token from localStorage
 */
const getUserAuthToken = () => {
  return localStorage.getItem("access_token") || "";
};

/**
 * Format date for display
 */
const formatUserDate = (dateString) => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    return "-";
  }
};

/**
 * Escape HTML to prevent XSS
 */
const escapeUserHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  Auth.checkAuth();
  initUserManagement();
});

// Export for global access
window.userManagement = {
  initUserManagement,
  loadUsers,
  validateForm,
  showAddUserModal,
  hideAddUserModal,
};
