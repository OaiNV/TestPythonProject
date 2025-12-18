/**
 * ============================================
 * Git Authentication Dialog (Reusable Module)
 * ============================================
 * Handles authentication for:
 *  - GitHub (via Personal Access Token)
 *  - GitBucket (via username/password)
 *
 * Usage:
 *   const gitDialog = new GitAuthDialog({
 *       onSuccess: (authData) => { ... },
 *       onCancel: () => { ... },
 *       onError: (msg) => { ... }
 *   });
 *
 *   gitDialog.showDialog(repoUrl);
 * ============================================
 */

import { CREATE_PROJECT_MESSAGES } from "../commons/error_messages.js";
import { GitProvider } from "../commons/constants.js";

/**
 * Common Git Authentication Dialog Handler
 */
class GitAuthDialog {
    constructor({ onSuccess, onCancel, onError }) {
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this.onError = onError;
        this._eventsBound = false;

        // Cache dialog elements (may be null if created dynamically later)
        this.githubDialog = document.getElementById("gitPatDialog");
        this.githubInput = document.getElementById("gitPatInput");
        this.githubOk = document.getElementById("gitPatOk");
        this.githubCancel = document.getElementById("gitPatCancel");

        this.gitBucketDialog = document.getElementById("gitBucketDialog");
        this.gitBucketUser = document.getElementById("gitBucketUser");
        this.gitBucketPass = document.getElementById("gitBucketPass");
        this.gitBucketOk = document.getElementById("gitBucketOk");
        this.gitBucketCancel = document.getElementById("gitBucketCancel");

        // Only bind events if elements exist
        if (this.githubInput || this.gitBucketUser) {
            this._bindEvents();
            this._eventsBound = true;
        }
    }

    _bindEvents() {
        // GitHub input
        if (this.githubInput && this.githubOk) {
            // init state
            this.githubOk.disabled = true;

            this.githubInput.addEventListener("input", () => {
                this.githubOk.disabled = !this.githubInput.value.trim();
            });

            this.githubOk.addEventListener("click", async () => {
                const pat = this.githubInput.value.trim();
                if (!pat) {
                    this.onError?.(CREATE_PROJECT_MESSAGES.PAT_REQUIRED);
                    return;
                }
                this._hideAllDialogs();
                await this.onSuccess?.({ type: GitProvider.GITHUB, pat });
            });
        }

        if (this.githubCancel) {
            this.githubCancel.addEventListener("click", () => {
                this._hideAllDialogs();
                this.onCancel?.();
            });
        }

        // GitBucket input
        if (this.gitBucketUser && this.gitBucketPass && this.gitBucketOk) {
            // Initialize disabled state
            this.gitBucketOk.disabled = true;

            const toggleGitBucketOk = () => {
                const user = this.gitBucketUser.value.trim();
                const pass = this.gitBucketPass.value.trim();
                this.gitBucketOk.disabled = !(user && pass);
            };

            this.gitBucketUser.addEventListener("input", toggleGitBucketOk);
            this.gitBucketPass.addEventListener("input", toggleGitBucketOk);

            this.gitBucketOk.addEventListener("click", async () => {
                const username = this.gitBucketUser.value.trim();
                const password = this.gitBucketPass.value.trim();
                if (!username || !password) {
                    this.onError?.(CREATE_PROJECT_MESSAGES.ENTER_CREDENTIALS);
                    return;
                }
                this._hideAllDialogs();
                await this.onSuccess?.({ type: GitProvider.GITBUCKET, username, password });
            });
        }

        if (this.gitBucketCancel) {
            this.gitBucketCancel.addEventListener("click", () => {
                this._hideAllDialogs();
                this.onCancel?.();
            });
        }
    }

    _hideAllDialogs() {
        if (this.githubDialog) this.githubDialog.style.display = "none";
        if (this.gitBucketDialog) this.gitBucketDialog.style.display = "none";
    }

    _determineProvider(url) {
        if (!url || url.trim() === "") return null;

        const trimmedUrl = url.trim().toLowerCase();

        if (trimmedUrl.includes("github.com")) return GitProvider.GITHUB;

        if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://") || trimmedUrl.startsWith("git@")) {
            return GitProvider.GITBUCKET;
        }

