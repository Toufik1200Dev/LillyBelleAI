import { Router } from 'express';
import {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
} from '../controllers/conversationsController';

const router = Router();

router.get('/',         listConversations);
router.post('/',        createConversation);
router.patch('/:id',    updateConversation);
router.delete('/:id',   deleteConversation);
router.get('/:id/messages', getMessages);

export default router;
