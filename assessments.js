const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/assessments?law_id=
router.get('/', auth, async (req, res) => {
  const { law_id } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.full_name AS assessed_by_name, l.name AS law_name, l.code
       FROM assessments a
       JOIN users u ON u.id = a.assessed_by
       JOIN laws  l ON l.id = a.law_id
       WHERE ($1::uuid IS NULL OR a.law_id = $1)
       ORDER BY a.created_at DESC`,
      [law_id || null]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/assessments/:id — with items
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [assessment] } = await db.query(
      `SELECT a.*, u.full_name AS assessed_by_name, l.name AS law_name
       FROM assessments a JOIN users u ON u.id=a.assessed_by JOIN laws l ON l.id=a.law_id
       WHERE a.id=$1`, [req.params.id]
    );
    if (!assessment) return res.status(404).json({ error: 'ไม่พบการประเมิน' });

    const { rows: items } = await db.query(
      `SELECT ai.*, c.requirement, c.tags, c.section_id
       FROM assessment_items ai JOIN checklists c ON c.id = ai.checklist_id
       WHERE ai.assessment_id = $1 ORDER BY c.sort_order`, [req.params.id]
    );
    res.json({ ...assessment, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/assessments — create new
router.post('/', auth, async (req, res) => {
  const { law_id, period_start, period_end, notes } = req.body;
  try {
    const { rows: [a] } = await db.query(
      `INSERT INTO assessments (law_id, assessed_by, period_start, period_end, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [law_id, req.user.id, period_start, period_end, notes]
    );

    // Auto-create blank items from checklists
    const { rows: cl } = await db.query(
      'SELECT id FROM checklists WHERE law_id=$1 AND is_active ORDER BY sort_order', [law_id]
    );
    if (cl.length) {
      const vals = cl.map((c, i) => `($1,$${i + 2})`).join(',');
      await db.query(
        `INSERT INTO assessment_items (assessment_id, checklist_id) VALUES ${vals}`,
        [a.id, ...cl.map(c => c.id)]
      );
    }
    res.status(201).json(a);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/assessments/:id/items/:itemId — update single item
router.patch('/:id/items/:itemId', auth, async (req, res) => {
  const { result, evidence_note } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE assessment_items SET result=$1, evidence_note=$2, updated_at=NOW()
       WHERE id=$3 AND assessment_id=$4 RETURNING *`,
      [result, evidence_note, req.params.itemId, req.params.id]
    );
    // Recalculate overall %
    await recalculate(req.params.id);
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/assessments/:id/submit
router.patch('/:id/submit', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE assessments SET status='submitted', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

async function recalculate(assessmentId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE result='pass') AS pass_count,
            COUNT(*) FILTER (WHERE result IN ('pass','fail')) AS total_count
     FROM assessment_items WHERE assessment_id=$1`, [assessmentId]
  );
  const { pass_count, total_count } = rows[0];
  const pct = total_count > 0 ? (pass_count / total_count) * 100 : 0;
  await db.query(
    'UPDATE assessments SET overall_pct=$1 WHERE id=$2', [pct.toFixed(2), assessmentId]
  );
}

module.exports = router;
