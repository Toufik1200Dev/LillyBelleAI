'use strict';

/**
 * Copy search *.js from src/n8n-data → dist/n8n-data so Render/production finds them
 * next to compiled code (dynamic import does not use TypeScript paths).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src', 'n8n-data');
const destDir = path.join(root, 'dist', 'n8n-data');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-n8n-data-js] skip: missing', srcDir);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.js')) continue;
  const from = path.join(srcDir, name);
  const to = path.join(destDir, name);
  fs.copyFileSync(from, to);
  console.log('[copy-n8n-data-js]', name, '→ dist/n8n-data/');
}
