/**
 * API Client with automatic token refresh
 * Handles 401 errors and refreshes token automatically
 */

const API_CLIENT_CONFIG = {
  BASE_URL: "/api",
  AUTH_ENDPOINT: "/auth",
  MAX_RETRY: 1,
};

let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers when token is refreshed
 */
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

/**
 * Refresh access token
 */
const refreshAccessToken = async () => {
  console.log("[APIClient] Refreshing access token");

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    console.error("[APIClient] No refresh token found");
    throw new Error("NO_REFRESH_TOKEN");
  }

  try {
    const response = await fetch(
      `${API_CLIENT_CONFIG.BASE_URL}${API_CLIENT_CONFIG.AUTH_ENDPOINT}/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[APIClient] Token refresh failed:", data);
      throw new Error("REFRESH_FAILED");
    }

    // Update access token
    const newAccessToken = data.access_token;
    localStorage.setItem("access_token", newAccessToken);

    console.log("[APIClient] Token refreshed successfully");
    return newAccessToken;
  } catch (error) {
    console.error("[APIClient] Error refreshing token:", error);
    throw error;
  }
};

/**
 * Handle logout and redirect to login page
 */
const handleLogout = () => {
  console.log("[APIClient] Logging out due to invalid token");

  // Clear all auth data
  const keysToRemove = ["access_token", "refresh_token", "user_info", "user_role"];
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Show alert before redirect
  if (window.showAlert) {
    showAlert(
      "セッションが終了しました。再度ログインしてください。",
      "warning"
    );
  }

  // Redirect to login after short delay
  setTimeout(() => {
    window.location.href = "/login";
  }, 1000);
};

/**
 * Make API request with automatic token refresh
 */
const apiRequest = async (url, options = {}) => {
  console.log(`[APIClient] Making request to ${url}`);

  // Add default headers
  const accessToken = localStorage.getItem("access_token");
  const headers = { ...options.headers };

  // Only add Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Make initial request
  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401 and not already retrying, try to refresh token
    if (response.status === 401 && !options._isRetry) {
      console.log("[APIClient] Received 401, attempting token refresh");

      // If already refreshing, wait for it
      if (isRefreshing) {
        console.log("[APIClient] Token refresh in progress, waiting...");
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            // Retry with new token
            headers["Authorization"] = `Bearer ${newToken}`;
            resolve(fetch(url, { ...options, headers }));
          });
        });
      }

      // Start refresh process
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);

        // Retry original request with new token
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          _isRetry: true,
        });
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        console.error("[APIClient] Token refresh failed:", refreshError);
        handleLogout();
        throw new Error("SESSION_EXPIRED");
      }
    }

    // If still 401 after retry, logout
    if (response.status === 401 && options._isRetry) {
      console.error("[APIClient] Still 401 after token refresh");
      handleLogout();
      throw new Error("SESSION_EXPIRED");
    }

    return response;
  } catch (error) {
    console.error(`[APIClient] Request error for ${url}:`, error);

    // If it's a network error, don't logout
    if (error.message === "SESSION_EXPIRED") {
      throw error;
    }

    throw error;
  }
};

/**
 * GET request
 */
const apiGet = async (url, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: "GET",
  });
};

/**
 * POST request
 */
const apiPost = async (url, data, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * PUT request
 */
const apiPut = async (url, data, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request
 */
const apiDelete = async (url, data = null, options = {}) => {
  const requestOptions = {
    ...options,
    method: "DELETE",
  };

  if (data) {
    requestOptions.body = JSON.stringify(data);
  }

  return apiRequest(url, requestOptions);
};

// Export for global access
window.APIClient = {
  request: apiRequest,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
};
