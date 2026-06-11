import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, faceImage, faceDescriptor } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    if (role === 'Student' && !faceDescriptor) {
      return res.status(400).json({ message: 'Face descriptor is required for biometric matching' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      faceImage: role === 'Student' ? faceImage : undefined,
      faceDescriptor: role === 'Student' ? faceDescriptor : undefined
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        faceImage: user.faceImage,
        faceDescriptor: user.faceDescriptor,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    // Validate password and optionally role
    if (user && (await user.matchPassword(password))) {
      // If role is provided in login, ensure it matches
      if (role && user.role !== role) {
         return res.status(401).json({ message: 'Invalid role for this user' });
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        faceImage: user.faceImage,
        faceDescriptor: user.faceDescriptor,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

export const enrollFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    
    if (!faceDescriptor) {
      return res.status(400).json({ message: 'Face data is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.faceDescriptor = faceDescriptor;
    await user.save();

    res.json({ message: 'Facial data enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
