/**
 * Availability service for room queries and overlap detection.
 */

/**
 * Checks if a specific room is available for requested dates.
 * Overlap formula: existing.check_in < new.check_out AND existing.check_out > new.check_in
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} roomId
 * @param {string} checkIn - "YYYY-MM-DD"
 * @param {string} checkOut - "YYYY-MM-DD"
 * @param {number} [excludeBookingId] - Optional booking ID to exclude (for admin edits)
 * @returns {{ available: boolean, reason?: string }}
 */
export function isRoomAvailable(db, roomId, checkIn, checkOut, excludeBookingId = null) {
  const room = db.prepare('SELECT id, is_active FROM rooms WHERE id = ?').get(roomId);
  if (!room || !room.is_active) {
    return { available: false, reason: 'Room does not exist or is inactive' };
  }

  // Check overlapping active bookings
  let bookingSql = `
    SELECT id, reference, check_in, check_out, status
    FROM bookings
    WHERE room_id = ?
      AND status IN ('pending', 'confirmed')
      AND check_in < ?
      AND check_out > ?
  `;
  const bookingParams = [roomId, checkOut, checkIn];

  if (excludeBookingId) {
    bookingSql += ' AND id != ?';
    bookingParams.push(excludeBookingId);
  }
  bookingSql += ' LIMIT 1';

  const overlappingBooking = db.prepare(bookingSql).get(...bookingParams);
  if (overlappingBooking) {
    return {
      available: false,
      reason: `Overlaps with ${overlappingBooking.status} booking (${overlappingBooking.reference})`
    };
  }

  // Check overlapping blocked dates
  const blockSql = `
    SELECT id, start_date, end_date, reason
    FROM blocked_dates
    WHERE room_id = ?
      AND start_date < ?
      AND end_date > ?
    LIMIT 1
  `;
  const overlappingBlock = db.prepare(blockSql).get(roomId, checkOut, checkIn);
  if (overlappingBlock) {
    return {
      available: false,
      reason: `Room blocked from ${overlappingBlock.start_date} to ${overlappingBlock.end_date}`
    };
  }

  return { available: true };
}

/**
 * Finds all active rooms that fit guest capacity and have no booking/blackout collisions.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} filter
 * @param {string} filter.checkIn
 * @param {string} filter.checkOut
 * @param {number} filter.adults
 * @param {number} filter.children
 * @returns {Array<object>}
 */
export function getAvailableRooms(db, { checkIn, checkOut, adults = 1, children = 0 }) {
  const totalGuests = Number(adults) + Number(children);

  const sql = `
    SELECT r.*
    FROM rooms r
    WHERE r.is_active = 1
      AND r.max_guests >= ?
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = r.id
          AND b.status IN ('pending', 'confirmed')
          AND b.check_in < ?
          AND b.check_out > ?
      )
      AND NOT EXISTS (
        SELECT 1 FROM blocked_dates bd
        WHERE bd.room_id = r.id
          AND bd.start_date < ?
          AND bd.end_date > ?
      )
    ORDER BY r.price_per_night ASC
  `;

  const rows = db.prepare(sql).all(totalGuests, checkOut, checkIn, checkOut, checkIn);

  return rows.map((room) => {
    let images = [];
    let amenities = [];
    try {
      images = JSON.parse(room.images_json || '[]');
    } catch {
      images = [];
    }
    try {
      amenities = JSON.parse(room.amenities_json || '[]');
    } catch {
      amenities = [];
    }

    return {
      ...room,
      images,
      amenities
    };
  });
}
