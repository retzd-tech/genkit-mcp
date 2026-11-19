const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/wallet-db.json');
const SEED_FILE = path.join(__dirname, '../data/seed.json');

class WalletDatabase {
  constructor() {
    this.data = this.loadData();
  }

  resetData() {
    try {
      if (fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.saveData();
        return true;
      }
    } catch (err) {
      console.error('[DB] Failed to reset data from seed:', err.message);
    }
    return false;
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[DB] Failed to load data file, initializing empty store:', err.message);
    }
    return { wallets: {}, transfers: [], topups: [] };
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist data:', err.message);
    }
  }

  // 1. Get Wallet
  getWallet(userId) {
    this.data = this.loadData();
    const wallet = this.data.wallets[userId];
    if (!wallet) return null;
    return { ...wallet };
  }

  listWallets() {
    this.data = this.loadData();
    return Object.values(this.data.wallets);
  }

  // 2. Transfer Funds
  executeTransfer({ senderId, recipientId, amount, description = 'Wallet Transfer' }) {
    this.data = this.loadData();
    if (!senderId || !recipientId) {
      throw new Error('Both senderId and recipientId are required.');
    }
    if (senderId === recipientId) {
      throw new Error('Cannot transfer funds to the same wallet account.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Transfer amount must be a positive number.');
    }

    const sender = this.data.wallets[senderId];
    if (!sender) {
      throw new Error(`Sender wallet '${senderId}' does not exist.`);
    }
    if (sender.status !== 'ACTIVE') {
      throw new Error(`Sender wallet is ${sender.status}. Cannot perform transactions.`);
    }

    const recipient = this.data.wallets[recipientId];
    if (!recipient) {
      throw new Error(`Recipient wallet '${recipientId}' does not exist.`);
    }
    if (recipient.status !== 'ACTIVE') {
      throw new Error(`Recipient wallet is ${recipient.status}. Cannot receive funds.`);
    }

    if (sender.balance < amount) {
      throw new Error(`Insufficient funds. Available: $${sender.balance.toFixed(2)}, Requested: $${amount.toFixed(2)}.`);
    }

    // Debit sender & Credit recipient
    sender.balance = parseFloat((sender.balance - amount).toFixed(2));
    recipient.balance = parseFloat((recipient.balance + amount).toFixed(2));

    const transferId = `TRF-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const referenceId = `REF-TRF-${Date.now().toString().slice(-6)}`;

    const transferRecord = {
      transferId,
      referenceId,
      senderId,
      senderName: sender.name,
      recipientId,
      recipientName: recipient.name,
      amount: parseFloat(amount.toFixed(2)),
      currency: sender.currency,
      status: 'COMPLETED',
      description,
      timestamp: new Date().toISOString(),
      fee: 0.00
    };

    this.data.transfers.unshift(transferRecord);
    this.saveData();

    return {
      success: true,
      transfer: transferRecord,
      remainingBalance: sender.balance
    };
  }

  // 3. Check Transfer Status
  getTransferStatus(transferOrRefId) {
    this.data = this.loadData();
    if (!transferOrRefId) {
      throw new Error('Transfer ID or Reference ID is required.');
    }
    const transfer = this.data.transfers.find(
      (t) => t.transferId.toLowerCase() === transferOrRefId.toLowerCase() ||
             t.referenceId.toLowerCase() === transferOrRefId.toLowerCase()
    );
    return transfer || null;
  }

  // 4. Initiate Top-up
  initiateTopup({ userId, amount, paymentMethod = 'VIRTUAL_ACCOUNT' }) {
    this.data = this.loadData();
    if (!userId) {
      throw new Error('User ID is required.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Top-up amount must be a positive number.');
    }

    const wallet = this.data.wallets[userId];
    if (!wallet) {
      throw new Error(`Wallet for user '${userId}' not found.`);
    }
    if (wallet.status !== 'ACTIVE') {
      throw new Error(`Wallet is ${wallet.status}. Cannot perform top-up.`);
    }

    const validMethods = ['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER'];
    const normalizedMethod = paymentMethod.toUpperCase();
    if (!validMethods.includes(normalizedMethod)) {
      throw new Error(`Invalid payment method '${paymentMethod}'. Allowed: ${validMethods.join(', ')}.`);
    }

    const topupId = `TOP-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const referenceId = `REF-TOP-${Date.now().toString().slice(-6)}`;

    let details = {};
    if (normalizedMethod === 'VIRTUAL_ACCOUNT') {
      details = {
        virtualAccountNumber: `8801${Math.floor(1000000 + Math.random() * 9000000)}`,
        bank: 'Chase Bank / Partner Network',
        expiryTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      };
    } else if (normalizedMethod === 'CREDIT_CARD') {
      details = {
        checkoutUrl: `https://pay.example.com/checkout/${topupId}`,
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
    } else {
      details = {
        bankName: 'City Central Bank',
        bankAccountNumber: '1092837465',
        accountName: 'Digital Wallet Escrow'
      };
    }

    const topupRecord = {
      topupId,
      referenceId,
      userId,
      userName: wallet.name,
      amount: parseFloat(amount.toFixed(2)),
      currency: wallet.currency,
      paymentMethod: normalizedMethod,
      status: 'PENDING',
      ...details,
      timestamp: new Date().toISOString()
    };

    this.data.topups.unshift(topupRecord);
    this.saveData();

    return topupRecord;
  }

  // 5. Check Top-up Status
  getTopupStatus(topupOrRefId) {
    this.data = this.loadData();
    if (!topupOrRefId) {
      throw new Error('Top-up ID or Reference ID is required.');
    }
    const topup = this.data.topups.find(
      (t) => t.topupId.toLowerCase() === topupOrRefId.toLowerCase() ||
             t.referenceId.toLowerCase() === topupOrRefId.toLowerCase()
    );
    return topup || null;
  }

  // 6. Complete Pending Top-up (Simulation Helper)
  completeTopup(topupId) {
    this.data = this.loadData();
    const query = (topupId || '').trim().toLowerCase();
    const topup = this.data.topups.find(
      (t) => t.topupId.toLowerCase() === query ||
             t.referenceId.toLowerCase() === query
    );
    if (!topup) throw new Error(`Top-up '${topupId}' not found.`);
    if (topup.status === 'SUCCESS') return topup;

    topup.status = 'SUCCESS';
    topup.completedAt = new Date().toISOString();

    const wallet = this.data.wallets[topup.userId];
    if (wallet) {
      wallet.balance = parseFloat((wallet.balance + topup.amount).toFixed(2));
    }
    this.saveData();
    return topup;
  }

  // 7. Transaction History
  getTransactionHistory(userId, limit = 10) {
    this.data = this.loadData();
    const wallet = this.data.wallets[userId];
    if (!wallet) {
      throw new Error(`Wallet for user '${userId}' not found.`);
    }

    const userTransfers = this.data.transfers
      .filter((t) => t.senderId === userId || t.recipientId === userId)
      .map((t) => ({
        type: t.senderId === userId ? 'TRANSFER_OUT' : 'TRANSFER_IN',
        id: t.transferId,
        referenceId: t.referenceId,
        counterparty: t.senderId === userId ? t.recipientName : t.senderName,
        counterpartyId: t.senderId === userId ? t.recipientId : t.senderId,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        timestamp: t.timestamp
      }));

    const userTopups = this.data.topups
      .filter((tp) => tp.userId === userId)
      .map((tp) => ({
        type: 'TOPUP',
        id: tp.topupId,
        referenceId: tp.referenceId,
        counterparty: tp.paymentMethod,
        counterpartyId: null,
        amount: tp.amount,
        currency: tp.currency,
        status: tp.status,
        description: `Top-up via ${tp.paymentMethod}`,
        timestamp: tp.timestamp
      }));

    const combined = [...userTransfers, ...userTopups].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return combined.slice(0, limit);
  }
}

const db = new WalletDatabase();
module.exports = { db, WalletDatabase };
