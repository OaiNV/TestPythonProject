/**
 * Commit Message Modal
 * Handles commit message input modal
 */

// #region Constants
const MODAL_HTML = `
  <div id="commitMessageModal" class="commit-modal" style="display:none;">
    <div class="commit-modal-overlay"></div>
    <div class="commit-modal-content">
      <h3 class="commit-modal-title">コミットメッセージ</h3>
      <textarea id="commitMessageInput" class="commit-message-input" placeholder="コミットメッセージを入力してください" maxlength="500"></textarea>
      <div class="commit-char-count"><span id="commitCharCount">0</span>/500</div>
      <div class="commit-modal-actions">
        <button id="commitCancelBtn" class="btn btn-secondary">Cancel</button>
        <button id="commitOkBtn" class="btn btn-primary" disabled>Commit</button>
      </div>
    </div>
  </div>
`;
// #endregion

// #region Modal State
let commitResolve = null;
let commitReject = null;
let isModalInitialized = false;
// #endregion

// #region Private Functions

/**
 * Initialize commit modal (create DOM elements)
 */
const initCommitModal = () => {
  console.log('[CommitModal] Initializing modal');
  
  try {
    // Check if modal already exists
    if (document.getElementById('commitMessageModal')) {
      isModalInitialized = true;
      return;
    }
    
    // Create modal HTML
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    isModalInitialized = true;
    
    // Setup event listeners
    setupCommitModalEvents();
    
    console.log('[CommitModal] Modal initialized');
  } catch (error) {
    console.error('[CommitModal] Error initializing modal:', error);
  }
};

/**
 * Setup commit modal event listeners
 */
const setupCommitModalEvents = () => {
  console.log('[CommitModal] Setting up event listeners');
  
  try {
    const modal = document.getElementById('commitMessageModal');
    const overlay = modal?.querySelector('.commit-modal-overlay');
    const input = document.getElementById('commitMessageInput');
    const charCount = document.getElementById('commitCharCount');
    const cancelBtn = document.getElementById('commitCancelBtn');
    const okBtn = document.getElementById('commitOkBtn');
    
    if (!modal || !input || !cancelBtn || !okBtn) {
      console.error('[CommitModal] Modal elements not found');
      return;
    }
    
    // Update character count and button state
    input.addEventListener('input', () => {
      const length = input.value.trim().length;
      charCount.textContent = input.value.length.toString();
      
      // Disable OK button if no text entered
      okBtn.disabled = length === 0;
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
      hideCommitMessageModal(null);
    });
    
    // OK button
    okBtn.addEventListener('click', () => {
      const message = input.value.trim();
      if (message) {
        hideCommitMessageModal(message);
      }
    });
    
    // Close on overlay click
    overlay?.addEventListener('click', () => {
      hideCommitMessageModal(null);
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        hideCommitMessageModal(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    console.log('[CommitModal] Event listeners setup complete');
  } catch (error) {
    console.error('[CommitModal] Error setting up events:', error);
  }
};
// #endregion

// #region Public Functions

/**
 * Show commit message modal
 * @returns {Promise<string>} Commit message or null if cancelled
 */
export const showCommitMessageModal = () => {
  console.log('[CommitModal] Opening modal');
  
  return new Promise((resolve, reject) => {
    try {
      // Initialize modal if not already done
      if (!isModalInitialized) {
        initCommitModal();
      }
      
      commitResolve = resolve;
      commitReject = reject;
      
      const modal = document.getElementById('commitMessageModal');
      const input = document.getElementById('commitMessageInput');
      const charCount = document.getElementById('commitCharCount');
      const okBtn = document.getElementById('commitOkBtn');
      
      if (!modal || !input || !okBtn) {
        console.error('[CommitModal] Modal elements not found');
        reject(new Error('Modal elements not found'));
        return;
      }
      
      // Reset input and button state
      input.value = '';
      charCount.textContent = '0';
      okBtn.disabled = true;
      
      // Show modal
      modal.style.display = 'flex';
      
      // Focus input
      setTimeout(() => input.focus(), 100);
      
      console.log('[CommitModal] Modal shown');
    } catch (error) {
      console.error('[CommitModal] Error showing modal:', error);
      reject(error);
    }
  });
};

/**
 * Hide commit message modal
 * @param {string|null} commitMessage - Commit message or null if cancelled
 */
export const hideCommitMessageModal = (commitMessage = null) => {
  console.log('[CommitModal] Hiding modal, message:', commitMessage);
  
  try {
    const modal = document.getElementById('commitMessageModal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    // Resolve promise
    if (commitResolve) {
      commitResolve(commitMessage);
      commitResolve = null;
      commitReject = null;
    }
  } catch (error) {
    console.error('[CommitModal] Error hiding modal:', error);
  }
};
// #endregion

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCommitModal);
} else {
  initCommitModal();
}

console.log('[commit_modal.js] Module loaded ✅');

