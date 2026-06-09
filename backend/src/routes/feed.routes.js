import express from 'express';
import { verifyToken } from '../../middleware/authMiddleware.js';
import * as feedController from '../controllers/feed.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', feedController.getFeed);
router.get('/notifications', feedController.getNotifications);

export default router;
