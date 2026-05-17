import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as baidangController from '../controllers/baidang.controller.js';

const router = express.Router();

// Sử dụng middleware xác thực cho mọi route liên quan đến bài viết
router.use(verifyToken);

// Bài viết
router.post('/', baidangController.createPost);
router.get('/feed', baidangController.getFeed);
router.get('/:id', baidangController.getPostDetail);
router.delete('/:id', baidangController.deletePost);

// Thích / Bỏ thích
router.post('/:id/thich', baidangController.likePost);
router.delete('/:id/thich', baidangController.unlikePost);

// Bình luận (gốc)
router.get('/:id/binhluan', baidangController.getRootComments);
router.post('/:id/binhluan', baidangController.addComment);

export default router;