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

// ============================================================================
// WORKSHOP EXERCISE 2: Standard Model Context Protocol (MCP) Server
// ============================================================================

const server = new McpServer({
  name: 'wallet-payment-mcp-server',
  version: '1.0.0',
  description: 'MCP Server providing payment & digital wallet operations backed by Node.js Core Banking API'
});

// [Reference Example 2.1]: Register get_wallet_balance
server.tool(
  'get_wallet_balance',
  'Retrieve current wallet balance, currency, account holder details, and status for a given user ID.',
  GetWalletBalanceInput.shape,
  async (args) => {
    const result = await handlers.getWalletBalance(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

// TODO [Exercise 2.2]: Register check_transfer_status
// Hint:
// server.tool(
//   'check_transfer_status',
//   'Inquire transfer status, parties, timestamp, and failure reason (if any) using transfer ID or reference ID.',
//   CheckTransferStatusInput.shape,
//   async (args) => {
//     const result = await handlers.checkTransferStatus(args);
//     return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
//   }
// );
// YOUR CODE HERE: Register check_transfer_status tool

// TODO [Exercise 2.3]: Register check_topup_status
// Hint:
// server.tool('check_topup_status', description, CheckTopupStatusInput.shape, async (args) => ...)
// YOUR CODE HERE: Register check_topup_status tool

// TODO [Exercise 2.4]: Register execute_transfer
// Hint:
// server.tool('execute_transfer', description, ExecuteTransferInput.shape, async (args) => ...)
// YOUR CODE HERE: Register execute_transfer tool

// TODO [Exercise 2.5]: Register initiate_topup
// Hint:
// server.tool('initiate_topup', description, InitiateTopupInput.shape, async (args) => ...)
// YOUR CODE HERE: Register initiate_topup tool

// TODO [Exercise 2.6]: Register get_transaction_history
// Hint:
// server.tool('get_transaction_history', description, GetTransactionHistoryInput.shape, async (args) => ...)
// YOUR CODE HERE: Register get_transaction_history tool

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Standard MCP] Wallet Payment MCP Server running on stdio');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Standard MCP] Fatal error starting server:', err);
    process.exit(1);
  });
}

module.exports = { server };
