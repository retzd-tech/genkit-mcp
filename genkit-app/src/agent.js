const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const { z } = require('genkit');
const { ai } = require('./genkit');
const {
  tools: {
    getWalletBalanceTool,
    checkTransferStatusTool,
    checkTopupStatusTool,
    executeTransferTool,
    initiateTopupTool,
    getTransactionHistoryTool
  }
} = require('../../mcp-server/src/genkit-mcp-server');
const { db } = require('../../backend/src/db');

const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

// All available wallet tools
const walletTools = [
  getWalletBalanceTool,
  checkTransferStatusTool,
  checkTopupStatusTool,
  executeTransferTool,
  initiateTopupTool,
  getTransactionHistoryTool
];

// ============================================================================
// WORKSHOP EXERCISE 4: AI Agent Orchestration Flow & Reasoning Engine
// ============================================================================

/**
 * Intelligent pattern matcher for offline / zero-API-key demonstration mode.
 * Identifies intent and parameters from user's natural language question.
 */
async function simulateAgentReasoning(query, defaultUserId = 'user_101', history = []) {
  const q = query.trim();
  const lower = q.toLowerCase();

  // 0. Handle confirmations when user agrees to a pending proposal (e.g. "okay baik", "ya kirimkan", "oke", "yes")
  const isConfirm = /^(ok|oke|okay|baik|ya|yes|lanjutkan|kirimkan|siap)(\s+(baik|dong|ya|aja|bro))?$/i.test(q);
  if (isConfirm && history && history.length > 0) {
    const lastAssistant = [...history].reverse().find(m => m && (m.role === 'model' || m.role === 'assistant'));
    const lastText = lastAssistant ? (typeof lastAssistant.content === 'string' ? lastAssistant.content : (lastAssistant.content?.[0]?.text || '')) : '';

    const propRecMatch = lastText.match(/Bob Jones|Bob|Charlie Brown|Charlie/i);
    if (propRecMatch) {
      let amount = null;
      const amtMatchAssistant = lastText.match(/(?:\$|usd|dollar)?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollar|usd|\$)?/i);
      if (amtMatchAssistant && parseFloat(amtMatchAssistant[1]) > 0) {
        amount = parseFloat(amtMatchAssistant[1]);
      } else {
        for (const m of [...history].reverse()) {
          const txt = typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || '');
          const mMatch = txt.match(/(?:\$|usd|dollar)?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollar|usd|\$)?/i);
          if (mMatch && parseFloat(mMatch[1]) > 0) {
            amount = parseFloat(mMatch[1]);
            break;
          }
        }
      }

      if (amount) {
        const recipientId = propRecMatch[0].toLowerCase().includes('bob') ? 'user_102' : 'user_103';
        const senderId = defaultUserId;
        const result = await executeTransferTool({
          senderId,
          recipientId,
          amount,
          description: 'Transfer confirmed via Devfest Assistant'
        });
        let text = '';
        if (result.success) {
          text = `Transfer sebesar **${result.formattedAmount}** ke **${result.recipientName}** berhasil dilakukan!\n\n` +
                 `Berikut adalah detail transaksinya:\n` +
                 `- **ID Transfer**: ${result.transferId}\n` +
                 `- **Referensi**: ${result.referenceId}\n` +
                 `- **Penerima**: ${result.recipientName}\n` +
                 `- **Sisa Saldo Anda**: **${result.formattedRemainingBalance}**\n\n` +
                 `Ada lagi yang bisa saya bantu?`;
        } else {
          text = `❌ **Transfer Gagal**: ${result.error}`;
        }
        return {
          toolCalled: 'execute_transfer',
          toolArgs: { senderId, recipientId, amount },
          toolResult: result,
          response: text
        };
      }
    }
  }

  // TODO [Exercise 4.2 - Branch 1]: Transfer Status check
  const trfMatch = q.match(/\b(TRF-\d+|REF-TRF-\d+)\b/i);
  if ((lower.includes('transfer') && (lower.includes('status') || lower.includes('check'))) || trfMatch) {
    const transferId = trfMatch ? trfMatch[1] : 'TRF-1002';
    const result = await checkTransferStatusTool({ transferId });
    let text = '';
    if (result.success) {
      text = `Here is the status for Transfer **${result.transferId}** (Ref: ${result.referenceId}):\n` +
             `- **Status**: ${result.status === 'COMPLETED' ? '✅ COMPLETED' : result.status === 'PENDING' ? '⏳ PENDING' : '❌ FAILED'}\n` +
             `- **Amount**: ${result.formattedAmount}\n` +
             `- **Sender**: ${result.sender}\n` +
             `- **Recipient**: ${result.recipient}\n` +
             `- **Timestamp**: ${new Date(result.timestamp).toLocaleString()}\n` +
             `- **Note**: ${result.description}`;
      if (result.failureReason) {
        text += `\n- **Failure Reason**: ${result.failureReason}`;
      }
    } else {
      text = `❌ Could not find transfer with ID "${transferId}": ${result.error}`;
    }
    return {
      toolCalled: 'check_transfer_status',
      toolArgs: { transferId },
      toolResult: result,
      response: text
    };
  }

  // 2. Top-up Status check: "status of topup TOP-5001" or "check topup status"
  const topupMatch = q.match(/\b(TOP-\d+|REF-TOP-\d+)\b/i);
  if (lower.includes('topup') || lower.includes('top up') || lower.includes('top-up')) {
    if (lower.includes('status') || lower.includes('what is happening') || topupMatch) {
      const topupId = topupMatch ? topupMatch[1] : 'TOP-5002';
      const result = await checkTopupStatusTool({ topupId });
      let text = '';
      if (result.success) {
        text = `Here is the status for Top-up **${result.topupId}** (Ref: ${result.referenceId}):\n` +
               `- **Status**: ${result.status === 'SUCCESS' ? '✅ SUCCESS' : result.status === 'PENDING' ? '⏳ PENDING' : '❌ FAILED'}\n` +
               `- **Account Holder**: ${result.userName}\n` +
               `- **Amount**: ${result.formattedAmount}\n` +
               `- **Payment Method**: ${result.paymentMethod}\n` +
               `- **Detail**: ${result.statusDetail}`;
        if (result.virtualAccountNumber) {
          text += `\n- **Virtual Account**: ${result.virtualAccountNumber} (${result.bank || 'Bank Partner'})`;
        }
      } else {
        text = `❌ Could not find top-up with ID "${topupId}": ${result.error}`;
      }
      return {
        toolCalled: 'check_topup_status',
        toolArgs: { topupId },
        toolResult: result,
        response: text
      };
    }

    // Initiate Top-up: "top up $100 using virtual account"
    const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 50.00;
    let paymentMethod = 'VIRTUAL_ACCOUNT';
    if (lower.includes('credit') || lower.includes('card')) paymentMethod = 'CREDIT_CARD';
    if (lower.includes('bank transfer')) paymentMethod = 'BANK_TRANSFER';

    const userMatch = q.match(/user_\d+/i);
    const userId = userMatch ? userMatch[0] : defaultUserId;

    const result = await initiateTopupTool({ userId, amount, paymentMethod });
    let text = '';
    if (result.success) {
      text = `✅ Top-up request **${result.topupId}** created successfully for **${result.formattedAmount}**.\n` +
             `- **Payment Method**: ${result.paymentMethod}\n` +
             `- **Status**: ⏳ ${result.status}\n`;
      const inst = result.paymentInstructions || result;
      if (inst && inst.virtualAccountNumber) {
        text += `- **Virtual Account Number**: \`${inst.virtualAccountNumber}\` (${inst.bank || 'Partner Bank'})\n` +
                `- **Valid until**: ${inst.expiryTime ? new Date(inst.expiryTime).toLocaleString() : '24 hours'}`;
      } else if (inst && inst.checkoutUrl) {
        text += `- **Payment Link**: ${inst.checkoutUrl}`;
      }
    } else {
      text = `❌ Failed to initiate top-up: ${result.error}`;
    }
    return {
      toolCalled: 'initiate_topup',
      toolArgs: { userId, amount, paymentMethod },
      toolResult: result,
      response: text
    };
  }

  // 3. Inquire History or Latest Transfer: "latest transfer", "last transfer", "recent transactions", "history", "statement"
  const isHistoryOrLatest = lower.includes('history') ||
                            lower.includes('transactions') ||
                            lower.includes('statement') ||
                            lower.includes('past') ||
                            lower.includes('latest') ||
                            lower.includes('last') ||
                            lower.includes('recent');

  if (isHistoryOrLatest && !lower.includes('send') && !lower.includes('pay to')) {
    const userMatch = q.match(/user_\d+/i);
    const userId = userMatch ? userMatch[0] : defaultUserId;
    const result = await getTransactionHistoryTool({ userId, limit: 10 });

    let text = '';
    if (result.success) {
      if (lower.includes('transfer')) {
        // Find latest transfer specifically
        const latestTransfer = result.transactions.find(
          (tx) => tx.type === 'TRANSFER_OUT' || tx.type === 'TRANSFER_IN'
        );
        if (latestTransfer) {
          text = `📋 **Your Latest Transfer (${latestTransfer.id})**:\n` +
                 `- **Status**: ${latestTransfer.status === 'COMPLETED' ? '✅ COMPLETED' : latestTransfer.status === 'PENDING' ? '⏳ PENDING' : '❌ ' + latestTransfer.status}\n` +
                 `- **Type**: ${latestTransfer.type === 'TRANSFER_OUT' ? 'Sent (Outflow)' : 'Received (Inflow)'}\n` +
                 `- **Amount**: ${latestTransfer.formattedAmount}\n` +
                 `- **Counterparty**: ${latestTransfer.counterparty}\n` +
                 `- **Note**: ${latestTransfer.description}\n` +
                 `- **Date**: ${new Date(latestTransfer.timestamp).toLocaleString()}`;
        } else {
          text = `No recent transfers found for ${userId}.`;
        }
      } else {
        // Show general transaction ledger
        text = `📜 **Recent Transactions** (${Math.min(5, result.transactions.length)} entries):\n`;
        result.transactions.slice(0, 5).forEach((tx, idx) => {
          const symbol = tx.type === 'TRANSFER_OUT' ? '📤' : tx.type === 'TRANSFER_IN' ? '📥' : '💳';
          text += `${idx + 1}. ${symbol} **${tx.id}** [${tx.status}] - **${tx.formattedAmount}**\n` +
                  `   ${tx.description || tx.counterparty} • ${new Date(tx.timestamp).toLocaleDateString()}\n`;
        });
      }
    } else {
      text = `❌ Could not fetch transaction history: ${result.error}`;
    }

    return {
      toolCalled: 'get_transaction_history',
      toolArgs: { userId, limit: 10 },
      toolResult: result,
      response: text
    };
  }

  // 4. Do Transfer: explicit action intent (English or Indonesian)
  if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay') || lower.includes('kirim') || lower.includes('bayar') || lower.includes('tf')) {
    const amountMatch = q.match(/(?:\$|usd|dollar)?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollar|usd|\$)?/i) || q.match(/\$?\s*(\d+(\.\d{1,2})?)/);

    // Clean query to isolate recipient name
    const cleanQ = q.replace(/(?:\$|usd|dollar)?\s*\d+(?:\.\d{1,2})?\s*(?:dollar|usd|\$)?/gi, '');
    const recMatch = cleanQ.match(/(?:ke|to|buat|untuk)\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:ya|yak|dong|saja|aja|nih|deh|please)|$)/i) ||
                     cleanQ.match(/(?:ke|to|buat|untuk)\s+([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?)/i);
    const targetName = recMatch ? recMatch[1].trim() : null;

    // Check if recipient was specified but unknown in database
    if (targetName) {
      const found = db.findWallet(targetName);
      if (!found) {
        return {
          toolCalled: 'none',
          toolArgs: {},
          toolResult: null,
          response: `Maaf, kontak "${targetName}" tidak ditemukan di daftar kontak Anda. Apakah Anda bermaksud mengirim uang ke Bob Jones?`
        };
      }
    }

    // Guard: If user didn't specify amount
    if (!amountMatch) {
      return {
        toolCalled: 'none',
        toolArgs: {},
        toolResult: null,
        response: `❓ Berapa nominal yang ingin Anda kirimkan${targetName ? ` ke ${targetName}` : ''}? (Contoh: *"Kirim $20 ke Bob"* atau *"Transfer $50 ke Bob Jones"*).`
      };
    }

    const amount = parseFloat(amountMatch[1]);
    const targetWallet = targetName ? db.findWallet(targetName) : db.findWallet('Bob Jones');
    const recipientId = targetWallet ? targetWallet.userId : 'user_102';

    const senderMatch = q.match(/(?:from\s+|dari\s+)(user_\d+)/i);
    const senderId = senderMatch ? senderMatch[1] : defaultUserId;

    const result = await executeTransferTool({
      senderId,
      recipientId,
      amount,
      description: `Transfer via Devfest Assistant: "${q}"`
    });

    let text = '';
    if (result.success) {
      text = `Transfer sebesar **${result.formattedAmount}** ke **${result.recipientName}** berhasil dilakukan!\n\n` +
             `Berikut adalah detail transaksinya:\n` +
             `- **ID Transfer**: ${result.transferId}\n` +
             `- **Referensi**: ${result.referenceId}\n` +
             `- **Penerima**: ${result.recipientName}\n` +
             `- **Sisa Saldo Anda**: **${result.formattedRemainingBalance}**\n\n` +
             `Ada lagi yang bisa saya bantu?`;
    } else {
      text = `❌ **Transfer Gagal**: ${result.error}`;
    }

    return {
      toolCalled: 'execute_transfer',
      toolArgs: { senderId, recipientId, amount },
      toolResult: result,
      response: text
    };
  }

  // 5. Balance Inquiry or general query
  const isBalanceIntent = lower.includes('balance') || lower.includes('saldo') || lower.includes('uang') || lower.includes('account') || lower.includes('cek') || lower.includes('check');
  const userMatch = q.match(/user_\d+/i);
  const userId = userMatch ? userMatch[0] : defaultUserId;

  if (isBalanceIntent) {
    const result = await getWalletBalanceTool({ userId });
    let text = '';
    if (result.success) {
      text = `💼 **Wallet Summary for ${result.accountHolder}**:\n` +
             `- **Current Balance**: **${result.formattedBalance}**\n` +
             `- **Account Status**: ${result.status === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 ' + result.status}\n` +
             `- **Tier**: ${result.tier}\n` +
             `- **Daily Transfer Limit**: $${result.dailyLimit.toFixed(2)}`;
    } else {
      text = `❌ Could not find wallet for user "${userId}": ${result.error}`;
    }

    return {
      toolCalled: 'get_wallet_balance',
      toolArgs: { userId },
      toolResult: result,
      response: text
    };
  }

  // Fallback helpful guidance
  return {
    toolCalled: 'none',
    toolArgs: {},
    toolResult: null,
    response: `Halo! Saya asisten dompet digital Anda. Anda dapat meminta saya untuk mengecek saldo, transfer dana (contoh: *"Kirim $20 ke Bob"*), top-up saldo, atau melihat riwayat transaksi.`
  };
}

