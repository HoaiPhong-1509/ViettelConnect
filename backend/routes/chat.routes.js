import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { uploadMediaMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', uploadMediaMiddleware.array('media', 10), chatController.sendMessage);
router.get('/conversations/:id/members', chatController.getMembers);
router.post('/conversations/:id/members', chatController.addMember);
router.delete('/conversations/:id/members/:userId', chatController.removeMember);
router.delete('/conversations/:id', chatController.deleteConversation);
router.get('/search', chatController.search);

export default router;
