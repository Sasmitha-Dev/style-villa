import { Router } from 'express';
import { z } from 'zod';
import db from '../../db/connection.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { isRoomAvailable } from '../../services/availability.js';

const router = Router();

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed'])
});

// GET /api/admin/bookings - Search, filter, paginate
router.get('/', (req, res) => {
  const { search, status, limit = 20, offset = 0 } = req.query;

  let baseSql = `
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN guests g ON b.guest_id = g.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    baseSql += ' AND b.status = ?';
    params.push(status);
  }

  if (search) {
    const term = `%${search.trim().toLowerCase()}%`;
    baseSql += ` AND (
      LOWER(b.reference) LIKE ? OR
      LOWER(g.full_name) LIKE ? OR
      LOWER(g.email) LIKE ? OR
      LOWER(g.phone) LIKE ? OR
      LOWER(r.name) LIKE ?
    )`;
    params.push(term, term, term, term, term);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total ${baseSql}`).get(...params);
  const total = countRow.count;

  const dataSql = `
    SELECT b.*,
           r.name as room_name, r.slug as room_slug,
           g.full_name as guest_name, g.email as guest_email, g.phone as guest_phone, g.country as guest_country
    ${baseSql}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataSql).all(...params, Number(limit), Number(offset));

  res.json({
    ok: true,
    data: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      bookings: rows
    }
  });
});

// PATCH /api/admin/bookings/:id/status - Update reservation status
router.patch('/:id/status', validate({ body: statusUpdateSchema }), (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', `Booking ID ${bookingId} not found.`);
    }

    // If changing to 'confirmed', ensure room availability hasn't collided with another booking
    if (status === 'confirmed' && booking.status !== 'confirmed') {
      const availCheck = isRoomAvailable(db, booking.room_id, booking.check_in, booking.check_out, bookingId);
      if (!availCheck.available) {
        throw new ApiError(409, 'ROOM_CONFLICT', `Cannot confirm booking: ${availCheck.reason}`);
      }
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, bookingId);

    const updated = db.prepare(`
      SELECT b.*, r.name as room_name, g.full_name as guest_name, g.email as guest_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = ?
    `).get(bookingId);

    res.json({
      ok: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
