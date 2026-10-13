import { Router } from 'express';
import { z } from 'zod';
import db from '../db/connection.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const reviewSchema = z.object({
  guestName: z.string().trim().min(2, 'Name must have at least 2 characters').max(100),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  comment: z.string().trim().min(5, 'Review comment must have at least 5 characters').max(1000)
});

// GET /api/reviews - Get approved/published reviews
router.get('/', (req, res) => {
  const reviews = db
    .prepare('SELECT id, guest_name, rating, comment, created_at FROM reviews WHERE is_published = 1 ORDER BY created_at DESC')
    .all();

  const stats = db
    .prepare('SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE is_published = 1')
    .get();

  res.json({
    ok: true,
    data: {
      totalReviews: stats.count || 0,
      averageRating: stats.avg_rating ? Number(stats.avg_rating.toFixed(1)) : 0,
      reviews
    }
  });
});

// POST /api/reviews - Submit review (saved unpublished for admin moderation)
router.post('/', validate({ body: reviewSchema }), (req, res) => {
  const { guestName, rating, comment } = req.body;

  const result = db.prepare(`
    INSERT INTO reviews (guest_name, rating, comment, is_published)
    VALUES (?, ?, ?, 0)
  `).run(guestName, rating, comment);

  res.status(201).json({
    ok: true,
    data: {
      reviewId: result.lastInsertRowid,
      message: 'Thank you for your review! It has been submitted and will appear once approved by our team.',
      status: 'pending_moderation'
    }
  });
});

export default router;
