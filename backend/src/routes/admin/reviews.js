import { Router } from 'express';
import { z } from 'zod';
import db from '../../db/connection.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

const publishSchema = z.object({
  isPublished: z.coerce.number().int().min(0).max(1)
});

// GET /api/admin/reviews - List all reviews
router.get('/', (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
  res.json({
    ok: true,
    data: reviews
  });
});

// PATCH /api/admin/reviews/:id/publish - Toggle published state
router.patch('/:id/publish', validate({ body: publishSchema }), (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const { isPublished } = req.body;

    const existing = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
    if (!existing) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', `Review ID ${reviewId} not found.`);
    }

    db.prepare('UPDATE reviews SET is_published = ? WHERE id = ?').run(isPublished, reviewId);

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    res.json({
      ok: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/reviews/:id - Delete review
router.delete('/:id', (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
    if (!existing) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', `Review ID ${reviewId} not found.`);
    }

    db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
    res.json({
      ok: true,
      data: { message: `Review ID ${reviewId} successfully deleted.` }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
