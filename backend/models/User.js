import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Teacher', 'Student'],
    required: true,
  },
  // Teacher specific
  assignedSubjects: [{
    type: String
  }],
  // Student specific
  enrolledClasses: [{
    type: String
  }],
  faceImage: {
    type: String, // Base64 string
    required: false
  },
  faceDescriptor: {
    type: String, // AES-256-GCM encrypted blob: "<iv>:<authTag>:<ciphertext>" (all hex)
    required: false,
    select: false,  // never returned in queries unless explicitly requested
  },
  // Auth hardening — account lockout
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
