import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { z } from 'zod';
import { getN8nDataDir } from '../config/n8nDataDir';
import { env } from '../config/env';

const searchBodySchema = z.object({
  query: z.string().min(1).max(2000),
  categories: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/** createRequire works for local CJS .js on Render; dynamic import(file://) can mis-resolve. */
const requireFromHere = createRequire(__filename);
// Compiled JS modules are shipped in dist/n8n-data/*.js after build.
// When N8N_DATA_DIR points to a persistent disk with only JSON files,
// we still want to load JS modules from dist.
const scriptsDir = path.join(__dirname, '..', 'n8n-data');

type MetadataModule = {
  searchDocuments: (
    q: string,
    o?: { limit?: number; categories?: string[] }
  ) => unknown[];
};

type SharepointSearchModule = {
  loadOrBuildFromDisk: (
    d: string,
    i: string,
    o: { forceRebuild: boolean }
  ) => { index: { source?: unknown }; rebuilt: boolean };
  describeIndex: (idx: { source?: unknown }) => string;
  clearSearchCache: () => void;
};

function requireAbsolute<T>(absolutePath: string): T {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Fichier introuvable: ${absolutePath}. ` +
        'Sur Render: vérifiez que « npm run build » et « npm start » copient dist/n8n-data/*.js, ' +
        'ou définissez N8N_DATA_DIR vers un dossier contenant metadata.js.'
    );
  }
  return requireFromHere(absolutePath) as T;
}

function internalSearchKey(): string {
  return env.SHAREPOINT_SEARCH_INTERNAL_KEY || env.N8N_API_KEY;
}

function headerInternalKey(req: Request): string | undefined {
  const raw = req.headers['x-internal-search-key'];
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

function assertInternalKey(req: Request, res: Response): boolean {
  const expected = internalSearchKey();
  if (!expected) {
    res.status(503).json({
      success: false,
      error:
        'Recherche SharePoint désactivée : définissez SHAREPOINT_SEARCH_INTERNAL_KEY ou N8N_API_KEY.',
    });
    return false;
  }
  const got = headerInternalKey(req);
  if (!got || got !== expected) {
    res.status(401).json({ success: false, error: 'Non autorisé' });
    return false;
  }
  return true;
}

/** Large export is gitignored; must be added on the host (see DEPLOY_DATA.txt). */
function respondIfSharepointDataMissing(dir: string, res: Response): boolean {
  const dataFile = path.join(dir, 'sharepoint_metadata.json');
  if (fs.existsSync(dataFile)) return false;
  res.status(503).json({
    success: false,
    code: 'SHAREPOINT_DATA_MISSING',
    error:
      'sharepoint_metadata.json est absent : le dépôt Git ne contient pas ce gros fichier (volontairement).',
    expectedPath: dataFile,
    hint:
      'Sur Render : montez un disque persistant OU importez le fichier dans ce dossier. ' +
      'Option A : Render Disk monté sur /var/data/n8n + copier sharepoint_metadata.json (et index.json optionnel) puis N8N_DATA_DIR=/var/data/n8n. ' +
      'Les fichiers .js de recherche sont déjà fournis via le build dans dist/n8n-data/. ' +
      'Option B : sans disque, ajoutez une étape de build qui télécharge le fichier vers dist/n8n-data/ + assurez que N8N_DATA_DIR pointe vers ce dossier. ' +
      'Ensuite : npm run search-metadata -- --reindex ou POST .../sharepoint-search/reindex.',
  });
  return true;
}

function isMissingDataError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Missing data file') || msg.includes('sharepoint_metadata.json');
}

export function postSharePointSearch(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!assertInternalKey(req, res)) return;
    const parsed = searchBodySchema.parse(req.body);
    const dir = getN8nDataDir();
    if (respondIfSharepointDataMissing(dir, res)) return;
    const metadata = requireAbsolute<MetadataModule>(
      path.join(scriptsDir, 'metadata.js')
    );
    const hits = metadata.searchDocuments(parsed.query, {
      limit: parsed.limit ?? 15,
      categories: parsed.categories,
    });
    res.json({
      success: true,
      data: {
        hits,
        count: hits.length,
        query: parsed.query,
      },
    });
  } catch (err) {
    if (isMissingDataError(err)) {
      const dir = getN8nDataDir();
      if (respondIfSharepointDataMissing(dir, res)) return;
    }
    next(err);
  }
}

export function postSharePointReindex(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!assertInternalKey(req, res)) return;
    const dir = getN8nDataDir();
    if (respondIfSharepointDataMissing(dir, res)) return;
    const dataFile = path.join(dir, 'sharepoint_metadata.json');
    const indexFile = path.join(dir, 'index.json');
    const ss = requireAbsolute<SharepointSearchModule>(
      path.join(scriptsDir, 'sharepoint-search.js')
    );
    const { index, rebuilt } = ss.loadOrBuildFromDisk(dataFile, indexFile, { forceRebuild: true });
    ss.clearSearchCache();
    res.json({
      success: true,
      data: {
        rebuilt,
        describe: ss.describeIndex(index),
      },
    });
  } catch (err) {
    if (isMissingDataError(err)) {
      const dir = getN8nDataDir();
      if (respondIfSharepointDataMissing(dir, res)) return;
    }
    next(err);
  }
}
