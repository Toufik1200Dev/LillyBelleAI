import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import { getN8nDataDir } from '../config/n8nDataDir';
import { env } from '../config/env';

const searchBodySchema = z.object({
  query: z.string().min(1).max(2000),
  categories: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/** Load CommonJS .js modules via dynamic import (works when ts-node runs as ESM or CJS). */
async function importCjs<T>(absolutePath: string): Promise<T> {
  const href = pathToFileURL(absolutePath).href;
  const ns = (await import(href)) as { default?: T } & T;
  return (ns.default ?? ns) as T;
}

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

function internalSearchKey(): string {
  return env.SHAREPOINT_SEARCH_INTERNAL_KEY || env.N8N_API_KEY;
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
  const h = req.headers['x-internal-search-key'];
  if (typeof h !== 'string' || h !== expected) {
    res.status(401).json({ success: false, error: 'Non autorisé' });
    return false;
  }
  return true;
}

export async function postSharePointSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!assertInternalKey(req, res)) return;
    const parsed = searchBodySchema.parse(req.body);
    const dir = getN8nDataDir();
    const metadata = await importCjs<MetadataModule>(path.join(dir, 'metadata.js'));
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

export async function postSharePointReindex(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!assertInternalKey(req, res)) return;
    const dir = getN8nDataDir();
    const dataFile = path.join(dir, 'sharepoint_metadata.json');
    const indexFile = path.join(dir, 'index.json');
    const ss = await importCjs<SharepointSearchModule>(path.join(dir, 'sharepoint-search.js'));
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
