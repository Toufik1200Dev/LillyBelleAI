import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Protects internal automation routes with a static API key (e.g. n8n HTTP Request).
 * Header: x-internal-api-key — must match INTERNAL_API_KEY.
 */
export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = env.INTERNAL_API_KEY;
  if (!expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const raw = req.headers['x-internal-api-key'];
  const got =
    typeof raw === 'string'
      ? raw.trim()
      : Array.isArray(raw) && raw[0]
        ? String(raw[0]).trim()
        : undefined;
  if (!got || got !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
