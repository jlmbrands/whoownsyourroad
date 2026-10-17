// SQLite storage for petition signatures.
// Swap this file for a Postgres version later; server.js only uses the
// functions exported here.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "signatures.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS signatures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT    NOT NULL,
    last_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    zip         TEXT    NOT NULL,
    is_texas    INTEGER NOT NULL DEFAULT 0,
    comment     TEXT,
    wants_updates INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_signatures_zip ON signatures(zip);
`);

const insertStmt = db.prepare(`
  INSERT INTO signatures (first_name, last_name, email, zip, is_texas, comment, wants_updates)
  VALUES (@first_name, @last_name, @email, @zip, @is_texas, @comment, @wants_updates)
`);

const countStmt = db.prepare(`
  SELECT COUNT(*) AS total, COALESCE(SUM(is_texas), 0) AS texas FROM signatures
`);

const allStmt = db.prepare(`
  SELECT id, first_name, last_name, email, zip, is_texas, comment, wants_updates, created_at
  FROM signatures ORDER BY id
`);

function addSignature(sig) {
  try {
    insertStmt.run(sig);
    return { ok: true };
  } catch (err) {
    if (err && err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { ok: false, duplicate: true };
    }
    throw err;
  }
}

function getCounts() {
  return countStmt.get();
}

function allSignatures() {
  return allStmt.all();
}

module.exports = { addSignature, getCounts, allSignatures, db };
