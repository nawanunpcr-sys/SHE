const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/assignments
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ag.*, l.name AS law_name, l.code,
             u1.full_name AS assigned_to_name,
             u2.full_name AS assigned_by_name,
             d.name AS department_name
      FROM assignments ag
      JOIN laws l ON l.id = ag.law_id
      JOIN users u1 ON u1.id = ag.assigned_to
      JOIN users u2 ON u2.id = ag.assigned_by
      LEFT JOIN departments d ON d.id = ag.department_id
      WHERE ag.assigned_to = $1 OR ag.assigned_by = $1
      ORDER BY ag.due_date ASC`, [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/assignments
router.post('/', auth, async (req, res) => {
  const { law_id, assigned_to, department_id, due_date, notes } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO assignments (law_id, assigned_to, assigned_by, department_id, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [law_id, assigned_to, req.user.id, department_id, due_date, notes]
    );
    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, law_id, type, message, due_date)
       VALUES ($1,$2,'assigned',$3,$4)`,
      [assigned_to, law_id, `คุณได้รับมอบหมายงานกฎหมายใหม่ กำหนดส่ง ${due_date}`, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/assignments/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE assignments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
