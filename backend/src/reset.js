const { db } = require('./db');

console.log('[DB] Resetting wallet database to initial seed data...');
const success = db.resetData();
if (success) {
  console.log('[DB] Database reset successfully! Initial balances and transactions restored.');
} else {
  console.error('[DB] Failed to reset database.');
}
