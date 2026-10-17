// Export all petition signatures to CSV.
// Usage: npm run export > signatures.csv

const { allSignatures } = require("../db");

const rows = allSignatures();
const cols = ["id", "first_name", "last_name", "email", "zip", "is_texas", "comment", "wants_updates", "created_at"];

function csv(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

process.stdout.write(cols.join(",") + "\n");
for (const row of rows) {
  process.stdout.write(cols.map((c) => csv(row[c])).join(",") + "\n");
}
