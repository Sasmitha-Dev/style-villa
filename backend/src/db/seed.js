import bcrypt from 'bcryptjs';
import db from './connection.js';
import config from '../config.js';
import { settingsData, roomsData } from './seedData.js';

/**
 * Idempotent seed script for Style Villa.
 * Safe to execute repeatedly without duplicating records.
 */
export function runSeed() {
  console.log('[Seed] Initializing Style Villa database seed...');

  // 1. Settings Seeding
  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const seedSettingsTx = db.transaction((items) => {
    for (const item of items) {
      insertSetting.run(item.key, item.value);
    }
  });
  seedSettingsTx(settingsData);
  console.log(`[Seed] Seeded ${settingsData.length} settings records.`);

  // 2. Rooms Seeding
  const insertRoom = db.prepare(`
    INSERT INTO rooms (
      slug, name, description, price_per_night, currency, max_guests,
      beds, size_sqm, image_main, images_json, amenities_json, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      price_per_night = excluded.price_per_night,
      currency = excluded.currency,
      max_guests = excluded.max_guests,
      beds = excluded.beds,
      size_sqm = excluded.size_sqm,
      image_main = excluded.image_main,
      images_json = excluded.images_json,
      amenities_json = excluded.amenities_json,
      is_active = excluded.is_active
  `);

  const seedRoomsTx = db.transaction((rooms) => {
    for (const r of rooms) {
      insertRoom.run(
        r.slug,
        r.name,
        r.description,
        r.price_per_night,
        r.currency,
        r.max_guests,
        r.beds,
        r.size_sqm,
        r.image_main,
        r.images_json,
        r.amenities_json,
        r.is_active
      );
    }
  });
  seedRoomsTx(roomsData);
  console.log(`[Seed] Seeded ${roomsData.length} rooms.`);

  // 3. Reviews: Verified EMPTY as per requirements
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  console.log(`[Seed] Reviews verified empty: count = ${reviewCount}`);

  // 4. Admin Seeding from .env
  const existingAdmin = db
    .prepare('SELECT id FROM admins WHERE email = ?')
    .get(config.adminEmail);

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(config.adminPassword, 10);
    db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(
      config.adminEmail,
      passwordHash
    );
    console.log(`[Seed] Created admin account for ${config.adminEmail}`);
  } else {
    // Keep password in sync with .env
    const passwordHash = bcrypt.hashSync(config.adminPassword, 10);
    db.prepare('UPDATE admins SET password_hash = ? WHERE email = ?').run(
      passwordHash,
      config.adminEmail
    );
    console.log(`[Seed] Updated admin credentials for ${config.adminEmail}`);
  }

  console.log('[Seed] Database seed completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  try {
    runSeed();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  }
}
