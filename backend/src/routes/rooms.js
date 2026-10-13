import { Router } from 'express';
import db from '../db/connection.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

function formatRoom(row) {
  let images = [];
  let amenities = [];
  try {
    images = JSON.parse(row.images_json || '[]');
  } catch {
    images = [];
  }
  try {
    amenities = JSON.parse(row.amenities_json || '[]');
  } catch {
    amenities = [];
  }
  return {
    ...row,
    images,
    amenities
  };
}

// GET /api/rooms - List all active rooms
router.get('/', (req, res) => {
  const rooms = db
    .prepare('SELECT * FROM rooms WHERE is_active = 1 ORDER BY price_per_night ASC')
    .all();

  res.json({
    ok: true,
    data: rooms.map(formatRoom)
  });
});

// GET /api/rooms/:slug - Retrieve single room by slug
router.get('/:slug', (req, res, next) => {
  const { slug } = req.params;
  const room = db
    .prepare('SELECT * FROM rooms WHERE slug = ? AND is_active = 1')
    .get(slug);

  if (!room) {
    return next(new ApiError(404, 'ROOM_NOT_FOUND', `Room with slug '${slug}' not found.`));
  }

  res.json({
    ok: true,
    data: formatRoom(room)
  });
});

export default router;
