import { Router } from 'express';
import { z } from 'zod';
import db from '../../db/connection.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

const blockedDateSchema = z
  .object({
    roomId: z.coerce.number().int().positive(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    reason: z.string().trim().max(500).optional().default('Maintenance / Private Block')
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate']
  });

// GET /api/admin/blocked-dates - List blocked dates
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT bd.*, r.name as room_name, r.slug as room_slug
    FROM blocked_dates bd
    JOIN rooms r ON bd.room_id = r.id
    ORDER BY bd.start_date DESC
  `).all();

  res.json({
    ok: true,
    data: rows
  });
});

// POST /api/admin/blocked-dates - Add blocked range
router.post('/', validate({ body: blockedDateSchema }), (req, res, next) => {
  try {
    const { roomId, startDate, endDate, reason } = req.body;

    const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      throw new ApiError(404, 'ROOM_NOT_FOUND', `Room ID ${roomId} not found.`);
    }

    const result = db.prepare(`
      INSERT INTO blocked_dates (room_id, start_date, end_date, reason)
      VALUES (?, ?, ?, ?)
    `).run(roomId, startDate, endDate, reason);

    const created = db.prepare(`
      SELECT bd.*, r.name as room_name
      FROM blocked_dates bd
      JOIN rooms r ON bd.room_id = r.id
      WHERE bd.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      ok: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/blocked-dates/:id - Delete block
router.delete('/:id', (req, res, next) => {
  try {
    const blockId = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM blocked_dates WHERE id = ?').get(blockId);
    if (!existing) {
      throw new ApiError(404, 'BLOCK_NOT_FOUND', `Blocked date ID ${blockId} not found.`);
    }

    db.prepare('DELETE FROM blocked_dates WHERE id = ?').run(blockId);

    res.json({
      ok: true,
      data: { message: `Blocked date ID ${blockId} successfully removed.` }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