        return null;
    }

    showDialog(repoUrl) {
        this._hideAllDialogs();
        
        // Refresh elements in case they were created dynamically after constructor
        this.githubDialog = document.getElementById("gitPatDialog");
        this.githubInput = document.getElementById("gitPatInput");
        this.githubOk = document.getElementById("gitPatOk");
        this.githubCancel = document.getElementById("gitPatCancel");
        
        this.gitBucketDialog = document.getElementById("gitBucketDialog");
        this.gitBucketUser = document.getElementById("gitBucketUser");
        this.gitBucketPass = document.getElementById("gitBucketPass");
        this.gitBucketOk = document.getElementById("gitBucketOk");
        this.gitBucketCancel = document.getElementById("gitBucketCancel");
        
        // Re-bind events if elements are now available
        if (this.githubInput && this.githubOk && !this._eventsBound) {
            this._bindEvents();
            this._eventsBound = true;
        }
        
        const provider = this._determineProvider(repoUrl);

        if (!provider) {
            this.onError?.(CREATE_PROJECT_MESSAGES.INVALID_GIT_URL);
            return;
        }

        if (provider === GitProvider.GITHUB) {
            if (!this.githubInput || !this.githubOk) {
                console.error("[GitAuthDialog] GitHub dialog elements not found");
                this.onError?.(CREATE_PROJECT_MESSAGES.INVALID_GIT_URL);
                return;
            }
            this.githubInput.value = "";
            this.githubOk.disabled = true;
            if (this.githubDialog) this.githubDialog.style.display = "flex";
        } else {
            if (!this.gitBucketUser || !this.gitBucketPass || !this.gitBucketOk) {
                console.error("[GitAuthDialog] GitBucket dialog elements not found");
                this.onError?.(CREATE_PROJECT_MESSAGES.INVALID_GIT_URL);
                return;
            }
            this.gitBucketUser.value = "";
            this.gitBucketPass.value = "";
            this.gitBucketOk.disabled = true;
            if (this.gitBucketDialog) this.gitBucketDialog.style.display = "flex";
        }
    }

    /**
     * Show dialog and return Promise with credentials
     * @param {string} repoUrl - Repository URL
     * @returns {Promise<{userName: string, tokenPassword: string}>} Promise that resolves with {userName, tokenPassword} or rejects on cancel/error
     */
    showDialogPromise(repoUrl) {
        return new Promise((resolve, reject) => {
            // Store original callbacks
            const originalOnSuccess = this.onSuccess;
            const originalOnCancel = this.onCancel;
            const originalOnError = this.onError;

            // Set temporary callbacks
            this.onSuccess = async (authData) => {
                // Restore original callbacks
                this.onSuccess = originalOnSuccess;
                this.onCancel = originalOnCancel;
                this.onError = originalOnError;
                
                // Extract credentials from authData
                let userName = null;
                let tokenPassword = null;

                if (authData.type === GitProvider.GITHUB) {
                    // GitHub: use PAT as both username and password
                    userName = "DocifyCode";
                    tokenPassword = authData.pat || "";
                } else if (authData.type === GitProvider.GITBUCKET) {
                    // GitBucket: use username and password
                    userName = authData.username || "";
                    tokenPassword = authData.password || "";
                }

                if (!userName) {
                    reject(new Error("Authentication data is invalid"));
                    return;
                }

                // Resolve with extracted credentials
                resolve({ userName, tokenPassword });
            };

            this.onCancel = () => {
                // Restore original callbacks
                this.onSuccess = originalOnSuccess;
                this.onCancel = originalOnCancel;
                this.onError = originalOnError;
                
                // Reject with cancel reason
                reject(new Error("Authentication cancelled"));
            };

            this.onError = (message) => {
                // Restore original callbacks
                this.onSuccess = originalOnSuccess;
                this.onCancel = originalOnCancel;
                this.onError = originalOnError;
                
                // Reject with error message
                reject(new Error(message));
            };

            // Show dialog
            this.showDialog(repoUrl);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const githubDialog = document.getElementById("gitPatDialog");
    if (githubDialog && githubDialog.innerHTML.trim() === "") {
        githubDialog.innerHTML = `
            <div class="dialog-content">
                <h3>Git認証</h3>
                <label>PAT (Github)</label>
                <input id="gitPatInput" placeholder="PAT (Github)" type="password" />
                <div style="margin-top: 24px;">
                    <button id="gitPatCancel">Cancel</button>
                    <button id="gitPatOk">OK</button>
                </div>
            </div>
        `;
        githubDialog.style.display = "none";
    }

    const gitBucketDialog = document.getElementById("gitBucketDialog");
    if (gitBucketDialog && gitBucketDialog.innerHTML.trim() === "") {
        gitBucketDialog.innerHTML = `
            <div class="dialog-content">
                <h3>Git認証</h3>
                <label>ユーザ名</label>
                <input id="gitBucketUser" placeholder="ユーザ名" />
                <label>パスワード (Gitbucket)</label>
                <input id="gitBucketPass" placeholder="パスワード (Gitbucket)" type="password" />
                <div style="margin-top: 24px;">
                    <button id="gitBucketCancel">Cancel</button>
                    <button id="gitBucketOk">OK</button>
                </div>
            </div>
        `;
        gitBucketDialog.style.display = "none";
    }
});

export { GitAuthDialog };