const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbFile = process.env.DB_FILE || './data/finance.db';
const dbPath = path.resolve(dbFile);

let db;

function initDb() {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS finance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income','expense')),
            amount REAL NOT NULL CHECK(amount >= 0),
            category TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
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