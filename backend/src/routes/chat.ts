import { Router } from 'express';
import { sendMessage } from '../controllers/chatController';

const router = Router();

router.post('/', sendMessage);

export default router;
