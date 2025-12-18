/**
 * Navbar JavaScript
 * Handles navbar functionality, dropdowns, and user interactions
 * ES6+ Functional Approach
 */

// State variables
let isDropdownOpen = false;
let isMobileMenuOpen = false;

// DOM Elements cache
let domCache = {};

// Prefill user info 
(() => {
  try {
    const userStr = localStorage.getItem("user_info");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const name = user.user_name || user.email || "User";
    const initial = (user.user_name || user.email || "U").charAt(0).toUpperCase();

    const nameEl = document.querySelector(".user-name");
    const avatarEl = document.querySelector(".user-avatar");

    if (nameEl && !nameEl.textContent.trim()) nameEl.textContent = name;
    if (avatarEl && !avatarEl.textContent.trim()) avatarEl.textContent = initial;

    document.addEventListener("DOMContentLoaded", () => {
      const nameEl2 = document.querySelector(".user-name");
      const avatarEl2 = document.querySelector(".user-avatar");
      if (nameEl2 && !nameEl2.textContent.trim()) nameEl2.textContent = name;
      if (avatarEl2 && !avatarEl2.textContent.trim()) avatarEl2.textContent = initial;
    });
  } catch (err) {
    console.warn("[Prefill] Failed:", err);
  }
})();

/**
 * Initialize navbar functionality
 */
const initNavbar = () => {
    console.log("[NavbarManager] Initializing navbar functionality");
    
    getDOMElements();
    setupEventListeners();
    initializeUserInfo();
    setActiveNavigation();
    updateAuthStatus();
};

/**
 * Get DOM elements
 */
const getDOMElements = () => {
    domCache = {
        userDropdownMenu: document.getElementById("userDropdownMenu"),
        userMenu: document.querySelector(".user-menu"),
        logoutLink: document.querySelector(".user-dropdown-item.logout"),
        mobileMenuToggle: document.querySelector(".mobile-menu-toggle"),
        mobileMenu: document.querySelector(".mobile-menu"),
        settingsNav: document.getElementById("settingsNav")
    };
};

/**
 * Set up navbar event listeners
 */
const setupEventListeners = () => {
    console.log("[NavbarManager] Setting up navbar event listeners");
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", handleOutsideClick);
    
    // Handle window resize
    window.addEventListener("resize", debounce(handleResize, 250));
    
    // Handle escape key
    document.addEventListener("keydown", handleEscapeKey);
    
    // Logout functionality
    domCache.logoutLink?.addEventListener("click", handleLogout);
    
    // User menu toggle
    domCache.userMenu?.addEventListener("click", toggleUserDropdown);
    
    // Mobile menu toggle
    domCache.mobileMenuToggle?.addEventListener("click", toggleMobileMenu);
    
    // Mobile menu links
    const mobileMenuLinks = document.querySelectorAll(".mobile-menu a");
    mobileMenuLinks.forEach(link => {
        link.addEventListener("click", closeMobileMenu);
    });
};

/**
 * Handle outside click to close dropdowns
 */
const handleOutsideClick = (event) => {
    if (isDropdownOpen && !domCache.userMenu?.contains(event.target)) {
        closeUserDropdown();
    }
    
    if (isMobileMenuOpen && !domCache.mobileMenu?.contains(event.target)) {
        closeMobileMenu();
    }
};

/**
 * Handle window resize
 */
const handleResize = () => {
    // Close mobile menu on desktop
    if (window.innerWidth > 768 && isMobileMenuOpen) {
        closeMobileMenu();
    }
    
    // Close dropdown on mobile
    if (window.innerWidth <= 768 && isDropdownOpen) {
        closeUserDropdown();
    }
};

/**
 * Handle escape key
 */
const handleEscapeKey = (event) => {
    if (event.key === "Escape") {
        if (isDropdownOpen) {
            closeUserDropdown();
        }
        if (isMobileMenuOpen) {
            closeMobileMenu();
        }
    }
};

/**
 * Toggle user dropdown
 */
const toggleUserDropdown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isDropdownOpen) {
        closeUserDropdown();
    } else {
        openUserDropdown();
    }
};

/**
 * Open user dropdown
 */