/**
 * Fast-path handler for pleasantries, greetings, and acknowledgments.
 * Responds in < 5ms without LLM latency or unnecessary tool execution.
 */
function getPleasantryResponse(query) {
  const q = query.trim().toLowerCase();
  const clean = q.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!👍🎉🙏😊❤️]/g, '').trim();

  // If query mentions financial wallet actions, let the agent/tools handle it
  const hasFinancialIntent = /\b(saldo|balance|uang|dollar|usd|\$|transfer|kirim|send|pay|bayar|topup|top up|isi|kartu|rekening|history|riwayat|trf|top|status)\b/i.test(q);
  if (hasFinancialIntent) return null;

  // Gratitude / Thank you
  const thanksPatterns = [
    'terima kasih', 'terimakasih', 'makasih', 'makasi', 'mksh', 'tq',
    'thank you', 'thanks', 'thx', 'maturnuwun', 'hatur nuhun', 'nuhun', 'arigato'
  ];
  if (thanksPatterns.some((pattern) => clean === pattern || clean.includes(pattern))) {
    return 'Sama-sama! Senang bisa membantu Anda. Jika ada transaksi atau bantuan lain seputar dompet digital Anda, silakan beri tahu ya! 😊';
  }

  // Greetings
  const greetingPatterns = [
    'halo', 'hi', 'hai', 'hello', 'hey', 'hei',
    'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
    'pagi', 'siang', 'sore', 'malam'
  ];
  if (greetingPatterns.some((pattern) => clean === pattern || clean.startsWith(pattern + ' '))) {
    return 'Halo! Saya asisten dompet digital Devfest Wallet. Ada yang bisa saya bantu hari ini? Anda dapat mengecek saldo, melakukan transfer dana, top up, atau melihat riwayat transaksi.';
  }

  // Acknowledgments / Closing
  const ackPatterns = [
    'mantap', 'mantul', 'keren', 'sip', 'siap', 'ok', 'oke', 'okay', 'baik', 'baiklah',
    'good', 'great', 'awesome', 'nice', 'sama-sama', 'sama sama', 'bye', 'dadah'
  ];
  if (ackPatterns.some((pattern) => clean === pattern || clean.startsWith(pattern + ' '))) {
    return 'Siap! Jika Anda butuh bantuan transaksi lain atau ingin mengecek saldo dompet digital Anda, silakan tanyakan kapan saja.';
  }

  // Casual Banter / Boredom ("saya bosan", "lagi gabut", etc.)
  const boredomPatterns = ['bosan', 'lagi bosan', 'bosan nih', 'saya bosan', 'gabut', 'lagi gabut', 'bored', 'im bored', 'i am bored'];
  if (boredomPatterns.some((pattern) => clean === pattern || clean.includes(pattern))) {
    return 'Haha, lagi bosan ya? Mau coba cek saldo dompet Anda atau kirim traktiran kopi ke Bob? Biar harinya makin seru! 😄☕ Ada yang bisa saya bantu terkait Devfest Wallet?';
  }

  return null;
}

