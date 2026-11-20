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

If you are on the `workshop-starter` branch (`git checkout workshop-starter`), follow these guided exercises step-by-step. Each exercise in this guide directly corresponds to a `// TODO [Exercise X.Y]` marker in the starter codebase.

*(If you are on `main`, this section serves as the complete technical code walkthrough).*

---

### Exercise 1: Implementing Tool Schemas & Handlers
* **Target File**: [`mcp-server/src/tools.js`](mcp-server/src/tools.js)

A Model Context Protocol (MCP) Tool consists of two core components:
1. **Zod Input Schema**: Strongly defines the arguments the AI model must extract from natural language inquiries.
2. **Execution Handler Function**: The asynchronous code that executes when the AI model invokes the tool (calling the underlying Node.js Core Banking REST API).

---

#### Exercise 1.1 [Reference Example]: Balance Schema (`GetWalletBalanceInput`)
In [`mcp-server/src/tools.js`](mcp-server/src/tools.js), note how `z` is imported from `genkit` (which re-exports Zod):
```javascript
const { z } = require('genkit');
const { apiClient } = require('../../backend/src/client');

// [Reference Example 1.1]: Balance Schema
const GetWalletBalanceInput = z.object({
  userId: z.string().describe('The unique identifier of the user/wallet (e.g., user_101, user_102)')
});
```

---

#### Exercise 1.2: Transfer Status Schema (`CheckTransferStatusInput`)
* **Task**: Define the schema for inquiring the status of past money transfers.
* **Requirements**: Accept `transferId` as a string with a descriptive annotation so the AI knows it accepts IDs like `TRF-1001` or `REF-TRF-001`.
```javascript
// TODO [Exercise 1.2]: Define CheckTransferStatusInput schema
const CheckTransferStatusInput = z.object({
  transferId: z.string().describe('The transfer ID (e.g. TRF-1001) or reference ID (e.g. REF-TRF-001) to check')
});
```

---

#### Exercise 1.3: Top-Up Status Schema (`CheckTopupStatusInput`)
* **Task**: Define the schema for querying top-up transactions.
* **Requirements**: Accept `topupId` as a string.
```javascript
// TODO [Exercise 1.3]: Define CheckTopupStatusInput schema
const CheckTopupStatusInput = z.object({
  topupId: z.string().describe('The top-up ID (e.g. TOP-5001) or reference ID (e.g. REF-TOP-001) to check')
});
```

---

#### Exercise 1.4: Fund Transfer Execution Schema (`ExecuteTransferInput`)
* **Task**: Define the schema for wallet-to-wallet fund transfers.
* **Requirements**: Validate `senderId`, `recipientId`, a positive `amount`, and optional `description`.
```javascript
// TODO [Exercise 1.4]: Define ExecuteTransferInput schema
const ExecuteTransferInput = z.object({
  senderId: z.string().describe('The wallet ID of the user sending the money (e.g. user_101)'),
  recipientId: z.string().describe('The wallet ID of the recipient receiving the money (e.g. user_102)'),
  amount: z.number().positive().describe('The amount of money to transfer (must be greater than 0)'),
  description: z.string().optional().describe('Optional note or description for the transfer')
});
```

---

#### Exercise 1.5: Initiate Top-Up Schema (`InitiateTopupInput`)
* **Task**: Define the schema for initiating digital wallet top-ups.
* **Requirements**: Accept `userId`, positive `amount`, and enum `paymentMethod` defaulting to `VIRTUAL_ACCOUNT`.
```javascript
// TODO [Exercise 1.5]: Define InitiateTopupInput schema
const InitiateTopupInput = z.object({
  userId: z.string().describe('The wallet user ID to be credited (e.g. user_101)'),
  amount: z.number().positive().describe('The amount to top up into the wallet'),
  paymentMethod: z.enum(['VIRTUAL_ACCOUNT', 'CREDIT_CARD', 'BANK_TRANSFER']).default('VIRTUAL_ACCOUNT').describe('Preferred payment channel')
});
```

---

#### Exercise 1.6: Transaction History Schema (`GetTransactionHistoryInput`)
* **Task**: Define the schema for retrieving transaction statements.
* **Requirements**: Accept `userId` and an optional `limit` bounded between 1 and 50 (defaulting to 10).
```javascript
// TODO [Exercise 1.6]: Define GetTransactionHistoryInput schema
const GetTransactionHistoryInput = z.object({
  userId: z.string().describe('The wallet user ID whose history is being requested'),
  limit: z.number().min(1).max(50).default(10).optional().describe('Maximum number of recent transactions to return')
});
```

