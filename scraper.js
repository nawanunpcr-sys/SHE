const router = require('express').Router();
const auth   = require('../middleware/auth');
const { scrapeRatchakitcha } = require('../controllers/scraperController');

// POST /api/scraper/run — manual trigger
router.post('/run', auth, async (req, res) => {
  try {
    const results = await scrapeRatchakitcha();
    res.json({ message: 'สำเร็จ', found: results.length, items: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
