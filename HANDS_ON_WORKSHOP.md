# Hands-On Workshop & Developer Guide: Firebase Genkit + MCP Digital Wallet

> 🌐 **GitHub Repository**: [https://github.com/retzd-tech/genkit-mcp](https://github.com/retzd-tech/genkit-mcp)

Welcome! This document is the **definitive, unified guide** for both beginners getting started and developers attending a hands-on workshop. It combines step-by-step code exercises (building the system from scratch) with an operational feature tour (running, testing, and verifying every capability).

---

## Workshop Objectives & Agenda

By following this guide, you will understand:
1. **The Core Banking Layer**: How an independent Node.js REST API manages accounts, enforces balance constraints, and persists atomic ledger updates.
2. **The MCP Tool Layer**: How the **Model Context Protocol (MCP)** standardizes backend functions into typed, schema-validated tools using `Zod`.
3. **The Universal MCP Server**: How to expose banking tools over `stdio` to external AI clients like **Claude Desktop**, **Cursor IDE**, and **Antigravity**.
4. **Firebase Genkit Integration**: How to register tools on a shared Genkit instance and visually inspect executions in the Developer Web UI (`localhost:4000`).
5. **The AI Orchestration Flow & Reasoning Engine**: How to build an intelligent assistant flow that operates **100% offline with zero API keys**, and seamlessly promotes to **Google Gemini** in the cloud.
6. **Interactive Testing & E2E Validation**: How to converse with the wallet assistant via terminal chat and run automated regression test suites.

### Time Budget (Estimated: 2.5 – 3 Hours, or Self-Paced)
* **Part 1**: Setup, Branches & Baseline Verification (20 mins)
* **Part 2**: Running Components One-by-One (25 mins)
* **Part 3**: Code Exercises — Building the MCP & Genkit Architecture (60 mins)
* **Part 4**: Comprehensive Feature Tour — Testing All 7 Scenarios (35 mins)
* **Part 5**: Summary, CLI Cheat Sheet & Architecture Takeaways (15 mins)

---

## Repository & Branch Strategy

The repository provides two git branches:

| Branch Name | Role | Description |
| :--- | :--- | :--- |
| **`workshop-starter`** | **Hands-On Working Branch** | Starter template containing the working Express backend, guided `// TODO [Exercise X.Y]` markers, and hints for all code exercises. |
| **`main`** | **Reference Solution** | The complete, 100% fully implemented reference code. Use this whenever you want to compare or check the complete solution. |

---

## Part 1: Environment Setup, Branches & Test Sandbox (20 mins)

### Step 1.1: Verify Prerequisites
Open your terminal and verify that Node.js and npm are installed:
```bash
node -v   # Must be v18.0.0 or higher (v20 or v22 recommended)
npm -v    # Must be v9.0.0 or higher
```
*(If you don't have Node.js installed, download the LTS release from [nodejs.org](https://nodejs.org/)).*

### Step 1.2: Clone the Repository
```bash
git clone https://github.com/retzd-tech/genkit-mcp.git
cd genkit-mcp
```

### Step 1.3: Choose Your Learning Mode

* **Option A: Hands-on Workshop Mode (Recommended)**:
  Switch to the starter branch to code along with the exercises:
  ```bash
  git checkout workshop-starter
  npm install
  ```
* **Option B: Exploration & Demo Mode**:
  Stay on `main` to test the already-completed code:
  ```bash
  git checkout main
  npm install
  ```

### Step 1.4: (Optional) Google Gemini Cloud AI Configuration
This project includes a **built-in local reasoning engine**, allowing you to learn and run everything **100% offline with zero external API keys and $0 cost**.

If you *do* want to test live cloud generation with Google Gemini:
```bash
cp .env.example .env
```
Edit `.env` and set your key and model:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash-lite
```
*(For complete details on the dual-engine design, see [AI_ENGINES_GUIDE.md](AI_ENGINES_GUIDE.md)).*

### Step 1.5: The 3 Test Sandbox Accounts
The system includes 3 fictional bank accounts stored in `backend/data/wallet-db.json`:

| User ID | Account Holder | Initial Balance | Account Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user_101` | **Alice Smith** | **$1,250.00** | ACTIVE | Premium tier account (Default user session) |
| `user_102` | **Bob Jones** | **$320.50** | ACTIVE | Standard tier account (Alice's friend) |
| `user_103` | **Charlie Brown** | **$45.00** | FROZEN | Compliance lock (Transfers to him will be rejected) |

---

## Part 2: Running Components One-by-One (25 mins)

Before modifying code, understand how each component works in isolation.

### Step 2.1: Run the Core Banking Backend Only
The backend is an independent REST API microservice:
```bash
npm run backend
```
**Terminal Output:**
```
[Wallet Backend] Express server running on http://localhost:3001
```

Open a **new terminal tab** and test the REST endpoints directly using cURL:
```bash
# 1. Health check
curl http://localhost:3001/api/health

# 2. Check Alice's wallet
curl http://localhost:3001/api/wallets/user_101

# 3. Check past transfer TRF-1001
curl http://localhost:3001/api/transfers/TRF-1001
```
*Takeaway*: The backend knows nothing about AI, LLMs, or Genkit. It is a standard REST system of record. Stop the standalone backend (`Ctrl+C`) before the next step.

---

### Step 2.2: Launch the Firebase Genkit Developer Web UI
Start the visual AI development workbench:
```bash
npm run ui
```
**Terminal Output:**
```
[Genkit Dev Mode] Starting backend API on port 3001...
✔ Node.js Backend API is running on http://localhost:3001
Genkit Developer UI started at http://localhost:4000
```
Open **`http://localhost:4000`** in your browser:
* **`Tools (6)`**: The 6 payment tools exposed via MCP.
* **`Flows (4)`**: The AI workflows (`walletAssistantFlow`, `transferFundsFlow`, etc.).

---

### Step 2.3: Run the Interactive Terminal Chat
Open a new terminal tab and start the conversational assistant:
```bash
npm run chat
```
```
=================================================================
💳 Firebase Genkit MCP Wallet Assistant (Interactive Chat)
=================================================================
Logged in as: Alice Smith
Try asking:
  • "What is my current balance?"
  • "Check status of transfer TRF-1002"
  • "Transfer $35 to Bob for lunch"
-----------------------------------------------------------------

💬 You: 
```
Type `"What is my balance?"` and hit Enter.

---

### Step 2.4: Run the Standalone MCP Server
To expose the wallet tools to external AI clients (**Claude Desktop**, **Cursor IDE**, **Antigravity**):
```bash
npm run mcp:std
```
*(The process connects to `stdio` and awaits JSON-RPC requests. Press `Ctrl+C` to stop).*

---

### Step 2.5: Run the Automated End-to-End Suite
To run all 7 payment test scenarios sequentially with formatted console logs:
```bash
npm run e2e
```

---

## Part 3: Code Exercises — Building the MCP & Genkit Architecture (60 mins)

If you are on the `workshop-starter` branch, follow these guided exercises. *(If on `main`, review the code implementations).*

---

### Exercise 1: Implementing Tool Schemas & Handlers
* **Target File**: [`mcp-server/src/tools.js`](mcp-server/src/tools.js)

A Tool consists of two parts:
1. **Schema (`Zod`)**: Defines what parameters the AI must extract and supply.
2. **Handler Function**: The code that executes when the AI calls the tool (calling the backend REST API).

#### Task 1.1: Define Input Schemas
In [`mcp-server/src/tools.js`](mcp-server/src/tools.js), note how `z` is imported from `genkit`:
```javascript
const { z } = require('genkit');
const { apiClient } = require('../../backend/src/client');

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

#### Task 1.2: Implement Handlers
Connect each tool to `apiClient`:
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
  // (checkTransferStatus, checkTopupStatus, initiateTopup, getTransactionHistory follow the same pattern)
};
```

---

### Exercise 2: Building the Standard MCP Server
* **Target File**: [`mcp-server/src/std-mcp-server.js`](mcp-server/src/std-mcp-server.js)

The standard MCP server exposes our tools over `stdio` using `@modelcontextprotocol/sdk`:

```javascript
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { schemas, handlers } = require('./tools');

const server = new McpServer({
  name: 'wallet-payment-mcp-server',
  version: '1.0.0'
});

// Register get_wallet_balance
server.tool(
  'get_wallet_balance',
  'Retrieve current wallet balance, currency, account holder details, and status for a given user ID.',
  schemas.GetWalletBalanceInput.shape,
  async (args) => {
    const result = await handlers.getWalletBalance(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Register execute_transfer
server.tool(
  'execute_transfer',
  'Execute a wallet-to-wallet transfer from sender to recipient. Deducts sender balance and credits recipient balance.',
  schemas.ExecuteTransferInput.shape,
  async (args) => {
    const result = await handlers.executeTransfer(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

---

### Exercise 3: Genkit Tool Registration & Developer UI
* **Target Files**:
  * [`genkit-app/src/genkit.js`](genkit-app/src/genkit.js)
  * [`mcp-server/src/genkit-mcp-server.js`](mcp-server/src/genkit-mcp-server.js)

#### Task 3.1: Shared Genkit Instance
In [`genkit-app/src/genkit.js`](genkit-app/src/genkit.js), initialize the single shared instance:
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

const ai = genkit({ plugins });
module.exports = { ai };
```

#### Task 3.2: Register Tools with `ai.defineTool`
In [`mcp-server/src/genkit-mcp-server.js`](mcp-server/src/genkit-mcp-server.js):
```javascript
const { ai } = require('../../genkit-app/src/genkit');
const { schemas, handlers } = require('./tools');

const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Retrieve current wallet balance, currency, account holder name, and account status for a given user ID.',
    inputSchema: schemas.GetWalletBalanceInput,
    outputSchema: z.any()
  },
  async (input) => handlers.getWalletBalance(input)
);

const executeTransferTool = ai.defineTool(
  {
    name: 'execute_transfer',
    description: 'Execute a wallet-to-wallet transfer from sender to recipient. Deducts sender balance and credits recipient balance.',
    inputSchema: schemas.ExecuteTransferInput,
    outputSchema: z.any()
  },
  async (input) => handlers.executeTransfer(input)
);
```

---

### Exercise 4: AI Agent Orchestration Flow & Reasoning Engine
* **Target File**: [`genkit-app/src/agent.js`](genkit-app/src/agent.js)

#### Task 4.1: Define `walletAssistantFlow`
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
    // Branch 1: If GEMINI_API_KEY is present -> Google Gemini Cloud LLM
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

    // Branch 2: Default -> Local Offline Reasoning Engine
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

#### Task 4.2: Implement `simulateAgentReasoning`
Build the 5 intent branches:
* **Branch 1 (Transfer Status)**: Regex `/\b(TRF-\d+|REF-TRF-\d+)\b/i`.
* **Branch 2 (Top-Up Status vs. Creation)**: Regex `/\b(TOP-\d+|REF-TOP-\d+)\b/i`.
* **Branch 3 (Transaction History)**: Distinguishes `"latest transfer"` from general statements.
* **Branch 4 (Fund Transfers with Safety Guard)**:
  ```javascript
  if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay')) {
    const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    // 🛡️ Safety Guard: Prompt if amount is missing
    if (!amountMatch) {
      return {
        toolCalled: 'none',
        toolArgs: {},
        toolResult: null,
        response: `❓ How much would you like to transfer, and to whom? Please specify the amount and recipient (e.g., *"Transfer $50 to Bob"*).`
      };
    }
    // Execute transfer...
  }
  ```
* **Branch 5 (Balance Inquiry)**: Fallback querying `getWalletBalanceTool`.

---

## Part 4: Comprehensive Feature Tour — Testing All 7 Scenarios (35 mins)

Test all 7 real-life situations using both the **Genkit Web UI** (`localhost:4000`) and the **Interactive Chat** (`npm run chat`):

### Scenario 1: Check Wallet Balance & Profile
* **In Genkit Web UI (`localhost:4000`)**:
  1. Click **Tools** in sidebar $\rightarrow$ Select `get_wallet_balance`.
  2. In `userId`, type `user_101`. Click **Run Tool**.
  3. Displays: Balance `$1250.00 USD`, status `ACTIVE`, tier `PREMIUM`.
* **In Terminal Chat (`npm run chat`)**:
  * Ask: `"What is my current balance?"` or `"Berapa sisa saldo saya?"`
  * Response: Shows Alice's current balance without exposing internal IDs.

---

### Scenario 2: Inquire Transfer Status (3 Cases)
* **Case 2A: Completed Transfer (`TRF-1001`)**:
  * Chat: `"Check status of transfer TRF-1001"`
  * Result: `✅ COMPLETED` — Alice sent $100 to Bob for "Dinner split".
* **Case 2B: Pending Transfer (`TRF-1002`)**:
  * Chat: `"Can you check transfer TRF-1002?"`
  * Result: `⏳ PENDING` — Bob sent $25 to Alice for "Coffee reimbursement".
* **Case 2C: Failed Transfer with Compliance Reason (`TRF-1003`)**:
  * Chat: `"Why did transfer TRF-1003 fail?"`
  * Result: `❌ FAILED` — Failure Reason: *"Recipient account is FROZEN by compliance"*.

---

### Scenario 3: Check Top-Up Status
* Chat: `"Check status of topup TOP-5001"`
  * Result: `✅ SUCCESS` — $200.00 via Virtual Account `88019283746` (Chase Bank).
* Chat: `"What is happening with topup TOP-5002?"`
  * Result: `⏳ PENDING` — $50.00 via Credit Card.

---

### Scenario 4: Execute Live Money Transfer
* **In Genkit Web UI (`localhost:4000`)**:
  1. Click **Flows** in sidebar $\rightarrow$ Select `walletAssistantFlow`.
  2. Input:
     ```json
     {
       "query": "Please transfer $50 to Bob for concert tickets",
       "userId": "user_101"
     }
     ```
  3. Click **Run**.
  4. Alice's balance decreases to `$1,200.00`.
  5. Click **View Trace**: Visually inspect the execution DAG where the flow selected and called `execute_transfer`!
* **In Terminal Chat**:
  * Chat: `"Transfer $35 to Bob for lunch"`
  * Chat: `"Transfer to Bob"` *(Notice the guardrail asking for the amount!)*

---

### Scenario 5: Initiate a New Top-Up via Virtual Account
* **In Genkit Web UI**:
  1. Click **Tools** $\rightarrow$ `initiate_topup`.
  2. Input: `userId: user_101`, `amount: 150`, `paymentMethod: VIRTUAL_ACCOUNT`. Click **Run Tool**.
  3. Generates a unique Virtual Account Number (`8801xxxxxxx`) valid for 24 hours.
* **In Terminal Chat**:
  * Chat: `"I want to top up $75 using virtual account"`
  * Assistant returns payment instructions with Virtual Account number.

---

### Scenario 6: Inquire Transaction History
* Chat: `"Show my recent transaction history"`
* Chat: `"What was my latest transfer?"`
* Displays recent transactions with directional badges (`📤 Sent`, `📥 Received`, `💳 Top-Up`).

---

### Scenario 7: Reset Database to Clean State
Transfers and top-ups mutate `backend/data/wallet-db.json`. To restore initial balances:
```bash
npm run reset-db
```
**Output:**
```
[DB] Resetting wallet database to initial seed data...
[DB] Database reset successfully! Initial balances and transactions restored.
```
Alice is restored to `$1,250.00`, Bob to `$320.50`, and Charlie to `$45.00`.

---

## Part 5: CLI Command Reference & Architectural Takeaways (15 mins)

### CLI Command Summary

| Command | Purpose | When to Use |
| :--- | :--- | :--- |
| `npm run e2e` | Runs the automated 7-scenario test suite | Fast regression test of all payment use cases |
| `npm run chat` | Interactive AI terminal assistant | Conversational testing and prompt evaluation |
| `npm run ui` | Starts backend + Genkit Web UI on `http://localhost:4000` | Visual tool execution, flow testing, and trace inspection |
| `npm run backend` | Starts ONLY the Express REST API on `localhost:3001` | Testing backend endpoints directly via cURL/Postman |
| `npm run mcp:std` | Starts the standard MCP Server on `stdio` | Connecting to Claude Desktop, Cursor, or Antigravity |
| `npm run reset-db` | Restores `wallet-db.json` back to seed values | Wiping test transactions for a fresh baseline |

---

### Architectural Takeaways

1. **The Two-Layer API Pattern**:
   * **Layer 1 (The Genkit Flow)**: Understands natural language, classifies intent, enforces security guardrails, and formulates responses.
   * **Layer 2 (The Core Backend REST API)**: Manages persistence, checks balance constraints, and executes atomic debit/credit updates.
2. **Standardization via MCP**:
   * Define your tools once. They work universally across Firebase Genkit, Claude Desktop, Cursor IDE, and Antigravity without rewriting code.
3. **Offline-First AI Engineering**:
   * Local development and CI/CD pipelines run deterministically with zero API keys and $0 cost.
   * Supplying `GEMINI_API_KEY` promotes the system to live Google Gemini cloud reasoning without changing any tool or backend code.

---

## Additional Deep-Dive Documentation
* **[Concepts & Architecture Guide (CONCEPTS_AND_ARCHITECTURE.md)](CONCEPTS_AND_ARCHITECTURE.md)**: Deep dive into the "Two-API" architecture.
* **[Dual-Engine AI Architecture Guide (AI_ENGINES_GUIDE.md)](AI_ENGINES_GUIDE.md)**: Line-by-line breakdown of the local reasoning engine and Gemini LLM integration.
* **[Workshop Starter Branch](https://github.com/retzd-tech/genkit-mcp/tree/workshop-starter)**: Hands-on coding branch with exercise `// TODO` templates.