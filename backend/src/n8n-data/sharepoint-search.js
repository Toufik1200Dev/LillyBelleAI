'use strict';

/**
 * SharePoint metadata search: inverted index (titleIndex, folderIndex, byCategory)
 * + multi-signal relevance scoring (see searchMetadata.js header).
 * Fuzzy word bonuses (fuzzball ratio ≥ 80) help ranking on typos when tokens still
 * intersect the index via other words (e.g. "contratt pca" + hit on "pca").
 */

const fs = require('fs');
const path = require('path');
const fuzz = require('fuzzball');

// ─── Normalization & tokenization ─────────────────────────────────────────────

function normalizeForMatch(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(text) {
  const n = normalizeForMatch(text);
  if (!n) return [];
  return n.split(/\s+/).filter((t) => t.length >= 2);
}

// ─── Category (aligned with index.json byCategory keys) ──────────────────────

function inferCategory(file) {
  const folder = file.folder || '';
  if (/po[\s_]*client|06_po\s*client|_po\s*client/i.test(folder)) return 'PO_CLIENT';
  if (/po[\s_]*fournis|07_po/i.test(folder)) return 'PO_FOURNISSEUR';
  if (/opportunit/i.test(folder)) return 'OPPORTUNITIES';

  const parts = folder.split(/[/\\]/).map((p) => normalizeForMatch(p));
  if (parts.some((p) => p === 'rh')) return 'RH';

  const nf = normalizeForMatch(`${folder} ${file.title || ''}`);
  const w = nf.split(/\s+/);
  if (w.includes('rh')) return 'RH';

  return 'OTHER';
}

function buildIndexFromFiles(files, sourceMeta) {
  const titleIndex = Object.create(null);
  const folderIndex = Object.create(null);
  const byCategory = {
    RH: [],
    PO_CLIENT: [],
    PO_FOURNISSEUR: [],
    OPPORTUNITIES: [],
    OTHER: [],
  };

  const addTokens = (inv, text, fileIndex) => {
    const seen = new Set(tokenize(text));
    for (const t of seen) {
      if (!inv[t]) inv[t] = [];
      inv[t].push(fileIndex);
    }
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const cat = inferCategory(file);
    byCategory[cat].push(i);
    addTokens(titleIndex, file.title || '', i);
    addTokens(folderIndex, file.folder || '', i);
  }

  return {
    v: 1,
    source: sourceMeta,
    titleIndex,
    folderIndex,
    byCategory,
  };
}

function sourcesMatch(metaStat, indexSource) {
  if (!indexSource || !indexSource.fileCount) return false;
  return (
    indexSource.fileCount === metaStat.fileCount &&
    indexSource.size === metaStat.size &&
    Math.abs((indexSource.mtimeMs ?? 0) - metaStat.mtimeMs) < 3000
  );
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function freshnessScore(lastModifiedIso) {
  const d = new Date(lastModifiedIso).getTime();
  if (Number.isNaN(d)) return 0;
  const days = (Date.now() - d) / (86400 * 1000);
  if (days <= 30) return 5;
  if (days >= 400) return 0;
  return 5 * (1 - (days - 30) / (400 - 30));
}

function hintedCategoriesFromQuery(queryTokensNorm) {
  const hints = new Set();
  const q = queryTokensNorm.join(' ');
  if (queryTokensNorm.includes('rh')) hints.add('RH');
  if (q.includes('fournisseur')) hints.add('PO_FOURNISSEUR');
  if (q.includes('opportunit')) hints.add('OPPORTUNITIES');
  if (/\bpo\b/.test(q) && q.includes('client')) hints.add('PO_CLIENT');
  return hints;
}

const FUZZ_RATIO_MIN = 80;

/** Unique normalized words (len ≥ 2) for fuzzball.extract */
function wordChoices(normalizedText) {
  if (!normalizedText) return [];
  const parts = normalizedText.split(/\s+/).filter((t) => t.length >= 2);
  return [...new Set(parts)];
}

/**
 * +2 title / +1 folder when query word is not an exact token hit but ratio ≥ threshold
 * against some word in title or folder.
 */
function fuzzyWordBonuses(qw, titleChoices, folderChoices, titleToks, folderToks) {
  if (qw.length < 2) return 0;
  let add = 0;
  if (titleChoices.length > 0 && !titleToks.has(qw)) {
    const best = fuzz.extract(qw, titleChoices, { scorer: fuzz.ratio, limit: 1 })[0];
    if (best && best[1] >= FUZZ_RATIO_MIN) add += 2;
  }
  if (folderChoices.length > 0 && !folderToks.has(qw)) {
    const best = fuzz.extract(qw, folderChoices, { scorer: fuzz.ratio, limit: 1 })[0];
    if (best && best[1] >= FUZZ_RATIO_MIN) add += 1;
  }
  return add;
}

function scoreFile(files, idx, queryRaw, queryTokensNorm, hintedCats) {
  const file = files[idx];
  const titleN = normalizeForMatch(file.title || '');
  const folderN = normalizeForMatch(file.folder || '');
  const fullQueryN = normalizeForMatch(queryRaw);
  const combined = `${titleN} ${folderN}`;

  let score = 0;
  const titleToks = new Set(tokenize(file.title || ''));
  const folderToks = new Set(tokenize(file.folder || ''));
  const titleChoices = wordChoices(titleN);
  const folderChoices = wordChoices(folderN);

  for (const w of queryTokensNorm) {
    if (titleToks.has(w)) score += 3;
    if (folderToks.has(w)) score += 1;
  }

  for (const qw of queryTokensNorm) {
    score += fuzzyWordBonuses(qw, titleChoices, folderChoices, titleToks, folderToks);
  }

  if (fullQueryN.length >= 3 && titleN.includes(fullQueryN)) score += 10;

  if (
    queryTokensNorm.length > 0 &&
    queryTokensNorm.every((w) => combined.includes(w))
  ) {
    score += 5;
  }

  if (fullQueryN.length > 0 && titleN === fullQueryN) score += 8;

  score += freshnessScore(file.lastModified);

  const cat = inferCategory(file);
  if (hintedCats.has(cat)) score += 3;

  return score;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function describeIndex(index) {
  const ti = Object.keys(index.titleIndex || {}).length;
  const fi = Object.keys(index.folderIndex || {}).length;
  const fc = index.source?.fileCount ?? '?';
  return `[index] titleTokens=${ti} folderTokens=${fi} files=${fc}`;
}

function loadOrBuildFromDisk(dataFile, indexFile, options) {
  const forceRebuild = options?.forceRebuild === true;
  if (!fs.existsSync(dataFile)) {
    throw new Error(`Missing data file: ${dataFile}`);
  }

  const raw = fs.readFileSync(dataFile, 'utf8');
  const data = JSON.parse(raw);
  const files = data.files;
  if (!Array.isArray(files)) {
    throw new Error('Invalid metadata: expected top-level "files" array');
  }

  const stat = fs.statSync(dataFile);
  const sourceMeta = {
    basename: path.basename(dataFile),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    fileCount: files.length,
  };

  let index;
  let rebuilt = false;

  if (!forceRebuild && fs.existsSync(indexFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      if (parsed.v === 1 && sourcesMatch(stat, parsed.source)) {
        index = parsed;
      }
    } catch (_) {
      /* rebuild */
    }
  }

  if (!index || forceRebuild) {
    index = buildIndexFromFiles(files, sourceMeta);
    fs.writeFileSync(indexFile, JSON.stringify(index));
    rebuilt = true;
  }

  return {
    index,
    files,
    rebuilt,
    metaHeader: { fetchedAt: data.fetchedAt, siteName: data.siteName, fileCount: files.length },
  };
}

function search(state, query, options) {
  const limit = Math.min(500, Math.max(1, options?.limit ?? 10));
  const categories = options?.categories;

  const q = String(query || '').trim();
  const queryTokensNorm = tokenize(q);
  const hinted = hintedCategoriesFromQuery(queryTokensNorm);

  /** @type {Set<number>} */
  const candidates = new Set();

  for (const t of queryTokensNorm) {
    const ti = state.index.titleIndex[t];
    const fi = state.index.folderIndex[t];
    if (ti) for (const i of ti) candidates.add(i);
    if (fi) for (const i of fi) candidates.add(i);
  }

  if (categories && categories.length > 0) {
    const allowed = new Set();
    for (const c of categories) {
      const arr = state.index.byCategory[c];
      if (arr) for (const i of arr) allowed.add(i);
    }
    for (const i of [...candidates]) {
      if (!allowed.has(i)) candidates.delete(i);
    }
  }

  const hits = [];
  for (const idx of candidates) {
    const file = state.files[idx];
    if (!file) continue;
    const s = scoreFile(state.files, idx, q, queryTokensNorm, hinted);
    hits.push({ score: s, file, idx });
  }

  hits.sort((a, b) => b.score - a.score);
  const slice = hits.slice(0, limit);

  return slice.map((h) => ({
    title: h.file.title,
    folder: h.file.folder,
    url: h.file.url,
    lastModified: h.file.lastModified,
    size: h.file.size,
    score: h.score,
    category: inferCategory(h.file),
  }));
}

// ─── Process-wide cache (Express + CLI) ──────────────────────────────────────

let _cache = null;

/**
 * @param {string} dataFile
 * @param {string} indexFile
 */
function getCachedSearchState(dataFile, indexFile) {
  const absData = path.resolve(dataFile);
  const absIdx = path.resolve(indexFile);
  if (_cache && _cache.dataFile === absData && _cache.indexFile === absIdx) {
    return _cache.state;
  }
  const { index, files, rebuilt, metaHeader } = loadOrBuildFromDisk(absData, absIdx, {});
  const state = { index, files, metaHeader };
  _cache = { dataFile: absData, indexFile: absIdx, state, rebuilt };
  return state;
}

function clearSearchCache() {
  _cache = null;
}

module.exports = {
  normalizeForMatch,
  tokenize,
  inferCategory,
  buildIndexFromFiles,
  describeIndex,
  loadOrBuildFromDisk,
  search,
  getCachedSearchState,
  clearSearchCache,
};
