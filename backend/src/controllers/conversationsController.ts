import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import * as db from '../services/supabaseService';
import { updateConversationSchema } from '../utils/validators';

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthRequest;
    const conversations = await db.getUserConversations(userId);
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthRequest;
    const conversation = await db.createConversation(userId);
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}

export async function updateConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const updates = updateConversationSchema.parse(req.body);

    const isOwner = await db.verifyConversationOwner(id, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    const conversation = await db.updateConversation(id, userId, updates);
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;

    const isOwner = await db.verifyConversationOwner(id, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    await db.deleteConversation(id, userId);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;

    const isOwner = await db.verifyConversationOwner(id, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    const messages = await db.getMessages(id);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}
