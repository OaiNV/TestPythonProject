/**
 * Git Credentials Storage Utility
 * Manages saving and retrieving git credentials from localStorage
 */

// Storage key prefix
const STORAGE_KEY_PREFIX = "git_credentials_";

/**
 * Save git credentials to localStorage
 * @param {string} projectId - Project ID
 * @param {string} userName - Git username
 * @param {string} password - Git password/token
 * @param {string} repoUrl - Repository URL (optional, for reference)
 */
export const saveGitCredentials = (projectId, userName, password, repoUrl = null) => {
  try {
    console.log(`[saveGitCredentials] Start - projectId=${projectId}`);
    
    if (!projectId) {
      console.warn("[saveGitCredentials] Missing projectId");
      return;
    }
    
    if (!userName || !password) {
      console.warn("[saveGitCredentials] Missing userName or password");
      return;
    }
    
    // Prepare data to save
    const credentialsData = {
      project_id: projectId,
      user_name: userName,
      token_password: password,
      repository_url: repoUrl || null,
      saved_at: new Date().toISOString()
    };
    
    // Save to localStorage with project_id as key
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(credentialsData));
    
    console.log(`[saveGitCredentials] Success - projectId=${projectId}`);
  } catch (error) {
    console.error("[saveGitCredentials] Error:", error);
  }
};

/**
 * Get git credentials from localStorage
 * @param {string} projectId - Project ID
 * @returns {Object|null} Credentials object or null if not found
 */
export const getGitCredentials = (projectId) => {
  try {
    console.log(`[getGitCredentials] Start - projectId=${projectId}`);
    
    if (!projectId) {
      console.warn("[getGitCredentials] Missing projectId");
      return null;
    }
    
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    const storedData = localStorage.getItem(storageKey);
    
    if (!storedData) {
      console.log(`[getGitCredentials] No credentials found for projectId=${projectId}`);
      return null;
    }
    
    const credentials = JSON.parse(storedData);
    console.log(`[getGitCredentials] Success - projectId=${projectId}`);
    return credentials;
  } catch (error) {
    console.error("[getGitCredentials] Error:", error);
    return null;
  }
};

/**
 * Remove git credentials from localStorage
 * @param {string} projectId - Project ID
 */
export const removeGitCredentials = (projectId) => {
  try {
    console.log(`[removeGitCredentials] Start - projectId=${projectId}`);
    
    if (!projectId) {
      console.warn("[removeGitCredentials] Missing projectId");
      return;
    }
    
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.removeItem(storageKey);
    
    console.log(`[removeGitCredentials] Success - projectId=${projectId}`);
  } catch (error) {
    console.error("[removeGitCredentials] Error:", error);
  }
};

/**
 * Check if git credentials exist for a project
 * @param {string} projectId - Project ID
 * @returns {boolean} True if credentials exist
 */
export const hasGitCredentials = (projectId) => {
  try {
    if (!projectId) {
      return false;
    }
    
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    return localStorage.getItem(storageKey) !== null;
  } catch (error) {
    console.error("[hasGitCredentials] Error:", error);
    return false;
  }
};

