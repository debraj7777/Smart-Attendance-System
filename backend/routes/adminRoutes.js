import express from 'express';
import { getDashboardStats, getGlobalAttendance, getAllUsers, addStudent, deleteStudent, addTeacher, deleteTeacher, assignSubject } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth and admin role middleware to all routes
router.use(protect, authorize('Admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/global-attendance', getGlobalAttendance);
router.get('/users', getAllUsers);
router.post('/add-student', addStudent);
router.delete('/delete-student/:id', deleteStudent);
router.post('/add-teacher', addTeacher);
router.delete('/delete-teacher/:id', deleteTeacher);
router.post('/assign-subject', assignSubject);

export default router;