function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Model request timed out after ${ms}ms`)), ms)
    )
  ]);
}

// Define Genkit Flow for Wallet Assistant
const walletAssistantFlow = ai.defineFlow(
  {
    name: 'walletAssistantFlow',
    inputSchema: z.object({
      query: z.string().describe('The user inquiry or command regarding their wallet or payment'),
      userId: z.string().optional().default('user_101').describe('Default user ID of the authenticated user'),
      history: z.array(z.any()).optional().default([])
    }),
    outputSchema: z.object({
      query: z.string(),
      response: z.string(),
      toolCalls: z.array(z.any()),
      data: z.any()
    })
  },
  async ({ query, userId, history = [] }) => {
    // 1. Instant Fast Path:
    // Gratitude (e.g. "terima kasih", "thank you", "mantap terima kasih") and boredom ("saya bosan")
    // are ALWAYS returned in < 5ms, avoiding unnecessary LLM round-trips.
    const isGratitude = /^(mantap\s+)?(terima\s*kasih|makasih|makasi|mksh|thank\s*you|thanks|thx|maturnuwun|hatur\s*nuhun|arigato)\b/i.test(query.trim());
    const isBored = /\b(bosan|gabut|bored)\b/i.test(query.trim());

    if (isGratitude) {
      return {
        query,
        response: 'Sama-sama! Senang bisa membantu Anda. Jika ada transaksi atau bantuan lain seputar dompet digital Anda, silakan beri tahu ya! 😊',
        toolCalls: [],
        data: { mode: 'instant-conversational' }
      };
    }

    if (isBored) {
      return {
        query,
        response: 'Haha, lagi bosan ya? Mau coba cek saldo dompet Anda atau kirim traktiran kopi ke Bob? Biar harinya makin seru! 😄☕ Ada yang bisa saya bantu terkait Devfest Wallet?',
        toolCalls: [],
        data: { mode: 'instant-conversational' }
      };
    }

    // Check greetings or closing acknowledgments
    const pleasantry = getPleasantryResponse(query);
    if (pleasantry) {
      const lastModelMsg = [...(history || [])].reverse().find(m => m && (m.role === 'model' || m.role === 'assistant'));
      const lastText = lastModelMsg ? (typeof lastModelMsg.content === 'string' ? lastModelMsg.content : (lastModelMsg.content?.[0]?.text || '')) : '';
      const isAwaitingAnswer = lastText.includes('?') || /\b(apakah|berapa|siapa|konfirmasi|confirm)\b/i.test(lastText);

      if (!isAwaitingAnswer) {
        return {
          query,
          response: pleasantry,
          toolCalls: [],
          data: { mode: 'instant-conversational' }
        };
      }
    }

    // 2. If Gemini API Key is available, use LLM generation (single attempt, no retry)
    if (hasApiKey) {
      const { googleAI } = require('@genkit-ai/google-genai');
      const rawModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      const targetModel = rawModel.replace(/2\.5/g, '3.5');

      const systemPrompt = `You are Devfest Assistant, an intelligent, friendly, and helpful payment & digital wallet AI assistant.