const openUserDropdown = () => {
    domCache.userDropdownMenu?.classList.remove("hidden");
    isDropdownOpen = true;
    console.log("[NavbarManager] User dropdown opened");
};

/**
 * Close user dropdown
 */
const closeUserDropdown = () => {
    domCache.userDropdownMenu?.classList.add("hidden");
    isDropdownOpen = false;
    console.log("[NavbarManager] User dropdown closed");
};

/**
 * Toggle mobile menu
 */
const toggleMobileMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isMobileMenuOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
};

/**
 * Open mobile menu
 */
const openMobileMenu = () => {
    domCache.mobileMenu?.classList.remove("hidden");
    domCache.mobileMenuToggle?.classList.add("active");
    isMobileMenuOpen = true;
    console.log("[NavbarManager] Mobile menu opened");
};

/**
 * Close mobile menu
 */
const closeMobileMenu = () => {
    domCache.mobileMenu?.classList.add("hidden");
    domCache.mobileMenuToggle?.classList.remove("active");
    isMobileMenuOpen = false;
    console.log("[NavbarManager] Mobile menu closed");
};

/**
 * Initialize navbar user info
 */
const initializeUserInfo = () => {
    const userInfo = getUserInfo();
    updateUserDisplay(userInfo);
    updateSettingsMenu(userInfo);
};

/**
 * Get user info from localStorage
 */
const getUserInfo = () => {
    try {
        const userStr = localStorage.getItem("user_info");
        if (!userStr) return null;
        const userInfo = JSON.parse(userStr);

        if (!userInfo.role) {
            userInfo.role = localStorage.getItem("user_role") || "user";
        }

        return userInfo;
    } catch (error) {
        console.error("[NavbarManager] Error parsing user info:", error);
        return null;
    }
};

const updateSettingsMenu = (userInfo) => {
    const settingsNav = domCache.settingsNav;
    if (!settingsNav) return;

    if (userInfo && (userInfo.role || "").toLowerCase() === "admin") {
        settingsNav.style.display = "block";
    } else {
        settingsNav.style.display = "none";
    }
};

/**
 * Update user display in navbar
 */
const updateUserDisplay = (userInfo) => {
  if (!userInfo) return;

  const nameEl = document.querySelector(".user-name");
  const avatarEl = document.querySelector(".user-avatar");

  if (nameEl) {
    const current = nameEl.textContent.trim();
    const newName = userInfo.user_name || userInfo.email || "User";
    if (current !== newName) nameEl.textContent = newName;
  }

  if (avatarEl) {
    const current = avatarEl.textContent.trim();
    const initial = (userInfo.user_name || userInfo.email || "U")
      .charAt(0)
      .toUpperCase();
    if (current !== initial) avatarEl.textContent = initial;
  }
};

/**
 * Set active navigation based on current page
 */
const setActiveNavigation = () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-link");
    
    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href && currentPath.startsWith(href)) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
};

/**
 * Update navbar based on authentication status
 */
const updateAuthStatus = () => {
    const isAuthenticated = !!localStorage.getItem("access_token");
    
    const authElements = document.querySelectorAll(".auth-required");
    const guestElements = document.querySelectorAll(".guest-only");
    
    authElements.forEach(element => {
        element.style.display = isAuthenticated ? "block" : "none";
    });
    
    guestElements.forEach(element => {
        element.style.display = isAuthenticated ? "none" : "block";
    });
};

/**
 * Refresh navbar
 */
const refreshNavbar = () => {
    getDOMElements();
    initializeUserInfo();
    setActiveNavigation();
    updateAuthStatus();
};

/**
 * Debounce function
 */
const debounce = (func, wait) => {
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

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initNavbar);

document.addEventListener("DOMContentLoaded", async () => {
  Auth.checkAuth();
  initializeUserInfo();
    
});

document.addEventListener("DOMContentLoaded", () => {
  initializeUserInfo();
  const info = document.querySelector(".user-info");
  if (info) info.classList.add("prefilled");
});

// Export for global access
window.navbarManager = {
    initNavbar,
    refreshNavbar,
    updateAuthStatus,
    getUserInfo
};