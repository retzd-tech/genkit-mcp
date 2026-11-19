const { startServer } = require('../../backend/src/server');
const { ai, walletAssistantFlow, walletTools } = require('./agent');

async function main() {
  console.log('[Genkit Dev Mode] Starting backend API on port 3001...');
  await startServer(3001);
  console.log('[Genkit Dev Mode] Flow and Tools registered with Genkit:');
  console.log(' - Flow: walletAssistantFlow');
  console.log(' - Tools: get_wallet_balance, check_transfer_status, check_topup_status, execute_transfer, initiate_topup, get_transaction_history');
  console.log('[Genkit Dev Mode] Ready for Genkit Developer UI inspection!');

  // Keep process alive for reflection and UI interaction
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  console.error('[Genkit Dev Mode] Error:', err);
  process.exit(1);
});