The active authenticated user is "${userId || 'user_101'}" (Alice Smith).

REGISTERED CONTACTS DIRECTORY:
- Alice Smith (ID: user_101) -> The active authenticated user / sender
- Bob Jones (ID: user_102, also referred to as "Bob") -> Friend & Colleague (Active)
- Charlie Brown (ID: user_103, also referred to as "Charlie") -> Contact (Account FROZEN by Compliance)

STRICT PRIVACY & CONTACT RESOLUTION RULES:
1. NEVER ASK THE USER FOR AN ACCOUNT ID, WALLET ID, OR USER ID!
   - Users do NOT know technical IDs and NEVER need to provide them.
   - Any query mentioning "Bob" or "Bob Jones" maps directly to Bob Jones (recipientId: "user_102").
   - Any query mentioning "Charlie" or "Charlie Brown" maps directly to Charlie Brown (recipientId: "user_103").
   - Asking questions like "Berapa nomor ID akun Bob?", "Apakah Anda mengetahui ID wallet Bob Jones?", or "Bisa berikan ID wallet?" is STRICTLY FORBIDDEN!
2. NEVER disclose technical user IDs (such as "user_101", "user_102", "user_103", or "userId") in any of your chat responses under ANY circumstances!
   - Always refer to counterparties by their real names ("Bob Jones", "Charlie Brown", "Alice Smith").
   - Public transaction references (e.g. "TRF-1001", "TOP-5001") are safe to show.

