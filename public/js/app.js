/**
 * Devfest Wallet - Minimalist & Elegant Assistant Controller
 * Pure chat experience with live wallet metadata
 */

(function () {
  'use strict';

  // State
  let currentUserId = 'user_101';
  let isSending = false;
  let conversationHistory = [];

  const USERS = {
    user_101: { name: 'Alice Smith', avatar: '👩' },
    user_102: { name: 'Bob Jones', avatar: '👨' },
    user_103: { name: 'Charlie Brown', avatar: '👤' }
  };

  // Elements
  const userSelect = document.getElementById('userSelect');
  const userAvatar = document.getElementById('userAvatar');
  const resetDbBtn = document.getElementById('resetDbBtn');
  const cardBalanceAmount = document.getElementById('cardBalanceAmount');
  const accountName = document.getElementById('accountName');
  const accountStatus = document.getElementById('accountStatus');
  const accountTier = document.getElementById('accountTier');
  const greetingName = document.getElementById('greetingName');

  const actionChips = document.getElementById('actionChips');
  const chatContainer = document.getElementById('chatContainer');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const toastWrapper = document.getElementById('toastWrapper');

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async function init() {
    setupEvents();
    await refreshWallet();
  }

  function setupEvents() {
    // 1. Switch User
    userSelect.addEventListener('change', async (e) => {
      currentUserId = e.target.value;
      conversationHistory = [];
      const user = USERS[currentUserId] || { name: 'User', avatar: '👤' };
      userAvatar.textContent = user.avatar;
      greetingName.textContent = user.name.split(' ')[0];
      
      showToast(`Active account: ${user.name}`);
      appendSystemNotice(`Active wallet switched to **${user.name}**.`);
      
      await refreshWallet();
    });

    // 2. Reset Database
    resetDbBtn.addEventListener('click', async () => {
      resetDbBtn.style.transform = 'rotate(180deg)';
      setTimeout(() => { resetDbBtn.style.transform = 'none'; }, 300);

      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          conversationHistory = [];
          showToast('Database reset to seed balances');
          appendSystemNotice('🔄 Database reset. Initial balances: Alice ($1,250.00), Bob ($320.50).');
          await refreshWallet();
        }
      } catch (err) {
        showToast('Reset failed');
      }
    });

    // 3. Quick Action Chips
    actionChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || isSending) return;
      const query = chip.getAttribute('data-query');
      if (query) {
        sendMessage(query);
      }
    });

    // 4. Form Submit
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = chatInput.value.trim();
      if (!query || isSending) return;
      chatInput.value = '';
      sendMessage(query);
    });
  }

  // ==========================================================================
  // Wallet Data
  // ==========================================================================

  async function refreshWallet() {
    try {
      const res = await fetch(`/api/wallets/${encodeURIComponent(currentUserId)}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const wallet = json.data;
      cardBalanceAmount.textContent = `$${wallet.balance.toFixed(2)}`;
      accountName.textContent = wallet.name;
      
      accountStatus.textContent = wallet.status === 'ACTIVE' ? 'Active' : 'Frozen';
      accountStatus.className = `pill pill-status ${wallet.status === 'ACTIVE' ? 'active' : 'frozen'}`;
      
      accountTier.textContent = wallet.tier === 'PREMIUM' ? 'Premium' : 'Standard';

    } catch (err) {
      console.warn('Wallet refresh failed:', err);
    }
  }

  // ==========================================================================
  // Chat Messaging
  // ==========================================================================

  async function sendMessage(query) {
    if (isSending) return;
    isSending = true;

    // Append User Bubble
    appendUserBubble(query);
    conversationHistory.push({ role: 'user', content: query });

    // Append Typing Indicator
    const typingIndicator = createTypingIndicator();
    chatContainer.appendChild(typingIndicator);
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: currentUserId,
          history: conversationHistory.slice(-12)
        })
      });

      const json = await response.json();
      typingIndicator.remove();

      if (json.success && json.data) {
        const agent = json.data;
        conversationHistory.push({ role: 'model', content: agent.response });
        appendAssistantBubble(agent.response, agent.toolCalls);

        // Update balance if a transfer or topup occurred
        await refreshWallet();
      } else {
        appendAssistantBubble(`I encountered an issue processing that: ${json.error || 'Server error'}`);
      }

    } catch (err) {
      typingIndicator.remove();
      appendAssistantBubble(`Could not connect to assistant: ${err.message}`);
    } finally {
      isSending = false;
      scrollToBottom();
    }
  }

  function appendUserBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble user';
    bubble.innerHTML = `<div class="bubble-content">${escapeHtml(text)}</div>`;
    chatContainer.appendChild(bubble);
    scrollToBottom();
  }

  function appendAssistantBubble(markdownText, toolCalls = []) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant';

    // Tool execution pill
    let toolPillHtml = '';
    if (toolCalls && toolCalls.length > 0) {
      toolCalls.forEach((call) => {
        if (!call || !call.tool || call.tool === 'none') return;

        // Clean tool name for human display
        const friendlyName = call.tool.replace(/_/g, ' ');
        const detailsJson = JSON.stringify({
          tool: call.tool,
          arguments: sanitizePayload(call.args),
          result: sanitizePayload(call.result)
        }, null, 2);

        toolPillHtml += `
          <div class="mcp-pill-wrapper">
            <div class="mcp-pill" onclick="this.parentElement.classList.toggle('open')">
              <span>⚡ Tool: <strong>${escapeHtml(friendlyName)}</strong></span>
            </div>
            <div class="mcp-dropdown-content">${escapeHtml(detailsJson)}</div>
          </div>
        `;
      });
    }

    bubble.innerHTML = `
      <div class="bubble-header">
        <span class="bubble-sender">Devfest Assistant</span>
      </div>
      <div class="bubble-content">
        ${renderMarkdown(markdownText)}
        ${toolPillHtml}
      </div>
    `;
    chatContainer.appendChild(bubble);
    scrollToBottom();
  }

  function appendSystemNotice(markdownText) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant';
    bubble.innerHTML = `
      <div class="bubble-content" style="background:#fef7e0;border-color:#f9ab00;color:#7a4400;font-size:0.82rem;">
        ${renderMarkdown(markdownText)}
      </div>
    `;
    chatContainer.appendChild(bubble);
    scrollToBottom();
  }

  function createTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-pill';
    div.innerHTML = `
      <span class="t-dot t-blue"></span>
      <span class="t-dot t-red"></span>
      <span class="t-dot t-yellow"></span>
      <span class="t-dot t-green"></span>
    `;
    return div;
  }

  // ==========================================================================
  // Formatting & Sanitization
  // ==========================================================================

  // Strip technical primary keys like user_101 from visual payload inspection
  function sanitizePayload(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    
    // Replace user ID with user name if known
    if (copy.userId && USERS[copy.userId]) copy.userId = USERS[copy.userId].name;
    if (copy.senderId && USERS[copy.senderId]) copy.senderId = USERS[copy.senderId].name;
    if (copy.recipientId && USERS[copy.recipientId]) copy.recipientId = USERS[copy.recipientId].name;
    
    return copy;
  }

  function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f3f4;padding:2px 5px;border-radius:4px;font-size:0.82em;">$1</code>');

    // Bullet lists
    html = html.replace(/^- (.*$)/gim, '• $1<br>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
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

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastWrapper.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s';
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  window.addEventListener('DOMContentLoaded', init);

})();
