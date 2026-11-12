'use strict';
// NWP-ENGINE-006 isolation check.
//   1. Only database.js may import the `pg` driver.
//   2. Only catalog-repository.js may require database.js.
// Usage (from the project root):  node scripts/check-pg-isolation.js <engine folder>
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || '.';
const PG_OWNER = 'database.js';
const DB_CALLER = 'catalog-repository.js';
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.amplify', 'amplify']);
const PG_IMPORT = /require\(\s*['"]pg['"]\s*\)|from\s+['"]pg['"]|import\(\s*['"]pg['"]\s*\)/;
const DB_IMPORT = /require\(\s*['"]\.{1,2}\/(?:[^'"]*\/)?database(?:\.js)?['"]\s*\)|from\s+['"]\.{1,2}\/(?:[^'"]*\/)?database(?:\.js)?['"]/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) yield* walk(path.join(dir, entry.name));
    } else if (/\.(js|cjs|mjs|ts|tsx)$/.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

const rows = [];
for (const file of walk(root)) {
  const name = path.basename(file);
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (PG_IMPORT.test(line)) rows.push({ kind: 'pg', ok: name === PG_OWNER, file, line: i + 1, text: line.trim() });
    if (DB_IMPORT.test(line)) rows.push({ kind: 'database.js', ok: name === DB_CALLER, file, line: i + 1, text: line.trim() });
  });
}

rows.forEach((r) => console.log(`${r.ok ? 'ok       ' : 'VIOLATION'}  [${r.kind}]  ${r.file}:${r.line}  ${r.text}`));
const bad = rows.filter((r) => !r.ok);
const sawPg = rows.some((r) => r.kind === 'pg');
if (bad.length) console.log(`\nFAIL: ${bad.length} violation(s). Only ${PG_OWNER} may import pg, and only ${DB_CALLER} may require ${PG_OWNER}.`);
else if (!sawPg) console.log(`\nNo imports of pg found under ${root}. Check the folder (is ${PG_OWNER} inside it?).`);
else console.log(`\nPASS: only ${PG_OWNER} imports pg, and only ${DB_CALLER} uses it.`);
process.exit(!bad.length && sawPg ? 0 : 1);