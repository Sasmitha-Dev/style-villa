import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import db from './db/connection.js';
import { runSeed } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';

import roomsRouter from './routes/rooms.js';
import availabilityRouter from './routes/availability.js';
import bookingsRouter from './routes/bookings.js';
import reviewsRouter from './routes/reviews.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

const app = express();

// 1. Security & Core Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));

// 2. Global Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});
app.use('/api/', generalLimiter);

// 3. Health Check
app.get('/api/health', (req, res) => {
  try {
    const ping = db.prepare('SELECT 1 as alive').get();
    return res.status(200).json({
      ok: true,
      data: {
        status: 'healthy',
        database: ping?.alive === 1 ? 'connected' : 'unreachable',
        hotel: config.hotelName,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed',
        details: err.message
      }
    });
  }
});

// 4. Mount Public & Admin API Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// 5. Catch-all 404 Handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// 6. Centralized Error Handler
app.use(errorHandler);

// Start Server and initialize seed if fresh
if (process.env.NODE_ENV !== 'test') {
  try {
    const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    if (roomCount === 0) {
      console.log('[Server] Database is empty. Running initial seed...');
      runSeed();
    }
  } catch (err) {
    console.error('[Server] Seed check error:', err);
  }

  app.listen(config.port, () => {
    console.log(
      `[Server] Style Villa Backend running on http://localhost:${config.port} (${config.nodeEnv})`
    );
  });
}

export default app;
