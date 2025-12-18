/**
 * Project Detail Comments Module
 * Handles all comment-related functionality
 */

import { ProjectAPI } from './project_detail_api.js';
import {
  getProjectId,
  setComments,
  setCommentPageInfo,
  setLoadingComments,
  setSendingComment,
  addComment,
  prependComments,
  ProjectState
} from './project_detail_state.js';
import {
  renderComments,
  scrollCommentsToBottom,
  // showAlert,
  // showLoading,
  // hideLoading
} from './project_detail_ui.js';
import { $projectid, getUserInfo } from './project_detail_helpers.js';
import { PROJECT_MESSAGES } from '../commons/error_messages.js';

// #region Load Comments
/**
 * Load comments for a project
 * @param {string} projectId - Project ID
 * @param {number} page - Page number
 * @param {boolean} append - Whether to append to existing comments
 */
const loadComments = async (projectId, page = 1, append = false) => {
  console.log(`[Comments] Load - projectId: ${projectId}, page: ${page}, append: ${append}`);

  if (ProjectState.isLoadingComments) {
    console.log('[Comments] Already loading, skip');
    return;
  }

  setLoadingComments(true);

  try {
    const result = await ProjectAPI.getComments(projectId, page, 20);
    console.log(`[Comments] Loaded page ${page}:`, result);

    const comments = result.data?.comments || [];
    const totalPages = result.data?.pagination?.total_pages || 1;

    setCommentPageInfo(page, totalPages);

    const reversed = comments.reverse();

    if (append) {
      prependComments(reversed);
      renderComments(true);
    } else {
      setComments(reversed);
      renderComments(false);
    }

  } catch (error) {
    console.error("[Comments] Load error:", error);
    if (!append) {
      setComments([]);
      renderComments();
    }
  } finally {
    setLoadingComments(false);
  }
};
// #endregion

// #region Send Comment
/**
 * Handle sending a new comment
 */
const handleSendComment = async () => {
  console.log('[handleSendComment] Start');

  if (ProjectState.isSendingComment) {
    console.log('[handleSendComment] Already sending, skip');
    return;
  }

  setSendingComment(true);

  const commentInput = $projectid("commentInput");
  const commentText = commentInput?.value?.trim();

  try {
    if (!commentText) {
      showAlert(PROJECT_MESSAGES.COMMENT_REQUIRED, "error");
      return;
    }

    if (commentText.length > 500) {
      showAlert(PROJECT_MESSAGES.COMMENT_MAX_LENGTH, "error");
      return;
    }

    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.user_id) {
      showAlert(PROJECT_MESSAGES.USER_NOT_FOUND, "error");
      return;
    }

    const commentData = {
      content: commentText,
      user_id: userInfo.user_id,
    };

    const projectId = getProjectId();
    const result = await ProjectAPI.createComment(projectId, commentData);

    if (result.statusCode === 200 && result.data) {
      const newComment = {
        comment_id: result.data.comment_id,
        user_id: result.data.user_id,
        user_name: result.data.user_name,
        content: result.data.content,
        created_at: new Date().toISOString(),
      };

      addComment(newComment);
      renderComments();
      scrollCommentsToBottom();

      commentInput.value = "";
      console.log('[handleSendComment] Success');
    }

  } catch (error) {
    console.error("[handleSendComment] Error:", error);
    showAlert(error.message, "error");
  } finally {
    setSendingComment(false);
    updateSendCommentButtonState();
    hideLoading();
  }
};
// #endregion

// #region Comment Scroll
/**
 * Setup scroll listener for loading more comments
 */
const setupCommentScrollListener = () => {
  console.log('[setupCommentScrollListener] Start');

  try {
    const container = $projectid("commentsContainer");
    if (!container) {
      console.warn('[setupCommentScrollListener] Container not found');
      return;
    }

    container.addEventListener("scroll", async () => {
      if (container.scrollTop === 0 && !ProjectState.isLoadingComments) {
        const currentPage = ProjectState.currentCommentPage;
        const totalPages = ProjectState.totalCommentPages;

        if (currentPage < totalPages) {
          const nextPage = currentPage + 1;
          console.log(`[Comments] Load older comments (page ${nextPage})`);

          ProjectState.currentCommentPage = nextPage;
          const projectId = getProjectId();
          await loadComments(projectId, nextPage, true);
        } else {
          console.log("[Comments] All comments loaded");
        }
      }
    });

    console.log('[setupCommentScrollListener] Complete');
  } catch (error) {
    console.error('[setupCommentScrollListener] Error:', error);
  }
};
// #endregion

// #region Comment Events
/**
 * Setup comment input and send button events
 */
const setupCommentEvents = () => {
  console.log('[setupCommentEvents] Start');

  try {
    const commentInput = $projectid("commentInput");
    const sendBtn = $projectid("sendCommentBtn");

    if (!commentInput || !sendBtn) {
      console.warn('[setupCommentEvents] Elements not found');
      return;
    }

    sendBtn.disabled = true;

    commentInput.addEventListener("input", updateSendCommentButtonState);

    sendBtn.addEventListener("click", async () => {
      if (sendBtn.disabled) return;
      await handleSendComment();
    });

    commentInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (sendBtn.disabled) return;
        await handleSendComment();
      }
    });

    console.log('[setupCommentEvents] Complete');
  } catch (error) {
    console.error('[setupCommentEvents] Error:', error);
  }
};

/**
 * Update send comment button state based on input
 */
const updateSendCommentButtonState = () => {
  try {
    const commentInput = $projectid("commentInput");
    const sendBtn = $projectid("sendCommentBtn");

    if (!commentInput || !sendBtn) return;

    const text = commentInput.value.trim();
    sendBtn.disabled = ProjectState.isSendingComment || text.length === 0;
  } catch (error) {
    console.error('[updateSendCommentButtonState] Error:', error);
  }
};
// #endregion

// Export comment functions
export {
  loadComments,
  handleSendComment,
  setupCommentScrollListener,
  setupCommentEvents,
  updateSendCommentButtonState,
};

