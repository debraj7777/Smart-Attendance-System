import express from 'express';
import { registerUser, loginUser, getMe, enrollFace } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/enroll-face', protect, enrollFace);

export default router;
