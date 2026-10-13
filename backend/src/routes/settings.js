import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/settings/public - Retrieve public hotel settings
router.get('/public', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};

  for (const row of rows) {
    if (row.key === 'services_list') {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = [];
      }
    } else {
      settings[row.key] = row.value;
    }
  }

  res.json({
    ok: true,
    data: settings
  });
});

export default router;
