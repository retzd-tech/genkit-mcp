const readline = require('readline');
const { walletAssistantFlow } = require('./agent');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(65));
console.log('💳 Firebase Genkit MCP Wallet Assistant (Interactive Chat)');
console.log('='.repeat(65));
console.log('Logged in as: Alice Smith (user_101)');
console.log('Try asking:');
console.log('  • "What is my current balance?"');
console.log('  • "Check status of transfer TRF-1002"');
console.log('  • "What is the status of top-up TOP-5002?"');
console.log('  • "Transfer $35 to user_102 for lunch"');
console.log('  • "I want to top up $50 using virtual account"');
console.log('  • "Show my recent transaction history"');
console.log('  • "exit" to quit');
console.log('-'.repeat(65));

function prompt() {
  rl.question('\n💬 You: ', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      prompt();
      return;
    }
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log('👋 Goodbye!');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('🤖 Assistant thinking & querying MCP tools...');
      const result = await walletAssistantFlow({
        query: trimmed,
        userId: 'user_101'
      });

      console.log('\n--- Assistant Response ---');
      console.log(result.response);
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`\n[MCP Tool Invoked: ${result.toolCalls[0].tool || 'tool'}]`);
      }
    } catch (err) {
      console.error('❌ Error executing request:', err.message);
    }

    prompt();
  });
}

prompt();
