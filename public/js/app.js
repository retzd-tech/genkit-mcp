/**
 * Devfest Wallet - Mobile Web UI Controller
 * Integrates with Firebase Genkit & MCP Backend API
 */

(function () {
  'use strict';

  // State
  let currentUserId = 'user_101';
  let isSending = false;

  // DOM Elements
  const userSelect = document.getElementById('userSelect');
  const headerAvatar = document.getElementById('headerAvatar');
  const refreshWalletBtn = document.getElementById('refreshWalletBtn');
  const cardBalanceAmount = document.getElementById('cardBalanceAmount');
  const cardBalanceCurrency = document.getElementById('cardBalanceCurrency');
  const cardHolderName = document.getElementById('cardHolderName');
  const cardStatusBadge = document.getElementById('cardStatusBadge');
  const cardTierBadge = document.getElementById('cardTierBadge');

  // Profile elements in Wallet Tab
  const detailName = document.getElementById('detailName');
  const detailUserId = document.getElementById('detailUserId');
  const detailEmail = document.getElementById('detailEmail');
  const detailStatus = document.getElementById('detailStatus');
  const detailTier = document.getElementById('detailTier');
  const detailLimit = document.getElementById('detailLimit');

  // Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const promptChips = document.getElementById('promptChips');
  const engineBadge = document.getElementById('engineBadge');

  // Activity Elements
  const transactionList = document.getElementById('transactionList');
  const refreshTxBtn = document.getElementById('refreshTxBtn');

  // Toolbar & Frame Elements
  const toggleViewBtn = document.getElementById('toggleViewBtn');
  const viewIcon = document.getElementById('viewIcon');
  const viewLabel = document.getElementById('viewLabel');
  const resetDbGlobalBtn = document.getElementById('resetDbGlobalBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewPanels = document.querySelectorAll('.view-panel');

  // Quick Action Buttons on Card
  const cardActionBtns = document.querySelectorAll('.card-action-btn');

  // Avatars by User
  const AVATARS = {
    user_101: '👩',
    user_102: '👨',
    user_103: '👤'
  };

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async function init() {
    setupEventListeners();
    await refreshWalletData();
    await refreshTransactions();
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  function setupEventListeners() {
    // 1. User selector change
    userSelect.addEventListener('change', async (e) => {
      currentUserId = e.target.value;
      headerAvatar.textContent = AVATARS[currentUserId] || '👤';
      showToast(`Switched account to ${userSelect.options[userSelect.selectedIndex].text.split('(')[0].trim()}`);
      
      appendSystemMessage(`🔄 Active session switched to **${userSelect.options[userSelect.selectedIndex].text.split('(')[0].trim()}** (${currentUserId})`);
      
      await refreshWalletData();
      await refreshTransactions();
    });

    // 2. Refresh Wallet Button
    refreshWalletBtn.addEventListener('click', async () => {
      refreshWalletBtn.style.transform = 'rotate(180deg)';
      await refreshWalletData();
      await refreshTransactions();
      setTimeout(() => { refreshWalletBtn.style.transform = 'none'; }, 300);
      showToast('Wallet balance refreshed');
    });

    // 3. Chat form submission
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = chatInput.value.trim();
      if (!query || isSending) return;
      chatInput.value = '';
      await handleSendMessage(query);
    });

    // 4. Quick Suggestion Prompt Chips
    promptChips.addEventListener('click', async (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || isSending) return;
      const query = chip.getAttribute('data-query');
      if (query) {
        await handleSendMessage(query);
      }
    });

    // 5. Card Quick Actions
    cardActionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        switchTab('viewChat');
        if (action === 'transfer') {
          chatInput.value = 'Transfer $35 to Bob for lunch';
          chatInput.focus();
        } else if (action === 'topup') {
          chatInput.value = 'I want to top up $50 using virtual account';
          chatInput.focus();
        } else if (action === 'history') {
          switchTab('viewActivity');
        } else if (action === 'status') {
          chatInput.value = 'Check status of transfer TRF-1001';
          chatInput.focus();
        }
      });
    });

    // 6. Tab Navigation
    navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        switchTab(targetId);
      });
    });

    // 7. Activity Refresh Button
    if (refreshTxBtn) {
      refreshTxBtn.addEventListener('click', async () => {
        await refreshTransactions();
        showToast('Transactions updated');
      });
    }

    // 8. Toggle Presentation View (Phone frame vs full width)
    toggleViewBtn.addEventListener('click', () => {
      const isPhoneMode = document.body.classList.contains('phone-mode');
      if (isPhoneMode) {
        document.body.classList.remove('phone-mode');
        document.body.classList.add('full-mode');
        viewIcon.textContent = '🖥️';
        viewLabel.textContent = 'Phone Frame View';
        showToast('Switched to Full Screen view');
      } else {
        document.body.classList.remove('full-mode');
        document.body.classList.add('phone-mode');
        viewIcon.textContent = '📱';
        viewLabel.textContent = 'Full Screen View';
        showToast('Switched to Mobile Phone Frame');
      }
    });

    // 9. Reset DB Button
    resetDbGlobalBtn.addEventListener('click', async () => {
      if (confirm('Restore wallet database to clean initial seed state? (Alice: $1,250, Bob: $320.50)')) {
        await resetDatabase();
      }
    });
  }

  // ==========================================================================
  // Tab Switching Helper
  // ==========================================================================

  function switchTab(panelId) {
    navTabs.forEach((tab) => {
      const isTarget = tab.getAttribute('data-target') === panelId;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    viewPanels.forEach((panel) => {
      if (panel.id === panelId) {
        panel.classList.add('active');
        panel.removeAttribute('hidden');
      } else {
        panel.classList.remove('active');
        panel.setAttribute('hidden', 'true');
      }
    });
  }

  // ==========================================================================
  // Backend API Communication
  // ==========================================================================

  async function refreshWalletData() {
    try {
      const res = await fetch(`/api/wallets/${encodeURIComponent(currentUserId)}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch wallet');

      const wallet = json.data;

      // Update Card
      cardBalanceAmount.textContent = `$${wallet.balance.toFixed(2)}`;
      cardBalanceCurrency.textContent = wallet.currency || 'USD';
      cardHolderName.textContent = wallet.name;
      cardStatusBadge.textContent = wallet.status;
      cardStatusBadge.className = `badge badge-status ${wallet.status}`;
      cardTierBadge.textContent = wallet.tier || 'STANDARD';

      // Update Profile Grid
      detailName.textContent = wallet.name;
      detailUserId.textContent = wallet.userId;
      detailEmail.textContent = wallet.email;
      detailStatus.textContent = wallet.status;
      detailTier.textContent = wallet.tier;
      detailLimit.textContent = `$${wallet.dailyLimit ? wallet.dailyLimit.toFixed(2) : '1000.00'}`;

    } catch (err) {
      console.warn('[Wallet Refresh Error]', err);
    }
  }

  async function refreshTransactions() {
    try {
      const res = await fetch(`/api/wallets/${encodeURIComponent(currentUserId)}/transactions?limit=10`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch transactions');

      const txs = json.data;
      renderTransactionList(txs);
    } catch (err) {
      console.warn('[Transactions Refresh Error]', err);
    }
  }

  function renderTransactionList(transactions) {
    if (!transactions || transactions.length === 0) {
      transactionList.innerHTML = `<div class="empty-state">No past transactions found for this account.</div>`;
      return;
    }

    transactionList.innerHTML = transactions.map((tx) => {
      let iconClass = 'tx-icon-out';
      let icon = '📤';
      let sign = '-';
      let amtClass = 'negative';

      if (tx.type === 'TRANSFER_IN') {
        iconClass = 'tx-icon-in';
        icon = '📥';
        sign = '+';
        amtClass = 'positive';
      } else if (tx.type === 'TOPUP') {
        iconClass = 'tx-icon-topup';
        icon = '💳';
        sign = '+';
        amtClass = 'positive';
      }

      const dateStr = new Date(tx.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="tx-item">
          <div class="tx-left">
            <div class="tx-icon ${iconClass}">${icon}</div>
            <div>
              <div class="tx-title">${escapeHtml(tx.description || tx.counterparty || tx.id)}</div>
              <div class="tx-meta">${dateStr} • Ref: ${tx.referenceId || tx.id}</div>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${amtClass}">${sign}$${Math.abs(tx.amount).toFixed(2)}</div>
            <span class="tx-badge ${tx.status}">${tx.status}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  async function resetDatabase() {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Database reset to pristine seed state!');
        appendSystemMessage('🔄 **System**: Database has been restored to clean seed data. Initial balances: Alice = $1,250.00, Bob = $320.50.');
        await refreshWalletData();
        await refreshTransactions();
      } else {
        showToast(`Reset failed: ${json.error}`);
      }
    } catch (err) {
      showToast(`Error resetting database: ${err.message}`);
    }
  }

  // ==========================================================================
  // Chat Messaging Logic
  // ==========================================================================

  async function handleSendMessage(query) {
    if (isSending) return;
    isSending = true;

    // Append User Message Bubble
    appendUserMessage(query);

    // Show Typing Indicator
    const typingIndicator = createTypingIndicator();
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: currentUserId
        })
      });

      const json = await response.json();
      typingIndicator.remove();

      if (json.success && json.data) {
        const agentData = json.data;

        // Update engine badge if specified
        if (agentData.data && agentData.data.mode === 'gemini-llm') {
          engineBadge.innerHTML = `<span class="badge-dot" style="background:#ea4335"></span> Gemini Cloud LLM`;
        } else {
          engineBadge.innerHTML = `<span class="badge-dot"></span> Offline Reasoning Engine`;
        }

        // Append Assistant Bubble
        appendAssistantMessage(agentData.response, agentData.toolCalls);

        // Always refresh wallet and transaction list if state might have changed
        await refreshWalletData();
        await refreshTransactions();

      } else {
        appendAssistantMessage(`❌ Sorry, an error occurred while processing your request: ${json.error || 'Unknown error'}`);
      }

    } catch (err) {
      typingIndicator.remove();
      appendAssistantMessage(`❌ Network error communicating with Assistant API: ${err.message}`);
    } finally {
      isSending = false;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-user';
    bubble.innerHTML = `
      <div class="message-avatar">${AVATARS[currentUserId] || '👤'}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="author-name">You</span>
          <span class="message-time">Just now</span>
        </div>
        <div class="message-text">${escapeHtml(text)}</div>
      </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendAssistantMessage(markdownText, toolCalls = []) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-assistant';

    let toolsHtml = '';
    if (toolCalls && toolCalls.length > 0) {
      toolCalls.forEach((call) => {
        if (!call || !call.tool || call.tool === 'none') return;
        toolsHtml += `
          <div class="mcp-call-card">
            <div class="mcp-call-header" onclick="this.parentElement.classList.toggle('open')">
              <span>🛠️ <strong>MCP Tool Invoked:</strong> <code>${escapeHtml(call.tool)}</code></span>
              <span class="mcp-toggle-icon">▼</span>
            </div>
            <div class="mcp-call-details">
              <strong>Arguments:</strong>
              <div class="mcp-code-block">${escapeHtml(JSON.stringify(call.args || {}, null, 2))}</div>
              <strong style="margin-top:6px;display:block;">Backend API Result via MCP:</strong>
              <div class="mcp-code-block">${escapeHtml(JSON.stringify(call.result || {}, null, 2))}</div>
            </div>
          </div>
        `;
      });
    }

    bubble.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-body">
        <div class="message-header">
          <span class="author-name">Devfest Assistant</span>
          <span class="message-time">Just now</span>
        </div>
        <div class="message-text">
          ${formatMarkdown(markdownText)}
          ${toolsHtml}
        </div>
      </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendSystemMessage(markdownText) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble message-assistant';
    bubble.innerHTML = `
      <div class="message-avatar">⚙️</div>
      <div class="message-body">
        <div class="message-header">
          <span class="author-name">System Notice</span>
        </div>
        <div class="message-text" style="background:#fef7e0;border-color:#fbbc05;">
          ${formatMarkdown(markdownText)}
        </div>
      </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function createTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.innerHTML = `
      <span class="typing-dot dot-1"></span>
      <span class="typing-dot dot-2"></span>
      <span class="typing-dot dot-3"></span>
      <span class="typing-dot dot-4"></span>
      <span style="font-size:0.75rem;color:#5f6368;margin-left:4px;">Assistant thinking & querying MCP tools...</span>
    `;
    return div;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  function formatMarkdown(text) {
    if (!text) return '';
    let formatted = escapeHtml(text);

    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bullet lists
    formatted = formatted.replace(/^- (.*$)/gim, '• $1<br>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);

})();
