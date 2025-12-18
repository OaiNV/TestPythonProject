/**
 * Markdown Image Resolver
 *
 * Resolves local image paths in markdown content to base64 data URLs.
 * Supports:
 * - Markdown image syntax: ![alt](path) and ![alt](path "title")
 * - HTML img tags: <img src="path" ...>
 * - Relative paths: ./images/x.png, ../folder/x.png, x.png
 * - URL-encoded paths with spaces
 * - Cache to avoid duplicate requests
 * - Concurrent request deduplication
 */

// #region Constants
const IMAGE_CACHE = {};
const PENDING_REQUESTS = {};
const LOG_PREFIX = "[MarkdownImageResolver]";
// #endregion

// #region Public Functions
/**
 * Resolve all local images in markdown content
 * @param {string} content - Markdown content
 * @param {string} currentFilePath - Current file path (e.g., "BD/design.md")
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} - Markdown with images resolved to base64 data URLs
 */
async function resolveMarkdownImages(content, currentFilePath, projectId) {
  if (!content || !projectId) {
    return content;
  }

  try {
    // 1. Extract all image paths (both markdown and HTML)
    const imagePaths = extractImagePaths(content);

    if (imagePaths.length === 0) {
      return content;
    }

    // 2. Filter out HTTP URLs and data URLs, deduplicate
    const localPaths = [...new Set(imagePaths)].filter(
      (p) => !isExternalUrl(p)
    );

    if (localPaths.length === 0) {
      return content;
    }

    // 3. Get current directory from file path
    const currentDir = getDirectoryFromPath(currentFilePath);

    // 4. Resolve relative paths to absolute paths
    const resolvedPaths = localPaths.map((originalPath) => ({
      original: originalPath,
      absolute: resolveRelativePath(currentDir, originalPath),
    }));

    // 5. Fetch all images with cache (parallel)
    const fetchPromises = resolvedPaths.map(({ original, absolute }) =>
      fetchImageWithCache(projectId, absolute).then((dataUrl) => ({
        original,
        dataUrl,
      }))
    );
    const results = await Promise.all(fetchPromises);

    // 6. Replace image paths in content
    let resolvedContent = content;
    for (const { original, dataUrl } of results) {
      if (dataUrl) {
        resolvedContent = replaceImagePath(resolvedContent, original, dataUrl);
      }
    }

    return resolvedContent;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, error);
    return content;
  }
}

/**
 * Clear image cache (useful when project data changes)
 */
function clearImageCache() {
  Object.keys(IMAGE_CACHE).forEach((key) => delete IMAGE_CACHE[key]);
  Object.keys(PENDING_REQUESTS).forEach((key) => delete PENDING_REQUESTS[key]);
}
// #endregion

// #region Private Functions - Path Extraction
/**
 * Extract image paths from both markdown syntax and HTML tags
 * @param {string} content - Content to search
 * @returns {string[]} - Array of image paths
 */
function extractImagePaths(content) {
  if (!content) {
    return [];
  }

  try {
    const paths = [];

    // Markdown: ![alt](path) or ![alt](path "title")
    // Regex explanation:
    // !\[[^\]]*\] - matches ![any alt text]
    // \( - matches opening parenthesis
    // ([^)\s"]+) - captures path (no ), space, or quote)
    // (?:\s+"[^"]*")? - optionally matches space + "title"
    // \) - matches closing parenthesis
    const mdRegex = /!\[[^\]]*\]\(([^)\s"]+)(?:\s+"[^"]*")?\)/g;
    let match;
    while ((match = mdRegex.exec(content)) !== null) {
      paths.push(match[1]);
    }

    // HTML: <img src="path" ...> or <img src='path' ...>
    const htmlRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlRegex.exec(content)) !== null) {
      paths.push(match[1]);
    }

    return paths;
  } catch (error) {
    console.error(`${LOG_PREFIX} [extractImagePaths] Error:`, error);
    return [];
  }
}

/**
 * Check if URL is external (http, https, data, blob)
 * @param {string} url - URL to check
 * @returns {boolean} - True if external
 */
function isExternalUrl(url) {
  if (!url) return true;
  const lowerUrl = url.toLowerCase().trim();
  return (
    lowerUrl.startsWith("http://") ||
    lowerUrl.startsWith("https://") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("blob:")
  );
}
// #endregion

// #region Private Functions - Path Resolution
/**
 * Get directory from file path
 * @param {string} filePath - File path (e.g., "BD/subfolder/design.md")
 * @returns {string} - Directory path (e.g., "BD/subfolder")
 */
function getDirectoryFromPath(filePath) {
  if (!filePath) {
    return "";
  }

  try {
    // Remove file name, keep directory
    const lastSlash = filePath.lastIndexOf("/");
    const dir = lastSlash > 0 ? filePath.substring(0, lastSlash) : "";
    return dir;
  } catch (error) {
    console.error(`${LOG_PREFIX} [getDirectoryFromPath] Error:`, error);
    return "";
  }
}

