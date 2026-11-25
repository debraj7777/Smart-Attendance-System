import express from 'express';
import { getAttendanceStats, getRoutine, markAttendance, verifyFace } from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth and student role middleware to all routes
router.use(protect, authorize('Student'));

router.get('/attendance-stats', getAttendanceStats);
router.get('/routine', getRoutine);
router.post('/verify-face', verifyFace);
router.post('/mark-attendance', markAttendance);

export default router;
