/**
 * Confirm Modal JavaScript
 * Common confirmation dialog for all pages
 * ES6+ Functional Approach
 */

// Configuration
const CONFIRM_CONFIG = {
    DEFAULT_DURATION: 0, // No auto-hide for confirm dialogs
    ANIMATION_DURATION: 300
};

// Modal HTML template
const CONFIRM_MODAL_HTML = `
    <div id="confirmModal" class="confirm-modal">
        <div class="confirm-modal-overlay"></div>
        <div class="confirm-modal-content">
            <div class="confirm-modal-header">
                <img id="confirmModalIcon" src="/static/images/warn.svg" alt="" class="confirm-modal-icon" style="display: none;">
                <h3 id="confirmModalTitle" class="confirm-modal-title"></h3>
            </div>
            <div class="confirm-modal-body">
                <p id="confirmModalMessage" class="confirm-modal-message"></p>
            </div>
            <div class="confirm-modal-footer">
                <button id="confirmModalCancel" class="btn btn-secondary">Cancel</button>
                <button id="confirmModalOk" class="btn btn-primary">OK</button>
            </div>
        </div>
    </div>
`;

// Global state
let confirmResolve = null;
let confirmReject = null;

/**
 * Initialize confirm modal
 */
const initConfirmModal = () => {
    console.log("[ConfirmModal] Initializing confirm modal");

    // Create modal if it doesn't exist
    if (!document.getElementById("confirmModal")) {
        document.body.insertAdjacentHTML("beforeend", CONFIRM_MODAL_HTML);
        setupConfirmEventListeners();
    }
};

/**
 * Set up event listeners for confirm modal
 */
const setupConfirmEventListeners = () => {
    const modal = document.getElementById("confirmModal");
    const overlay = modal.querySelector(".confirm-modal-overlay");
    const cancelBtn = document.getElementById("confirmModalCancel");
    const okBtn = document.getElementById("confirmModalOk");

    // Close on cancel button only
    cancelBtn?.addEventListener("click", () => {
        hideConfirmModal(false);
    });

    // Confirm on OK button
    okBtn?.addEventListener("click", () => {
        hideConfirmModal(true);
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) {
            hideConfirmModal(false);
        }
    });
};

/**
 * Show confirm modal
 */
const showConfirmModal = (title, message, showIcon = false) => {

    return new Promise((resolve, reject) => {
        confirmResolve = resolve;
        confirmReject = reject;

        // Set content
        const titleElement = document.getElementById("confirmModalTitle");
        const messageElement = document.getElementById("confirmModalMessage");
        const iconElement = document.getElementById("confirmModalIcon");

        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;

        // Show/hide icon
        if (iconElement) {
            iconElement.style.display = showIcon ? "inline-block" : "none";
        }

        // Show modal
        const modal = document.getElementById("confirmModal");
        if (modal) {
            modal.classList.add("show");
            document.body.style.overflow = "hidden"; // Prevent background scrolling
        }
    });
};

/**
 * Hide confirm modal
 */
const hideConfirmModal = (confirmed) => {
    console.log("[ConfirmModal] Hiding confirm modal, confirmed:", confirmed);

    const modal = document.getElementById("confirmModal");
    if (modal) {
        modal.classList.remove("show");
        document.body.style.overflow = ""; // Restore scrolling
    }

    // Resolve promise
    if (confirmResolve) {
        confirmResolve(confirmed);
        confirmResolve = null;
        confirmReject = null;
    }
};

/**
 * Confirm dialog - Main function to use
 */
const confirm = async (title, message, showIcon = false) => {
    if (!document.getElementById("confirmModal")) {
        initConfirmModal();
    }

    return await showConfirmModal(title, message, showIcon);
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initConfirmModal);

// Export for global access
window.confirmModal = {
    confirm,
    showConfirmModal,
    hideConfirmModal
};

// Export individual function for convenience
window.confirm = confirm;
