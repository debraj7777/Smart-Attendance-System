import express from 'express';
import { getRoster, sendWarning } from '../controllers/teacherController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth and teacher role middleware to all routes
router.use(protect, authorize('Teacher'));

router.get('/roster', getRoster);
router.post('/send-warning', sendWarning);

export default router;
