import assert from 'assert';
import db from '../src/db/connection.js';
import { runSeed } from '../src/db/seed.js';
import app from '../src/server.js';

const PORT = 4099;
let server;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== STYLE VILLA BACKEND VERIFICATION SUITE ===\n');

  // 1. Run seed idempotently
  console.log('1. Verifying database seed...');
  runSeed();
  runSeed(); // Second run to verify idempotency
  console.log('  PASS: Seed is idempotent.\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 2. Health check
    console.log('2. Testing GET /api/health...');
    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.ok, true);
    assert.strictEqual(health.data.data.status, 'healthy');
    console.log('  PASS: Health check healthy.\n');

    // 3. Settings public
    console.log('3. Testing GET /api/settings/public...');
    const settings = await request('/api/settings/public');
    assert.strictEqual(settings.status, 200);
    assert.strictEqual(settings.data.data.hotel_name, 'Style Villa');
    assert.ok(Array.isArray(settings.data.data.services_list));
    console.log('  PASS: Public settings loaded.\n');

    // 4. Rooms list & single
    console.log('4. Testing GET /api/rooms & GET /api/rooms/:slug...');
    const rooms = await request('/api/rooms');
    assert.strictEqual(rooms.status, 200);
    assert.strictEqual(rooms.data.data.length, 6);
    const room1 = rooms.data.data[0];
    assert.strictEqual(room1.slug, 'room-1');

    const singleRoom = await request(`/api/rooms/${room1.slug}`);
    assert.strictEqual(singleRoom.status, 200);
    assert.strictEqual(singleRoom.data.data.name, room1.name);
    console.log('  PASS: Rooms endpoints returning seeded data.\n');

    // 5. Availability search
    console.log('5. Testing GET /api/availability...');
    const futureCheckIn = '2026-11-10';
    const futureCheckOut = '2026-11-13';
    const avail = await request(`/api/availability?checkIn=${futureCheckIn}&checkOut=${futureCheckOut}&adults=2&children=0`);
    assert.strictEqual(avail.status, 200);
    assert.strictEqual(avail.data.data.availableRooms.length, 6);
    console.log('  PASS: Availability search returned 6 rooms.\n');

    // 6. Valid booking creation
    console.log('6. Testing POST /api/bookings (Valid booking)...');
    const bookingPayload = {
      roomId: room1.id,
      checkIn: futureCheckIn,
      checkOut: futureCheckOut,
      adults: 2,
      children: 0,
      guest: {
        fullName: 'Test Traveler',
        email: 'traveler@example.com',
        phone: '+94 77 123 4567',
        country: 'United Kingdom'
      },
      specialRequests: 'Quiet room near garden'
    };
    const bookingRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingPayload)
    });
    assert.strictEqual(bookingRes.status, 201);
    assert.ok(bookingRes.data.data.reference.startsWith('SV-'));
    assert.strictEqual(bookingRes.data.data.nights, 3);
    assert.strictEqual(bookingRes.data.data.totalPrice, 195);
    const refCode = bookingRes.data.data.reference;
    console.log(`  PASS: Booking created with ref: ${refCode}.\n`);

    // 7. Overlapping booking (Double booking prevention -> 409 Conflict)
    console.log('7. Testing POST /api/bookings (Overlapping booking -> expect 409)...');
    const overlapRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingPayload)
    });
    assert.strictEqual(overlapRes.status, 409);
    assert.strictEqual(overlapRes.data.ok, false);
    assert.strictEqual(overlapRes.data.error.code, 'ROOM_UNAVAILABLE');
    console.log('  PASS: 409 Conflict returned on overlapping booking.\n');

    // 8. Invalid dates (checkOut before checkIn)
    console.log('8. Testing POST /api/bookings (Invalid dates -> expect 400)...');
    const invalidDateRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...bookingPayload,
        checkIn: '2026-11-15',
        checkOut: '2026-11-10'
      })
    });
    assert.strictEqual(invalidDateRes.status, 400);
    console.log('  PASS: 400 returned on invalid checkout date.\n');

    // 9. Over-capacity guests
    console.log('9. Testing POST /api/bookings (Over-capacity -> expect 400)...');
    const overCapacityRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...bookingPayload,
        checkIn: '2026-11-20',
        checkOut: '2026-11-22',
        adults: 5 // Room 1 max_guests is 2
      })
    });
    assert.strictEqual(overCapacityRes.status, 400);
    assert.strictEqual(overCapacityRes.data.error.code, 'CAPACITY_EXCEEDED');
    console.log('  PASS: 400 returned on over-capacity guests.\n');

    // 10. Reviews workflow
    console.log('10. Testing Reviews (submit unpublished -> verify empty state)...');
    const reviewRes = await request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Jane Smith',
        rating: 5,
        comment: 'Magnificent tropical gardens and peaceful atmosphere.'
      })
    });
    assert.strictEqual(reviewRes.status, 201);

    const publicReviews = await request('/api/reviews');
    assert.strictEqual(publicReviews.status, 200);
    assert.strictEqual(publicReviews.data.data.reviews.length, 0); // Must be unpublished!
    console.log('  PASS: Review submitted as unpublished; public view remains clean.\n');

    // 11. Admin login brute force & authentication
    console.log('11. Testing Admin Auth (wrong password -> correct login)...');
    const wrongLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@stylevilla.com', password: 'WrongPassword' })
    });
    assert.strictEqual(wrongLogin.status, 401);
    assert.strictEqual(wrongLogin.data.error.code, 'INVALID_CREDENTIALS');

    const correctLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@stylevilla.com', password: 'AdminPass123!' })
    });
    assert.strictEqual(correctLogin.status, 200);
    assert.ok(correctLogin.data.data.token);
    const token = correctLogin.data.data.token;
    console.log('  PASS: Admin login rejected wrong password and issued JWT.\n');

    // 12. Admin request without token (expect 401)
    console.log('12. Testing Admin Protected Route without token -> expect 401...');
    const unauthReq = await request('/api/admin/stats');
    assert.strictEqual(unauthReq.status, 401);
    assert.strictEqual(unauthReq.data.error.code, 'UNAUTHORIZED');
    console.log('  PASS: 401 returned when token is missing.\n');

    // 13. Admin stats & bookings management
    console.log('13. Testing Admin Protected Routes with JWT...');
    const adminStats = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(adminStats.status, 200);
    assert.strictEqual(adminStats.data.data.totalRooms, 6);

    const adminBookings = await request('/api/admin/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(adminBookings.status, 200);
    assert.ok(adminBookings.data.data.bookings.length >= 1);

    // Confirm booking
    const bookingToConfirm = adminBookings.data.data.bookings[0];
    const confirmRes = await request(`/api/admin/bookings/${bookingToConfirm.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'confirmed' })
    });
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.data.data.status, 'confirmed');

    // Verify room is now blocked for those dates
    const checkAfterConfirm = await request(`/api/availability?checkIn=${futureCheckIn}&checkOut=${futureCheckOut}&adults=2`);
    const room1InResults = checkAfterConfirm.data.data.availableRooms.find((r) => r.id === room1.id);
    assert.strictEqual(room1InResults, undefined); // Room 1 must NOT be in available rooms!
    console.log('  PASS: Confirmed booking successfully rendered Room 1 unavailable.\n');

    // 14. Admin review moderation (approve review)
    console.log('14. Testing Admin Review Moderation...');
    const adminReviews = await request('/api/admin/reviews', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(adminReviews.status, 200);
    assert.ok(adminReviews.data.data.length >= 1);
    const reviewId = adminReviews.data.data[0].id;

    await request(`/api/admin/reviews/${reviewId}/publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isPublished: 1 })
    });

    const reviewsNowPublic = await request('/api/reviews');
    assert.strictEqual(reviewsNowPublic.data.data.reviews.length, 1);
    console.log('  PASS: Admin approved review; now visible on public endpoint.\n');

    console.log('========================================================');
    console.log('ALL BACKEND & DATABASE VERIFICATION TESTS PASSED (14/14)!');
    console.log('========================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
