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
      error: 'Erreur de validation',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));

  console.error('[ErrorHandler] Full error:', error);

  res.status(500).json({
    success: false,
    error: error.message || 'Erreur interne du serveur',
  });
}
