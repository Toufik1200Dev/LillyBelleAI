'use strict';

/**
 * Search / filter the local SharePoint export: sharepoint_metadata.json
 *
 * Index: index.json (posting lists only). Rebuilt when the dataset changes or with --reindex.
 *
 * Relevance scoring (multi-signal, computed on candidate files from the inverted index):
 *   +3  each query word found in the file title (once per word)
 *   +1  each query word found in the folder path (once per word)
 *   +10 normalized full query appears as a contiguous substring in the normalized title
 *   +5  every query word appears somewhere in title ∪ folder (combined)
 *   +0–5 freshness from lastModified (max +5 under ~30 days, linear decay toward ~400 days)
 *   +8  normalized title exactly equals the normalized full query (filename / title exact match)
 *   +3  file category matches a category explicitly hinted by query tokens (e.g. keyword "rh" → RH)
 *   +2  fuzzy match (fuzzball ratio ≥ 80) of a query word to a title word (typos), if not already an exact token hit
 *   +1  same for folder words
 *
 * Usage:
 *   node searchMetadata.js "mot cle"
 *   node searchMetadata.js --category RH "contrat"
 *   node searchMetadata.js --reindex
 *   node searchMetadata.js --reindex "contrat"
 *   npm run search -- "contrat pca"
 *
 * Env:
 *   SEARCH_LIMIT=20   (default 10, max 500)
 */

const fs = require('fs');
const path = require('path');
const {
  loadOrBuildFromDisk,
  search,
  describeIndex,
  clearSearchCache,
} = require('./sharepoint-search');

const DATA_FILE = path.join(__dirname, 'sharepoint_metadata.json');
const INDEX_FILE = path.join(__dirname, 'index.json');

function parseArgs(argv) {
  let reindex = false;
  /** @type {string[]} */
  const categories = [];
  /** @type {string[]} */
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reindex') {
      reindex = true;
    } else if (a === '--category' || a === '-c') {
      const v = argv[++i];
      if (v) categories.push(v);
    } else if (a.startsWith('--category=')) {
      categories.push(a.slice('--category='.length));
    } else {
      rest.push(a);
    }
  }
  return { reindex, categories, query: rest.join(' ').trim() };
}

const argv = process.argv.slice(2);
const { reindex, categories, query } = parseArgs(argv);
const limit = Math.max(1, Math.min(500, parseInt(process.env.SEARCH_LIMIT || '10', 10) || 10));

if (!query && !reindex) {
  console.error(`Dataset: ${DATA_FILE}`);
  console.error(`Index:    ${INDEX_FILE}`);
  console.error('Usage: node searchMetadata.js [--reindex] [--category RH] "your keywords"');
  console.error('       node searchMetadata.js --reindex   (rebuild index only)');
  process.exit(1);
}

if (!fs.existsSync(DATA_FILE)) {
  console.error(`File not found: ${DATA_FILE}`);
  console.error('Run fetchSharePointMetadata.js first or place sharepoint_metadata.json here.');
  process.exit(1);
}

const t0 = Date.now();
const { index, files, rebuilt } = loadOrBuildFromDisk(DATA_FILE, INDEX_FILE, {
  forceRebuild: reindex,
});
if (reindex) clearSearchCache();
console.error(describeIndex(index));
console.error(`Engine ready in ${Date.now() - t0} ms (${rebuilt ? 'rebuilt' : 'from cache'})`);

if (!query) {
  console.error('Reindex complete.');
  process.exit(0);
}

const t1 = Date.now();
const hits = search({ index, files }, query, {
  limit,
  categories: categories.length > 0 ? categories : null,
});
console.error(
  `Search "${query}"${categories.length ? ` [categories: ${categories.join(', ')}]` : ''} in ${Date.now() - t1} ms -> ${hits.length} hit(s)`
);
process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
