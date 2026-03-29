import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

// Per-request user-scoped Supabase client (validates JWT via RLS)
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'En-tête Authorization manquant ou invalide' });
    return;
  }

  const token = authHeader.slice(7);

  // Verify token by calling Supabase getUser
  const userClient = createClient(env.SUPABASE_URL, token, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Use admin client to verify the JWT
  const { data: { user }, error } = await createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  ).auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ success: false, error: 'Jeton invalide ou expiré' });
    return;
  }

  (req as AuthRequest).userId = user.id;
  (req as AuthRequest).userEmail = user.email ?? '';
  next();
}
