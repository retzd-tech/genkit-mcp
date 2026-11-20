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

  // [Reference Example 4.2]: Intent Branch 1 — Check Transfer Status
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

  // TODO [Exercise 4.3]: Intent Branch 2 — Check & Initiate Top-Up
  // Requirements:
  // - Check status if prompt has "status" or "what is happening" or matches /\b(TOP-\d+|REF-TOP-\d+)\b/i
  // - Initiate top-up if prompt has "top up $X using virtual account"
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4.3)

  // TODO [Exercise 4.4]: Intent Branch 3 — Inquire Transaction History & Statement
  // Requirements:
  // - Check if prompt includes 'history', 'transactions', 'statement', 'latest'
  // - Query getTransactionHistoryTool({ userId, limit: 10 })
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4.4)

  // TODO [Exercise 4.5]: Intent Branch 4 — Money Transfer Execution with Guardrail
  // Requirements:
  // - Check if prompt includes 'transfer', 'send', 'pay'
  // - 🛡️ Guardrail: if no amount specified, prompt user for details!
  // - Parse amount and recipient, call executeTransferTool
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4.5)

  // [Reference Example 4.6]: Intent Branch 5 — Balance Inquiry Fallback
  const userMatch = q.match(/user_\d+/i);
  const userId = userMatch ? userMatch[0] : defaultUserId;
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
