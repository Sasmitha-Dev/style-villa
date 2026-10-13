import { Router } from 'express';
import { z } from 'zod';
import db from '../../db/connection.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

const roomSchema = z.object({
  slug: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5),
  price_per_night: z.coerce.number().positive(),
  currency: z.string().default('USD'),
  max_guests: z.coerce.number().int().min(1),
  beds: z.string().trim().min(2),
  size_sqm: z.coerce.number().int().min(1),
  image_main: z.string().trim().min(1),
  images: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  is_active: z.coerce.number().int().min(0).max(1).default(1)
});

// GET /api/admin/rooms - List all rooms
router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY id ASC').all();
  res.json({
    ok: true,
    data: rooms.map((r) => ({
      ...r,
      images: JSON.parse(r.images_json || '[]'),
      amenities: JSON.parse(r.amenities_json || '[]')
    }))
  });
});

// POST /api/admin/rooms - Create room
router.post('/', validate({ body: roomSchema }), (req, res, next) => {
  try {
    const data = req.body;
    const existing = db.prepare('SELECT id FROM rooms WHERE slug = ?').get(data.slug);
    if (existing) {
      throw new ApiError(409, 'SLUG_EXISTS', `A room with slug '${data.slug}' already exists.`);
    }

    const result = db.prepare(`
      INSERT INTO rooms (
        slug, name, description, price_per_night, currency, max_guests,
        beds, size_sqm, image_main, images_json, amenities_json, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.slug,
      data.name,
      data.description,
      data.price_per_night,
      data.currency,
      data.max_guests,
      data.beds,
      data.size_sqm,
      data.image_main,
      JSON.stringify(data.images),
      JSON.stringify(data.amenities),
      data.is_active
    );

    const created = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ok: true,
      data: {
        ...created,
        images: JSON.parse(created.images_json || '[]'),
        amenities: JSON.parse(created.amenities_json || '[]')
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/rooms/:id - Update room
router.put('/:id', validate({ body: roomSchema }), (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    const data = req.body;

    const existing = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
    if (!existing) {
      throw new ApiError(404, 'ROOM_NOT_FOUND', `Room ID ${roomId} not found.`);
    }

    // Check slug uniqueness across other rooms
    const slugCollision = db.prepare('SELECT id FROM rooms WHERE slug = ? AND id != ?').get(data.slug, roomId);
    if (slugCollision) {
      throw new ApiError(409, 'SLUG_EXISTS', `Slug '${data.slug}' is taken by another room.`);
    }

    db.prepare(`
      UPDATE rooms SET
        slug = ?, name = ?, description = ?, price_per_night = ?, currency = ?,
        max_guests = ?, beds = ?, size_sqm = ?, image_main = ?, images_json = ?,
        amenities_json = ?, is_active = ?
      WHERE id = ?
    `).run(
      data.slug,
      data.name,
      data.description,
      data.price_per_night,
      data.currency,
      data.max_guests,
      data.beds,
      data.size_sqm,
      data.image_main,
      JSON.stringify(data.images),
      JSON.stringify(data.amenities),
      data.is_active,
      roomId
    );

    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    res.json({
      ok: true,
      data: {
        ...updated,
        images: JSON.parse(updated.images_json || '[]'),
        amenities: JSON.parse(updated.amenities_json || '[]')
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
