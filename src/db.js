const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fs = require('fs');
const path = require('path');

const dbFile = process.env.DB_FILE || './data/finance.json';
const dbPath = path.resolve(dbFile);

let db;

async function initDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const adapter = new JSONFile(dbPath);
  db = new Low(adapter);
  await db.read();

  db.data = db.data || { users: [], finance_records: [], counters: { userId: 0, recordId: 0 } };
  await db.write();
}

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Call initDb() first.');
  }
  return db;
}

module.exports = {
  initDb,
  getDb,
};