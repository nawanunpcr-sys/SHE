const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/laws — list all (with category + compliance %)
router.get('/', auth, async (req, res) => {
  const { category, status, search } = req.query;
  let query = `
    SELECT l.*, c.name AS category_name, c.color,
      COALESCE(a.overall_pct, 0) AS compliance_pct,
      a.status AS assessment_status
    FROM laws l
    LEFT JOIN law_categories c ON c.id = l.category_id
    LEFT JOIN LATERAL (
      SELECT overall_pct, status FROM assessments
      WHERE law_id = l.id ORDER BY created_at DESC LIMIT 1
    ) a ON TRUE
    WHERE l.status = 'active'
  `;
  const params = [];
  if (category) { params.push(category); query += ` AND c.name = $${params.length}`; }
  if (search)   { params.push(`%${search}%`); query += ` AND (l.name ILIKE $${params.length} OR l.code ILIKE $${params.length})`; }
  query += ' ORDER BY l.created_at DESC';

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/laws/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [law] } = await db.query(
      `SELECT l.*, c.name AS category_name FROM laws l
       LEFT JOIN law_categories c ON c.id = l.category_id
       WHERE l.id = $1`, [req.params.id]
    );
    if (!law) return res.status(404).json({ error: 'ไม่พบกฎหมาย' });

    const { rows: sections } = await db.query(
      'SELECT * FROM law_sections WHERE law_id = $1 ORDER BY sort_order', [law.id]
    );
    const { rows: depts } = await db.query(
      `SELECT d.name FROM law_departments ld
       JOIN departments d ON d.id = ld.department_id
       WHERE ld.law_id = $1`, [law.id]
    );
    const { rows: checklists } = await db.query(
      'SELECT * FROM checklists WHERE law_id = $1 AND is_active ORDER BY sort_order', [law.id]
    );

    res.json({ ...law, sections, departments: depts.map(d => d.name), checklists });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/laws
router.post('/', auth, async (req, res) => {
  const { code, name, short_name, category_id, effective_date, published_date, source_url, notes } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO laws (code,name,short_name,category_id,effective_date,published_date,source_url,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code, name, short_name, category_id, effective_date, published_date, source_url, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/laws/:id
router.put('/:id', auth, async (req, res) => {
  const fields = ['name','short_name','category_id','effective_date','published_date','source_url','notes','status'];
  const updates = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { vals.push(req.body[f]); updates.push(`${f}=$${vals.length}`); } });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE laws SET ${updates.join(',')} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/laws/:id/analysis
router.get('/:id/analysis', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT la.*, ls.section_no, ls.title
       FROM law_analyses la
       JOIN law_sections ls ON ls.id = la.section_id
       WHERE ls.law_id = $1`, [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/laws/:id/analysis
router.post('/:id/analysis', auth, async (req, res) => {
  const { section_id, who_list, what_list, where_list, how_list } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO law_analyses (section_id, who_list, what_list, where_list, how_list, analyzed_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [section_id, who_list, what_list, where_list, how_list, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/laws/stats/summary — dashboard numbers
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active')                        AS total,
        COUNT(*) FILTER (WHERE a.overall_pct >= 80)                   AS compliant,
        COUNT(*) FILTER (WHERE a.overall_pct >= 50 AND a.overall_pct < 80) AS in_progress,
        COUNT(*) FILTER (WHERE a.overall_pct < 50 OR a.overall_pct IS NULL) AS non_compliant,
        ROUND(AVG(a.overall_pct),1)                                   AS avg_pct
      FROM laws l
      LEFT JOIN LATERAL (
        SELECT overall_pct FROM assessments WHERE law_id = l.id ORDER BY created_at DESC LIMIT 1
      ) a ON TRUE
      WHERE l.status = 'active'
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
