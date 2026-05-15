const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT n.*, l.name AS law_name, l.code FROM notifications n
       LEFT JOIN laws l ON l.id = n.law_id
       WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
