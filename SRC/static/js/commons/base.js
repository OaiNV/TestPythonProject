/**
 * Base Template JavaScript
 * Handles navbar functionality, dropdowns, and common UI interactions
 * ES6+ Functional Approach
 */
// Configuration constants
const CONFIG = {
    DEFAULT_ALERT_DURATION: 5000,
    LOADING_TIMEOUT: 30000
};

// DOM Elements cache
let baseDomCache = {};

/**
 * Initialize base functionality
 */
const initBase = () => {
    console.log("[BaseUtils] Initializing base template functionality");
    setupBaseEventListeners();
};

/**
 * Set up all event listeners
 */
const setupBaseEventListeners = () => {
    console.log("[BaseUtils] Setting up event listeners");

    // Handle window resize
    window.addEventListener("resize", baseDebounce(handleBaseResize, 250));

    // Handle escape key
    document.addEventListener("keydown", handleBaseEscapeKey);
};

/**
 * Handle escape key
 */
const handleBaseEscapeKey = (event) => {
    if (event.key === "Escape") {
        console.log("[BaseUtils] Escape key pressed");
        // Base-level escape handling can be added here
    }
};

/**
 * Handle window resize
 */
const handleBaseResize = () => {
    console.log("[BaseUtils] Handling window resize");
    // Base-level resize handling can be added here
};

/**
 * Show loading overlay
 */
const showLoading = () => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
        let loadingOverlay = mainContent.querySelector(".loading-overlay");
        if (!loadingOverlay) {
            loadingOverlay = document.createElement("div");
            loadingOverlay.className = "loading-overlay";
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            mainContent.appendChild(loadingOverlay);
        }
        loadingOverlay.classList.remove("hidden");
    }
};

/**
 * Hide loading overlay
 */
const hideLoading = () => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
        const loadingOverlay = mainContent.querySelector(".loading-overlay");
        if (loadingOverlay) {
            loadingOverlay.classList.add("hidden");
        }
    }
};


/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
    return localStorage.getItem("access_token") || "";
};

/**
 * Logout user
 */
const baseLogout = () => {
    console.log("[BaseUtils] Logging out user");

    // Clear localStorage
    const keysToRemove = ["access_token", "refresh_token", "user_info"];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Redirect to login
    window.location.href = "/login";
};

/**
 * Format date and format datetime for display
 */
const formatDate = (dateString) => {
    if (!dateString) return "-";

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    } catch (error) {
        return "-";
    }
};

const formatDateTime = (dateString) => {
    const FALLBACK = "0000/00/00 00:00";

    try {
        if (!dateString) return FALLBACK;

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return FALLBACK;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
        console.error("[formatDateTime] Error:", error);
        return FALLBACK;
    }
};

/**
 * Escape HTML to prevent XSS
 */
const baseEscapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Debounce function
 */
const baseDebounce = (func, wait) => {
    let timeout;
    return (...args) => {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 */
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Get or create element with cache
 */
const getOrCreateElement = (id, createFn) => {
    if (!baseDomCache[id]) {
        baseDomCache[id] = document.getElementById(id) || createFn();
    }
    return baseDomCache[id];
};

/**
 * Generate random ID
 */
const generateId = () => {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if element exists
 */
const elementExists = (selector) => {
    return document.querySelector(selector) !== null;
};

/**
 * Wait for element to exist
 */
const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
};

/**
 * Copy text to clipboard
 */
const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.readOnly = true;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();

            // @ts-expect-error: execCommand deprecated 
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }

        showAlert("コピーしました", "success");
    } catch (err) {
        console.error("[copyToClipboard] Failed:", err);
        showAlert("コピーに失敗しました", "error");
    }
};
/**
 * Sanitize project name for use in filenames
 * Returns the project name as-is, preserving Japanese/Vietnamese characters
 * @param {string} projectName - Project name to sanitize
 * @returns {string} Project name or "project" if empty
 */
const sanitizeProjectNameForFilename = (projectName) => {
    if (!projectName) return "project";

    // Return the project name as-is, preserving all characters including Japanese/Vietnamese
    return projectName;
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initBase);

// Export functions for global access
window.BaseUtils = {
    showLoading,
    hideLoading,
    getAuthToken,
    baseLogout,
    formatDate,
    formatDateTime,
    baseEscapeHtml,
    baseDebounce,
    throttle,
    elementExists,
    waitForElement,
    copyToClipboard,
    generateId,
    sanitizeProjectNameForFilename
};