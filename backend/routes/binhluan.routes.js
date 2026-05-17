import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as baidangController from '../controllers/baidang.controller.js';

const router = express.Router();

router.use(verifyToken);

// Reply bình luận
// Path gốc được mount tại /api/binhluan
router.get('/:commentId/reply', baidangController.getReplies);
router.post('/:commentId/reply', baidangController.applyReply);

export default router;