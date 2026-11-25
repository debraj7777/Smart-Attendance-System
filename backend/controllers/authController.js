import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { encryptDescriptor } from '../utils/crypto.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Account-lockout constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, faceDescriptor } = req.body;

    if (role === 'Student' && !faceDescriptor) {
      return res.status(400).json({ message: 'Face descriptor is required for biometric matching' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userData = { name, email, password, role };

    if (role === 'Student' && faceDescriptor) {
      userData.faceDescriptor = encryptDescriptor(faceDescriptor);
    }

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id:         user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        faceEnrolled: !!(user.faceDescriptor),
        token:       generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email }).select('+loginAttempts +lockUntil +faceDescriptor');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Lockout check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`,
      });
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      // Increment failed attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil     = new Date(Date.now() + LOCK_DURATION_MS);
        user.loginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Role mismatch
    if (role && user.role !== role) {
      return res.status(401).json({ message: 'Invalid role for this user' });
    }

    // Successful login — reset lockout counters
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    // Audit log
    await AuditLog.create({
      actorId:   user._id,
      actorRole: user.role,
      action:    'LOGIN',
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      _id:         user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      faceEnrolled: !!(user.faceDescriptor),
      token:       generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
export const getMe = async (req, res) => {
  const u = await User.findById(req.user._id).select('+faceDescriptor');
  res.status(200).json({
    _id:         u._id,
    name:        u.name,
    email:       u.email,
    role:        u.role,
    faceEnrolled: !!(u.faceDescriptor),
  });
};

// ---------------------------------------------------------------------------
// POST /api/auth/enroll-face
// ---------------------------------------------------------------------------
export const enrollFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'Face data is required and must be an array.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Encrypt before storing
    user.faceDescriptor = encryptDescriptor(faceDescriptor);
    await user.save();

    // Audit log
    await AuditLog.create({
      actorId:   user._id,
      actorRole: user.role,
      action:    'ENROLL_FACE',
      targetId:  user._id,
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Facial data enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
