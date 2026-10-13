import config from '../config.js';

/**
 * Calculates number of nights between checkIn and checkOut.
 * Uses UTC midnight calculation to avoid timezone/daylight discrepancies.
 * @param {string} checkIn - "YYYY-MM-DD"
 * @param {string} checkOut - "YYYY-MM-DD"
 * @returns {number}
 */
export function calculateNights(checkIn, checkOut) {
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);

  const startUtc = Date.UTC(inY, inM - 1, inD);
  const endUtc = Date.UTC(outY, outM - 1, outD);

  const diffMs = endUtc - startUtc;
  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.round(diffMs / msPerDay);
}

/**
 * Computes official price using database room rates.
 * Client-submitted prices are ignored entirely.
 * @param {object} room - Room record from DB
 * @param {string} checkIn - "YYYY-MM-DD"
 * @param {string} checkOut - "YYYY-MM-DD"
 * @returns {object}
 */
export function calculateBookingPrice(room, checkIn, checkOut) {
  const nights = calculateNights(checkIn, checkOut);

  if (nights <= 0) {
    throw new Error('Check-out date must be strictly after check-in date.');
  }

  if (nights > config.maxBookingNights) {
    throw new Error(`Maximum allowable booking duration is ${config.maxBookingNights} nights.`);
  }

  const pricePerNight = Number(room.price_per_night);
  const subtotal = Number((nights * pricePerNight).toFixed(2));
  const taxesAndFees = 0.0;
  const totalPrice = Number((subtotal + taxesAndFees).toFixed(2));

  return {
    nights,
    pricePerNight,
    currency: room.currency || 'USD',
    subtotal,
    taxesAndFees,
    totalPrice,
    paymentMethod: 'PAY_AT_HOTEL',
    paymentStatus: 'pending_on_arrival'
  };
}
