/**
 * AuthManager
 * Handles authentication checks and logout logic across all pages
 */
// import { AUTH_ERROR } from './error_messages.js';

const Auth = {
  checkAuth() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn("[Auth] No token found → redirecting to /login");
      window.location.href = "/login";
      return false;
    }
    return true;
  },

  handleLogout() {
    console.log("[Auth] Logging out...");

    const keysToRemove = ["access_token", "refresh_token", "user_info", "user_role"];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    if (window.showAlert) {
      showAlert(AUTH_ERROR.AUTH_MESSAGE, "info");
    }
    window.location.href = "/login";
  }
};

window.Auth = Auth;
