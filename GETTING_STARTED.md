# Beginner's Guide: Getting Started with Firebase Genkit & MCP

Welcome! If you are new to **Firebase Genkit** or the **Model Context Protocol (MCP)**, this step-by-step guide is designed specifically for you.

By the end of this guide, you will understand:
1. How a standard **Node.js REST API Backend** provides data for AI.
2. How the **Model Context Protocol (MCP)** standardizes backend functions into tools for AI models.
3. How **Firebase Genkit** runs AI flows that intelligently pick and execute those tools.

---

## 1. Prerequisites & Preparation

Before running anything, verify your local environment:

### Step 1.1: Verify Node.js and npm
Open your terminal and run:
```bash
node -v
npm -v
```
* **Required**: Node.js `v18.0.0` or higher (Node `v20` or `v22` recommended).
* **Required**: npm `v9.0.0` or higher.

*(If you don't have Node.js installed, download the LTS version from [nodejs.org](https://nodejs.org/)).*

### Step 1.2: Check Project Directory
Ensure you are in the root directory of this project:
```bash
cd /Users/surahutomo/Documents/Workshop/genkit-mcp
```

### Step 1.3: (Optional) Google Gemini API Key
This project includes a **built-in local reasoning engine** so you can run, test, and learn everything **100% offline with zero API keys and $0 cost**.

If you *do* want to test with Google's live cloud Gemini model:
```bash
cp .env.example .env
```
Open `.env` in your editor and insert your key:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_key_here
```

*(For a full breakdown of how both the local reasoning engine and cloud Gemini function under the hood, see the **[Dual-Engine AI Architecture Guide (AI_ENGINES_GUIDE.md)](AI_ENGINES_GUIDE.md)**).*

---

## 2. Installation

Install all project dependencies with one command:
```bash
npm install
```
This installs:
* `express`: Runs the core banking REST API backend.
* `genkit`: The Firebase Genkit AI framework.
* `genkit-cli`: The local Genkit Developer Web UI (`localhost:4000`).
* `@genkit-ai/mcp`: Genkit's Model Context Protocol integration.
* `@modelcontextprotocol/sdk`: The official Anthropic/Linux Foundation MCP SDK.
* `zod`: Schema validation for tool inputs and outputs.

---

## 3. The 3 Demo Accounts (Our Test Sandbox)

The system comes pre-loaded with 3 fictional bank accounts stored in `backend/data/wallet-db.json`:

| User ID | Account Holder | Initial Balance | Account Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user_101` | **Alice Smith** | **$1,250.00** | ACTIVE | Premium tier account (Default user) |
| `user_102` | **Bob Jones** | **$320.50** | ACTIVE | Standard tier account (Alice's friend) |
| `user_103` | **Charlie Brown** | **$45.00** | FROZEN | Compliance lock (Transfers to him will fail) |

---

## 4. Running Components One-by-One (Learning the Pipeline)

We will start with the lowest level (the backend) and move up to the AI UI.

### Step 4.1: Run the Backend API Only
In an enterprise company, the backend is an existing service. Let's run just the backend first:

```bash
npm run backend
```
**What you should see in terminal:**
```
[Wallet Backend] Express server running on http://localhost:3001
```

Now open a **new terminal tab** and test the REST endpoints directly:
```bash
# 1. Check health
curl http://localhost:3001/api/health

# 2. Check Alice's wallet
curl http://localhost:3001/api/wallets/user_101

# 3. Check past transfer TRF-1001
curl http://localhost:3001/api/transfers/TRF-1001
```
*Takeaway*: The backend is just standard Node.js Express. It does not know or care about AI.

---

### Step 4.2: Launch the Firebase Genkit Developer Web UI
Now let's launch the visual AI workbench. Stop the backend (`Ctrl+C` in that terminal) and run:

```bash
npm run ui
```

**What you should see in terminal:**
```
[Genkit Dev Mode] Starting backend API on port 3001...
✔ Node.js Backend API is running on http://localhost:3001
Genkit Developer UI started at http://localhost:4000
```

Open **`http://localhost:4000`** in your browser.
Look at the left sidebar:
* **`Tools (6)`**: The 6 payment tools exposed via MCP.
* **`Flows (4)`**: The AI workflows (`walletAssistantFlow`, `transferFundsFlow`, etc.).

---

### Step 4.3: Run the Interactive Terminal Chat
If you prefer a conversational terminal experience like ChatGPT:

Open a new terminal tab and run:
```bash
npm run chat
```

**What you should see:**
```
=================================================================
💳 Firebase Genkit MCP Wallet Assistant (Interactive Chat)
=================================================================
Logged in as: Alice Smith (user_101)
Try asking:
  • "What is my current balance?"
  • "Transfer $35 to user_102 for lunch"
  • "Check status of transfer TRF-1002"
-----------------------------------------------------------------

💬 You: 
```

Type `"What is my balance?"` and hit Enter!

---

### Step 4.4: Run the Standalone MCP Server (External Client Mode)
If you want to plug this wallet into **Claude Desktop**, **Cursor**, or **Antigravity**:

```bash
npm run mcp:std
```
This runs the standard Model Context Protocol over `stdio`. Any external AI client configured to run this command will automatically discover all 6 payment tools!

---

### Step 4.5: Run the Automated Full-Scenario E2E Test Suite
To see all payment scenarios executed automatically with colorful console outputs:

```bash
npm run e2e
```
This executes 7 real-life payment situations and prints a financial reconciliation summary at the end.

---

## 5. How to Try Every Single Feature (Hands-On Tour)

Here is how you can test all 7 features across both the **Genkit Web UI** (`localhost:4000`) and the **Terminal Chat** (`npm run chat`):

---

### Feature 1: Check Wallet Balance & Profile
* **Goal**: Find out how much money is in an account and check its tier.
* **In Genkit Web UI (`localhost:4000`)**:
  1. Click **Tools** in the sidebar → Select `get_wallet_balance`.
  2. In the `userId` field, type: `user_101`.
  3. Click **Run Tool**.
  4. You will see: Balance `$1250.00 USD`, status `ACTIVE`, tier `PREMIUM`.
* **In Terminal Chat (`npm run chat`)**:
  * Type: `What is my current balance?`
  * Response: Shows Alice's balance and status.

---

### Feature 2: Inquire Transfer Status (3 Different Cases)
* **Goal**: Check whether a past money transfer succeeded, is pending, or failed.
* **Case 2A: Completed Transfer (`TRF-1001`)**:
  * In Chat, type: `Check status of transfer TRF-1001`
  * Result: `✅ COMPLETED` - Alice sent $100 to Bob for "Dinner split".
* **Case 2B: Pending Transfer (`TRF-1002`)**:
  * In Chat, type: `Can you check transfer TRF-1002?`
  * Result: `⏳ PENDING` - Bob sent $25 to Alice for "Coffee reimbursement".
* **Case 2C: Failed Transfer with Compliance Reason (`TRF-1003`)**:
  * In Chat, type: `Why did transfer TRF-1003 fail?`
  * Result: `❌ FAILED` - Reason: *"Recipient account is FROZEN by compliance"*.

---

### Feature 3: Execute a Live Money Transfer
* **Goal**: Transfer funds from Alice (`user_101`) to Bob (`user_102`) and watch balances change live.
* **In Genkit Web UI (`localhost:4000`)**:
  1. Click **Flows** in sidebar → Select `walletAssistantFlow`.
  2. In the input box, paste:
     ```json
     {
       "query": "Please transfer $50 to Bob (user_102) for concert tickets",
       "userId": "user_101"
     }
     ```
  3. Click **Run**.
  4. Notice the result:
     * Transaction ID generated (e.g. `TRF-7411`).
     * Alice's remaining balance is updated from `$1,250.00` down to `$1,200.00`.
  5. Click the **Trace** tab: You can visually inspect the exact step where the AI chose and called `execute_transfer`!
* **In Terminal Chat (`npm run chat`)**:
  * Type: `Transfer $30 to user_102 for lunch`
  * You will immediately see the transfer receipt and your new remaining balance.

---

### Feature 4: Check Top-Up Status
* **Goal**: Inquire status of an account top-up.
* **In Terminal Chat**:
  * Type: `Check status of topup TOP-5001`
  * Result: `✅ SUCCESS` - $200.00 via Virtual Account `88019283746` (Chase Bank).
  * Type: `What is happening with topup TOP-5002?`
  * Result: `⏳ PENDING` - $50.00 via Credit Card (Awaiting 3D Secure verification).

---

### Feature 5: Initiate a New Top-Up via Virtual Account
* **Goal**: Request funds to be added to the wallet and get bank payment instructions.
* **In Genkit Web UI**:
  1. Click **Tools** in sidebar → Select `initiate_topup`.
  2. Input:
     * `userId`: `user_101`
     * `amount`: `150`
     * `paymentMethod`: `VIRTUAL_ACCOUNT`
  3. Click **Run Tool**.
  4. Result: Generates a new top-up ID (e.g. `TOP-8921`) and a unique Virtual Account Number (`8801xxxxxxx`) valid for 24 hours.
* **In Terminal Chat**:
  * Type: `I want to top up $75 using virtual account`
  * The assistant returns the Virtual Account Number to pay into.

---

### Feature 6: Inquire Recent Transaction History
* **Goal**: See a chronological ledger of all money in, money out, and top-ups.
* **In Terminal Chat**:
  * Type: `Show me my recent transaction history`
  * Result:
    ```
    📜 Recent Transactions for user_101 (5 entries):
    1. 📤 TRF-xxxx [COMPLETED] - -$50.00 USD (Concert tickets)
    2. 💳 TOP-5001 [SUCCESS]   - +$200.00 USD (Top-up via Virtual Account)
    3. 📤 TRF-1001 [COMPLETED] - -$100.00 USD (Dinner split)
    ```

---

### Feature 7: Resetting the Database to Clean State
Because transfers and top-ups modify the database in `backend/data/wallet-db.json`, you might want to restore the pristine starting balances after experimenting:

Run anytime:
```bash
npm run reset-db
```
**Output:**
```
[DB] Resetting wallet database to initial seed data...
[DB] Database reset successfully! Initial balances and transactions restored.
```
Alice is back to `$1,250.00`, Bob is back to `$320.50`, and test transfers are cleaned up.

---

## 6. Summary of CLI Commands

| Command | What It Does | When to Use |
| :--- | :--- | :--- |
| `npm run ui` | Starts backend + Genkit Web UI on `http://localhost:4000` | Recommended for visual testing, inspection, and traces |
| `npm run chat` | Interactive AI chat in your terminal | Quick conversational testing |
| `npm run backend` | Starts ONLY the Express REST API on `localhost:3001` | When testing the backend independently with cURL/Postman |
| `npm run mcp:std` | Runs the standard MCP Server on `stdio` | Connecting to Claude Desktop, Cursor, or Antigravity |
| `npm run e2e` | Runs the automated 7-scenario end-to-end test walkthrough | Automated regression test of all payment use cases |
| `npm run reset-db` | Restores `wallet-db.json` to initial seed values | Whenever you want a fresh start |

Happy coding! If you have any questions or want to add a new tool, check [`mcp-server/src/tools.js`](mcp-server/src/tools.js) to see how easy it is to define a new tool.
