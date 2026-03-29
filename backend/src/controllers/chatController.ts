import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import { sendMessageSchema } from '../utils/validators';
import * as db from '../services/supabaseService';
import { callN8n } from '../services/n8nService';

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  try {
    const { userId } = req as AuthRequest;
    const { conversationId, message } = sendMessageSchema.parse(req.body);

    // Verify ownership
    const isOwner = await db.verifyConversationOwner(conversationId, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, error: 'Accès refusé : conversation introuvable' });
      return;
    }

    // Fetch recent message history for context (last 10 turns)
    const history = await db.getMessages(conversationId);
    const previousMessages = history
      .slice(-20)
      .map((m) => ({ role: m.role as string, content: m.content as string }));

    // Save user message first
    const userMessage = await db.saveMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Call n8n AI workflow
    const n8nResponse = await callN8n({
      userId,
      conversationId,
      message,
      context: { previousMessages },
    });

    const responseTime = Date.now() - start;

    // Save assistant response
    const assistantMessage = await db.saveMessage({
      conversationId,
      role: 'assistant',
      content: n8nResponse.response,
      metadata: n8nResponse.metadata as Record<string, unknown> | undefined,
      responseTimeMs: responseTime,
    });

    res.json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
      },
    });
  } catch (err) {
    next(err);
  }
}
