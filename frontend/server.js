const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';
const AGENT_URL = process.env.AGENT_API_URL || 'http://localhost:3002';

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.startsWith('/css') && !req.path.startsWith('/js') && !req.path.startsWith('/favicon')) {
      console.log(`[Frontend ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// 1. Proxy /api/chat to the independent Genkit MCP Agent Service (Port 3002)
app.post('/api/chat', async (req, res) => {
  try {
    const agentRes = await fetch(`${AGENT_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await agentRes.json();
    res.status(agentRes.status).json(data);
  } catch (err) {
    res.status(503).json({
      success: false,
      error: `Could not connect to Genkit AI Agent service at ${AGENT_URL}. Please start it using 'npm run agent'.`
    });
  }
});

// 2. Proxy all other /api/* requests to the independent Core Banking API (Port 3001)
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}/api${req.url}`;
    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }
    const backendRes = await fetch(targetUrl, options);
    const contentType = backendRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await backendRes.json();
      res.status(backendRes.status).json(data);
    } else {
      const text = await backendRes.text();
      res.status(backendRes.status).send(text);
    }
  } catch (err) {
    res.status(503).json({
      success: false,
      error: `Could not connect to Core Banking Backend API at ${BACKEND_URL}. Please start it using 'npm run backend'.`
    });
  }
});

// 3. Serve Frontend Static Web Assets (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for SPA-style routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.FRONTEND_PORT || 3000;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Devfest Wallet] Frontend UI running on http://localhost:${port}`);
      console.log(`  -> Proxying Core Banking requests to ${BACKEND_URL}`);
      console.log(`  -> Proxying AI Chatbot requests to ${AGENT_URL}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Frontend UI] Port ${port} is already active. Reusing running server.`);
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
