import { Router } from 'express';
import db from '../../db/connection.js';

const router = Router();

// GET /api/admin/settings - Retrieve all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }

  res.json({
    ok: true,
    data: settings
  });
});

// PUT /api/admin/settings - Update settings keys
router.put('/', (req, res) => {
  const entries = req.body;
  if (!entries || typeof entries !== 'object') {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_DATA', message: 'Settings payload must be a key-value object.' }
    });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const updateTx = db.transaction((obj) => {
    for (const [key, val] of Object.entries(obj)) {
      const stringValue = typeof val === 'object' ? JSON.stringify(val) : String(val);
      upsertStmt.run(key, stringValue);
    }
  });
  updateTx(entries);

  // Return refreshed settings
  const refreshed = db.prepare('SELECT key, value FROM settings').all();
  const output = {};
  for (const r of refreshed) {
    output[r.key] = r.value;
  }

  res.json({
    ok: true,
    data: output
  });
});

export default router;
