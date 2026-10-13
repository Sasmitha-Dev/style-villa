import { Router } from 'express';
import db from '../../db/connection.js';

const router = Router();

// GET /api/admin/stats - Overview metrics
router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Today's arrivals and departures
  const arrivalsToday = db
    .prepare("SELECT COUNT(*) as count FROM bookings WHERE check_in = ? AND status IN ('pending', 'confirmed')")
    .get(today).count;

  const departuresToday = db
    .prepare("SELECT COUNT(*) as count FROM bookings WHERE check_out = ? AND status IN ('pending', 'confirmed')")
    .get(today).count;

  // 2. Next 7 days occupancy calculation
  const next7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    next7Days.push(d.toISOString().slice(0, 10));
  }
  const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE is_active = 1').get().count;

  let occupiedRoomDays = 0;
  for (const dateStr of next7Days) {
    const count = db
      .prepare(`
        SELECT COUNT(DISTINCT room_id) as count
        FROM bookings
        WHERE status IN ('pending', 'confirmed')
          AND check_in <= ?
          AND check_out > ?
      `)
      .get(dateStr, dateStr).count;
    occupiedRoomDays += count;
  }
  const possibleRoomDays = (totalRooms || 1) * 7;
  const occupancyRate = Math.round((occupiedRoomDays / possibleRoomDays) * 100);

  // 3. Current month revenue (confirmed & completed bookings)
  const currentMonthPrefix = today.slice(0, 7); // "YYYY-MM"
  const monthlyRevenue = db
    .prepare(`
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM bookings
      WHERE status IN ('confirmed', 'completed')
        AND check_in LIKE ?
    `)
    .get(`${currentMonthPrefix}%`).total;

  // 4. Pending bookings count
  const pendingCount = db
    .prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'")
    .get().count;

  res.json({
    ok: true,
    data: {
      today,
      arrivalsToday,
      departuresToday,
      totalRooms,
      occupancyRatePercent: occupancyRate,
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      pendingBookings: pendingCount
    }
  });
});

export default router;
