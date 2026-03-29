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

export function postSharePointSearch(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!assertInternalKey(req, res)) return;
    const parsed = searchBodySchema.parse(req.body);
    const dir = getN8nDataDir();
    const metadata = requireAbsolute<MetadataModule>(path.join(dir, 'metadata.js'));
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
    next(err);
  }
}

export function postSharePointReindex(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!assertInternalKey(req, res)) return;
    const dir = getN8nDataDir();
    const dataFile = path.join(dir, 'sharepoint_metadata.json');
    const indexFile = path.join(dir, 'index.json');
    const ss = requireAbsolute<SharepointSearchModule>(path.join(dir, 'sharepoint-search.js'));
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
    next(err);
  }
}
