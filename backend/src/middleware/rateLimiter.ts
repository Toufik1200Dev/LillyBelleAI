import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per authenticated user (set by authMiddleware)
    return (req as { userId?: string }).userId ?? req.ip ?? 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: `Trop de requêtes. Limite : ${env.RATE_LIMIT_MAX_REQUESTS} par minute.`,
    });
  },
});
