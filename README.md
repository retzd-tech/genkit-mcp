# Firebase Genkit + MCP Digital Wallet System

A production-ready reference demonstration illustrating how **Firebase Genkit** and the **Model Context Protocol (MCP)** interface with an **independent backend system** (e.g., Core Banking / Digital Wallet REST API).

> 💡 **Guides for Developers**:
> * **[Concepts & Architecture Guide (CONCEPTS_AND_ARCHITECTURE.md)](CONCEPTS_AND_ARCHITECTURE.md)**: Deep dive into the "Two-API" architecture, difference between Flows and Tools, and how Genkit and MCP relate.
> * **[Dual-Engine AI Architecture Guide (AI_ENGINES_GUIDE.md)](AI_ENGINES_GUIDE.md)**: In-depth technical breakdown of the Local Offline Reasoning Engine vs. Cloud LLM (Gemini) and how to configure/switch between modes.
> * **[Beginner's Getting Started Guide (GETTING_STARTED.md)](GETTING_STARTED.md)**: Step-by-step hands-on tutorial with exact copy-paste commands, preparation, and feature walkthroughs.

---

## 1. Enterprise Perspective: How This Architecture Works

In an enterprise or large-scale production setup, you almost never build the database directly into the AI agent. Instead:

1. **The Backend is an Existing Service**: Your core banking, payment gateway, or wallet service already exists as an independent microservice (Node.js, Go, Java Spring Boot, etc.) running on Kubernetes, AWS, or GCP.
2. **The MCP & Genkit Layer is an AI Adapter**: Rather than rewriting or exposing internal databases, you build a lightweight MCP tool layer that speaks HTTP/REST to your existing backend endpoints.
3. **Any AI Client Can Connect**: The tools can be consumed by:
   - **Firebase Genkit** agents and flows.
   - External MCP-compatible clients (**Claude Desktop, Cursor, Antigravity, MCP Inspector**).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENTS & AGENTS                                │
│                                                                             │
│   Firebase Genkit UI       Terminal Chat          External MCP Clients      │
│   (localhost:4000)       (Alice user_101)        (Claude, Cursor, etc.)     │
└───────────┬──────────────────────┬──────────────────────────┬───────────────┘
            │                      │                          │
            ▼                      ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GENKIT & MCP LAYER                                 │
│                                                                             │
│   genkit-app/src/agent.js         mcp-server/src/genkit-mcp-server.js       │
│   • walletAssistantFlow           • get_wallet_balance                      │
│   • transferFundsFlow             • check_transfer_status                   │
│   • initiateTopupFlow             • execute_transfer                        │
│   • checkBalanceFlow              • initiate_topup, etc.                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST calls
                                       ▼ (BACKEND_API_URL=http://localhost:3001)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXISTING CORE BANKING / WALLET BACKEND                   │
│                                                                             │
│   backend/src/server.js (Express REST API)                                  │
│   • GET  /api/wallets/:id                  • POST /api/transfers            │
│   • GET  /api/wallets/:id/transactions     • GET  /api/transfers/:id        │
│   • POST /api/topups                       • GET  /api/topups/:id           │
│                                                                             │
│   backend/src/db.js  <──>  backend/data/wallet-db.json                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Breakdown & Functions

```
genkit-mcp/
├── backend/                  # Layer 1: Core Banking REST API (Independent Service)
│   ├── data/
│   │   ├── wallet-db.json    # Live persistent storage (wallets, transfers, topups)
│   │   └── seed.json         # Clean seed state for instant database reset
│   └── src/
│       ├── db.js             # Banking business logic (balance checks, debit/credit)
│       ├── server.js         # Express REST API server (port 3001)
│       ├── client.js         # API client SDK that MCP tools use to call the backend
│       └── reset.js          # CLI script to restore database back to seed state
│
├── mcp-server/               # Layer 2: Model Context Protocol (MCP) Standardization
│   └── src/
│       ├── tools.js          # Tool input schemas (Zod) and execution handlers
│       ├── genkit-mcp-server.js  # MCP Server using @genkit-ai/mcp (createMcpServer)
│       └── std-mcp-server.js     # Standard MCP SDK Server (StdioServerTransport)
│
├── genkit-app/               # Layer 3: Firebase Genkit AI Agent & Flows
│   └── src/
│       ├── genkit.js         # Single unified Genkit instance shared across the project
│       ├── agent.js          # AI Assistant Flow & dedicated single-purpose flows
│       ├── dev.js            # Entrypoint for Genkit Developer UI
│       └── cli.js            # Interactive terminal chat UI
│
├── e2e.js                    # Automated end-to-end test walkthrough of all 7 payment scenarios
├── package.json              # Project scripts and dependencies
├── .env.example              # Configuration template (ports, backend URL, Gemini API key)
└── README.md                 # Complete documentation
```

### Detailed Folder Responsibilities:

#### `backend/` (The Core System)
This represents your **existing backend service**. It knows nothing about AI, LLMs, or Genkit. It only provides standard REST endpoints and enforces banking business logic (e.g., sender cannot transfer money if balance is insufficient, accounts cannot transfer to frozen accounts).

#### `mcp-server/` (The Tool Protocol Layer)
This translates between **AI / MCP protocol** and your **backend API**.
* Each tool takes a structured `Zod` schema.
* When an AI requests `execute_transfer`, the tool calls `POST /api/transfers` on the backend and returns the JSON result back to the AI.
* Exports both a Genkit MCP server and a standard MCP SDK server.

#### `genkit-app/` (The AI Agent & Workflows)
This is where **Firebase Genkit** lives:
* **`genkit.js`**: Initializes the single shared `ai` instance with optional Gemini plugin.
* **`agent.js`**: Defines the `walletAssistantFlow` (the conversational agent) plus direct flows (`transferFundsFlow`, `initiateTopupFlow`, `checkBalanceFlow`).

---

## 3. How to Run Each Component Independently

Each layer can be run independently to test or integrate into different architectures:

### 1. Run the Backend API Only (Independent Microservice)
To run just the Node.js Express banking server:
```bash
npm run backend
```
* **Endpoint**: `http://localhost:3001`
* **Test it via cURL / Postman**:
  ```bash
  # Check Alice's balance
  curl http://localhost:3001/api/wallets/user_101

  # Transfer $50 from Alice to Bob
  curl -X POST http://localhost:3001/api/transfers \
    -H "Content-Type: application/json" \
    -d '{"senderId":"user_101","recipientId":"user_102","amount":50,"description":"Direct cURL transfer"}'

  # Check transfer status
  curl http://localhost:3001/api/transfers/TRF-1001

  # Initiate a Top-Up
  curl -X POST http://localhost:3001/api/topups \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_101","amount":100,"paymentMethod":"VIRTUAL_ACCOUNT"}'
  ```

---

### 2. Run the MCP Server Standalone
If you want to plug this wallet backend into external tools like **Claude Desktop**, **Cursor**, or **Antigravity**:

* **Standard MCP Server (stdio transport)**:
  ```bash
  npm run mcp:std
  ```
  Configure your Claude Desktop / Cursor `mcpServers` config:
  ```json
  {
    "mcpServers": {
      "wallet-banking": {
        "command": "node",
        "args": ["/absolute/path/to/genkit-mcp/mcp-server/src/std-mcp-server.js"],
        "env": {
          "BACKEND_API_URL": "http://localhost:3001"
        }
      }
    }
  }
  ```

* **Genkit MCP Server**:
  ```bash
  npm run mcp:genkit
  ```

---

### 3. Run the Firebase Genkit Developer Web UI
To visually inspect and execute flows and tools in your browser:
```bash
npm run ui
```
1. Open **`http://localhost:4000`** in your browser.
2. In the sidebar:
   * **`Tools (6)`**: Test any tool directly (`execute_transfer`, `get_wallet_balance`, etc.) with auto-generated form inputs.
   * **`Flows (4)`**: Run `walletAssistantFlow` or direct flows (`transferFundsFlow`, `initiateTopupFlow`) and inspect latency and trace trees.

---

### 4. Run the Interactive Terminal Chat
To converse naturally with the wallet agent:
```bash
npm run chat
```
Example prompts:
* `"What is my balance?"`
* `"Can you check the status of transfer TRF-1002?"`
* `"Why did transfer TRF-1003 fail?"`
* `"Transfer $35 to user_102 for lunch"`
* `"Top up $100 using virtual account"`
* `"Show my recent transaction history"`

---

### 5. Run the Automated End-to-End Test Suite
To execute all 7 payment test scenarios sequentially with formatted console output:
```bash
npm run e2e
# or
npm start
```

---

### 6. Reset Database to Clean State
To wipe all transactions and restore the seed accounts back to pristine initial values:
```bash
npm run reset-db
```

---

## 4. Production Scaling & Connecting to Real Backends

In a real enterprise environment, simply configure `.env`:

```env
# Point to your production or staging banking API
BACKEND_API_URL=https://api.mycompanybank.internal

# Optional: Gemini API Key for production LLM generation
GEMINI_API_KEY=AIzaSy...
```

If your real backend requires authentication (e.g. Bearer JWT, OAuth, mTLS), you only update [`backend/src/client.js`](backend/src/client.js#L11):

```javascript
// Adding production Authorization headers in client.js:
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.BANKING_API_TOKEN}`
  },
  ...options
});
```
Neither the MCP tools nor the Genkit flows need to change—they remain clean, standardized AI interfaces to your existing backend services.
