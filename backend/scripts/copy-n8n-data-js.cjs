'use strict';

/**
 * Copy search *.js from src/n8n-data → dist/n8n-data (production / Render).
 * Exits with error if nothing was copied so deploy fails loudly instead of a broken runtime.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src', 'n8n-data');
const destDir = path.join(root, 'dist', 'n8n-data');

if (!fs.existsSync(srcDir)) {
  console.error('[copy-n8n-data-js] FATAL: missing source dir', srcDir);
  process.exit(1);
}

const jsNames = fs.readdirSync(srcDir).filter((n) => n.endsWith('.js'));
if (jsNames.length === 0) {
  console.error('[copy-n8n-data-js] FATAL: no .js files in', srcDir);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of jsNames) {
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  console.log('[copy-n8n-data-js]', name, '→ dist/n8n-data/');
}

const required = ['metadata.js', 'sharepoint-search.js'];
for (const name of required) {
  const p = path.join(destDir, name);
  if (!fs.existsSync(p)) {
    console.error('[copy-n8n-data-js] FATAL: expected', p);
    process.exit(1);
  }
}
