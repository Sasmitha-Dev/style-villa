import { Router } from 'express';
import { z } from 'zod';
import db from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { getAvailableRooms } from '../services/availability.js';
import { calculateBookingPrice } from '../services/pricing.js';

const router = Router();

const availabilityQuerySchema = z
  .object({
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'checkIn must be formatted as YYYY-MM-DD'),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'checkOut must be formatted as YYYY-MM-DD'),
    adults: z.coerce.number().int().min(1, 'At least 1 adult is required').default(1),
    children: z.coerce.number().int().min(0, 'Children cannot be negative').default(0)
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

router.get('/', validate({ query: availabilityQuerySchema }), (req, res, next) => {
  try {
    const { checkIn, checkOut, adults, children } = req.query;

    const availableRooms = getAvailableRooms(db, {
      checkIn,
      checkOut,
      adults,
      children
    });

    // Decorate each available room with authoritative pricing for the requested dates
    const enrichedRooms = availableRooms.map((room) => {
      const priceDetails = calculateBookingPrice(room, checkIn, checkOut);
      return {
        ...room,
        pricing: priceDetails
      };
    });

    res.json({
      ok: true,
      data: {
        checkIn,
        checkOut,
        adults: Number(adults),
        children: Number(children),
        totalGuests: Number(adults) + Number(children),
        availableRooms: enrichedRooms
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