---

#### Exercise 1.7 [Reference Example]: Balance Handler (`getWalletBalance`)
Tool handlers connect to the backend REST client via `apiClient`:
```javascript
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
```

---

#### Exercise 1.8: Check Transfer Status Handler (`checkTransferStatus`)
* **Task**: Implement status lookup by calling `apiClient.getTransferStatus(transferId)`.
```javascript
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
```

---

#### Exercise 1.9: Check Top-Up Status Handler (`checkTopupStatus`)
* **Task**: Implement top-up status lookup by calling `apiClient.getTopupStatus(topupId)`.
```javascript
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
```

---

#### Exercise 1.10: Execute Transfer Handler (`executeTransfer`)
* **Task**: Implement fund transfer execution calling `apiClient.executeTransfer`.
```javascript
  // TODO [Exercise 1.10]: Implement executeTransfer
  async executeTransfer(args = {}) {
    const { senderId, recipientId, amount, description } = args || {};
    if (!senderId || !recipientId || !amount) {
      return { success: false, error: 'senderId, recipientId, and positive amount are required' };
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
```

---

#### Exercise 1.11: Initiate Top-Up Handler (`initiateTopup`)
* **Task**: Implement top-up creation by calling `apiClient.initiateTopup`.
```javascript
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
```

---

#### Exercise 1.12: Transaction History Handler (`getTransactionHistory`)
* **Task**: Implement history retrieval by calling `apiClient.getTransactionHistory`.
```javascript
  // TODO [Exercise 1.12]: Implement getTransactionHistory
  async getTransactionHistory(args = {}) {
    const { userId = 'user_101', limit = 10 } = args || {};
    try {
      const transactions = await apiClient.getTransactionHistory(userId, limit);
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
```

---

### Exercise 2: Building the Standard MCP Server on `stdio`
* **Target File**: [`mcp-server/src/std-mcp-server.js`](mcp-server/src/std-mcp-server.js)

The standard Model Context Protocol (MCP) server allows external AI clients (**Claude Desktop**, **Cursor IDE**, and **Antigravity**) to discover and execute our wallet tools over standard input/output (`stdio`).

```javascript
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  GetWalletBalanceInput,
  CheckTransferStatusInput,
  CheckTopupStatusInput,
  ExecuteTransferInput,
  InitiateTopupInput,
  GetTransactionHistoryInput,
  handlers
} = require('./tools');

const server = new McpServer({
  name: 'wallet-payment-mcp-server',
  version: '1.0.0',
  description: 'MCP Server providing payment & digital wallet operations backed by Node.js Core Banking API'
});
```

---

