const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const express = require('express');
const path = require('path');
const { db } = require('./db');

const app = express();
app.use(express.json());

// Serve static assets for Devfest Wallet Mobile Web UI
app.use(express.static(path.join(__dirname, '../../public')));

// Silence common browser & devtools probes (clean middleware, Express 5 compatible)
app.use((req, res, next) => {
  if (req.path === '/sw.js' || req.path === '/favicon.ico' || req.path.startsWith('/.well-known')) {
    return res.status(204).end();
  }
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[API ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'Wallet Backend API',
    timestamp: new Date().toISOString()
  });
});

// List all wallets (Admin/internal)
app.get('/api/wallets', (req, res) => {
  const wallets = db.listWallets();
  res.json({ success: true, count: wallets.length, data: wallets });
});

// Get specific wallet balance & profile
app.get('/api/wallets/:userId', (req, res) => {
  const { userId } = req.params;
  const wallet = db.getWallet(userId);
  if (!wallet) {
    return res.status(404).json({
      success: false,
      error: `Wallet not found for userId: ${userId}`
    });
  }
  res.json({ success: true, data: wallet });
});

// Get user transaction history
app.get('/api/wallets/:userId/transactions', (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 10;
  try {
    const history = db.getTransactionHistory(userId, limit);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Execute Transfer
app.post('/api/transfers', (req, res) => {
  const { senderId, recipientId, amount, description } = req.body;
  try {
    const result = db.executeTransfer({
      senderId,
      recipientId,
      amount: Number(amount),
      description
    });
    res.status(201).json({
      success: true,
      message: 'Transfer processed successfully',
      data: result.transfer,
      remainingBalance: result.remainingBalance
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Check Transfer Status
app.get('/api/transfers/:transferId', (req, res) => {
  const { transferId } = req.params;
  try {
    const transfer = db.getTransferStatus(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: `Transfer with reference/ID '${transferId}' not found.`
      });
    }
    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Initiate Top-up
app.post('/api/topups', (req, res) => {
  const { userId, amount, paymentMethod } = req.body;
  try {
    const topup = db.initiateTopup({
      userId,
      amount: Number(amount),
      paymentMethod
    });
    res.status(201).json({
      success: true,
      message: 'Top-up initiated successfully',
      data: topup
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Check Top-up Status
app.get('/api/topups/:topupId', (req, res) => {
  const { topupId } = req.params;
  try {
    const topup = db.getTopupStatus(topupId);
    if (!topup) {
      return res.status(404).json({
        success: false,
        error: `Top-up with reference/ID '${topupId}' not found.`
      });
    }
    res.json({ success: true, data: topup });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Simulation helper: complete pending top-up
app.post('/api/topups/:topupId/complete', (req, res) => {
  const { topupId } = req.params;
  try {
    const completed = db.completeTopup(topupId);
    res.json({
      success: true,
      message: 'Top-up marked as completed and funds credited',
      data: completed
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Chatbot endpoint: connects Web UI to Firebase Genkit Assistant Flow
app.post('/api/chat', async (req, res) => {
  const { query, userId = 'user_101' } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }
  try {
    const { walletAssistantFlow } = require('../../genkit-app/src/agent');
    const result = await walletAssistantFlow({ query, userId });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[API Chat Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Database reset endpoint for Devfest Wallet Web UI
app.post('/api/reset', (req, res) => {
  try {
    const success = db.resetData();
    if (success) {
      res.json({ success: true, message: 'Database reset to seed state successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reset database' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Devfest Wallet] Mobile Web App & Backend API running on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Wallet Backend] Port ${port} is already active. Reusing running server.`);
        resolve({ close: (cb) => cb && cb() });
      } else {
        throw err;
      }
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
