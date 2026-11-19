/**
 * Firebase Genkit MCP Demonstration
 * Use Case: Digital Wallet & Payment Services
 * Backed by Node.js Core Banking API
 */

const { startServer } = require('./backend/src/server');
const { walletAssistantFlow } = require('./genkit-app/src/agent');
const { apiClient } = require('./backend/src/client');
const { db } = require('./backend/src/db');

// Pretty printer helpers
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

async function printStep(title, query) {
  console.log('\n' + '='.repeat(70));
  console.log(bold(cyan(`▶ ${title}`)));
  console.log(dim(`User prompt:`), yellow(`"${query}"`));
  console.log('='.repeat(70));

  const result = await walletAssistantFlow({
    query,
    userId: 'user_101' // Alice Smith
  });

  if (result.toolCalls && result.toolCalls.length > 0) {
    const call = result.toolCalls[0];
    console.log(dim(`\n[MCP Protocol Tool Execution]`));
    console.log(blue(`Tool:`), bold(call.tool));
    console.log(blue(`Arguments:`), JSON.stringify(call.args));
    console.log(dim(`Backend API response exposed via MCP:`));
    console.log(dim(JSON.stringify(call.result, null, 2)));
  }

  console.log(green('\n[Firebase Genkit AI Agent Response]'));
  console.log(result.response);
  return result;
}

async function runDemo() {
  console.log(bold(cyan('\n══════════════════════════════════════════════════════════════════════')));
  console.log(bold(cyan('  🚀 FIREBASE GENKIT + MODEL CONTEXT PROTOCOL (MCP) DEMONSTRATION')));
  console.log(bold(cyan('     Topic: Digital Wallet & Payment Operations')));
  console.log(bold(cyan('     Data Source: Node.js Core Banking Backend API')));
  console.log(bold(cyan('══════════════════════════════════════════════════════════════════════\n')));

  // 1. Start Node.js Backend API Server
  const backendServer = await startServer(3001);
  console.log(green('✔ Node.js Backend API is running on http://localhost:3001'));

  // Initial balances snapshot
  const aliceInitial = await apiClient.getWallet('user_101');
  const bobInitial = await apiClient.getWallet('user_102');
  console.log(dim(`Initial state: Alice balance = $${aliceInitial.balance}, Bob balance = $${bobInitial.balance}\n`));

  try {
    // SCENARIO 1: Balance & Account Inquiry
    await printStep(
      'SCENARIO 1: Inquiring Wallet Balance & Account Status',
      'Hi, what is my current wallet balance and account status? (user_101)'
    );

    // SCENARIO 2: Check Status of Past Transfers (Success, Pending, Failed)
    await printStep(
      'SCENARIO 2A: Checking Status of Completed Transfer (TRF-1001)',
      'Can you check the status of my transfer TRF-1001?'
    );

    await printStep(
      'SCENARIO 2B: Checking Status of Pending Transfer (TRF-1002)',
      'Can you check the status of transfer TRF-1002?'
    );

    await printStep(
      'SCENARIO 2C: Checking Status of Failed Transfer with Compliance Reason (TRF-1003)',
      'Why did my transfer TRF-1003 fail? Please check its status.'
    );

    // SCENARIO 3: Check Top-up Status
    await printStep(
      'SCENARIO 3A: Checking Status of Completed Top-up (TOP-5001)',
      'Please check the status of top-up TOP-5001'
    );

    await printStep(
      'SCENARIO 3B: Checking Status of Pending Top-up (TOP-5002)',
      'What is happening with my top-up TOP-5002?'
    );

    // SCENARIO 4: Execute a Fund Transfer (Alice -> Bob $75.00)
    const transferDemo = await printStep(
      'SCENARIO 4: Executing Live Money Transfer via Genkit MCP',
      'Please transfer $75.00 to Bob (user_102) for team dinner contribution'
    );

    // SCENARIO 5: Initiate a New Top-up
    const topupDemo = await printStep(
      'SCENARIO 5: Initiating a New Top-Up via Virtual Account',
      'I want to top up $120.00 using virtual account for user_101'
    );

    // SCENARIO 6: Simulate completing the newly created topup in the backend
    if (topupDemo.toolCalls && topupDemo.toolCalls[0] && topupDemo.toolCalls[0].result.topupId) {
      const newTopupId = topupDemo.toolCalls[0].result.topupId;
      console.log('\n' + '-'.repeat(70));
      console.log(bold(cyan(`▶ SIMULATION: Simulating Payment Settlement for ${newTopupId} in Backend`)));
      console.log('-'.repeat(70));
      await apiClient.completeTopup(newTopupId);
      console.log(green(`✔ Backend processed webhook: Payment received. Account credited!`));

      // Re-check top-up status to verify
      await printStep(
        'SCENARIO 5B: Verifying Top-Up Status After Backend Payment Settlement',
        `Check status of topup ${newTopupId}`
      );
    }

    // SCENARIO 7: Transaction History
    await printStep(
      'SCENARIO 6: Inquiring Recent Transaction History',
      'Show me my recent transaction history for user_101'
    );

    // Final balance comparison
    const aliceFinal = await apiClient.getWallet('user_101');
    const bobFinal = await apiClient.getWallet('user_102');

    console.log('\n' + '='.repeat(70));
    console.log(bold(cyan('📊 FINAL RECONCILIATION SUMMARY')));
    console.log('='.repeat(70));
    console.log(`Alice (user_101): Initial = $${aliceInitial.balance.toFixed(2)} | Final = $${aliceFinal.balance.toFixed(2)}`);
    console.log(`Bob   (user_102): Initial = $${bobInitial.balance.toFixed(2)} | Final = $${bobFinal.balance.toFixed(2)}`);
    console.log(green('✔ State successfully modified and synchronized via Node.js Backend API + MCP!'));
    console.log('='.repeat(70));

  } finally {
    backendServer.close(() => {
      console.log(dim('\n[Backend Server closed clean-up]'));
    });
  }
}

if (require.main === module) {
  runDemo().catch((err) => {
    console.error('Fatal demo error:', err);
    process.exit(1);
  });
}

module.exports = { runDemo };
