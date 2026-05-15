const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE username = $1', [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'ไม่พบผู้ใช้งาน' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'she_secret',
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, full_name, organization } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password, full_name, organization)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, username, full_name, role`,
      [username, email, hash, full_name, organization]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
