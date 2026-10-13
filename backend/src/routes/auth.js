import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db/connection.js';
import config from '../config.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// Rate limiter strictly enforcing 5 attempts per minute on login
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many login attempts. Please wait 1 minute before trying again.'
    }
  }
});

const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required'),
  password: z.string().min(1, 'Password cannot be blank')
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate({ body: loginSchema }), (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = db
      .prepare('SELECT id, email, password_hash FROM admins WHERE email = ?')
      .get(email.toLowerCase());

    if (!admin) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordsMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!passwordsMatch) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      ok: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email
        },
        expiresIn: config.jwtExpiresIn
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
