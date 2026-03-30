import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import { sendMessageSchema } from '../utils/validators';
import * as db from '../services/supabaseService';
import { callN8n } from '../services/n8nService';

/** n8n may attach sources while the LLM still apologizes: we only pass metadata, not file bodies. */
function countSearchHitsFromMetadata(metadata: Record<string, unknown> | undefined): number {
  if (!metadata) return 0;
  const sources = metadata.sources;
  if (Array.isArray(sources)) return sources.length;
  const hits = metadata.hits;
  if (Array.isArray(hits)) return hits.length;
  const totalHits = metadata.totalHits;
  if (typeof totalHits === 'number' && totalHits > 0) return totalHits;
  return 0;
}

const APOLOGY_DESPITE_HITS = /aucune information|pas d['']informations?|rien dans le contexte|non disponible dans le contexte|malheureusement,?\s*aucun|aucun document.*contexte|désol[ée].{0,80}(pas|aucune|impossible)/i;

function assistantTextWhenHitsExistButModelApologized(
  text: string,
  metadata: Record<string, unknown> | undefined
): string {
  const n = countSearchHitsFromMetadata(metadata);
  if (n === 0 || !APOLOGY_DESPITE_HITS.test(text)) return text;
  return (
    'Voici les documents SharePoint les plus pertinents pour votre demande (liens ci-dessous). ' +
    "L'assistant ne reçoit que le titre, le dossier et le lien — pas le texte intégral des fichiers. " +
    'Ouvrez les documents pour consulter le détail.'
  );
}

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
    const meta = n8nResponse.metadata as Record<string, unknown> | undefined;
    const assistantContent = assistantTextWhenHitsExistButModelApologized(n8nResponse.response, meta);

    // Save assistant response
    const assistantMessage = await db.saveMessage({
      conversationId,
      role: 'assistant',
      content: assistantContent,
      metadata: meta,
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
