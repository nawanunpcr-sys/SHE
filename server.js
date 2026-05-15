require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');

const authRoutes        = require('./routes/auth');
const lawRoutes         = require('./routes/laws');
const assessmentRoutes  = require('./routes/assessments');
const assignmentRoutes  = require('./routes/assignments');
const notificationRoutes= require('./routes/notifications');
const scraperRoutes     = require('./routes/scraper');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/laws',          lawRoutes);
app.use('/api/assessments',   assessmentRoutes);
app.use('/api/assignments',   assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scraper',       scraperRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Cron: ดึงราชกิจจาฯ ทุกวัน 08:00 ────────────────────────
cron.schedule('0 8 * * *', async () => {
  console.log('[cron] ตรวจสอบราชกิจจานุเบกษา...');
  try {
    const { scrapeRatchakitcha } = require('./controllers/scraperController');
    await scrapeRatchakitcha();
  } catch (err) {
    console.error('[cron] scrape error:', err.message);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅  SHE API running on http://localhost:${PORT}`));
