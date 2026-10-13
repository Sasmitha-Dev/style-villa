import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import statsRouter from './admin/stats.js';
import bookingsRouter from './admin/bookings.js';
import roomsRouter from './admin/rooms.js';
import blockedDatesRouter from './admin/blockedDates.js';
import reviewsRouter from './admin/reviews.js';
import settingsRouter from './admin/settings.js';

const router = Router();

// Apply administrative JWT authentication to all sub-routes
router.use(requireAdminAuth);

router.use('/stats', statsRouter);
router.use('/bookings', bookingsRouter);
router.use('/rooms', roomsRouter);
router.use('/blocked-dates', blockedDatesRouter);
router.use('/reviews', reviewsRouter);
router.use('/settings', settingsRouter);

export default router;
