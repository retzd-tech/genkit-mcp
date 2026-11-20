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

  // TODO [Exercise 4.2 - Branch 2]: Top-up Status check & Initiate Top-up
  // Hint:
  // - Check status if prompt has "status" or "what is happening" or matches /\b(TOP-\d+|REF-TOP-\d+)\b/i
  // - Initiate top-up if prompt has "top up $X using virtual account"
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4)

  // TODO [Exercise 4.2 - Branch 3]: Inquire History or Latest Transfer
  // Hint:
  // - Check if prompt includes 'history', 'transactions', 'statement', 'latest'
  // - Query getTransactionHistoryTool({ userId, limit: 10 })
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4)

  // TODO [Exercise 4.2 - Branch 4]: Execute Money Transfer
  // Hint:
  // - Check if prompt includes 'transfer', 'send', 'pay'
  // - Guard: if no amount specified, prompt user for details!
  // - Parse amount and recipient, call executeTransferTool
  // YOUR CODE HERE (refer to HANDS_ON_WORKSHOP.md Exercise 4)

  // 5. Balance Inquiry: default
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

// Define Genkit Flow for Wallet Assistant
const walletAssistantFlow = ai.defineFlow(
  {
    name: 'walletAssistantFlow',
    inputSchema: z.object({
      query: z.string().describe('The user inquiry or command regarding their wallet or payment'),
      userId: z.string().optional().default('user_101').describe('Default user ID of the authenticated user')
    }),
    outputSchema: z.object({
      query: z.string(),
      response: z.string(),
      toolCalls: z.array(z.any()),
      data: z.any()
    })
  },
  async ({ query, userId }) => {
    // If Gemini API Key is available, use LLM generation with tools
    if (hasApiKey) {
      try {
        const { googleAI } = require('@genkit-ai/google-genai');
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash-lite';
        const llmResponse = await ai.generate({
          model: googleAI.model(modelName),
          prompt: `You are an intelligent, helpful payment & digital wallet assistant.
The active authenticated user is "${userId || 'user_101'}".
Use the available tools to inspect balance, check transfer status, check top-up status, execute fund transfers, initiate top-ups, or get transaction history.
Always provide clear, secure, and professional banking responses in the user's language.

PRIVACY & SECURITY RULES:
- Never disclose internal technical user IDs (such as "user_101", "user_102") in chat responses.
- Address the user naturally by their name (e.g. Alice or Alice Smith) or simply say "your account" / "your balance".
- Refer to counterparties by their names (e.g. Bob Jones).
- Public transaction references (e.g. "TRF-1001", "TOP-5001", virtual account numbers) are safe to show.

User Query: ${query}`,
          tools: walletTools
        });

        return {
          query,
          response: llmResponse.text,
          toolCalls: llmResponse.messages || [],
          data: { mode: 'gemini-llm' }
        };
      } catch (err) {
        console.warn('[Genkit Agent] LLM generation error, falling back to simulated reasoning engine:', err.message);
      }
    }

    // Default fast & reliable reasoning engine
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
