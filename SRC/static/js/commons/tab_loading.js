/**
 * Tab Content Loading Utility
 * /static/js/commons/tab-loading.js
 */

class TabContentLoadingManager {
    /**
     * Show loading overlay for a tab content
     * @param {string} tabId - tab content element id
     */
    show(tabId) {
        const tabContent = document.getElementById(tabId);
        if (!tabContent) return;

        if (getComputedStyle(tabContent).position === "static") {
            tabContent.style.position = "relative";
        }

        let overlay = tabContent.querySelector(".tab-content-loading-overlay");

        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "tab-content-loading-overlay";
            overlay.innerHTML = `
                <div class="tab-content-loading-spinner"> <div class="spinner-circle"></div></div>
            `;
            tabContent.appendChild(overlay);
        }

        overlay.classList.remove("hidden");
    }

    /**
     * Hide loading overlay for a tab content
     * @param {string} tabId - tab content element id
     */
    hide(tabId) {
        const tabContent = document.getElementById(tabId);
        if (!tabContent) return;

        const overlay = tabContent.querySelector(".tab-content-loading-overlay");
        if (overlay) {
            overlay.classList.add("hidden");
        }
    }

    /**
     * Hide all tab loading overlays
     */
    hideAll() {
        document
            .querySelectorAll(".tab-content-loading-overlay")
            .forEach(overlay => overlay.classList.add("hidden"));
    }
}

const tabContentLoadingManager = new TabContentLoadingManager();

// Public APIs
export const showTabContentLoading = (tabId) =>
    tabContentLoadingManager.show(tabId);

export const hideTabContentLoading = (tabId) =>
    tabContentLoadingManager.hide(tabId);

export const hideAllTabContentLoading = () =>
    tabContentLoadingManager.hideAll();

export default tabContentLoadingManager;