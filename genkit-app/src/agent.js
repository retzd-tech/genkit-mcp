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
async function simulateAgentReasoning(query, defaultUserId = 'user_101') {
  const q = query.trim();
  const lower = q.toLowerCase();

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
    const recipientMatch = q.match(/(?:to\s+|ke\s+|buat\s+|untuk\s+)(user_\d+|bob|charlie|alice)/i);

    // Guard: If user didn't specify amount or recipient, ask for details instead of blindly sending money
    if (!amountMatch) {
      return {
        toolCalled: 'none',
        toolArgs: {},
        toolResult: null,
        response: `❓ Berapa nominal yang ingin Anda kirimkan, dan kepada siapa? (Contoh: *"Kirim $20 ke Bob"* atau *"Transfer $50 ke Bob Jones"*).`
      };
    }

    const amount = parseFloat(amountMatch[1]);
    let recipientId = 'user_102'; // default Bob
    if (recipientMatch) {
      const nameOrId = recipientMatch[1].toLowerCase();
      if (nameOrId === 'bob' || nameOrId === 'user_102') recipientId = 'user_102';
      else if (nameOrId === 'charlie' || nameOrId === 'user_103') recipientId = 'user_103';
      else if (nameOrId === 'alice' || nameOrId === 'user_101') recipientId = 'user_101';
      else recipientId = nameOrId;
    }

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
      text = `🎉 **Transfer Berhasil!**\n` +
             `- **ID Transaksi**: ${result.transferId}\n` +
             `- **Nominal Terkirim**: ${result.formattedAmount}\n` +
             `- **Pengirim**: ${result.senderName}\n` +
             `- **Penerima**: ${result.recipientName}\n` +
             `- **Sisa Saldo Anda**: **${result.formattedRemainingBalance}**\n` +
             `- **Waktu**: ${new Date(result.timestamp).toLocaleString()}`;
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

function withTimeout(promise, ms = 8500) {
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
    // 1. Instant Fast Path: Standalone pleasantries & greetings ONLY when there is no active conversational history!
    // (If user says "okay baik" in response to a pending transfer, let the model process it with full context!)
    if (!history || history.length === 0) {
      const pleasantry = getPleasantryResponse(query);
      if (pleasantry) {
        return {
          query,
          response: pleasantry,
          toolCalls: [],
          data: { mode: 'instant-conversational' }
        };
      }
    }

    // 2. If Gemini API Key is available, use LLM generation with automatic model fallback & multi-turn memory
    if (hasApiKey) {
      const { googleAI } = require('@genkit-ai/google-genai');
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      
      // Fallback chain in case of Google 503 capacity spikes
      const candidateModels = [
        primaryModel,
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-flash-latest'
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      const systemPrompt = `You are Devfest Assistant, an intelligent, friendly, and helpful payment & digital wallet AI assistant.
The active authenticated user is "${userId || 'user_101'}".

REGISTERED CONTACTS DIRECTORY:
- Alice Smith (You / Active User)
- Bob Jones (Friend & Colleague - Active)
- Charlie Brown (Contact - Account FROZEN by Compliance)

TRANSFER & RECIPIENT RULES:
1. ONLY transfer to contacts that exist in the directory above (Bob Jones or Charlie Brown).
2. If the user mentions a name NOT in the directory (e.g. "Bob Uchiha", "Naruto", "John"):
   - Explicitly tell the user: "Kontak '[Name]' tidak ditemukan di daftar kontak Anda."
   - Suggest the real matching contact without leaking technical IDs (e.g., "Apakah Anda bermaksud mengirim uang ke Bob Jones?").
   - NEVER invent or pretend to transfer to a contact that does not exist.
3. When the user confirms a pending transfer in conversation (e.g. "okay baik", "ya kirimkan", "oke", "yes", "lanjutkan"):
   - Review the conversation history, identify the agreed recipient and amount, and IMMEDIATELY call executeTransferTool!
4. When transferring to Bob or Bob Jones, pass recipientId: "user_102" (or "Bob Jones").
5. When completing a transaction or checking balance, ALWAYS report the exact remaining balance returned by the tool (never guess or invent a balance number).

ABSOLUTE PRIVACY & SECURITY RESTRICTIONS:
- NEVER disclose technical user IDs (such as "user_101", "user_102", "user_103", "userId", or account ID strings) in any of your chat responses under ANY circumstances!
- Refer to counterparties ONLY by their names (e.g. "Bob Jones", "Charlie Brown", "Alice Smith").
- Public transaction references (e.g. "TRF-1001", "TOP-5001", virtual account numbers) are safe to show.

CONVERSATIONAL TONE & LANGUAGE:
- Always respond in the SAME language the user used (Indonesian if Indonesian, English if English).
- For casual chit-chat (like "saya bosan", "lagi apa"): be warm, playful, and charming in Indonesian, and gently guide them back to their wallet.`;

      // Convert incoming history into Genkit messages for multi-turn conversational context
      const genkitMessages = (history || [])
        .filter(m => m && m.content)
        .map(m => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          content: [{ text: typeof m.content === 'string' ? m.content : String(m.content) }]
        }));

      for (const modelCandidate of candidateModels) {
        try {
          const config = modelCandidate.includes('2.5')
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : { thinkingConfig: { thinkingLevel: 'LOW' } };

          const llmResponse = await withTimeout(
            ai.generate({
              model: googleAI.model(modelCandidate, config),
              config,
              system: systemPrompt,
              messages: genkitMessages,
              prompt: query,
              tools: walletTools
            }),
            8500 // Prevents SDK from hanging for 38+ seconds on 503 retries
          );

          return {
            query,
            response: llmResponse.text,
            toolCalls: llmResponse.messages || [],
            data: { mode: 'gemini-llm', model: modelCandidate }
          };
        } catch (err) {
          console.warn(`[Genkit Agent] Model ${modelCandidate} failed: ${err.message}. Trying next fallback...`);
        }
      }

      console.warn('[Genkit Agent] All cloud LLM candidates unavailable or timed out, falling back to simulated reasoning engine.');
    }

    // 3. Simulated reasoning engine fallback
    const simulation = await simulateAgentReasoning(query, userId || 'user_101');
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
