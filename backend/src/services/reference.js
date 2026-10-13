import crypto from 'crypto';

// Characters excluding confusing 0, O, 1, I
const REFERENCE_CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates reference in format: SV-XXXXXX
 * @returns {string} e.g. "SV-8Y3K9M"
 */
export function generateReferenceCode() {
  const charsLength = REFERENCE_CHARACTERS.length;
  const randomBytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += REFERENCE_CHARACTERS[randomBytes[i] % charsLength];
  }
  return `SV-${code}`;
}

/**
 * Generates a unique reference by checking against existing bookings.
 * @param {import('better-sqlite3').Database} db
 * @returns {string}
 */
export function generateUniqueBookingReference(db) {
  const checkStmt = db.prepare('SELECT id FROM bookings WHERE reference = ?');
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reference = generateReferenceCode();
    const existing = checkStmt.get(reference);
    if (!existing) {
      return reference;
    }
  }

  throw new Error('Unable to generate unique booking reference. Please try again.');
}
