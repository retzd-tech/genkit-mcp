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

/**
 * Intelligent pattern matcher for offline / zero-API-key demonstration mode.
 * Identifies intent and parameters from user's natural language question.
 */
async function simulateAgentReasoning(query, defaultUserId = 'user_101') {
  const q = query.trim();
  const lower = q.toLowerCase();

  // 1. Transfer Status check: "check transfer status TRF-1002" or "status of TRF-1001" or "REF-TRF-001"
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
      if (result.paymentInstructions.virtualAccountNumber) {
        text += `- **Virtual Account Number**: \`${result.paymentInstructions.virtualAccountNumber}\` (${result.paymentInstructions.bank})\n` +
                `- **Valid until**: ${new Date(result.paymentInstructions.expiryTime).toLocaleString()}`;
      } else if (result.paymentInstructions.checkoutUrl) {
        text += `- **Payment Link**: ${result.paymentInstructions.checkoutUrl}`;
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

  // 4. Do Transfer: ONLY when explicit action intent ("transfer $50 to Bob", "send 30 to user_102")
  if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay')) {
    const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    const recipientMatch = q.match(/(?:to\s+)(user_\d+|bob|charlie|alice)/i);

    // Guard: If user didn't specify amount or recipient, ask for details instead of blindly sending money
    if (!amountMatch) {
      return {
        toolCalled: 'none',
        toolArgs: {},
        toolResult: null,
        response: `❓ How much would you like to transfer, and to whom? Please specify the amount and recipient (e.g., *"Transfer $50 to Bob"* or *"Send $30 to user_102"*).`
      };
    }

    const amount = parseFloat(amountMatch[1]);
    let recipientId = 'user_102'; // default Bob if specified
    if (recipientMatch) {
      const nameOrId = recipientMatch[1].toLowerCase();
      if (nameOrId === 'bob' || nameOrId === 'user_102') recipientId = 'user_102';
      else if (nameOrId === 'charlie' || nameOrId === 'user_103') recipientId = 'user_103';
      else if (nameOrId === 'alice' || nameOrId === 'user_101') recipientId = 'user_101';
      else recipientId = nameOrId;
    }

    const senderMatch = q.match(/(?:from\s+)(user_\d+)/i);
    const senderId = senderMatch ? senderMatch[1] : defaultUserId;

    const result = await executeTransferTool({
      senderId,
      recipientId,
      amount,
      description: `Transfer initiated via Genkit Assistant: "${q}"`
    });

    let text = '';
    if (result.success) {
      text = `🎉 **Transfer Successful!**\n` +
             `- **Transaction ID**: ${result.transferId}\n` +
             `- **Amount Sent**: ${result.formattedAmount}\n` +
             `- **From**: ${result.senderName}\n` +
             `- **To**: ${result.recipientName}\n` +
             `- **Your Remaining Balance**: **${result.formattedRemainingBalance}**\n` +
             `- **Timestamp**: ${new Date(result.timestamp).toLocaleString()}`;
    } else {
      text = `❌ **Transfer Failed**: ${result.error}`;
    }

    return {
      toolCalled: 'execute_transfer',
      toolArgs: { senderId, recipientId, amount },
      toolResult: result,
      response: text
    };
  }

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