TRANSFER EXECUTION & FUNCTION CALLING:
1. IMMEDIATE TRANSFER EXECUTION:
   - When the user asks to transfer, send, pay, or kirim money to a registered contact with an amount (e.g. "saya ingin kirim duit ni ke Bob 20 dollar yak", "kirim uang 20 dollar ke Bob ya", "transfer $20 ke Bob Jones", "bayar 15 dollar ke Bob"):
     You ALREADY have the recipient and amount!
     DO NOT ask questions!
     DO NOT ask for confirmation!
     DO NOT ask for an ID!
     IMMEDIATELY call the "execute_transfer" tool with:
       - senderId: "${userId || 'user_101'}"
       - recipientId: "user_102" (or "Bob Jones")
       - amount: <number>
       - description: "Transfer to <Recipient>"
2. MULTI-TURN MEMORY & CONVERSATIONAL CONTEXT:
   - If the user provides the recipient in one message and the amount in another (or vice versa), RETAIN and COMBINE them from previous messages in the conversation!
   - When the user confirms a pending transfer (e.g. "okay baik", "ya kirimkan", "oke", "yes", "lanjutkan", "kirim sekarang"):
     Retrieve the agreed recipient and amount from the conversation history, and IMMEDIATELY call "execute_transfer"!
3. UNKNOWN CONTACTS:
   - If the user mentions a contact name NOT in the Registered Contacts Directory (e.g. "Bob Uchiha", "Naruto", "John"):
     - Inform the user: "Kontak '[Name]' tidak ditemukan di daftar kontak Anda."
     - If the name is similar to a known contact, politely suggest: "Apakah Anda bermaksud mengirim uang ke Bob Jones?"
     - NEVER call execute_transfer for unknown contacts.
