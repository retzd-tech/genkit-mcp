# Frequently Asked Questions (FAQ)

> 💡 **Firebase Genkit & Model Context Protocol (MCP) Workshop**  
> Repository: [https://github.com/retzd-tech/genkit-mcp](https://github.com/retzd-tech/genkit-mcp)

---

## Table of Contents
1. [Is MCP from the Genkit module? How do we use it?](#1-is-mcp-from-the-genkit-module-how-do-we-use-it)
2. [How do you register tools in Genkit?](#2-how-do-you-register-tools-in-genkit)
3. [Can we use different AI models in Genkit?](#3-can-we-use-different-ai-models-in-genkit)
4. [When transferring money to another user, how does it know the recipient ID?](#4-when-transferring-money-to-another-user-how-does-it-know-the-recipient-id)
5. [How do you call MCP through Genkit? (With Code Examples)](#5-how-do-you-call-mcp-through-genkit-with-code-examples)
6. [How do you inspect MCP tools? What is the difference between the MCP Inspector and the Genkit Web UI?](#6-how-do-you-inspect-mcp-tools-what-is-the-difference-between-the-mcp-inspector-and-the-genkit-web-ui)

---

## 1. Is MCP from the Genkit module? How do we use it?

### What is MCP?
**Model Context Protocol (MCP)** is an open-source standard originated by Anthropic. It provides a standardized protocol (like HTTP or USB-C, but for AI) allowing AI models and IDEs to securely discover, inspect, and execute tools and access resources across different services.

### Is it part of Genkit?
* **MCP itself is NOT exclusive to Genkit** — it is an independent industry standard used by Claude Desktop, Cursor, Antigravity, and other AI systems.
* **However, the Firebase Genkit team maintains an official first-party plugin package: [`@genkit-ai/mcp`](https://www.npmjs.com/package/@genkit-ai/mcp)**.
* In addition, there is the official Anthropic SDK: **`@modelcontextprotocol/sdk`**.

### How do we use it in this repository?
In this workshop, we demonstrate **both approaches** to give you complete enterprise flexibility:

| Implementation File | Package Used | Purpose |
| :--- | :--- | :--- |
| [`mcp-server/src/genkit-mcp-server.js`](mcp-server/src/genkit-mcp-server.js) | `@genkit-ai/mcp` | Uses `createMcpServer(ai, { ... })` to directly package your Genkit tools into an MCP server over `stdio`. |
| [`mcp-server/src/std-mcp-server.js`](mcp-server/src/std-mcp-server.js) | `@modelcontextprotocol/sdk` | Uses the standard reference SDK (`McpServer`, `StdioServerTransport`) so any external tool (**Google Antigravity**, **Claude Desktop**, **Cursor**) can consume your banking tools. |

### How does Google Antigravity connect to this MCP server?
Google Antigravity automatically discovers workspace customizations by reading [`.agents/mcp_config.json`](.agents/mcp_config.json) at the root of your project:
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
When your Core Banking API is running (`npm run backend`), Antigravity automatically registers the 6 tools and allows you to test them directly in chat (e.g. *"Check balance for Alice"* or *"Transfer $20 to Bob"*).

---

## 2. How do you register tools in Genkit?

In Firebase Genkit, you define and register tools using **`ai.defineTool()`**. Every tool consists of:
1. **`name`**: A unique string identifier (e.g. `get_wallet_balance`, `execute_transfer`).
2. **`description`**: Natural language instructions telling the LLM *when* and *why* to invoke this tool.
3. **`inputSchema`**: A typed schema written in **[Zod](https://zod.dev/)** (`z.object({...})`) that validates arguments and generates parameter definitions for LLM function calling.
4. **`outputSchema`** *(Optional)*: A Zod schema validating the return payload.
5. **Execution Handler**: An `async (input) => { ... }` function that executes your business logic or calls your backend REST API.

### Code Example:
```javascript
const { z } = require('genkit');
const { ai } = require('./genkit'); // Shared genkit instance
const { apiClient } = require('./client');

// 1. Define the input parameter schema using Zod
const GetWalletBalanceInput = z.object({
  userId: z.string().describe('The unique identifier of the user (e.g., user_101)')
});

// 2. Register the tool on Genkit
const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Retrieve current wallet balance, currency, account holder name, and account status for a given user ID.',
    inputSchema: GetWalletBalanceInput,
    outputSchema: z.any()
  },
  async (input) => {
    // 3. Call your core backend banking REST API
    const response = await apiClient.getWallet(input.userId);
    return response;
  }
);

module.exports = { getWalletBalanceTool };
```

---

## 3. Can we use different AI models in Genkit?

**YES! Genkit is completely model-agnostic and provider-independent.**

You can switch models with a single line of code, or even run multi-model architectures (e.g. small fast model for intent routing, large model for complex reasoning).

### Supported Model Providers:
| Provider | Genkit Plugin Package | Example Models |
| :--- | :--- | :--- |
| **Google Gemini** | `@genkit-ai/google-genai` | `gemini-3.5-flash-lite`, `gemini-flash-latest`, `gemini-3.8-flash` |
| **OpenAI** | `genkitx-openai` | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| **Anthropic Claude** | `genkitx-anthropic` | `claude-3-5-sonnet`, `claude-3-5-haiku` |
| **Local Models (Ollama)** | `genkitx-ollama` | `deepseek-r1`, `llama3.3`, `mistral`, `qwen2.5` |
| **Groq (Fast Inference)** | `genkitx-groq` | `llama-3.3-70b-versatile` |

### How to configure multiple providers in code:
```javascript
const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
const { openAI } = require('genkitx-openai');
const { ollama } = require('genkitx-ollama');

// Register one or more model plugins
const ai = genkit({
  plugins: [
    googleAI(),
    openAI({ apiKey: process.env.OPENAI_API_KEY }),
    ollama({ models: [{ name: 'deepseek-r1' }] })
  ]
});

// Use whichever model fits your request:
// 1. Google Gemini
const resGemini = await ai.generate({
  model: googleAI.model('gemini-3.5-flash-lite'),
  prompt: 'Check balance for Alice',
  tools: [getWalletBalanceTool]
});

// 2. OpenAI GPT-4o
const resOpenAI = await ai.generate({
  model: openAI.model('gpt-4o-mini'),
  prompt: 'Check balance for Alice',
  tools: [getWalletBalanceTool]
});

// 3. Local Offline DeepSeek (Zero API Key)
const resLocal = await ai.generate({
  model: ollama.model('deepseek-r1'),
  prompt: 'Check balance for Alice',
  tools: [getWalletBalanceTool]
});
```

---

## 4. When transferring money to another user, how does it know the recipient ID?

In consumer fintech applications (Venmo, GoPay, Revolut), **users never know or type database IDs like `user_102`**. Users speak naturally:
> *"Kirim uang 20 dollar ke Bob ya"* or *"Transfer $50 to Bob Jones"*

Our architecture resolves the recipient through **three coordinated layers**:

```
User Input: "Kirim 20 dollar ke Bob"
      │
      ▼
[Layer 1: AI System Prompt Context]
- Maps "Bob" / "Bob Jones" to recipientId: "user_102"
- Strictly forbids asking the user for technical IDs
      │
      ▼
[Layer 2: MCP Tool Schema Definition]
- recipientId parameter accepts either "user_102" or contact name "Bob Jones"
      │
      ▼
[Layer 3: Core Banking Resolution Engine (db.findWallet)]
- Exact ID lookup: "user_102"
- Exact Full Name: "Bob Jones"
- Single-Word First Name: "Bob" -> "Bob Jones"
- Rejects non-contacts: "Bob Uchiha" -> returns null (prevents false transfers)
```

### 1. In the AI System Prompt (`genkit-app/src/agent.js`):
We provide the agent with a **Registered Contacts Directory**:
```text
REGISTERED CONTACTS DIRECTORY:
- Alice Smith (ID: user_101) -> The active authenticated user / sender
- Bob Jones (ID: user_102, also referred to as "Bob") -> Friend & Colleague (Active)
- Charlie Brown (ID: user_103, also referred to as "Charlie") -> Contact (Account FROZEN by Compliance)

RULES:
- When the user says "Bob" or "Bob Jones", pass recipientId: "user_102".
- NEVER ask the user for an ID, wallet ID, or account number!
```

### 2. In the Core Banking Database (`backend/src/db.js`):
The core banking layer includes a smart resolver `findWallet(query)`:
```javascript
findWallet(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();

  // 1. Exact ID match (e.g. 'user_102')
  if (this.data.wallets[q]) return this.data.wallets[q];

  // 2. Exact Full Name match (e.g. 'Bob Jones')
  for (const w of Object.values(this.data.wallets)) {
    if (w.name.toLowerCase() === q) return w;
  }

  // 3. Exact First Name match ONLY when query is a single word
  // 'bob' matches 'Bob Jones', but 'bob uchiha' does NOT match 'Bob Jones'
  if (!q.includes(' ')) {
    for (const w of Object.values(this.data.wallets)) {
      if (w.name.toLowerCase().split(' ')[0] === q) return w;
    }
  }

  return null; // Unknown contact!
}
```

If an unknown contact (e.g., `"Bob Uchiha"`) is entered, the agent detects `null` and asks for clarification rather than sending funds to the wrong person.

---

## 5. How do you call MCP through Genkit? (With Code Examples)

There are two primary ways MCP and Genkit connect:

### Pattern A: Exposing Genkit Tools as an MCP Server (Serving Tools)
Use Genkit's `createMcpServer` to package your tools into an MCP server over `stdio` so Claude, Cursor, or another agent can use them:

```javascript
// mcp-server/src/genkit-mcp-server.js
const { genkit, z } = require('genkit');
const { createMcpServer } = require('@genkit-ai/mcp');

const ai = genkit({});

// Define your tool
const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Retrieve wallet balance and account status',
    inputSchema: z.object({ userId: z.string() })
  },
  async ({ userId }) => {
    // Business logic
    return { balance: 1250.00, currency: 'USD' };
  }
);

// Create and start the MCP Server over stdio
const server = createMcpServer(ai, {
  name: 'wallet-mcp-server',
  version: '1.0.0'
});

async function run() {
  await server.start(); // Listens for MCP JSON-RPC over stdio
}

run();
```

---

### Pattern B: Consuming an External MCP Server in Genkit (Calling Tools)
If another team provides an external MCP server (e.g. a Postgres MCP server, GitHub MCP, or Filesystem MCP), Genkit can connect to it as a client using the `mcpClient` plugin:

```javascript
// genkit-app/src/consumer.js
const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
const { mcpClient } = require('@genkit-ai/mcp');

async function main() {
  const ai = genkit({
    plugins: [
      googleAI(),
      // Connect to an external MCP server running over stdio
      mcpClient({
        name: 'filesystem',
        transport: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/data/docs']
        }
      })
    ]
  });

  // Call the external MCP tool in ai.generate
  const response = await ai.generate({
    model: googleAI.model('gemini-3.5-flash-lite'),
    prompt: 'Read the summary file in the docs folder',
    // Tools from the MCP server are prefixed by the client name
    tools: ['filesystem/read_file', 'filesystem/list_directory']
  });

  console.log(response.text);
}

main();
```

---

### Pattern C: Calling Tools Inside a Genkit Flow (Used in this Project)
In this project's `genkit-app/src/agent.js`, the flow imports the tools directly and provides them to `ai.generate()`:

```javascript
const { ai } = require('./genkit');
const { googleAI } = require('@genkit-ai/google-genai');
const {
  tools: { executeTransferTool, getWalletBalanceTool }
} = require('../../mcp-server/src/genkit-mcp-server');

const walletAssistantFlow = ai.defineFlow(
  {
    name: 'walletAssistantFlow',
    inputSchema: z.object({ query: z.string(), userId: z.string() })
  },
  async ({ query, userId }) => {
    // Genkit automatically handles:
    // 1. Sending tool definitions to Gemini
    // 2. Receiving tool calls from the model
    // 3. Executing the corresponding JavaScript function
    // 4. Returning the tool result back to the model for the final human answer
    const response = await ai.generate({
      model: googleAI.model('gemini-3.5-flash-lite'),
      system: 'You are Devfest Assistant. Use tools to execute transfers and check balances.',
      prompt: query,
      tools: [executeTransferTool, getWalletBalanceTool]
    });

    return {
      query,
      response: response.text,
      toolCalls: response.messages
    };
  }
);
```

---

## 6. How do you inspect MCP tools? What is the difference between the MCP Inspector and the Genkit Web UI?

Both tools provide interactive web browser UIs to test tools and inspect parameters, but they operate at **different layers of the software architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Application / Agent Layer                                │
│    Firebase Genkit Developer UI (http://localhost:4000)     │
│    Command: npm run ui                                      │
│    • Inspects Genkit Flows (walletAssistantFlow)            │
│    • Full execution traces, step latencies, & token counts  │
│    • Live prompt engineering and model evaluation           │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Calls Tools)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Tool Protocol Layer                                      │
│    Official Anthropic MCP Inspector (http://localhost:5173) │
│    Command: npm run inspect                                 │
│    • Discovers tools via MCP JSON-RPC protocol over stdio   │
│    • Inspects raw Zod/JSON schemas                          │
│    • Validates compatibility for Antigravity, Claude, Cursor│
└──────────────────────────────┬──────────────────────────────┘
                               │ (HTTP REST)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Core Banking REST API (http://localhost:3001)            │
│    Command: npm run backend                                 │
└─────────────────────────────────────────────────────────────┘
```

### Feature Comparison Matrix:

| Feature | Official MCP Inspector (`npm run inspect`) | Firebase Genkit Developer UI (`npm run ui`) |
| :--- | :--- | :--- |
| **Command** | `npm run inspect` *(or `npm run mcp:inspect`)* | `npm run ui` |
| **Port / URL** | `http://localhost:5173` | `http://localhost:4000` |
| **Architectural Layer**| **Protocol Level** (Anthropic MCP standard) | **Application / Agent Level** (Firebase Genkit) |
| **Tool Inspection** | Discovers tools via MCP JSON-RPC (`tools/list`) | Discovers tools registered in Genkit (`ai.defineTool`) |
| **Agent Flows** | ❌ None (MCP only knows raw tools and resources) | ✅ Full support for **Flows** (`walletAssistantFlow`) |
| **Execution Tracing** | ❌ Shows raw JSON-RPC text messages | ✅ **Trace waterfalls** with step latency & tokens |
| **Model Testing** | ❌ Model-agnostic (does not invoke LLMs) | ✅ Live testing across Gemini, Claude, OpenAI, Ollama |
| **Best Used For** | Verifying MCP server compliance for **Antigravity, Claude Desktop, and Cursor** | Building AI workflows, multi-turn prompts, and application business logic |

### How to use the MCP Inspector:
```bash
npm run inspect
```
1. Spawns `npx @modelcontextprotocol/inspector node mcp-server/src/std-mcp-server.js`.
2. Open `http://localhost:5173` in your browser.
3. Select `devfest-wallet` $\rightarrow$ Click any tool $\rightarrow$ Fill arguments $\rightarrow$ Click **Run Tool**.

---

## Summary Cheat Sheet

| Question | Short Answer |
| :--- | :--- |
| **Is MCP from Genkit?** | No, MCP is an open standard by Anthropic. But Genkit has first-party integration via `@genkit-ai/mcp`. |
| **How to register tools?** | Use `ai.defineTool({ name, description, inputSchema: z.object({...}) }, handler)`. |
| **Can we change models?** | Yes, Genkit supports Gemini, OpenAI, Claude, DeepSeek, and Ollama with zero lock-in. |
| **How does it know recipient ID?** | Multi-layer resolution: System prompt maps names to IDs, and `db.findWallet()` resolves names/IDs in the core banking database. |
| **How to call MCP in Genkit?** | Either serve tools via `createMcpServer()` or consume external MCP tools via `mcpClient()`. |
