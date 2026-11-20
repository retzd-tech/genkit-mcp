const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const express = require('express');
const { walletAssistantFlow } = require('./agent');

const app = express();
app.use(express.json());

// CORS Support for independent clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[Agent API ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'Genkit MCP AI Agent Service',
    timestamp: new Date().toISOString()
  });
});

// Dedicated AI Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  const { query, userId = 'user_101', history = [] } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  try {
    const result = await walletAssistantFlow({ query, userId, history });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Genkit Agent Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.AGENT_PORT || 3002;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Genkit MCP Agent] AI Assistant Service running on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Genkit Agent] Port ${port} is already active. Reusing running server.`);
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