/**
 * Resolve relative path to absolute path
 * @param {string} currentDir - Current directory (e.g., "BD/subfolder")
 * @param {string} relativePath - Relative path (e.g., "../images/x.png")
 * @returns {string} - Absolute path (e.g., "BD/images/x.png")
 */
function resolveRelativePath(currentDir, relativePath) {
  if (!relativePath) {
    return "";
  }

  try {
    // Normalize: strip leading "/" or "./"
    let path = relativePath.trim();
    while (path.startsWith("/") || path.startsWith("./")) {
      if (path.startsWith("/")) {
        path = path.substring(1);
      } else if (path.startsWith("./")) {
        path = path.substring(2);
      }
    }

    // If no currentDir, return normalized path
    if (!currentDir) {
      return path;
    }

    // Handle "../" by navigating up directories
    const dirParts = currentDir.split("/").filter(Boolean);
    const pathParts = path.split("/");

    for (const part of pathParts) {
      if (part === "..") {
        dirParts.pop();
      } else if (part !== "." && part !== "") {
        dirParts.push(part);
      }
    }

    const result = dirParts.join("/");
    return result;
  } catch (error) {
    console.error(`${LOG_PREFIX} [resolveRelativePath] Error:`, error);
    return relativePath;
  }
}
// #endregion

// #region Private Functions - Fetching
/**
 * Fetch image with cache and request deduplication
 * @param {string} projectId - Project ID
 * @param {string} absolutePath - Absolute path to image
 * @returns {Promise<string|null>} - Data URL or null if failed
 */
async function fetchImageWithCache(projectId, absolutePath) {
  if (!projectId || !absolutePath) {
    return null;
  }

  try {
    const cacheKey = `${projectId}:${absolutePath}`;

    // Check cache first
    if (IMAGE_CACHE[cacheKey]) {
      return IMAGE_CACHE[cacheKey];
    }

    // Check if request is already pending (avoid duplicate requests)
    if (PENDING_REQUESTS[cacheKey]) {
      return PENDING_REQUESTS[cacheKey];
    }

    // Create fetch promise
    const encodedPath = encodeURIComponent(absolutePath);
    const apiUrl = `/api/projects/${projectId}/assets/image?file_path=${encodedPath}`;

    // Get auth token from localStorage
    const accessToken = localStorage.getItem("access_token");
    const headers = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const fetchPromise = fetch(apiUrl, { headers })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        // Get content type and image data
        const contentType = response.headers.get("content-type") || "image/png";
        const blob = await response.blob();

        // Convert to data URL
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result;
            // Cache the result
            IMAGE_CACHE[cacheKey] = dataUrl;
            delete PENDING_REQUESTS[cacheKey];
            resolve(dataUrl);
          };
          reader.onerror = () => {
            delete PENDING_REQUESTS[cacheKey];
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      })
      .catch((error) => {
        console.error(
          `${LOG_PREFIX} [fetchImageWithCache] Fetch error:`,
          error
        );
        delete PENDING_REQUESTS[cacheKey];
        return null;
      });

    // Store pending request
    PENDING_REQUESTS[cacheKey] = fetchPromise;

    return fetchPromise;
  } catch (error) {
    console.error(`${LOG_PREFIX} [fetchImageWithCache] Error:`, error);
    return null;
  }
}
// #endregion

// #region Private Functions - Content Replacement
/**
 * Replace image path in content (both markdown and HTML)
 * @param {string} content - Content to modify
 * @param {string} originalPath - Original path to replace
 * @param {string} dataUrl - Data URL to replace with
 * @returns {string} - Modified content
 */
function replaceImagePath(content, originalPath, dataUrl) {
  if (!content || !originalPath || !dataUrl) {
    return content;
  }

  try {
    // Escape special regex characters in original path
    const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Replace in markdown syntax: ![alt](path) or ![alt](path "title")
    // Match: ![any](originalPath) or ![any](originalPath "title")
    const mdPattern = new RegExp(
      `(!\\[[^\\]]*\\]\\()${escapedPath}((\\s+"[^"]*")?\\))`,
      "g"
    );
    content = content.replace(mdPattern, `$1${dataUrl}$2`);

    // Replace in HTML src attribute: src="path" or src='path'
    const htmlPatternDouble = new RegExp(
      `(<img[^>]+src=")${escapedPath}(")`,
      "gi"
    );
    content = content.replace(htmlPatternDouble, `$1${dataUrl}$2`);

    const htmlPatternSingle = new RegExp(
      `(<img[^>]+src=')${escapedPath}(')`,
      "gi"
    );
    content = content.replace(htmlPatternSingle, `$1${dataUrl}$2`);

    return content;
  } catch (error) {
    console.error(`${LOG_PREFIX} [replaceImagePath] Error:`, error);
    return content;
  }
}
// #endregion

// Export to window for global access
window.MarkdownImageResolver = {
  resolveMarkdownImages,
  clearImageCache,
};