#### Exercise 2.1 [Reference Example]: Register `get_wallet_balance`
```javascript
// [Reference Example 2.1]: Register get_wallet_balance
server.tool(
  'get_wallet_balance',
  'Retrieve current wallet balance, currency, account holder details, and status for a given user ID.',
  GetWalletBalanceInput.shape,
  async (args) => {
    const result = await handlers.getWalletBalance(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Exercise 2.2: Register `check_transfer_status`
```javascript
// TODO [Exercise 2.2]: Register check_transfer_status
server.tool(
  'check_transfer_status',
  'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
  CheckTransferStatusInput.shape,
  async (args) => {
    const result = await handlers.checkTransferStatus(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Exercise 2.3: Register `check_topup_status`
```javascript
// TODO [Exercise 2.3]: Register check_topup_status
server.tool(
  'check_topup_status',
  'Inquire top-up status, payment method, virtual account or settlement information by topup ID or reference ID.',
  CheckTopupStatusInput.shape,
  async (args) => {
    const result = await handlers.checkTopupStatus(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Exercise 2.4: Register `execute_transfer`
```javascript
// TODO [Exercise 2.4]: Register execute_transfer
server.tool(
  'execute_transfer',
  'Execute a wallet-to-wallet transfer from sender to recipient. Deducts sender balance and credits recipient balance.',
  ExecuteTransferInput.shape,
  async (args) => {
    const result = await handlers.executeTransfer(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Exercise 2.5: Register `initiate_topup`
```javascript
// TODO [Exercise 2.5]: Register initiate_topup
server.tool(
  'initiate_topup',
  'Initiate a wallet balance top-up for a user via VIRTUAL_ACCOUNT, CREDIT_CARD, or BANK_TRANSFER.',
  InitiateTopupInput.shape,
  async (args) => {
    const result = await handlers.initiateTopup(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Exercise 2.6: Register `get_transaction_history`
```javascript
// TODO [Exercise 2.6]: Register get_transaction_history
server.tool(
  'get_transaction_history',
  'Retrieve recent transaction history (inflows, outflows, and topups) for a wallet user account.',
  GetTransactionHistoryInput.shape,
  async (args) => {
    const result = await handlers.getTransactionHistory(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

---

#### Verification: Test Standard MCP Server
Run the standard MCP server:
```bash
npm run mcp:std
```
*(The server connects to `stdio` and logs `[Standard MCP] Wallet Payment MCP Server running on stdio`. Press `Ctrl+C` to stop).*

---

### Exercise 3: Genkit Tool Registration & Developer UI
* **Target Files**:
  * [`genkit-app/src/genkit.js`](genkit-app/src/genkit.js)
  * [`mcp-server/src/genkit-mcp-server.js`](mcp-server/src/genkit-mcp-server.js)

Firebase Genkit uses `ai.defineTool()` to register tools with strongly-typed Zod schemas on the shared Genkit instance.

---

#### Exercise 3.1 [Reference Example]: Tool `get_wallet_balance`
```javascript
// [Reference Example 3.1]: Tool: get_wallet_balance
const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Retrieve current wallet balance, currency, account holder name, and account status for a given user ID.',
    inputSchema: GetWalletBalanceInput,
  },
  async (input) => handlers.getWalletBalance(input)
);
```

---

#### Exercise 3.2: Tool `check_transfer_status`
```javascript
// TODO [Exercise 3.2]: Register check_transfer_status with ai.defineTool
const checkTransferStatusTool = ai.defineTool(
  {
    name: 'check_transfer_status',
    description: 'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
    inputSchema: CheckTransferStatusInput,
  },
  async (input) => handlers.checkTransferStatus(input)
);
```

---

#### Exercise 3.3: Tool `check_topup_status`
```javascript
// TODO [Exercise 3.3]: Register check_topup_status with ai.defineTool
const checkTopupStatusTool = ai.defineTool(
  {
    name: 'check_topup_status',
    description: 'Inquire top-up status, payment method, virtual account or settlement information by topup ID or reference ID.',
    inputSchema: CheckTopupStatusInput,
  },
  async (input) => handlers.checkTopupStatus(input)
);
```

---

#### Exercise 3.4: Tool `execute_transfer`
```javascript
// TODO [Exercise 3.4]: Register execute_transfer with ai.defineTool
const executeTransferTool = ai.defineTool(
  {
    name: 'execute_transfer',
    description: 'Execute a wallet-to-wallet transfer from sender to recipient. Deducts sender balance and credits recipient balance.',
    inputSchema: ExecuteTransferInput,
  },
  async (input) => handlers.executeTransfer(input)
);
```

---

#### Exercise 3.5: Tool `initiate_topup`
```javascript
// TODO [Exercise 3.5]: Register initiate_topup with ai.defineTool
const initiateTopupTool = ai.defineTool(
  {
    name: 'initiate_topup',
    description: 'Initiate a wallet balance top-up for a user via VIRTUAL_ACCOUNT, CREDIT_CARD, or BANK_TRANSFER.',
    inputSchema: InitiateTopupInput,
  },
  async (input) => handlers.initiateTopup(input)
);
```

---

#### Exercise 3.6: Tool `get_transaction_history`
```javascript
// TODO [Exercise 3.6]: Register get_transaction_history with ai.defineTool
const getTransactionHistoryTool = ai.defineTool(
  {
    name: 'get_transaction_history',
    description: 'Retrieve recent transaction history (inflows, outflows, and topups) for a wallet user account.',
    inputSchema: GetTransactionHistoryInput,
  },
  async (input) => handlers.getTransactionHistory(input)
);
```

---

#### Verification: Inspect Tools in Genkit Web UI
Launch the Developer Workbench:
```bash
npm run ui
```
Open **`http://localhost:4000`** in your browser. All 6 registered tools will appear under the **Tools** section. Test running `get_wallet_balance` with `{ "userId": "user_101" }`.

---

### Exercise 4: AI Agent Orchestration Flow & Reasoning Engine
* **Target File**: [`genkit-app/src/agent.js`](genkit-app/src/agent.js)

Here we build the dual-engine orchestrator. If `GEMINI_API_KEY` is present, it uses Google Gemini cloud reasoning. If absent (the default), it falls back seamlessly to `simulateAgentReasoning` to work 100% offline with zero cost.

---

#### Exercise 4.1: Define `walletAssistantFlow`
In [`genkit-app/src/agent.js`](genkit-app/src/agent.js), define the primary Genkit Flow:

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
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');

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

---

#### Exercise 4.2 [Reference Example]: Intent Branch 1 — Check Transfer Status
In `simulateAgentReasoning(query, defaultUserId)`:
```javascript
  // [Reference Example 4.2 - Branch 1]: Transfer Status check
  const trfMatch = q.match(/\b(TRF-\d+|REF-TRF-\d+)\b/i);
  if ((lower.includes('transfer') && (lower.includes('status') || lower.includes('check'))) || trfMatch) {
    const transferId = trfMatch ? trfMatch[1] : 'TRF-1002';
    const result = await checkTransferStatusTool({ transferId });
    let text = '';
    if (result.success) {
      text = `Here is the status for Transfer **${result.transferId}** (Ref: ${result.referenceId}):\n` +
             `- **Status**: ${result.status === 'COMPLETED' ? '✅ COMPLETED' : result.status === 'PENDING' ? '⏳ PENDING' : '❌ FAILED'}\n` +
             `- **Amount**: ${result.formattedAmount}\n` +
             `- **Sender**: ${result.sender}\n` +
             `- **Recipient**: ${result.recipient}\n` +
             `- **Timestamp**: ${new Date(result.timestamp).toLocaleString()}\n` +
             `- **Note**: ${result.description}`;
      if (result.failureReason) {
        text += `\n- **Failure Reason**: ${result.failureReason}`;
      }
    } else {
      text = `❌ Could not find transfer with ID "${transferId}": ${result.error}`;
    }
    return {
      toolCalled: 'check_transfer_status',
      toolArgs: { transferId },
      toolResult: result,
      response: text
    };
  }
```

---

#### Exercise 4.3: Intent Branch 2 — Check & Initiate Top-Up
* **Task**: Handle both top-up status checks (e.g. `"status of top-up TOP-5001"`) and top-up initiation (e.g. `"top up $75 using virtual account"`).
```javascript
  // TODO [Exercise 4.3]: Top-up Status check & Initiate Top-up
  const topupMatch = q.match(/\b(TOP-\d+|REF-TOP-\d+)\b/i);
  if (lower.includes('topup') || lower.includes('top up') || lower.includes('top-up')) {
    if (lower.includes('status') || lower.includes('what is happening') || topupMatch) {
      const topupId = topupMatch ? topupMatch[1] : 'TOP-5002';
      const result = await checkTopupStatusTool({ topupId });
      let text = '';
      if (result.success) {
        text = `Here is the status for Top-up **${result.topupId}** (Ref: ${result.referenceId}):\n` +
               `- **Status**: ${result.status === 'SUCCESS' ? '✅ SUCCESS' : result.status === 'PENDING' ? '⏳ PENDING' : '❌ FAILED'}\n` +
               `- **Account Holder**: ${result.userName}\n` +
               `- **Amount**: ${result.formattedAmount}\n` +
               `- **Payment Method**: ${result.paymentMethod}\n` +
               `- **Detail**: ${result.statusDetail}`;
        if (result.virtualAccountNumber) {
          text += `\n- **Virtual Account**: ${result.virtualAccountNumber} (${result.bank || 'Bank Partner'})`;
        }
      } else {
        text = `❌ Could not find top-up with ID "${topupId}": ${result.error}`;
      }
      return {
        toolCalled: 'check_topup_status',
        toolArgs: { topupId },
        toolResult: result,
        response: text
      };
    }

    // Initiate Top-up
    const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 50.00;
    let paymentMethod = 'VIRTUAL_ACCOUNT';
    if (lower.includes('credit') || lower.includes('card')) paymentMethod = 'CREDIT_CARD';
    if (lower.includes('bank transfer')) paymentMethod = 'BANK_TRANSFER';

    const userMatch = q.match(/user_\d+/i);
    const userId = userMatch ? userMatch[0] : defaultUserId;

    const result = await initiateTopupTool({ userId, amount, paymentMethod });
    let text = '';
    if (result.success) {
      text = `✅ Top-up request **${result.topupId}** created successfully for **${result.formattedAmount}**.\n` +
             `- **Payment Method**: ${result.paymentMethod}\n` +
             `- **Status**: ⏳ ${result.status}\n`;
      const inst = result.paymentInstructions || result;
      if (inst && inst.virtualAccountNumber) {
        text += `- **Virtual Account Number**: \`${inst.virtualAccountNumber}\` (${inst.bank || 'Partner Bank'})\n` +
                `- **Valid until**: ${inst.expiryTime ? new Date(inst.expiryTime).toLocaleString() : '24 hours'}`;
      } else if (inst && inst.checkoutUrl) {
        text += `- **Payment Link**: ${inst.checkoutUrl}`;
      }
    } else {
      text = `❌ Failed to initiate top-up: ${result.error}`;
    }
    return {
      toolCalled: 'initiate_topup',
      toolArgs: { userId, amount, paymentMethod },
      toolResult: result,
      response: text
    };
  }
```

---

#### Exercise 4.4: Intent Branch 3 — Inquire Transaction History & Statement
* **Task**: Handle statement inquiries (e.g. `"show my history"`, `"what was my latest transfer?"`).
```javascript
  // TODO [Exercise 4.4]: Inquire History or Latest Transfer
  const isHistoryOrLatest = lower.includes('history') ||
                            lower.includes('transactions') ||
                            lower.includes('statement') ||
                            lower.includes('past') ||
                            lower.includes('latest') ||
                            lower.includes('last') ||
                            lower.includes('recent');

  if (isHistoryOrLatest && !lower.includes('send') && !lower.includes('pay to')) {
    const userMatch = q.match(/user_\d+/i);
    const userId = userMatch ? userMatch[0] : defaultUserId;
    const result = await getTransactionHistoryTool({ userId, limit: 10 });

    let text = '';
    if (result.success) {
      if (lower.includes('transfer')) {
        const latestTransfer = result.transactions.find(
          (tx) => tx.type === 'TRANSFER_OUT' || tx.type === 'TRANSFER_IN'
        );
        if (latestTransfer) {
          text = `📋 **Your Latest Transfer (${latestTransfer.id})**:\n` +
                 `- **Status**: ${latestTransfer.status === 'COMPLETED' ? '✅ COMPLETED' : latestTransfer.status === 'PENDING' ? '⏳ PENDING' : '❌ ' + latestTransfer.status}\n` +
                 `- **Type**: ${latestTransfer.type === 'TRANSFER_OUT' ? 'Sent (Outflow)' : 'Received (Inflow)'}\n` +
                 `- **Amount**: ${latestTransfer.formattedAmount}\n` +
                 `- **Counterparty**: ${latestTransfer.counterparty}\n` +
                 `- **Note**: ${latestTransfer.description}\n` +
                 `- **Date**: ${new Date(latestTransfer.timestamp).toLocaleString()}`;
        } else {
          text = `No recent transfers found.`;
        }
      } else {
        text = `📜 **Recent Transactions** (${Math.min(5, result.transactions.length)} entries):\n`;
        result.transactions.slice(0, 5).forEach((tx, idx) => {
          const symbol = tx.type === 'TRANSFER_OUT' ? '📤' : tx.type === 'TRANSFER_IN' ? '📥' : '💳';
          text += `${idx + 1}. ${symbol} **${tx.id}** [${tx.status}] - **${tx.formattedAmount}**\n` +
                  `   ${tx.description || tx.counterparty} • ${new Date(tx.timestamp).toLocaleDateString()}\n`;
        });
      }
    } else {
      text = `❌ Could not fetch transaction history: ${result.error}`;
    }

    return {
      toolCalled: 'get_transaction_history',
      toolArgs: { userId, limit: 10 },
      toolResult: result,
      response: text
    };
  }
```

---

#### Exercise 4.5: Intent Branch 4 — Money Transfer Execution with Guardrail
* **Task**: Handle fund transfer commands (e.g. `"Transfer $50 to Bob"`).
* **Security Guardrail**: If the user omits the transfer amount (e.g. `"transfer to Bob"`), ask for confirmation and required amount instead of failing or blindly sending funds!
```javascript
  // TODO [Exercise 4.5]: Do Transfer with Safety Guardrail
  if (lower.includes('transfer') || lower.includes('send') || lower.includes('pay')) {
    const amountMatch = q.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    const recipientMatch = q.match(/(?:to\s+)(user_\d+|bob|charlie|alice)/i);

    // 🛡️ Safety Guardrail: Prompt if amount is missing
    if (!amountMatch) {
      return {
        toolCalled: 'none',
        toolArgs: {},
        toolResult: null,
        response: `❓ How much would you like to transfer, and to whom? Please specify the amount and recipient (e.g., *"Transfer $50 to Bob"* or *"Send $30 to user_102"*).`
      };
    }

    const amount = parseFloat(amountMatch[1]);
    let recipientId = 'user_102'; // default Bob if specified
    if (recipientMatch) {
      const nameOrId = recipientMatch[1].toLowerCase();
      if (nameOrId === 'bob' || nameOrId === 'user_102') recipientId = 'user_102';
      else if (nameOrId === 'charlie' || nameOrId === 'user_103') recipientId = 'user_103';
      else if (nameOrId === 'alice' || nameOrId === 'user_101') recipientId = 'user_101';
      else recipientId = nameOrId;
    }

    const senderMatch = q.match(/(?:from\s+)(user_\d+)/i);
    const senderId = senderMatch ? senderMatch[1] : defaultUserId;

    const result = await executeTransferTool({
      senderId,
      recipientId,
      amount,
      description: `Transfer initiated via Genkit Assistant: "${q}"`
    });

    let text = '';
    if (result.success) {
      text = `🎉 **Transfer Successful!**\n` +
             `- **Transaction ID**: ${result.transferId}\n` +
             `- **Amount Sent**: ${result.formattedAmount}\n` +
             `- **From**: ${result.senderName}\n` +
             `- **To**: ${result.recipientName}\n` +
             `- **Your Remaining Balance**: **${result.formattedRemainingBalance}**\n` +
             `- **Timestamp**: ${new Date(result.timestamp).toLocaleString()}`;
    } else {
      text = `❌ **Transfer Failed**: ${result.error}`;
    }

    return {
      toolCalled: 'execute_transfer',
      toolArgs: { senderId, recipientId, amount },
      toolResult: result,
      response: text
    };
  }
```

---

#### Exercise 4.6 [Reference Example]: Intent Branch 5 — Balance Inquiry Fallback
```javascript
  // [Reference Example 4.6 - Branch 5]: Balance Inquiry default fallback
  const userMatch = q.match(/user_\d+/i);
  const userId = userMatch ? userMatch[0] : defaultUserId;
  const result = await getWalletBalanceTool({ userId });

  let text = '';
  if (result.success) {
    text = `💼 **Wallet Summary for ${result.accountHolder}**:\n` +
           `- **Current Balance**: **${result.formattedBalance}**\n` +
           `- **Account Status**: ${result.status === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 ' + result.status}\n` +
           `- **Tier**: ${result.tier}\n` +
           `- **Daily Transfer Limit**: $${result.dailyLimit.toFixed(2)}`;
  } else {
    text = `❌ Could not find wallet for user "${userId}": ${result.error}`;
  }

  return {
    toolCalled: 'get_wallet_balance',
    toolArgs: { userId },
    toolResult: result,
    response: text
  };
```

---

#### Verification: Test with Interactive Chat & Automated E2E
```bash
# 1. Interactive terminal chat:
npm run chat

# 2. Automated regression validation of all 7 payment scenarios:
npm run e2e
```

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
| `npm run web` | Starts Devfest Wallet Mobile Web App + Backend API on `http://localhost:3001` | Interactive visual mobile demonstration of the chatbot, cards, and live ledger |
| `npm run e2e` | Runs the automated 7-scenario test suite | Fast regression test of all payment use cases |
| `npm run chat` | Interactive AI terminal assistant | Conversational testing and prompt evaluation in terminal |
| `npm run ui` | Starts backend + Genkit Web UI on `http://localhost:4000` | Visual tool execution, flow testing, and trace inspection |
| `npm run backend` | Starts the Express REST API & Mobile Web App on `localhost:3001` | Hosting backend and web client |
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