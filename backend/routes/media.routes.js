import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { uploadMediaMiddleware, handleUploadErrors } from '../middleware/uploadMiddleware.js';
import { uploadMedia } from '../controllers/media.controller.js';

const router = express.Router();

router.post('/upload', verifyToken, uploadMediaMiddleware.array('files', 10), handleUploadErrors, uploadMedia);

export default router;