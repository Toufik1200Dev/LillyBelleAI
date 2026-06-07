import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { searchSharepoint, getSharepointFile } from '../services/graphService';

const searchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .transform((s) => s.trim()),
  size: z.number().int().min(1).max(50).optional(),
});

const fileSchema = z.object({
  driveId: z.string().min(1),
  itemId: z.string().min(1),
});

function isGraphConfigured(): boolean {
  return Boolean(env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET);
}

function requireGraph(res: Response): boolean {
  if (!isGraphConfigured()) {
    res.status(503).json({
      success: false,
      error:
        'Microsoft Graph API not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in your environment.',
    });
    return false;
  }
  return true;
}

export async function postGraphSearch(req: Request, res: Response, next: NextFunction) {
  try {
    if (!requireGraph(res)) return;
    const { query, size } = searchSchema.parse(req.body);
    const hits = await searchSharepoint(query, size ?? 10);
    res.json({ success: true, data: { hits, count: hits.length, query } });
  } catch (err) {
    next(err);
  }
}

export async function postGraphFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!requireGraph(res)) return;
    const { driveId, itemId } = fileSchema.parse(req.body);
    const result = await getSharepointFile(driveId, itemId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
