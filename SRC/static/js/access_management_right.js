/**
 * Access Management Right JavaScript
 * Handles group and user management operations
 * ES6+ Functional Approach
 */

const ACCESS_CONFIG = {
  API_BASE: "/api/access-rights",
  GROUPS_ENDPOINT: "/groups",
  USERS_ENDPOINT: "/users",
  TIMEOUT: 30000,
};

import { ACCESS_MESSAGES } from './commons/error_messages.js';

// State
let accessGroups = [];
let accessUsers = [];
let accessSelectedGroupId = null;
let accessSelectedUserId = null;

// DOM helpers
// DOM helper: get element by id
const $accessId = (id) => document.getElementById(id);

const getAccessToken = () => {
  return localStorage.getItem("access_token") || "";
};

// DATA CONVERSION UTILITIES

/**
 * Convert role string to permissions string
 */
const roleToPermissions = (role) => (role === "admin" ? "admin" : "user");

/**
 * Convert permissions string to Japanese role string
 */
const permissionsToRole = (permissions) =>
  permissions === "admin" ? "管理者" : "ユーザー";

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  Auth.checkAuth();
  initAccessEventListeners();
  accessLoadGroups();
});

/**
 * Initialize all event listeners
 */
const initAccessEventListeners = () => {
  // Tab switching
  const tabGroup = $accessId("tabGroup");
  const tabUser = $accessId("tabUser");
  if (tabGroup) tabGroup.addEventListener("click", () => switchTab("group"));
  if (tabUser) tabUser.addEventListener("click", () => switchTab("user"));

  // Group actions
  const addGroupBtn = $accessId("addGroupBtn");
  if (addGroupBtn) addGroupBtn.addEventListener("click", accessHandleAddGroup);

  const groupNameInput = $accessId("groupNameInput");
  if (groupNameInput) {
    groupNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") accessHandleAddGroup();
    });
  }

  // User actions
  const addUserBtn = $accessId("addUserBtn");
  if (addUserBtn) addUserBtn.addEventListener("click", accessHandleAddUser);

  const userNameInput = $accessId("userNameInput");
  if (userNameInput) {
    userNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") accessHandleAddUser();
    });
  }
};
// TAB SWITCH
const switchTab = (tab) => {
  const groupTab = $accessId("tabGroup");
  const userTab = $accessId("tabUser");
  const groupContent = $accessId("groupContent");
  const userContent = $accessId("userContent");

  if (tab === "group") {
    groupTab?.classList.add("active");
    userTab?.classList.remove("active");
    groupContent?.classList.add("active");
    userContent?.classList.remove("active");
  } else {
    userTab?.classList.add("active");
    groupTab?.classList.remove("active");
    userContent?.classList.add("active");
    groupContent?.classList.remove("active");
    // Load users when switching to user tab
    accessLoadUsers();
  }
};

// // Attach event listeners for tabs
document.addEventListener("DOMContentLoaded", () => {
  const groupTabBtn = $accessId("tabGroup");
  const userTabBtn = $accessId("tabUser");

  groupTabBtn?.addEventListener("click", () => switchTab("group"));
  userTabBtn?.addEventListener("click", () => switchTab("user"));
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  accessLoadGroups();
});

// ========================================
// GROUP MANAGEMENT
// ========================================

const accessLoadGroups = async () => {
  showLoading();
  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.GROUPS_ENDPOINT}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    console.log("API Response:", result);

    if (result.statusCode === 200) {
      accessGroups = result.data || [];
    } else {
      throw new Error(result.message || "Failed to load groups");
    }
  } catch (err) {
    console.error("accessLoadGroups error:", err);
    showAlert(err.message || ACCESS_MESSAGES.GROUP_LOAD_FAILED, "error");
    accessGroups = [];
  } finally {
    accessRenderGroupsTable();
    hideLoading();
  }
};

