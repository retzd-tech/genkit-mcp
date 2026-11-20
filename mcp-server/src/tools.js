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
const CheckTransferStatusInput = z.object({
  // TODO: Add transferId field here
  transferId: z.string().describe('The transfer ID (e.g. TRF-1001) or reference ID (e.g. REF-TRF-001) to check')
});

// TODO [Exercise 1.3]: Define CheckTopupStatusInput schema
// Requirements:
// - topupId: z.string() with description (e.g. TOP-5001 or REF-TOP-001)
const CheckTopupStatusInput = z.object({
  // TODO: Add topupId field here
  topupId: z.string().describe('The top-up ID (e.g. TOP-5001) or reference ID (e.g. REF-TOP-001) to check')
});

// TODO [Exercise 1.4]: Define ExecuteTransferInput schema
// Requirements:
// - senderId: z.string()
// - recipientId: z.string()
// - amount: z.number().positive()
// - description: z.string().optional()
const ExecuteTransferInput = z.object({
  // TODO: Add fields here (refer to WORKSHOP_GUIDE.md Exercise 1.2)
  senderId: z.string().optional().default('user_101').describe('The wallet ID or name of the sender (defaults to active user user_101)'),
  recipientId: z.string().describe('The recipient ID or contact name (e.g. user_102, Bob, Bob Jones, Charlie Brown). You can pass the contact name directly.'),
  amount: z.number().positive().describe('The amount of money to transfer (must be greater than 0)'),
  description: z.string().optional().describe('Optional note or description for the transfer')
});

// TODO [Exercise 1.5]: Define InitiateTopupInput schema
// Requirements:
// - userId: z.string()
// - amount: z.number().positive()
// - paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT')
const InitiateTopupInput = z.object({
  // TODO: Add fields here (refer to WORKSHOP_GUIDE.md Exercise 1.2)
  userId: z.string().describe('The wallet user ID to be credited (e.g. user_101)'),
  amount: z.number().positive().describe('The amount to top up into the wallet'),
  paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT').describe('Preferred payment channel')
});

// TODO [Exercise 1.6]: Define GetTransactionHistoryInput schema
// Requirements:
// - userId: z.string()
// - limit: z.number().min(1).max(50).default(10).optional()
const GetTransactionHistoryInput = z.object({
  // TODO: Add fields here (refer to WORKSHOP_GUIDE.md Exercise 1.2)
  userId: z.string().describe('The wallet user ID whose history is being requested'),
  limit: z.number().min(1).max(50).default(10).optional().describe('Maximum number of recent transactions to return')
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
  async checkTransferStatus(args = {}) {
    const { transferId } = args || {};
    if (!transferId) return { success: false, error: 'transferId is required' };
    try {
      const transfer = await apiClient.getTransferStatus(transferId);
      return {
        success: true,
        transferId: transfer.transferId,
        referenceId: transfer.referenceId,
        status: transfer.status,
        sender: transfer.senderName,
        recipient: transfer.recipientName,
        amount: transfer.amount,
        currency: transfer.currency,
        formattedAmount: `$${transfer.amount.toFixed(2)} ${transfer.currency}`,
        description: transfer.description,
        timestamp: transfer.timestamp,
        failureReason: transfer.failureReason || null
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // TODO [Exercise 1.9]: Implement checkTopupStatus
  async checkTopupStatus(args = {}) {
    const { topupId } = args || {};
    if (!topupId) return { success: false, error: 'topupId is required' };
    try {
      const topup = await apiClient.getTopupStatus(topupId);
      return {
        success: true,
        topupId: topup.topupId,
        referenceId: topup.referenceId,
        userId: topup.userId,
        userName: topup.userName,
        amount: topup.amount,
        currency: topup.currency,
        formattedAmount: `$${topup.amount.toFixed(2)} ${topup.currency}`,
        paymentMethod: topup.paymentMethod,
        status: topup.status,
        statusDetail: topup.statusDetail || (topup.status === 'SUCCESS' ? 'Funds successfully credited' : 'Pending payment confirmation'),
        virtualAccountNumber: topup.virtualAccountNumber || null,
        bank: topup.bank || null,
        timestamp: topup.timestamp
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // TODO [Exercise 1.10]: Implement executeTransfer
  async executeTransfer(args = {}) {
    const { senderId = 'user_101', recipientId, amount, description } = args || {};
    if (!recipientId || !amount) {
      return { success: false, error: 'recipientId and positive amount are required' };
    }
    try {
      const res = await apiClient.executeTransfer({ senderId, recipientId, amount, description });
      const transfer = res.transfer || res;
      const remainingBalance = res.remainingBalance !== undefined ? res.remainingBalance : transfer.remainingBalance;
      return {
        success: true,
        transferId: transfer.transferId,
        referenceId: transfer.referenceId,
        senderId: transfer.senderId,
        senderName: transfer.senderName,
        recipientId: transfer.recipientId,
        recipientName: transfer.recipientName,
        amount: transfer.amount,
        currency: transfer.currency,
        formattedAmount: `$${transfer.amount.toFixed(2)} ${transfer.currency}`,
        remainingBalance: remainingBalance,
        formattedRemainingBalance: remainingBalance !== undefined ? `$${remainingBalance.toFixed(2)} ${transfer.currency}` : undefined,
        timestamp: transfer.timestamp
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // TODO [Exercise 1.11]: Implement initiateTopup
  async initiateTopup(args = {}) {
    const { userId, amount, paymentMethod } = args || {};
    if (!userId || !amount) {
      return { success: false, error: 'userId and positive amount are required' };
    }
    try {
      const topup = await apiClient.initiateTopup({ userId, amount, paymentMethod });
      const instructions = topup.paymentInstructions || {
        virtualAccountNumber: topup.virtualAccountNumber,
        bank: topup.bank,
        expiryTime: topup.expiryTime,
        checkoutUrl: topup.checkoutUrl,
        bankName: topup.bankName,
        bankAccountNumber: topup.bankAccountNumber,
        accountName: topup.accountName
      };
      return {
        success: true,
        topupId: topup.topupId,
        referenceId: topup.referenceId,
        userId: topup.userId,
        amount: topup.amount,
        currency: topup.currency,
        formattedAmount: `$${topup.amount.toFixed(2)} ${topup.currency}`,
        paymentMethod: topup.paymentMethod,
        status: topup.status,
        paymentInstructions: instructions,
        virtualAccountNumber: topup.virtualAccountNumber || instructions.virtualAccountNumber || null,
        bank: topup.bank || instructions.bank || null,
        expiryTime: topup.expiryTime || instructions.expiryTime || null,
        checkoutUrl: topup.checkoutUrl || instructions.checkoutUrl || null,
        timestamp: topup.timestamp
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // TODO [Exercise 1.12]: Implement getTransactionHistory
  async getTransactionHistory(args = {}) {
    const { userId = 'user_101', limit = 10 } = args || {};
    try {
      const transactions = await apiClient.getTransactions(userId, limit);
      return {
        success: true,
        userId,
        count: transactions.length,
        transactions: transactions.map((tx) => ({
          id: tx.id,
          referenceId: tx.referenceId,
          type: tx.type,
          counterparty: tx.counterparty,
          amount: tx.amount,
          currency: tx.currency,
          formattedAmount: `${tx.amount < 0 ? '-' : '+'}$${Math.abs(tx.amount).toFixed(2)} ${tx.currency}`,
          status: tx.status,
          description: tx.description,
          timestamp: tx.timestamp
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
