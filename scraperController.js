const db = require('../db');

/**
 * ดึงข้อมูลกฎหมายใหม่จากราชกิจจานุเบกษา
 * ใช้ fetch + Cheerio (ไม่ต้องการ headless browser)
 * ถ้าต้องการ JS-rendered pages ให้สลับเป็น Puppeteer
 */
async function scrapeRatchakitcha() {
  // dynamic import cheerio (ESM-compatible)
  const cheerio = require('cheerio');

  const BASE = 'https://www.ratchakitchanubeksa.go.th';
  const SEARCH_KEYWORDS = [
    'ความปลอดภัย', 'อาชีวอนามัย', 'สิ่งแวดล้อม',
    'สวัสดิการแรงงาน', 'แรงงาน',
  ];

  const results = [];

  for (const kw of SEARCH_KEYWORDS) {
    try {
      const url = `${BASE}/search?query=${encodeURIComponent(kw)}&type=law`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SHEComplianceBot/1.0' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;

      const html = await res.text();
      const $    = cheerio.load(html);

      // ปรับ selector ตาม HTML จริงของเว็บ
      $('a.result-item, .search-result .item').each((_, el) => {
        const title    = $(el).find('.title, h3').text().trim();
        const href     = $(el).attr('href') || $(el).find('a').attr('href');
        const dateText = $(el).find('.date, .published').text().trim();

        if (!title) return;

        results.push({
          name:       title,
          source_url: href ? (href.startsWith('http') ? href : BASE + href) : BASE,
          date_text:  dateText,
          keyword:    kw,
        });
      });
    } catch (err) {
      console.warn(`[scraper] keyword "${kw}":`, err.message);
    }
  }

  // บันทึกรายการที่ยังไม่มีในฐานข้อมูล
  for (const item of results) {
    const existing = await db.query('SELECT id FROM laws WHERE source_url=$1', [item.source_url]);
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO laws (code, name, source_url, status, notes)
         VALUES ($1,$2,$3,'active',$4)
         ON CONFLICT DO NOTHING`,
        [
          `RAT-${Date.now()}`,
          item.name,
          item.source_url,
          `ดึงอัตโนมัติจากราชกิจจาฯ คำค้น: ${item.keyword}`,
        ]
      );
      // แจ้งเตือน admin ทุกคน
      await db.query(
        `INSERT INTO notifications (user_id, type, message)
         SELECT id, 'new_law', $1 FROM users WHERE role='admin'`,
        [`กฎหมายใหม่จากราชกิจจาฯ: ${item.name}`]
      );
    }
  }

  return results;
}

module.exports = { scrapeRatchakitcha };