const accessRenderGroupsTable = () => {
  const tbody = $accessId("groupsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!accessGroups || accessGroups.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:20px;color:#718096">
                    グループがありません
                </td>
            </tr>
        `;
    return;
  }

  accessGroups.forEach((g) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${escapeHtml(g.group_name)}</td>
            <td>${permissionsToRole(g.permissions)}</td>
            <td>${formatDate(g.created_at)}</td>
            <td>
                <button class="btn-delete" data-id="${g.access_right_id
      }" data-name="${escapeHtml(g.group_name)}" title="削除">
                    <i class="fa-regular fa-trash-can" style="color: #ff0000ff;"></i>
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });

  tbody
    .querySelectorAll(".btn-delete")
    .forEach((btn) =>
      btn.addEventListener("click", accessOnDeleteGroupButtonClick)
    );
};

const accessOnDeleteGroupButtonClick = (e) => {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const name = btn.getAttribute("data-name");
  accessOpenGroupDeleteModal(id, name);
};

const accessHandleAddGroup = async () => {
  const input = $accessId("groupNameInput");
  const groupName = input?.value?.trim();

  if (!groupName) {
    showAlert(ACCESS_MESSAGES.GROUP_NAME_REQUIRED, "error");
    return;
  }

  if (groupName.length < 1 || groupName.length > 50) {
    showAlert(ACCESS_MESSAGES.GROUP_NAME_LENGTH, "error");
    return;
  }

  const radios = document.querySelectorAll('input[name="groupRole"]');
  const role = Array.from(radios).find((r) => r.checked)?.value || "user";
  const permissions = roleToPermissions(role);

  showLoading();
  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.GROUPS_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_name: groupName,
          permissions: permissions,
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result.statusCode === 200) {
      if (input) input.value = "";
      // Success case - use toast
      showAlert("グループが正常に作成されました。" || result.message, "success");
      await accessLoadGroups();
    } else {
      // Error case - use dialog
      showAlert(result.message || ACCESS_MESSAGES.GROUP_NAME_DUPLICATE, "error");
    }
  } catch (err) {
    console.error("accessHandleAddGroup error:", err);
    showAlert(ACCESS_MESSAGES.GROUP_NAME_DUPLICATE, "error");
  } finally {
    hideLoading();
  }
};

const accessOpenGroupDeleteModal = async (id, name) => {
  accessSelectedGroupId = id;
  const confirmed = await confirm(
    "グループ削除",
    `グループ「${name}」を削除しますか？`
  );

  if (confirmed) {
    await accessConfirmGroupDelete();
  } else {
    accessSelectedGroupId = null;
  }
};

const accessCloseGroupDeleteModal = () => {
  accessSelectedGroupId = null;
};

const accessConfirmGroupDelete = async () => {
  if (!accessSelectedGroupId) return;

  showLoading();

  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.GROUPS_ENDPOINT}/${accessSelectedGroupId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result.statusCode === 200) {
      // Success case - use toast
      showAlert(ACCESS_MESSAGES.GROUP_DELETE_SUCCESS, "success");
      await accessLoadGroups();
    } else {
      // Error case - use dialog
      showAlert(ACCESS_MESSAGES.GROUP_DELETE_FAILED, "error");
    }
  } catch (err) {
    console.error("accessConfirmGroupDelete error:", err);
    showAlert(ACCESS_MESSAGES.GROUP_DELETE_FAILED, "error");
  } finally {
    accessSelectedGroupId = null;
    hideLoading();
  }
};

// USER MANAGEMENT (Placeholder)

const accessLoadUsers = async () => {
  showLoading();
  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.USERS_ENDPOINT}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result.statusCode === 200) {
      accessUsers = result.data || [];
    } else {
      throw new Error(result.message || "Failed to load users");
    }
  } catch (err) {
    console.error("accessLoadUsers error:", err);
    accessUsers = [];
  } finally {
    accessRenderUsersTable();
    hideLoading();
  }
};

const accessRenderUsersTable = () => {
  const tbody = $accessId("usersTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!accessUsers || accessUsers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:20px;color:#718096">
                    ユーザーがありません
                </td>
            </tr>
        `;
    return;
  }

  accessUsers.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${escapeHtml(u.login_id || "")}</td>
            <td>${permissionsToRole(u.permissions)}</td>
            <td>${formatDate(u.created_at)}</td>
            <td>
                <button class="btn-delete" data-id="${u.access_right_id
      }" data-email="${escapeHtml(u.login_id)}" title="削除">
                    <i class="fa-regular fa-trash-can" style="color: #ff0000ff;"></i>
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", accessOnDeleteUserButtonClick);
  });
};

