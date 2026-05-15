-- ============================================================
-- SHE Compliance Manager — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(100) UNIQUE NOT NULL,
  email       VARCHAR(200) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  full_name   VARCHAR(200) NOT NULL,
  role        VARCHAR(50)  NOT NULL DEFAULT 'officer',  -- admin | officer | viewer
  organization VARCHAR(200),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Law categories ─────────────────────────────────────────
CREATE TABLE law_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL,   -- ความปลอดภัย | สวัสดิการ | สิ่งแวดล้อม | อาชีวอนามัย
  color VARCHAR(20)                     -- blue | green | amber | gray
);

-- ── Departments ────────────────────────────────────────────
CREATE TABLE departments (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL     -- HR | ผลิต | คลัง | สิ่งแวดล้อม | การเงิน
);

-- ── Laws ───────────────────────────────────────────────────
CREATE TABLE laws (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,     -- OSH-2554-001
  name            VARCHAR(500) NOT NULL,
  short_name      VARCHAR(200),
  category_id     INT REFERENCES law_categories(id),
  effective_date  DATE,
  published_date  DATE,
  source_url      TEXT,                            -- URL ราชกิจจานุเบกษา
  status          VARCHAR(30) DEFAULT 'active',    -- active | repealed | amended
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_laws_code ON laws(code);
CREATE INDEX idx_laws_status ON laws(status);

-- ── Law sections (มาตรา) ───────────────────────────────────
CREATE TABLE law_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id      UUID REFERENCES laws(id) ON DELETE CASCADE,
  section_no  VARCHAR(50) NOT NULL,    -- มาตรา 8, มาตรา 13 วรรค 2
  title       VARCHAR(500),
  content     TEXT,
  sort_order  INT DEFAULT 0
);

-- ── Law analysis (ใคร/ทำอะไร/ที่ไหน/อย่างไร) ──────────────
CREATE TABLE law_analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID REFERENCES law_sections(id) ON DELETE CASCADE,
  who_list    TEXT[],    -- ผู้มีหน้าที่
  what_list   TEXT[],    -- สิ่งที่ต้องทำ
  where_list  TEXT[],    -- ขอบเขต/สถานที่
  how_list    TEXT[],    -- วิธีการ/บทลงโทษ
  analyzed_by UUID REFERENCES users(id),
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Law–Department mapping ─────────────────────────────────
CREATE TABLE law_departments (
  law_id        UUID REFERENCES laws(id) ON DELETE CASCADE,
  department_id INT  REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (law_id, department_id)
);

-- ── Compliance checklists ──────────────────────────────────
CREATE TABLE checklists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id      UUID REFERENCES laws(id) ON DELETE CASCADE,
  section_id  UUID REFERENCES law_sections(id),
  requirement TEXT NOT NULL,           -- ข้อกำหนด
  tags        TEXT[],                  -- ['เอกสาร','ประกาศ']
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE
);

-- ── Compliance assessments ─────────────────────────────────
CREATE TABLE assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id       UUID REFERENCES laws(id) ON DELETE CASCADE,
  assessed_by  UUID REFERENCES users(id),
  period_start DATE,
  period_end   DATE,
  overall_pct  NUMERIC(5,2),           -- 67.50
  status       VARCHAR(30) DEFAULT 'draft',  -- draft | submitted | approved
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment items (per checklist row) ──────────────────
CREATE TABLE assessment_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID REFERENCES assessments(id) ON DELETE CASCADE,
  checklist_id   UUID REFERENCES checklists(id),
  result         VARCHAR(10),          -- pass | fail | na
  evidence_note  TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications / Alerts ─────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  law_id      UUID REFERENCES laws(id),
  type        VARCHAR(30) NOT NULL,    -- new_law | deadline | overdue | assigned
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Task assignments ───────────────────────────────────────
CREATE TABLE assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id        UUID REFERENCES laws(id) ON DELETE CASCADE,
  assigned_to   UUID REFERENCES users(id),
  assigned_by   UUID REFERENCES users(id),
  department_id INT REFERENCES departments(id),
  due_date      DATE,
  status        VARCHAR(30) DEFAULT 'pending',   -- pending | in_progress | done
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activity log ───────────────────────────────────────────
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,   -- created | updated | assessed | assigned
  target_type VARCHAR(50),             -- law | assessment | assignment
  target_id   UUID,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_laws_updated          BEFORE UPDATE ON laws          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assessments_updated   BEFORE UPDATE ON assessments   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assignments_updated   BEFORE UPDATE ON assignments   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
