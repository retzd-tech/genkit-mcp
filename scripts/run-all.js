const { spawn } = require('child_process');

console.log('══════════════════════════════════════════════════════════════════════');
console.log('  🚀 Starting Devfest Wallet Microservices');
console.log('     1. Core Banking API   -> http://localhost:3001');
console.log('     2. Genkit MCP Agent   -> http://localhost:3002');
console.log('     3. Frontend Mobile UI -> http://localhost:3000');
console.log('══════════════════════════════════════════════════════════════════════\n');

const services = [
  { name: 'Backend', color: '\x1b[34m', file: 'backend/src/server.js' },
  { name: 'Agent', color: '\x1b[35m', file: 'genkit-app/src/server.js' },
  { name: 'Frontend', color: '\x1b[32m', file: 'frontend/server.js' }
];

const processes = [];

services.forEach(({ name, color, file }) => {
  const reset = '\x1b[0m';
  const prefix = `${color}[${name}]${reset}`;

  const child = spawn(process.execPath, [file], {
    env: { ...process.env },
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.log(`${prefix} ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.error(`${prefix} \x1b[31m${line}${reset}`);
    });
  });

  child.on('close', (code) => {
    console.log(`${prefix} exited with code ${code}`);
  });

  processes.push(child);
});

function cleanup() {
  console.log('\nShutting down all services...');
  processes.forEach((p) => p.kill());
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
