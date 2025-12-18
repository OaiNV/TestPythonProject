/**
 * Alert Utility Functions
 * Reusable alert functions for showing notifications
 * ES6+ Functional Approach
 */

// Configuration constants
const ALERT_CONFIG = {
    DEFAULT_DURATION: 5000,
    SUCCESS_DURATION: 3000,
    WARNING_DURATION: 4000,
    INFO_DURATION: 4000,
    ANIMATION_DURATION: 300
};

// Alert icons
const ALERT_ICONS = {
    success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
    error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
    warning: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
    info: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
};

// Alert type classes
const ALERT_TYPE_CLASSES = {
    success: "bg-green-100 border-green-400 text-green-700",
    error: "bg-red-100 border-red-400 text-red-700",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
    info: "bg-blue-100 border-blue-400 text-blue-700"
};

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, warning, info)
 * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
 * @param {string} containerId - Container ID to append alert to (default: "alert-container")
 */
const showAlert = (message, type = "error", duration = ALERT_CONFIG.DEFAULT_DURATION, containerId = "alert-container") => {
    console.log(`[AlertManager] Showing ${type} alert: ${message}`);
    
    const alertId = generateAlertId();
    const alertElement = createAlertElement(alertId, message, type);
    
    appendToContainer(alertElement, containerId);
    
    if (duration > 0) {
        scheduleAutoHide(alertId, duration);
    }
};

/**
 * Generate unique alert ID
 */
const generateAlertId = () => {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create alert element
 */
const createAlertElement = (alertId, message, type) => {
    const alertElement = document.createElement("div");
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type}`;
    
    alertElement.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">
                ${getAlertIcon(type)}
            </div>
            <div class="alert-message">
                ${escapeHtml(message)}
            </div>
            <button onclick="hideAlert('${alertId}')" class="alert-close">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;
    
    return alertElement;
};

/**
 * Append alert to container
 */
const appendToContainer = (alertElement, containerId) => {
    const container = document.getElementById(containerId);
    if (container) {
        container.appendChild(alertElement);
    } else {
        console.warn(`[AlertManager] Container with ID '${containerId}' not found`);
        document.body.appendChild(alertElement);
    }
};

/**
 * Schedule auto-hide for alert
 */
const scheduleAutoHide = (alertId, duration) => {
    setTimeout(() => {
        hideAlert(alertId);
    }, duration);
};

/**
 * Get alert icon based on type
 * @param {string} type - Alert type
 * @returns {string} - SVG icon HTML
 */
const getAlertIcon = (type) => {
    return ALERT_ICONS[type] || ALERT_ICONS.info;
};

/**
 * Hide alert by ID
 * @param {string} alertId - Alert element ID
 */
const hideAlert = (alertId) => {
    console.log(`[AlertManager] Hiding alert: ${alertId}`);
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        alertElement.classList.add("alert-slide-out");
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, ALERT_CONFIG.ANIMATION_DURATION);
    }
};

/**
 * Clear all alerts from container
 * @param {string} containerId - Container ID to clear alerts from (default: "alert-container")
 */
const clearAllAlerts = (containerId = "alert-container") => {
    console.log(`[AlertManager] Clearing all alerts from container: ${containerId}`);
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = "";
    }
};

/**
 * Show success alert
 * @param {string} message - Success message
 * @param {number} duration - Auto-hide duration in ms (default: 3000)
 */
const showSuccessAlert = (message, duration = ALERT_CONFIG.SUCCESS_DURATION) => {
    showAlert(message, "success", duration);
};

/**
 * Show error alert
 * @param {string} message - Error message
 * @param {number} duration - Auto-hide duration in ms (default: 5000)
 */
const showErrorAlert = (message, duration = ALERT_CONFIG.DEFAULT_DURATION) => {
    showAlert(message, "error", duration);
};

/**
 * Show warning alert
 * @param {string} message - Warning message
 * @param {number} duration - Auto-hide duration in ms (default: 4000)
 */
const showWarningAlert = (message, duration = ALERT_CONFIG.WARNING_DURATION) => {
    showAlert(message, "warning", duration);
};

/**
 * Show info alert
 * @param {string} message - Info message
 * @param {number} duration - Auto-hide duration in ms (default: 4000)
 */
const showInfoAlert = (message, duration = ALERT_CONFIG.INFO_DURATION) => {
    showAlert(message, "info", duration);
};

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

// Export for global access
window.showAlert = showAlert;
window.hideAlert = hideAlert;
window.clearAllAlerts = clearAllAlerts;
window.showSuccessAlert = showSuccessAlert;
window.showErrorAlert = showErrorAlert;
window.showWarningAlert = showWarningAlert;
window.showInfoAlert = showInfoAlert;