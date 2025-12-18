/**
 * Login Page JavaScript
 * Handles form submission, validation, and UI interactions
 * ES6+ Functional Approach
 */

import { LOGIN_MESSAGES } from "./commons/error_messages.js";

// Configuration constants
const LOGIN_CONFIG = {
    API_BASE_URL: "/api",
    LOGIN_ENDPOINT: "/auth/login",
    TIMEOUT: 30000,
    REDIRECT_DELAY: 1000,
    SUCCESS_ALERT_DURATION: 2000
};

// Get MAX_LENGTH values from template
const MAX_LENGTH_EMAIL = parseInt(
    document.querySelector('meta[name="max-length-email"]')?.content || "254"
);
const MAX_LENGTH_PASS = parseInt(
    document.querySelector('meta[name="max-length-pass"]')?.content || "64"
);

// DOM Elements cache
let domCache = {};

/**
 * Initialize login functionality
 */
const initLogin = () => {
    console.log("[LoginManager] Initializing login page");
    getDOMElements();
    setupEventListeners();
    checkExistingAuth();
    focusEmailField();
};

/**
 * Get DOM elements
 */
const getDOMElements = () => {
    domCache = {
        loginForm: document.getElementById("login-form"),
        emailInput: document.getElementById("email"),
        passwordInput: document.getElementById("password"),
        loadingOverlay: document.getElementById("loading-overlay"),
        alertContainer: document.getElementById("alert-container"),
        forgotPasswordLink: document.getElementById("forgot-password")
    };
};

/**
 * Set up event listeners
 */
const setupEventListeners = () => {
    // Form submission
    domCache.loginForm?.addEventListener("submit", handleLogin);

    // Forgot password
    domCache.forgotPasswordLink?.addEventListener("click", handleForgotPassword);

    // Input validation on blur
    domCache.emailInput?.addEventListener("blur", validateEmail);
    domCache.passwordInput?.addEventListener("blur", validatePassword);

    // Real-time validation
    domCache.emailInput?.addEventListener("input", validateEmail);
    domCache.passwordInput?.addEventListener("input", validatePassword);

    // Enter key handling
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !domCache.loginForm.contains(e.target)) {
            domCache.loginForm?.dispatchEvent(new Event("submit"));
        }
    });
};

/**
 * Handle login form submission
 */
const handleLogin = async (event) => {
    event.preventDefault();
    console.log("[LoginManager] Handling login submission");

    if (!validateForm()) {
        return;
    }
    const formData = await getFormData();
    await submitLogin(formData);
};

/**
 * Get form data
 */
const getFormData = async () => {
    const hashedPassword = await window.hashUtil.hashPassword(domCache.passwordInput.value);
    if (!hashedPassword) {
        throw new Error(LOGIN_MESSAGES.PASSWORD_HASH_FAILED);
    }
    return {
        email: domCache.emailInput.value.trim(),
        password: hashedPassword
    };
};

/**
 * Submit login request
 */
const submitLogin = async (formData) => {
    showLoading();

    try {
        const response = await fetch(`${LOGIN_CONFIG.API_BASE_URL}${LOGIN_CONFIG.LOGIN_ENDPOINT}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error_message || data.message || LOGIN_MESSAGES.LOGIN_FAILED);
        }

        // Store tokens
        storeAuthTokens(data);

        // Show success message
        showAlert(LOGIN_MESSAGES.LOGIN_SUCCESS, "success", LOGIN_CONFIG.SUCCESS_ALERT_DURATION);

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = "/projects";
        }, LOGIN_CONFIG.REDIRECT_DELAY);

    } catch (error) {
        console.error("[LoginManager] Login error:", error);
        showAlert(error.message, "error");
    } finally {
        hideLoading();
    }
};

/**
 * Store authentication tokens
 * Accepts the raw API response and extracts tokens from response.data
 */
const storeAuthTokens = (responseJson) => {
    try {
        const payload = responseJson?.data || responseJson;
        if (!payload) return;

        const accessToken = payload.access_token;
        const refreshToken = payload.refresh_token;

        const userInfo = {
            user_id: payload.user_id,
            email: payload.email,
            user_name: payload.user_name,
            role: payload.role || "user"
        };

        if (accessToken) localStorage.setItem("access_token", accessToken);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        localStorage.setItem("user_info", JSON.stringify(userInfo));
        localStorage.setItem("user_role", userInfo.role);
    } catch (err) {
        console.error("[LoginManager] Error storing auth tokens:", err);
    }
};

/**
 * Handle forgot password
 */
const handleForgotPassword = (event) => {
    event.preventDefault();
    console.log("[LoginManager] Forgot password clicked");
    showAlert(LOGIN_MESSAGES.FORGOT_PASSWORD_INFO, "info");
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate email field
 */
const validateEmail = () => {
    const email = domCache.emailInput.value.trim();
    const isValid = email && isValidEmail(email) &&
        email.length <= MAX_LENGTH_EMAIL;

    updateFieldValidation(domCache.emailInput, isValid);
    return isValid;
};

/**
 * Validate password field
 */
const validatePassword = () => {
    const password = domCache.passwordInput.value;
    const isValid = password &&
        password.length >= 8 &&
        password.length <= MAX_LENGTH_PASS;

    updateFieldValidation(domCache.passwordInput, isValid);
    return isValid;
};

/**
 * Update field validation styling
 */
const updateFieldValidation = (field, isValid) => {
    if (!field) return;

    if (isValid) {
        field.classList.remove("border-red-500");
        field.classList.add("border-green-500");
    } else {
        field.classList.remove("border-green-500");
        field.classList.add("border-red-500");
    }
};

/**
 * Validate entire form
 */
const validateForm = () => {
    const emailValid = validateEmail();
    const passwordValid = validatePassword();

    return emailValid && passwordValid;
};

/**
 * Show loading overlay
 */
const showLoading = () => {
    console.log("[LoginManager] Showing loading overlay");
    domCache.loadingOverlay?.classList.remove("hidden");
};

/**
 * Hide loading overlay
 */
const hideLoading = () => {
    console.log("[LoginManager] Hiding loading overlay");
    domCache.loadingOverlay?.classList.add("hidden");
};

/**
 * Check if user is already logged in
 */
const checkExistingAuth = () => {
    const token = localStorage.getItem("access_token");
    if (token) {
        console.log("[LoginManager] User already logged in, redirecting to dashboard");
        window.location.href = "/dashboard";
    }
};

/**
 * Clear form
 */
const clearForm = () => {
    domCache.loginForm?.reset();
    domCache.emailInput?.classList.remove("border-red-500", "border-green-500");
    domCache.passwordInput?.classList.remove("border-red-500", "border-green-500");
};

/**
 * Focus on email field
 */
const focusEmailField = () => {
    domCache.emailInput?.focus();
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initLogin);

// Export for global access
window.loginManager = {
    initLogin,
    validateForm,
    clearForm,
    focusEmailField
};