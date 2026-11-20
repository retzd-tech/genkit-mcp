const { z } = require('genkit');
const { apiClient } = require('../../backend/src/client');

// Shared schemas
const GetWalletBalanceInput = z.object({
  userId: z.string().describe('The unique identifier of the user/wallet (e.g., user_101, user_102)')
});

const CheckTransferStatusInput = z.object({
  transferId: z.string().describe('The transfer ID (e.g. TRF-1001) or reference ID (e.g. REF-TRF-001) to check')
});

const CheckTopupStatusInput = z.object({
  topupId: z.string().describe('The top-up ID (e.g. TOP-5001) or reference ID (e.g. REF-TOP-001) to check')
});

const ExecuteTransferInput = z.object({
  senderId: z.string().describe('The wallet ID of the user sending the money (e.g. user_101)'),
  recipientId: z.string().describe('The wallet ID of the recipient receiving the money (e.g. user_102)'),
  amount: z.number().positive().describe('The amount of money to transfer (must be greater than 0)'),
  description: z.string().optional().describe('Optional note or description for the transfer')
});

const InitiateTopupInput = z.object({
  userId: z.string().describe('The wallet user ID to be credited (e.g. user_101)'),
  amount: z.number().positive().describe('The amount to top up into the wallet'),
  paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT').describe('Preferred payment channel')
});

const GetTransactionHistoryInput = z.object({
  userId: z.string().describe('The wallet user ID whose history is being requested'),
  limit: z.number().min(1).max(50).default(10).optional().describe('Maximum number of recent transactions to return')
});

// Tool Handlers
const handlers = {
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
      return {
        success: false,
        error: err.message
      };
    }
  },

  async checkTransferStatus(args = {}) {
    const { transferId } = args || {};
    if (!transferId) {
      return { success: false, error: 'transferId is required (e.g. TRF-1001)' };
    }
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
      return {
        success: false,
        error: err.message
      };
    }
  },

  async checkTopupStatus(args = {}) {
    const { topupId } = args || {};
    if (!topupId) {
      return { success: false, error: 'topupId is required (e.g. TOP-5001)' };
    }
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
      return {
        success: false,
        error: err.message
      };
    }
  },

  async executeTransfer(args = {}) {
    const { senderId, recipientId, amount, description } = args || {};
    if (!senderId || !recipientId || amount === undefined) {
      return { success: false, error: 'senderId, recipientId, and amount are required.' };
    }
    try {
      const result = await apiClient.executeTransfer({
        senderId,
        recipientId,
        amount: Number(amount),
        description: description || 'Transfer via AI Wallet Agent'
      });
      return {
        success: true,
        message: 'Fund transfer completed successfully',
        transferId: result.transfer.transferId,
        referenceId: result.transfer.referenceId,
        senderId: result.transfer.senderId,
        senderName: result.transfer.senderName,
        recipientId: result.transfer.recipientId,
        recipientName: result.transfer.recipientName,
        amount: result.transfer.amount,
        currency: result.transfer.currency,
        formattedAmount: `$${result.transfer.amount.toFixed(2)} ${result.transfer.currency}`,
        status: result.transfer.status,
        remainingSenderBalance: result.remainingBalance,
        formattedRemainingBalance: `$${result.remainingBalance.toFixed(2)} ${result.transfer.currency}`,
        timestamp: result.transfer.timestamp
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  },

  async initiateTopup(args = {}) {
    const { userId, amount, paymentMethod } = args || {};
    if (!userId || amount === undefined) {
      return { success: false, error: 'userId and amount are required.' };
    }
    try {
      const topup = await apiClient.initiateTopup({
        userId,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'VIRTUAL_ACCOUNT'
      });
      return {
        success: true,
        message: 'Top-up initiated successfully. Please complete payment using instructions below.',
        topupId: topup.topupId,
        referenceId: topup.referenceId,
        userId: topup.userId,
        amount: topup.amount,
        currency: topup.currency,
        formattedAmount: `$${topup.amount.toFixed(2)} ${topup.currency}`,
        paymentMethod: topup.paymentMethod,
        status: topup.status,
        paymentInstructions: {
          virtualAccountNumber: topup.virtualAccountNumber,
          bank: topup.bank,
          checkoutUrl: topup.checkoutUrl,
          expiryTime: topup.expiryTime
        },
        timestamp: topup.timestamp
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  },

  async getTransactionHistory(args = {}) {
    const { userId = 'user_101', limit = 10 } = args || {};
    try {
      const history = await apiClient.getTransactionHistory(userId, limit);
      return {
        success: true,
        userId,
        count: history.length,
        transactions: history.map((tx) => ({
          id: tx.id,
          referenceId: tx.referenceId,
          type: tx.type,
          counterparty: tx.counterparty,
          amount: tx.amount,
          currency: tx.currency,
          formattedAmount: `${tx.type === 'TRANSFER_OUT' ? '-' : '+'}$${tx.amount.toFixed(2)} ${tx.currency}`,
          status: tx.status,
          description: tx.description,
          timestamp: tx.timestamp
        }))
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
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
  handlers
};
