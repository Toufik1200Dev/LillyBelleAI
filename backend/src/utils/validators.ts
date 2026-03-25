import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(8000, 'Message too long (max 8000 chars)')
    .transform((s) => s.trim()),
});

export const updateConversationSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .transform((s) => s.trim())
    .optional(),
  is_archived: z.boolean().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
