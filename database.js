const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbPath;
if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'securecv.sqlite');
  const sourceDbPath = path.resolve(__dirname, 'securecv.sqlite');
  if (!fs.existsSync(tmpDbPath)) {
    if (fs.existsSync(sourceDbPath)) {
      try {
        fs.copyFileSync(sourceDbPath, tmpDbPath);
      } catch (e) {
        console.error('Database copy to /tmp notice:', e.message);
      }
    }
  }
  dbPath = tmpDbPath;
} else {
  dbPath = path.resolve(__dirname, '..', process.env.DB_FILE || 'db/securecv.sqlite');
}

const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Security & Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// Ensure username column exists if users table was already created
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (tableCheck) {
    const tableInfo = db.pragma('table_info(users)');
    const hasUsername = tableInfo.some(col => col.name === 'username');
    if (!hasUsername) {
      db.exec("ALTER TABLE users ADD COLUMN username TEXT;");
    }
  }
} catch (e) {
  // Ignored if table not created yet
}

// Run schema initialization
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

module.exports = db;
