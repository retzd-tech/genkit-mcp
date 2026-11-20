const { ai } = require('../../genkit-app/src/genkit');
const { createMcpServer } = require('@genkit-ai/mcp');
const {
  GetWalletBalanceInput,
  CheckTransferStatusInput,
  CheckTopupStatusInput,
  ExecuteTransferInput,
  InitiateTopupInput,
  GetTransactionHistoryInput,
  handlers
} = require('./tools');

// ============================================================================
// WORKSHOP EXERCISE 3: Firebase Genkit Tool Registration (ai.defineTool)
// ============================================================================

// [Reference Example 3.1]: Tool: get_wallet_balance
const getWalletBalanceTool = ai.defineTool(
  {
    name: 'get_wallet_balance',
    description: 'Retrieve current wallet balance, currency, account holder name, and account status for a given user ID.',
    inputSchema: GetWalletBalanceInput,
  },
  async (input) => handlers.getWalletBalance(input)
);

// TODO [Exercise 3.2]: Tool: check_transfer_status
const checkTransferStatusTool = ai.defineTool(
  {
    name: 'check_transfer_status',
    description: 'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
    inputSchema: CheckTransferStatusInput,
  },
  async (input) => handlers.checkTransferStatus(input)
);

// TODO [Exercise 3.3]: Tool: check_topup_status
const checkTopupStatusTool = ai.defineTool(
  {
    name: 'check_topup_status',
    description: 'Inquire top-up status, payment method, virtual account or settlement information by topup ID or reference ID.',
    inputSchema: CheckTopupStatusInput,
  },
  async (input) => handlers.checkTopupStatus(input)
);

// TODO [Exercise 3.4]: Tool: execute_transfer
const executeTransferTool = ai.defineTool(
  {
    name: 'execute_transfer',
    description: 'Execute a wallet-to-wallet transfer from sender to recipient. Deducts sender balance and credits recipient balance.',
    inputSchema: ExecuteTransferInput,
  },
  async (input) => handlers.executeTransfer(input)
);

// TODO [Exercise 3.5]: Tool: initiate_topup
const initiateTopupTool = ai.defineTool(
  {
    name: 'initiate_topup',
    description: 'Initiate a wallet balance top-up for a user via VIRTUAL_ACCOUNT, CREDIT_CARD, or BANK_TRANSFER.',
    inputSchema: InitiateTopupInput,
  },
  async (input) => handlers.initiateTopup(input)
);

// TODO [Exercise 3.6]: Tool: get_transaction_history
const getTransactionHistoryTool = ai.defineTool(
  {
    name: 'get_transaction_history',
    description: 'Retrieve recent transaction history (inflows, outflows, and topups) for a wallet user account.',
    inputSchema: GetTransactionHistoryInput,
  },
  async (input) => handlers.getTransactionHistory(input)
);

// Create the Genkit MCP Server
const mcpServer = createMcpServer(ai, {
  name: 'wallet-genkit-mcp-server',
  version: '1.0.0'
});

async function run() {
  console.log('[Genkit MCP] Starting Wallet Genkit MCP Server (stdio transport)...');
  await mcpServer.start();
  console.log('[Genkit MCP] Server listening for MCP requests via stdio.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[Genkit MCP] Fatal error starting server:', err);
    process.exit(1);
  });
}

module.exports = {
  ai,
  mcpServer,
  tools: {
    getWalletBalanceTool,
    checkTransferStatusTool,
    checkTopupStatusTool,
    executeTransferTool,
    initiateTopupTool,
    getTransactionHistoryTool
  }
};
