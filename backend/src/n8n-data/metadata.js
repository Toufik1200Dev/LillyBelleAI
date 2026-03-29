'use strict';

/**
 * Entry point for n8n (Code node, Function node via require, or child_process).
 * Searches local SharePoint export using index.json + sharepoint_metadata.json.
 *
 * Example (n8n Code node, self-hosted with NODE_FUNCTION_ALLOW_BUILTIN=require):
 *   const m = require('/absolute/path/to/backend/src/n8n-data/metadata.js');
 *   const q = $input.item.json.body?.message ?? '';
 *   return m.searchDocuments(q, { limit: 15 });
 *
 * Prefer HTTP: POST /api/internal/sharepoint-search on this backend (see server).
 */

const path = require('path');
const ss = require('./sharepoint-search');

const DATA_FILE = path.join(__dirname, 'sharepoint_metadata.json');
const INDEX_FILE = path.join(__dirname, 'index.json');

/**
 * @param {string} query
 * @param {{ limit?: number, categories?: string[] }} [options]
 * @returns {Array<{ title, folder, url, lastModified, size, score, category }>}
 */
function searchDocuments(query, options) {
  const state = ss.getCachedSearchState(DATA_FILE, INDEX_FILE);
  return ss.search(
    { index: state.index, files: state.files },
    query,
    options || {}
  );
}

/**
 * @param {string} query
 * @param {{ limit?: number, categories?: string[] }} [options]
 */
function searchDocumentsJson(query, options) {
  return JSON.stringify(searchDocuments(query, options));
}

module.exports = {
  searchDocuments,
  searchDocumentsJson,
  loadOrBuildFromDisk: ss.loadOrBuildFromDisk,
  search: ss.search,
  describeIndex: ss.describeIndex,
  clearSearchCache: ss.clearSearchCache,
  DATA_FILE,
  INDEX_FILE,
};
