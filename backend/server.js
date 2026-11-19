import express  from 'express';
import dotenv   from 'dotenv';
import cors     from 'cors';
import helmet   from 'helmet';
import connectDB from './config/db.js';
import { globalLimiter } from './middleware/rateLimiter.js';

// Load env vars before anything else
dotenv.config();

import { importData } from './seeder.js';

// Connect to database and seed
connectDB().then(() => {
  importData();
});

const app = express();

// Security headers (helmet must come before routes)
app.use(helmet());

// CORS
app.use(cors());

// Global rate limit — 200 req / 15 min per IP
app.use(globalLimiter);

// Body parser
app.use(express.json({ limit: '2mb' })); // 2 MB cap (face descriptors are ~4 KB)

import authRoutes    from './routes/authRoutes.js';
import adminRoutes   from './routes/adminRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import studentRoutes from './routes/studentRoutes.js';

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Attendance API' });
});

app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
