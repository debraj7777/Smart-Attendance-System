import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, getMe, enrollFace } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate, getRoleEmailError } from '../middleware/validate.js';

const router = express.Router();

const roleEmailValidator = (value, { req }) => {
  const err = getRoleEmailError(value, req.body.role);
  if (err) throw new Error(err);
  return true;
};

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required').custom(roleEmailValidator),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['Admin', 'Teacher', 'Student']).withMessage('Invalid role'),
  ],
  validate,
  registerUser
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required').custom(roleEmailValidator),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  loginUser
);

router.get('/me', protect, getMe);
router.post('/enroll-face', protect, enrollFace);

export default router;
