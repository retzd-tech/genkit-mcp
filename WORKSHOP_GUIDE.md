# Hands-on Workshop: Building an AI-Powered Digital Wallet with Firebase Genkit & MCP

> 🌐 **GitHub Repository**: [https://github.com/retzd-tech/genkit-mcp](https://github.com/retzd-tech/genkit-mcp)  
> 💡 **Unified Master Manual**: For the consolidated single-file guide combining these exercises with the beginner onboarding tour and testing scenarios, see **[HANDS_ON_WORKSHOP.md](HANDS_ON_WORKSHOP.md)**.

Welcome to the **Firebase Genkit + Model Context Protocol (MCP)** developer workshop!

In this hands-on workshop, you will learn how to take an existing Node.js Core Banking REST API and transform it into an autonomous, AI-driven financial assistant using **Model Context Protocol (MCP)** and **Firebase Genkit**.

---

## Workshop Objectives & Agenda

By the end of this workshop, you will have built and mastered:
1. **Core Banking Layer**: An independent Express REST API that enforces financial rules and ledger updates.
2. **MCP Tool Layer**: Typed Zod schemas and tool handlers that expose banking operations to AI models.
3. **Universal MCP Server**: A standard MCP server over `stdio` consumable by Claude Desktop, Cursor, and Antigravity.
4. **Firebase Genkit Integration**: Shared Genkit tool registry, visual developer UI, and action workflows.
5. **Autonomous AI Flow & Dual-Engine Agent**: An intelligent assistant flow that operates **100% offline with zero API keys**, and seamlessly upgrades to **Google Gemini** in the cloud.
6. **Interactive Chat & E2E Validation**: Terminal chat loop and automated 7-scenario end-to-end test suite.

### Time Budget (Estimated: 2.5 – 3 Hours)
* **Part 1**: Setup & System Architecture (15 mins)
* **Part 2**: Exercise 1 — Implementing MCP Tool Schemas & Handlers (35 mins)
* **Part 3**: Exercise 2 — Building the Standard MCP Server (20 mins)
* **Part 4**: Exercise 3 — Genkit Tool Registration & Developer UI (25 mins)
* **Part 5**: Exercise 4 — Building the AI Orchestration Flow & Reasoning Engine (45 mins)
* **Part 6**: Exercise 5 — Interactive Chat & End-to-End Validation (20 mins)

---

## Repository & Branch Strategy

* **GitHub Repository**: [https://github.com/retzd-tech/genkit-mcp](https://github.com/retzd-tech/genkit-mcp)

This repository provides two branches:

| Branch Name | Role in Workshop | Description |
| :--- | :--- | :--- |
| **`workshop-starter`** | **Your Working Branch** | Starter template with working backend, clear `// TODO [Step X]` placeholders, and guided hints for every exercise. |
| **`main`** | **Reference Solution** | The complete, fully working implementation. Use this anytime if you get stuck or want to verify your code. |

---

## Part 1: Environment Setup & Verification (15 mins)

### Step 1.1: Clone the Repository & Check Prerequisites
If you haven't cloned the project yet, run:
```bash
git clone https://github.com/retzd-tech/genkit-mcp.git
cd genkit-mcp
```

Verify that you have Node.js and npm installed:
```bash
node -v   # Must be v18.0.0 or higher (v20 or v22 recommended)
npm -v    # Must be v9.0.0 or higher
```

### Step 1.2: Switch to the Workshop Branch
If you want to code hands-on from the guided starter template, switch to `workshop-starter`:
```bash
git checkout workshop-starter
```
*(If you prefer to inspect the complete working solution directly, stay on `main`).*

### Step 1.3: Install Dependencies
```bash
npm install
```

### Step 1.4: Verify the Core Banking Backend
Before writing any AI code, verify that the underlying banking REST API works:
```bash
npm run backend
```
In a new terminal tab, run:
```bash
# 1. Health check
curl http://localhost:3001/api/health

# 2. Check Alice's initial balance ($1,250.00)
curl http://localhost:3001/api/wallets/user_101
```
You should receive:
```json
{"status":"healthy","service":"wallet-backend-api","timestamp":"..."}
```

Stop the standalone backend server (`Ctrl+C`) before proceeding to the next exercise.

---

## Part 2: Exercise 1 — Implementing Tool Schemas & Handlers (35 mins)

* **Target File**: [`mcp-server/src/tools.js`](mcp-server/src/tools.js)

Large Language Models cannot directly debit bank accounts or read local files. A **Tool** defines a schema (what parameters the AI must provide) and a handler (what code runs when the AI requests that action).

### Task 1.1: Import Dependencies
In `mcp-server/src/tools.js`, note that Genkit bundles its own native Zod instance:
```javascript
const { z } = require('genkit');
const { apiClient } = require('../../backend/src/client');
```

### Task 1.2: Define Input Schemas
Define strict schemas with descriptive field annotations. These descriptions teach the AI model how to extract arguments:

```javascript
// 1. Balance Schema
const GetWalletBalanceInput = z.object({
  userId: z.string().describe('The unique identifier of the user/wallet (e.g., user_101, user_102)')
});

// 2. Transfer Status Schema
const CheckTransferStatusInput = z.object({
  transferId: z.string().describe('The transfer ID (e.g. TRF-1001) or reference ID (e.g. REF-TRF-001) to check')
});

// 3. Top-Up Status Schema
const CheckTopupStatusInput = z.object({
  topupId: z.string().describe('The top-up ID (e.g. TOP-5001) or reference ID (e.g. REF-TOP-001) to check')
});

// 4. Fund Transfer Execution Schema
const ExecuteTransferInput = z.object({
  senderId: z.string().describe('The wallet ID of the user sending the money (e.g. user_101)'),
  recipientId: z.string().describe('The wallet ID of the recipient receiving the money (e.g. user_102)'),
  amount: z.number().positive().describe('The amount of money to transfer (must be greater than 0)'),
  description: z.string().optional().describe('Optional note or description for the transfer')
});

// 5. Initiate Top-Up Schema
const InitiateTopupInput = z.object({
  userId: z.string().describe('The wallet user ID to be credited (e.g. user_101)'),
  amount: z.number().positive().describe('The amount to top up into the wallet'),
  paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT').describe('Preferred payment channel')
});

// 6. Transaction History Schema
const GetTransactionHistoryInput = z.object({
  userId: z.string().describe('The wallet user ID whose history is being requested'),
  limit: z.number().min(1).max(50).default(10).optional().describe('Maximum number of recent transactions to return')
});
```

### Task 1.3: Implement Tool Handlers
Connect each tool to the `apiClient`:

```javascript
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
      return { success: false, error: err.message };
    }
  },

  async executeTransfer(args = {}) {
    const { senderId, recipientId, amount, description } = args || {};
    try {
      const transfer = await apiClient.transferFunds({ senderId, recipientId, amount, description });
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
        remainingBalance: transfer.remainingBalance,
        formattedRemainingBalance: `$${transfer.remainingBalance.toFixed(2)} ${transfer.currency}`,
        timestamp: transfer.timestamp
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
```

---

## Part 3: Exercise 2 — Building the Standard MCP Server (20 mins)

* **Target File**: [`mcp-server/src/std-mcp-server.js`](mcp-server/src/std-mcp-server.js)

The **Model Context Protocol (MCP)** is an open standard that allows external tools like **Claude Desktop**, **Cursor IDE**, and **Antigravity** to run your wallet tools.

### Task 2.1: Initialize MCP Server with Stdio Transport
In `mcp-server/src/std-mcp-server.js`:

```javascript
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { schemas, handlers } = require('./tools');

const server = new McpServer({
  name: 'wallet-mcp-server',
  version: '1.0.0'
});

// Register get_wallet_balance
server.tool(
  'get_wallet_balance',
  'Get wallet balance, account holder info, and status for a specific user ID',
  schemas.GetWalletBalanceInput.shape,
  async (args) => {
    const result = await handlers.getWalletBalance(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

// Register execute_transfer
server.tool(
  'execute_transfer',
  'Transfer funds from one wallet account to another',
  schemas.ExecuteTransferInput.shape,
  async (args) => {
    const result = await handlers.executeTransfer(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  console.error('[MCP Server] Fatal startup error:', err);
  process.exit(1);
});
```

### Task 2.2: Test the Standard MCP Server
```bash
npm run mcp:std
```
*(The server connects to `process.stdin`/`process.stdout` and waits for JSON-RPC messages. Press `Ctrl+C` to exit).*

### Task 2.3: Connect & Test with Google Antigravity via `.agents/`
Google Antigravity automatically discovers project MCP servers via the `.agents/` directory:

1. **Verify `.agents/mcp_config.json`**:
   ```json
   {
     "mcpServers": {
       "devfest-wallet": {
         "command": "node",
         "args": ["mcp-server/src/std-mcp-server.js"],
         "env": {
           "BACKEND_API_URL": "http://localhost:3001"
         }
       }
     }
   }
   ```
2. **Ensure Core Banking API is running**:
   ```bash
   npm run backend
   ```
3. **Open Antigravity Chat in this project and test these prompts**:
   * *"Check the current wallet balance for Alice (user_101)"* $\rightarrow$ invokes `get_wallet_balance`.
   * *"What is the status of transfer TRF-1001?"* $\rightarrow$ invokes `check_transfer_status`.
   * *"Transfer $20 from user_101 to Bob Jones with note 'Coffee treat'"* $\rightarrow$ invokes `execute_transfer`.
   * *"Why did transfer TRF-1003 fail?"* $\rightarrow$ invokes `check_transfer_status` and explains account freeze.
   * *"Show me recent transactions for user_101"* $\rightarrow$ invokes `get_transaction_history`.

### Task 2.4: Visual Tool Inspection with the Official MCP Inspector
To inspect all tools and test raw JSON-RPC execution in your browser:
```bash
npm run inspect
# or: npm run mcp:inspect
```
Opens **`http://localhost:5173`** where you can view registered tools, test parameters, and monitor JSON-RPC traffic.

---

## Part 4: Exercise 3 — Registering Genkit Tools & Using the Web UI (25 mins)

* **Target Files**:
  * [`genkit-app/src/genkit.js`](genkit-app/src/genkit.js)
  * [`mcp-server/src/genkit-mcp-server.js`](mcp-server/src/genkit-mcp-server.js)

### Task 3.1: Initialize the Shared Genkit Instance
In `genkit-app/src/genkit.js`:
```javascript
require('dotenv').config();
const { genkit } = require('genkit');

let plugins = [];
if (process.env.GEMINI_API_KEY) {
  try {
    const { googleAI } = require('@genkit-ai/google-genai');
    plugins.push(googleAI());
  } catch (err) {
    console.warn('[Genkit] Could not load @genkit-ai/google-genai:', err.message);
  }
}

// Single shared Genkit instance across tools, flows, and MCP server
const ai = genkit({ plugins });

module.exports = { ai };
```

### Task 3.2: Register Tools on Genkit
In `mcp-server/src/genkit-mcp-server.js`, register tools using `ai.defineTool`:
```javascript
const { ai } = require('../../genkit-app/src/genkit');
const { schemas, handlers } = require('./tools');

const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Get wallet balance, account holder info, and status for a specific user ID',
    inputSchema: schemas.GetWalletBalanceInput,
    outputSchema: z.any()
  },
  async (input) => handlers.getWalletBalance(input)
);

const executeTransferTool = ai.defineTool(
  {
    name: 'execute_transfer',
    description: 'Transfer funds from one wallet account to another',
    inputSchema: schemas.ExecuteTransferInput,
    outputSchema: z.any()
  },
  async (input) => handlers.executeTransfer(input)
);
```

### Task 3.3: Launch the Genkit Developer Web UI
```bash
npm run ui
```
1. Open **`http://localhost:4000`** in your browser.
2. In the left navigation, click **Tools (6)**.
3. Select **`execute_transfer`** and notice that Genkit auto-generates input form fields from your Zod schema!
4. Click **Run** to execute a test transfer.

### Task 3.4: Understanding the Difference: MCP Inspector vs. Genkit Web UI

| Dimension | MCP Inspector (`npm run inspect`) | Genkit Developer UI (`npm run ui`) |
| :--- | :--- | :--- |
| **Layer** | Protocol level (Anthropic MCP standard) | Application / Agent level (Firebase Genkit) |
| **What it Inspects** | Raw MCP tools, parameters, & JSON-RPC traffic | Genkit Tools, **Flows**, prompts, & execution traces |
| **Telemetry & Observability** | None (protocol messages only) | Full span waterfalls, latency timings, and token counters |
| **Best Used For** | Debugging MCP server compatibility for external clients (Antigravity, Claude, Cursor) | Developing AI orchestration flows, multi-turn reasoning, and prompt engineering |

---

## Part 5: Exercise 4 — Building the AI Orchestration Flow & Reasoning Engine (45 mins)

* **Target File**: [`genkit-app/src/agent.js`](genkit-app/src/agent.js)

Now we build the AI brain: `walletAssistantFlow`.

### Task 4.1: Understand the Flow Definition
```javascript
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
    // 1. If GEMINI_API_KEY is present -> Call Google Gemini 3.8 Flash Lite
    if (hasApiKey) {
      try {
        const { googleAI } = require('@genkit-ai/google-genai');
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
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

    // 2. Default: Route to Local Offline Semantic Reasoning Engine
    const simulation = await simulateAgentReasoning(query, userId || 'user_101');
    return {
      query,
      response: simulation.response,
      toolCalls: [{ tool: simulation.toolCalled, args: simulation.toolArgs, result: simulation.toolResult }],
      data: { mode: 'mcp-tool-agent', toolResult: simulation.toolResult }
    };
  }
);
```

### Task 4.2: Implement `simulateAgentReasoning` (Offline Mode)
Build the 5 branches:
1. **Transfer Status Check**: Match `/\b(TRF-\d+|REF-TRF-\d+)\b/i`.
2. **Top-Up Operations**: Match `TOP-\d+` and distinguish status vs. creation.
3. **Transaction History**: Match `"history"` / `"latest transfer"`.
4. **Fund Transfer with Safety Guard**:
   ```javascript
   if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay')) {
     const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
     
     // Guardrail: Intercept if amount is missing
     if (!amountMatch) {
       return {
         toolCalled: 'none',
         toolArgs: {},
         toolResult: null,
         response: '❓ How much would you like to transfer, and to whom? Please specify the amount and recipient (e.g., "Transfer $50 to Bob").'
       };
     }
     // Execute transfer...
   }
   ```
5. **Balance Inquiry**: Baseline fallback calling `getWalletBalanceTool`.

---

## Part 6: Exercise 5 — Interactive Chat & End-to-End Validation (20 mins)

### Task 5.1: Test Interactive Terminal Chat
```bash
npm run chat
```
Try natural questions:
* *"Berapa sisa saldo saya?"* (or *"What is my balance?"*)
* *"Transfer $35 to Bob for lunch"*
* *"Transfer to Bob"* *(Notice the guardrail asking how much to send)*
* *"Show my recent transaction history"*
* Type `exit` to quit.

### Task 5.2: Run the Automated End-to-End Test Suite
```bash
npm run e2e
```
This script executes all 7 scenarios sequentially:
* **Scenario 1**: Balance & account status check.
* **Scenario 2A/2B/2C**: Transfer status checks (Completed, Pending, and Compliance Failed).
* **Scenario 3**: Top-up status check.
* **Scenario 4**: Live money transfer (Alice $\rightarrow$ Bob $75.00).
* **Scenario 5**: Initiating a new top-up via Virtual Account.
* **Scenario 6**: Transaction history ledger.
* **Final Financial Reconciliation**: Verifies balances match atomic ledger debits and credits.

### Task 5.3: Reset Database
To restore clean seed accounts at any time:
```bash
npm run reset-db
```

---

## Workshop Summary & Key Takeaways

1. **Two-Layer API Pattern**:
   * **Layer 1 (Genkit Flow)**: The AI endpoint that understands human speech, handles conversational logic, and decides which actions to take.
   * **Layer 2 (Backend REST API)**: The authoritative system of record that guarantees business rules, account status checks, and atomic debit/credit persistence.
2. **Standardization via MCP**:
   * Tools are defined once and can be exposed to Firebase Genkit, Claude Desktop, Cursor, or any MCP client without code duplication.
3. **Offline-First AI Engineering**:
   * Development, integration testing, and CI/CD pipelines can run 100% locally with zero API keys and zero cost.
   * Providing `GEMINI_API_KEY` promotes the agent to live Google Gemini neural reasoning with zero changes to your tools or backend.

---

## Reference Documentation
* **[Concepts & Architecture Guide (CONCEPTS_AND_ARCHITECTURE.md)](CONCEPTS_AND_ARCHITECTURE.md)**: Deep architectural analysis.
* **[Dual-Engine AI Guide (AI_ENGINES_GUIDE.md)](AI_ENGINES_GUIDE.md)**: Line-by-line explanation of the reasoning engine and Gemini LLM integration.
* **[Beginner's Getting Started Guide (GETTING_STARTED.md)](GETTING_STARTED.md)**: Additional quick reference commands.