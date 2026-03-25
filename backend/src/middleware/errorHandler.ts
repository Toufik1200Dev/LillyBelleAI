import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));

  console.error('[ErrorHandler]', error.message, env.isProd ? '' : error.stack);

  // Hide internals in production
  res.status(500).json({
    success: false,
    error: env.isProd ? 'Internal server error' : error.message,
  });
}
