import express from 'express';
import {
  getRoster,
  sendWarning,
  getTeacherRoutines,
  openSession,
  closeSession,
  getMySessions,
} from '../controllers/teacherController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('Teacher'));

router.get('/roster',         getRoster);
router.get('/routines',       getTeacherRoutines);
router.post('/send-warning',  sendWarning);

// Attendance session management
router.get('/sessions',       getMySessions);
router.post('/sessions',      openSession);
router.delete('/sessions/:id', closeSession);

export default router;