/**
 * Handle delete user button click
 */
const accessOnDeleteUserButtonClick = async (e) => {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const email = btn.getAttribute("data-email");

  accessOpenUserDeleteModal(id, email);
};

/**
 * Handle add user button click
 */
const accessHandleAddUser = async () => {
  const nameInput = $accessId("userNameInput");
  const userEmail = nameInput?.value?.trim();

  // FE Validation only
  if (!userEmail) {
    showAlert(ACCESS_MESSAGES.USER_NAME_REQUIRED, "error");
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    showAlert(ACCESS_MESSAGES.USER_EMAIL_INVALID, "error");
    return;
  }

  const radios = document.querySelectorAll('input[name="userRole"]');
  const role = Array.from(radios).find((r) => r.checked)?.value || "user";
  const permissions = roleToPermissions(role);

  showLoading();
  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.USERS_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_id: userEmail,
          permissions: permissions,
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result.statusCode === 200) {
      if (nameInput) nameInput.value = "";
      // Success case - use toast
      showAlert(ACCESS_MESSAGES.USER_ADD_SUCCESS, "success");
      await accessLoadUsers();
    } else {
      // Error case - use dialog
      showAlert(ACCESS_MESSAGES.USER_ALREADY_EXISTS, "error");
    }
  } catch (err) {
    console.error("accessHandleAddUser error:", err);
    showAlert(ACCESS_MESSAGES.USER_ALREADY_EXISTS, "error");
  } finally {
    hideLoading();
  }
};

const accessOpenUserDeleteModal = async (id, email) => {
  accessSelectedUserId = id;
  const confirmed = await confirm(
    "ユーザー削除",
    ACCESS_MESSAGES.USER_DELETE_CONFIRM(email)
  );

  if (confirmed) {
    await accessConfirmUserDelete();
  } else {
    accessSelectedUserId = null;
  }
};

const accessCloseUserDeleteModal = () => {
  accessSelectedUserId = null;
};

const accessConfirmUserDelete = async () => {
  if (!accessSelectedUserId) return;

  showLoading();

  try {
    const response = await fetch(
      `${ACCESS_CONFIG.API_BASE}${ACCESS_CONFIG.USERS_ENDPOINT}/${accessSelectedUserId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result.statusCode === 200) {
      showAlert(ACCESS_MESSAGES.USER_DELETE_SUCCESS, "success");
      await accessLoadUsers();
    } else {
      showAlert(ACCESS_MESSAGES.USER_DELETE_FAILED, "error");
    }
  } catch (err) {
    console.error("accessConfirmUserDelete error:", err);
    showAlert(ACCESS_MESSAGES.USER_DELETE_IN_PROGRESS, "info");
  } finally {
    accessSelectedUserId = null;
    hideLoading();
  }
};

// Expose safe global API
window.accessManagement = {
  loadGroups: accessLoadGroups,
  loadUsers: accessLoadUsers,
  addGroup: accessHandleAddGroup,
  addUser: accessHandleAddUser,
  openGroupDeleteModal: accessOpenGroupDeleteModal,
  closeGroupDeleteModal: accessCloseGroupDeleteModal,
  confirmGroupDelete: accessConfirmGroupDelete,
  openUserDeleteModal: accessOpenUserDeleteModal,
  closeUserDeleteModal: accessCloseUserDeleteModal,
  confirmUserDelete: accessConfirmUserDelete,
};
