const { z } = require('genkit');
const { apiClient } = require('../../backend/src/client');

// ============================================================================
// WORKSHOP EXERCISE 1: Tool Input Schemas (Zod)
// ============================================================================

// [Reference Example 1.1]: Balance Schema
const GetWalletBalanceInput = z.object({
  userId: z.string().describe('The unique identifier of the user/wallet (e.g., user_101, user_102)')
});

// TODO [Exercise 1.2]: Define CheckTransferStatusInput schema
// Requirements:
// - transferId: z.string() with description (e.g. TRF-1001 or REF-TRF-001)
// Hint: z.string().describe('The transfer ID (e.g. TRF-1001) or reference ID to check')
const CheckTransferStatusInput = z.object({
  // YOUR CODE HERE: Add transferId field
});

// TODO [Exercise 1.3]: Define CheckTopupStatusInput schema
// Requirements:
// - topupId: z.string() with description (e.g. TOP-5001 or REF-TOP-001)
// Hint: z.string().describe('The top-up ID (e.g. TOP-5001) or reference ID to check')
const CheckTopupStatusInput = z.object({
  // YOUR CODE HERE: Add topupId field
});

// TODO [Exercise 1.4]: Define ExecuteTransferInput schema
// Requirements:
// - senderId: z.string() (e.g. user_101)
// - recipientId: z.string() (e.g. user_102)
// - amount: z.number().positive()
// - description: z.string().optional()
const ExecuteTransferInput = z.object({
  // YOUR CODE HERE: Add senderId, recipientId, amount, description fields
});

// TODO [Exercise 1.5]: Define InitiateTopupInput schema
// Requirements:
// - userId: z.string()
// - amount: z.number().positive()
// - paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT')
const InitiateTopupInput = z.object({
  // YOUR CODE HERE: Add userId, amount, paymentMethod fields
});

// TODO [Exercise 1.6]: Define GetTransactionHistoryInput schema
// Requirements:
// - userId: z.string()
// - limit: z.number().min(1).max(50).default(10).optional()
const GetTransactionHistoryInput = z.object({
  // YOUR CODE HERE: Add userId and limit fields
});

// ============================================================================
// WORKSHOP EXERCISE 1 (Continued): Tool Execution Handlers
// ============================================================================

const handlers = {
  // [Reference Example 1.7]: getWalletBalance handler
  async getWalletBalance(args = {}) {
    const { userId = 'user_101' } = args || {};
    try {
      const wallet = await apiClient.getWallet(userId);
      return {
        success: true,
        userId: wallet.userId,
        accountHolder: wallet.name,
        email: wallet.email,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: `$${wallet.balance.toFixed(2)} ${wallet.currency}`,
        status: wallet.status,
        tier: wallet.tier,
        dailyLimit: wallet.dailyLimit
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // TODO [Exercise 1.8]: Implement checkTransferStatus
  // Requirements:
  // 1. Validate transferId
  // 2. Call await apiClient.getTransferStatus(transferId)
  // 3. Return object with transferId, status, sender (senderName), recipient (recipientName), amount, etc.
  async checkTransferStatus(args = {}) {
    const { transferId } = args || {};
    if (!transferId) return { success: false, error: 'transferId is required' };
    
    // YOUR CODE HERE:
    // const transfer = await apiClient.getTransferStatus(transferId);
    // return { success: true, ... };
    throw new Error('checkTransferStatus handler is not yet implemented. Complete Exercise 1.8 in mcp-server/src/tools.js!');
  },

  // TODO [Exercise 1.9]: Implement checkTopupStatus
  // Requirements:
  // 1. Validate topupId
  // 2. Call await apiClient.getTopupStatus(topupId)
  // 3. Return object with topupId, amount, status, paymentMethod, virtualAccountNumber, etc.
  async checkTopupStatus(args = {}) {
    const { topupId } = args || {};
    if (!topupId) return { success: false, error: 'topupId is required' };

    // YOUR CODE HERE:
    // const topup = await apiClient.getTopupStatus(topupId);
    // return { success: true, ... };
    throw new Error('checkTopupStatus handler is not yet implemented. Complete Exercise 1.9 in mcp-server/src/tools.js!');
  },

  // TODO [Exercise 1.10]: Implement executeTransfer
  // Requirements:
  // 1. Validate senderId, recipientId, amount
  // 2. Call await apiClient.executeTransfer({ senderId, recipientId, amount, description })
  // 3. Return transfer details, formattedAmount, remainingBalance, etc.
  async executeTransfer(args = {}) {
    const { senderId, recipientId, amount, description } = args || {};
    if (!senderId || !recipientId || !amount) {
      return { success: false, error: 'senderId, recipientId, and positive amount are required' };
    }

    // YOUR CODE HERE:
    // const res = await apiClient.executeTransfer({ senderId, recipientId, amount, description });
    // return { success: true, ... };
    throw new Error('executeTransfer handler is not yet implemented. Complete Exercise 1.10 in mcp-server/src/tools.js!');
  },

  // TODO [Exercise 1.11]: Implement initiateTopup
  // Requirements:
  // 1. Validate userId, amount
  // 2. Call await apiClient.initiateTopup({ userId, amount, paymentMethod })
  // 3. Return paymentInstructions, virtualAccountNumber, etc.
  async initiateTopup(args = {}) {
    const { userId, amount, paymentMethod } = args || {};
    if (!userId || !amount) {
      return { success: false, error: 'userId and positive amount are required' };
    }

    // YOUR CODE HERE:
    // const topup = await apiClient.initiateTopup({ userId, amount, paymentMethod });
    // return { success: true, ... };
    throw new Error('initiateTopup handler is not yet implemented. Complete Exercise 1.11 in mcp-server/src/tools.js!');
  },

  // TODO [Exercise 1.12]: Implement getTransactionHistory
  // Requirements:
  // 1. Call await apiClient.getTransactionHistory(userId, limit)
  // 2. Return list of formatted transactions with directional signs (+ / -)
  async getTransactionHistory(args = {}) {
    const { userId = 'user_101', limit = 10 } = args || {};

    // YOUR CODE HERE:
    // const transactions = await apiClient.getTransactionHistory(userId, limit);
    // return { success: true, transactions: ... };
    throw new Error('getTransactionHistory handler is not yet implemented. Complete Exercise 1.12 in mcp-server/src/tools.js!');
  }
};

module.exports = {
  GetWalletBalanceInput,
  CheckTransferStatusInput,
  CheckTopupStatusInput,
  ExecuteTransferInput,
  InitiateTopupInput,
  GetTransactionHistoryInput,
  schemas: {
    GetWalletBalanceInput,
    CheckTransferStatusInput,
    CheckTopupStatusInput,
    ExecuteTransferInput,
    InitiateTopupInput,
    GetTransactionHistoryInput
  },
  handlers
};
