-- ============================================================
-- SHE Compliance Manager — Seed Data
-- ============================================================

-- ── Categories ─────────────────────────────────────────────
INSERT INTO law_categories (name, color) VALUES
  ('ความปลอดภัย', 'blue'),
  ('สวัสดิการ',   'amber'),
  ('สิ่งแวดล้อม', 'green'),
  ('อาชีวอนามัย', 'gray');

-- ── Departments ────────────────────────────────────────────
INSERT INTO departments (name) VALUES
  ('HR'), ('ผลิต'), ('คลัง'), ('สิ่งแวดล้อม'), ('การเงิน'), ('ฝ่ายบริหาร');

-- ── Default admin user (password: Admin@1234) ──────────────
INSERT INTO users (username, email, password, full_name, role, organization) VALUES
  ('nawanun', 'nawanun@phkku.ac.th',
   '$2b$10$examplehashplaceholder.nawanun',
   'นวนุ่น ชาติไทย', 'admin', 'PHKKU'),
  ('somchai', 'somchai@phkku.ac.th',
   '$2b$10$examplehashplaceholder.somchai',
   'สมชาย ดีงาม', 'officer', 'PHKKU');

-- ── Laws ───────────────────────────────────────────────────
INSERT INTO laws (code, name, short_name, category_id, effective_date, published_date, source_url) VALUES
  ('OSH-2554-001',
   'พระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554',
   'พรบ. ความปลอดภัยฯ 2554',
   1, '2554-07-16', '2554-06-12',
   'https://www.ratchakitchanubeksa.go.th'),

  ('WEL-2563-004',
   'กฎกระทรวงว่าด้วยการจัดสวัสดิการในสถานประกอบกิจการ พ.ศ. 2563',
   'กฎกระทรวงสวัสดิการ 2563',
   2, '2563-06-01', '2563-05-15', NULL),

  ('ENV-2535-012',
   'พระราชบัญญัติส่งเสริมและรักษาคุณภาพสิ่งแวดล้อมแห่งชาติ พ.ศ. 2535 (แก้ไข 2566)',
   'พรบ. ควบคุมมลพิษ 2535',
   3, '2535-04-04', '2535-03-29', NULL),

  ('PPE-2565-008',
   'ประกาศกระทรวงแรงงาน เรื่อง มาตรฐานอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล พ.ศ. 2565',
   'ประกาศ PPE 2565',
   1, '2565-10-01', '2565-09-15', NULL),

  ('HLT-2564-002',
   'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย พ.ศ. 2564',
   'กฎกระทรวงสุขภาพอนามัย 2564',
   4, '2564-05-01', '2564-04-22', NULL);

-- ── Law–Department mappings ────────────────────────────────
-- OSH-2554-001 → HR, ผลิต
INSERT INTO law_departments (law_id, department_id)
SELECT l.id, d.id FROM laws l, departments d
WHERE l.code = 'OSH-2554-001' AND d.name IN ('HR', 'ผลิต');

-- WEL-2563-004 → HR, การเงิน
INSERT INTO law_departments (law_id, department_id)
SELECT l.id, d.id FROM laws l, departments d
WHERE l.code = 'WEL-2563-004' AND d.name IN ('HR', 'การเงิน');

-- ENV-2535-012 → สิ่งแวดล้อม
INSERT INTO law_departments (law_id, department_id)
SELECT l.id, d.id FROM laws l, departments d
WHERE l.code = 'ENV-2535-012' AND d.name = 'สิ่งแวดล้อม';

-- PPE-2565-008 → ผลิต, คลัง
INSERT INTO law_departments (law_id, department_id)
SELECT l.id, d.id FROM laws l, departments d
WHERE l.code = 'PPE-2565-008' AND d.name IN ('ผลิต', 'คลัง');

-- HLT-2564-002 → HR
INSERT INTO law_departments (law_id, department_id)
SELECT l.id, d.id FROM laws l, departments d
WHERE l.code = 'HLT-2564-002' AND d.name = 'HR';

