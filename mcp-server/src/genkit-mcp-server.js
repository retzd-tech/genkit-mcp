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

// TODO [Exercise 3.2]: Register check_transfer_status with ai.defineTool
// Hint:
// const checkTransferStatusTool = ai.defineTool(
//   {
//     name: 'check_transfer_status',
//     description: 'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
//     inputSchema: CheckTransferStatusInput,
//   },
//   async (input) => handlers.checkTransferStatus(input)
// );
const checkTransferStatusTool = ai.defineTool(
  {
    name: 'check_transfer_status',
    description: 'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
    inputSchema: CheckTransferStatusInput,
  },
  async (input) => handlers.checkTransferStatus(input)
);

// TODO [Exercise 3.3]: Register check_topup_status with ai.defineTool
// YOUR CODE HERE (follow Exercise 3.2 pattern)
const checkTopupStatusTool = null; // Replace with ai.defineTool(...)

// TODO [Exercise 3.4]: Register execute_transfer with ai.defineTool
// YOUR CODE HERE (follow Exercise 3.2 pattern)
const executeTransferTool = null; // Replace with ai.defineTool(...)

// TODO [Exercise 3.5]: Register initiate_topup with ai.defineTool
// YOUR CODE HERE (follow Exercise 3.2 pattern)
const initiateTopupTool = null; // Replace with ai.defineTool(...)

// TODO [Exercise 3.6]: Register get_transaction_history with ai.defineTool
// YOUR CODE HERE (follow Exercise 3.2 pattern)
const getTransactionHistoryTool = null; // Replace with ai.defineTool(...)

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
