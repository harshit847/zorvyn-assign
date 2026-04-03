const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbFile = process.env.DB_FILE || './data/finance.db';
const dbPath = path.resolve(dbFile);

let db;

function normalizeParams(params) {
  if (!Array.isArray(params)) {
    return [];
  }

  return params.map((value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value === undefined) {
      return null;
    }
    return value;
  });
}

function wrapDb(database) {
  return {
    run(sql, params, callback) {
      const values = normalizeParams(params);

      try {
        const stmt = database.prepare(sql);
        const result = stmt.run(...values);
        if (typeof callback === 'function') {
          callback.call(
            {
              lastID: Number(result.lastInsertRowid || 0),
              changes: Number(result.changes || 0),
            },
            null
          );
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback.call({ lastID: 0, changes: 0 }, error);
          return;
        }
        throw error;
      }
    },

    get(sql, params, callback) {
      const values = normalizeParams(params);

      try {
        const stmt = database.prepare(sql);
        const row = stmt.get(...values);
        if (typeof callback === 'function') {
          callback(null, row);
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback(error);
          return;
        }
        throw error;
      }
    },

    all(sql, params, callback) {
      const values = normalizeParams(params);

      try {
        const stmt = database.prepare(sql);
        const rows = stmt.all(...values);
        if (typeof callback === 'function') {
          callback(null, rows);
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback(error);
          return;
        }
        throw error;
      }
    },
  };
}

function initDb() {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const rawDb = new DatabaseSync(dbPath);
      rawDb.exec('PRAGMA foreign_keys = ON');
      rawDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      rawDb.exec(`
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
      `);

      db = wrapDb(rawDb);
      resolve();
    } catch (err) {
      reject(err);
    }
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
