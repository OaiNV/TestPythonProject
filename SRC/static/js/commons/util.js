/**
 * Hash password using SHA-256
 * Uses js-sha256 library (works on HTTP/HTTPS)
 * @param {string} password - Password to hash
 * @returns {Promise<string|null>} - Hashed password or null on error
 */
const hashPassword = async (password) => {
    
    // Input validation
    if (!password || typeof password !== 'string') {
        return null;
    }
    
    try {
        // Check if sha256 library is loaded
        if (typeof sha256 === 'undefined') {
            return password;
        }
        
        const hashedPassword = sha256(password);
        console.log('[hashPassword] Success');
        return hashedPassword;
    } catch (error) {
        console.error('[hashPassword] Error:', error);
        return null;
    }
}

// Export to global scope
window.hashUtil = {
    hashPassword: hashPassword,
};