import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter — 10 attempts per IP per 15 minutes.
 * Apply only to POST /api/auth/login.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API limiter — 200 req / 15 min per IP.
 * Applied globally in server.js.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