-- ── Law sections for OSH-2554-001 ─────────────────────────
INSERT INTO law_sections (law_id, section_no, title, sort_order)
SELECT l.id, s.section_no, s.title, s.sort_order
FROM laws l,
(VALUES
  ('มาตรา 8',  'หน้าที่นายจ้างจัดให้สถานที่ปลอดภัย', 1),
  ('มาตรา 13', 'การฝึกอบรมด้านความปลอดภัย', 2),
  ('มาตรา 16', 'คณะกรรมการความปลอดภัย (คปอ.)', 3),
  ('มาตรา 20', 'การจัดให้มี PPE', 4),
  ('มาตรา 22', 'การรายงานอุบัติเหตุ', 5),
  ('มาตรา 23', 'การตรวจวัดสิ่งแวดล้อม', 6),
  ('มาตรา 32', 'เจ้าหน้าที่ความปลอดภัย (จป.)', 7)
) AS s(section_no, title, sort_order)
WHERE l.code = 'OSH-2554-001';

-- ── Checklists for OSH-2554-001 ───────────────────────────
INSERT INTO checklists (law_id, section_id, requirement, tags, sort_order)
SELECT
  l.id,
  sec.id,
  c.requirement,
  c.tags,
  c.sort_order
FROM laws l
JOIN law_sections sec ON sec.law_id = l.id
JOIN (VALUES
  ('มาตรา 8',  'นายจ้างจัดทำนโยบายความปลอดภัยเป็นลายลักษณ์อักษร และประกาศให้พนักงานทราบ', ARRAY['เอกสาร','ประกาศ'], 1),
  ('มาตรา 13', 'จัดการฝึกอบรมด้านความปลอดภัยให้พนักงานใหม่ก่อนเริ่มงาน', ARRAY['Training','ลงนาม'], 2),
  ('มาตรา 13', 'ทบทวนการฝึกอบรมด้านความปลอดภัยทั่วไปอย่างน้อยปีละ 1 ครั้ง', ARRAY['Training'], 3),
  ('มาตรา 16', 'จัดตั้งคณะกรรมการความปลอดภัย (คปอ.) และมีการประชุมอย่างน้อยเดือนละ 1 ครั้ง', ARRAY['คปอ.','รายงาน'], 4),
  ('มาตรา 20', 'จัดให้มี PPE ที่เหมาะสมและเพียงพอสำหรับงานที่มีความเสี่ยง', ARRAY['PPE','ทะเบียน'], 5),
  ('มาตรา 22', 'รายงานอุบัติเหตุที่ทำให้หยุดงานเกิน 3 วัน ต่อพนักงานตรวจแรงงานภายใน 15 วัน', ARRAY['กสร.','รายงาน'], 6),
  ('มาตรา 23', 'ตรวจวัดระดับเสียงในสถานที่ทำงานที่มีเสียงดังอย่างน้อยปีละ 1 ครั้ง', ARRAY['สิ่งแวดล้อม','ตรวจวัด'], 7),
  ('มาตรา 32', 'มีการแต่งตั้ง จป. วิชาชีพ อย่างน้อย 1 คน ในกรณีที่มีลูกจ้าง 50 คนขึ้นไป', ARRAY['HR','คำสั่งแต่งตั้ง'], 8)
) AS c(section_no, requirement, tags, sort_order)
ON sec.section_no = c.section_no
WHERE l.code = 'OSH-2554-001';

-- ── Sample assessment ──────────────────────────────────────
INSERT INTO assessments (law_id, assessed_by, period_start, period_end, overall_pct, status)
SELECT l.id, u.id, '2567-01-01', '2567-06-30', 67.00, 'draft'
FROM laws l, users u
WHERE l.code = 'OSH-2554-001' AND u.username = 'nawanun';

-- ── Sample notifications ───────────────────────────────────
INSERT INTO notifications (user_id, law_id, type, message, due_date)
SELECT u.id, l.id, 'deadline',
  'พรบ. ควบคุมมลพิษ ครบกำหนดรายงาน — ต้องดำเนินการก่อน 17:00 น.',
  CURRENT_DATE
FROM users u, laws l
WHERE u.username = 'nawanun' AND l.code = 'ENV-2535-012';

INSERT INTO notifications (user_id, law_id, type, message, due_date)
SELECT u.id, l.id, 'overdue',
  'กฎกระทรวงสุขภาพฯ ยังขาดเอกสาร 3 รายการ',
  CURRENT_DATE + 5
FROM users u, laws l
WHERE u.username = 'nawanun' AND l.code = 'HLT-2564-002';

INSERT INTO notifications (user_id, law_id, type, message, due_date)
SELECT u.id, l.id, 'new_law',
  'ราชกิจจาฯ ออกกฎใหม่เรื่อง สารเคมี — รอวิเคราะห์',
  CURRENT_DATE + 14
FROM users u, laws l
WHERE u.username = 'nawanun' AND l.code = 'OSH-2554-001';