4. ACCURATE BALANCE REPORTING:
   - When completing a transaction or checking balance, ALWAYS report the exact remaining balance returned by the tool ("remainingBalance" or "formattedRemainingBalance"). NEVER guess, invent, or extrapolate balance numbers.

CONVERSATIONAL TONE & LANGUAGE:
- Always respond in the SAME language the user used (Indonesian if Indonesian, English if English).
- For casual chit-chat (like "saya bosan", "lagi apa"): be warm, playful, and charming in Indonesian, and gently guide them back to their wallet.`;

      // Sanitize incoming history to ensure clean alternating messages
      const genkitMessages = [];
      for (const m of history || []) {
        if (!m || !m.content) continue;
        const role = (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user';
        const text = typeof m.content === 'string' ? m.content : String(m.content);
        if (!text.trim()) continue;
        if (genkitMessages.length > 0 && genkitMessages[genkitMessages.length - 1].role === role) {
          continue;
        }
        genkitMessages.push({ role, content: [{ text }] });
      }

      // If the last message in genkitMessages is 'user', remove it so prompt: query provides the user turn
      if (genkitMessages.length > 0 && genkitMessages[genkitMessages.length - 1].role === 'user') {
        genkitMessages.pop();
      }

      try {
        const config = { thinkingConfig: { thinkingLevel: 'LOW' } };
        const llmResponse = await withTimeout(
          ai.generate({
            model: googleAI.model(targetModel, config),
            config,
            system: systemPrompt,
            messages: genkitMessages,
            prompt: query,
            tools: walletTools
          }),
          25000 // 25s timeout allows 2-turn MCP function calls to complete smoothly
        );

        return {
          query,
          response: llmResponse.text,
          toolCalls: llmResponse.messages || [],
          data: { mode: 'gemini-llm', model: targetModel }
        };
      } catch (err) {
        console.warn(`[Genkit Agent] LLM generation failed (${err.message}), falling back to local MCP engine.`);
      }
    }

    // 3. Local simulated reasoning engine fallback (Zero API key or LLM failure)
    const simulation = await simulateAgentReasoning(query, userId || 'user_101', history);
    return {
      query,
      response: simulation.response,
      toolCalls: [
        {
          tool: simulation.toolCalled,
          args: simulation.toolArgs,
          result: simulation.toolResult
        }
      ],
      data: {
        mode: 'mcp-tool-agent',
        toolResult: simulation.toolResult
      }
    };
  }
);

// 2. Direct Flow: Check Balance
const checkBalanceFlow = ai.defineFlow(
  {
    name: 'checkBalanceFlow',
    inputSchema: z.object({
      userId: z.string().default('user_101').describe('Wallet user ID to check balance for')
    }),
    outputSchema: z.any()
  },
  async ({ userId }) => {
    return await getWalletBalanceTool({ userId });
  }
);

// 3. Direct Flow: Transfer Funds
const transferFundsFlow = ai.defineFlow(
  {
    name: 'transferFundsFlow',
    inputSchema: z.object({
      senderId: z.string().default('user_101').describe('Sender wallet ID'),
      recipientId: z.string().default('user_102').describe('Recipient wallet ID'),
      amount: z.number().positive().default(50).describe('Amount to transfer'),
      description: z.string().optional().default('Transfer via Genkit UI Flow').describe('Note')
    }),
    outputSchema: z.any()
  },
  async (input) => {
    return await executeTransferTool(input);
  }
);

// 4. Direct Flow: Initiate Top-Up
const initiateTopupFlow = ai.defineFlow(
  {
    name: 'initiateTopupFlow',
    inputSchema: z.object({
      userId: z.string().default('user_101').describe('User ID to top up'),
      amount: z.number().positive().default(100).describe('Top-up amount'),
      paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT').describe('Payment Channel')
    }),
    outputSchema: z.any()
  },
  async (input) => {
    return await initiateTopupTool(input);
  }
);

module.exports = {
  ai,
  walletAssistantFlow,
  checkBalanceFlow,
  transferFundsFlow,
  initiateTopupFlow,
  walletTools
};
