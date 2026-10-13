import { Router } from 'express';
import { z } from 'zod';
import db from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';
import { isRoomAvailable } from '../services/availability.js';
import { calculateBookingPrice } from '../services/pricing.js';
import { generateUniqueBookingReference } from '../services/reference.js';

const router = Router();

const createBookingSchema = z
  .object({
    roomId: z.number().int().positive('A valid roomId is required'),
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'checkIn must be formatted as YYYY-MM-DD'),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'checkOut must be formatted as YYYY-MM-DD'),
    adults: z.number().int().min(1, 'At least 1 adult is required'),
    children: z.number().int().min(0, 'Children cannot be negative').default(0),
    guest: z.object({
      fullName: z.string().trim().min(2, 'Full name must have at least 2 characters'),
      email: z.string().trim().email('A valid email address is required'),
      phone: z.string().trim().min(5, 'A valid contact phone number is required'),
      country: z.string().trim().min(2, 'Country is required')
    }),
    specialRequests: z.string().max(1000).optional().nullable()
  })
  .refine(
    (data) => {
      const today = new Date().toISOString().slice(0, 10);
      return data.checkIn >= today;
    },
    { message: 'checkIn date cannot be in the past', path: ['checkIn'] }
  )
  .refine((data) => data.checkOut > data.checkIn, {
    message: 'checkOut date must be strictly after checkIn date',
    path: ['checkOut']
  });

// POST /api/bookings - Create new booking with transactional locking
router.post('/', validate({ body: createBookingSchema }), (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut, adults, children, guest, specialRequests } = req.body;
    const totalGuests = Number(adults) + Number(children);

    // Run the booking creation inside an atomic SQLite transaction
    const createBookingTx = db.transaction(() => {
      // 1. Fetch room and verify active state
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      if (!room || !room.is_active) {
        throw new ApiError(404, 'ROOM_NOT_FOUND', 'The requested room was not found or is inactive.');
      }

      // 2. Capacity validation
      if (totalGuests > room.max_guests) {
        throw new ApiError(
          400,
          'CAPACITY_EXCEEDED',
          `The selected room accommodates a maximum of ${room.max_guests} guests.`
        );
      }

      // 3. Concurrency / Overlap check
      const availabilityCheck = isRoomAvailable(db, roomId, checkIn, checkOut);
      if (!availabilityCheck.available) {
        throw new ApiError(
          409,
          'ROOM_UNAVAILABLE',
          availabilityCheck.reason || 'Room is unavailable for the selected dates.'
        );
      }

      // 4. Authoritative pricing calculation (strictly from DB values)
      const pricing = calculateBookingPrice(room, checkIn, checkOut);

      // 5. Upsert Guest
      let guestId;
      const existingGuest = db
        .prepare('SELECT id FROM guests WHERE email = ?')
        .get(guest.email.toLowerCase());

      if (existingGuest) {
        guestId = existingGuest.id;
        db.prepare(`
          UPDATE guests
          SET full_name = ?, phone = ?, country = ?
          WHERE id = ?
        `).run(guest.fullName, guest.phone, guest.country, guestId);
      } else {
        const guestInsert = db.prepare(`
          INSERT INTO guests (full_name, email, phone, country)
          VALUES (?, ?, ?, ?)
        `).run(guest.fullName, guest.email.toLowerCase(), guest.phone, guest.country);
        guestId = guestInsert.lastInsertRowid;
      }

      // 6. Generate unique reference code
      const reference = generateUniqueBookingReference(db);

      // 7. Insert booking record
      const bookingInsert = db.prepare(`
        INSERT INTO bookings (
          reference, room_id, guest_id, check_in, check_out,
          adults, children, nights, total_price, status, special_requests
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        reference,
        roomId,
        guestId,
        checkIn,
        checkOut,
        adults,
        children,
        pricing.nights,
        pricing.totalPrice,
        specialRequests || null
      );

      return {
        bookingId: bookingInsert.lastInsertRowid,
        reference,
        pricing,
        room: {
          id: room.id,
          name: room.name,
          slug: room.slug,
          imageMain: room.image_main
        },
        guest: {
          id: guestId,
          fullName: guest.fullName,
          email: guest.email,
          phone: guest.phone,
          country: guest.country
        }
      };
    });

    const result = createBookingTx();

    res.status(201).json({
      ok: true,
      data: {
        reference: result.reference,
        status: 'pending',
        checkIn,
        checkOut,
        nights: result.pricing.nights,
        adults,
        children,
        totalGuests,
        totalPrice: result.pricing.totalPrice,
        currency: result.pricing.currency,
        paymentMethod: result.pricing.paymentMethod,
        paymentStatus: result.pricing.paymentStatus,
        specialRequests: specialRequests || null,
        room: result.room,
        guest: result.guest
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:reference - Retrieve single booking details
router.get('/:reference', (req, res, next) => {
  const { reference } = req.params;
  const { email } = req.query;

  let query = `
    SELECT b.*,
           r.name as room_name, r.slug as room_slug, r.image_main as room_image, r.price_per_night, r.currency,
           g.full_name, g.email as guest_email, g.phone as guest_phone, g.country as guest_country
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN guests g ON b.guest_id = g.id
    WHERE b.reference = ?
  `;
  const params = [reference];

  if (email) {
    query += ' AND LOWER(g.email) = ?';
    params.push(email.trim().toLowerCase());
  }

  const booking = db.prepare(query).get(...params);

  if (!booking) {
    return next(
      new ApiError(
        404,
        'BOOKING_NOT_FOUND',
        'No matching reservation was found with the specified reference.'
      )
    );
  }

  res.json({
    ok: true,
    data: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      totalPrice: booking.total_price,
      currency: booking.currency,
      paymentMethod: 'PAY_AT_HOTEL',
      specialRequests: booking.special_requests,
      createdAt: booking.created_at,
      room: {
        id: booking.room_id,
        name: booking.room_name,
        slug: booking.room_slug,
        imageMain: booking.room_image,
        pricePerNight: booking.price_per_night
      },
      guest: {
        fullName: booking.full_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
        country: booking.guest_country
      }
    }
  });
});

export default router;
