# SHE Compliance Manager
ระบบจัดการทะเบียนกฎหมายความปลอดภัย อาชีวอนามัย และสิ่งแวดล้อม

## โครงสร้างโปรเจค

```
she-compliance/
├── frontend/
│   └── index.html          ← UI หลัก (HTML/CSS/JS + Tailwind)
├── backend/
│   ├── server.js           ← Entry point
│   ├── db.js               ← PostgreSQL connection pool
│   ├── .env.example        ← ตัวอย่าง config
│   ├── middleware/
│   │   └── auth.js         ← JWT middleware
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login|register
│   │   ├── laws.js         ← CRUD กฎหมาย + สถิติ
│   │   ├── assessments.js  ← ประเมินความสอดคล้อง
│   │   ├── assignments.js  ← ส่งงานแผนก
│   │   ├── notifications.js← การแจ้งเตือน
│   │   └── scraper.js      ← ดึงราชกิจจาฯ
│   └── controllers/
│       └── scraperController.js
└── database/
    ├── schema.sql          ← สร้างตาราง
    └── seed.sql            ← ข้อมูลตัวอย่าง
```

## ขั้นตอนการติดตั้ง

### 1. ตั้งค่า PostgreSQL
```bash
# สร้าง database
psql -U postgres -c "CREATE DATABASE she_compliance;"

# รัน schema
psql -U postgres -d she_compliance -f database/schema.sql

# ใส่ข้อมูลตัวอย่าง
psql -U postgres -d she_compliance -f database/seed.sql
```

### 2. ตั้งค่า Backend
```bash
cd backend
cp ../.env.example .env
# แก้ไข .env ให้ตรงกับ config ของคุณ

npm install
npm run dev   # หรือ npm start สำหรับ production
```

### 3. เปิด Frontend
```bash
# เปิด frontend/index.html ด้วย browser โดยตรง
# หรือใช้ live-server
npx live-server frontend
```

## API Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /api/auth/login | เข้าสู่ระบบ |
| POST | /api/auth/register | สมัครสมาชิก |
| GET | /api/laws | รายการกฎหมายทั้งหมด |
| GET | /api/laws/:id | รายละเอียดกฎหมาย |
| POST | /api/laws | เพิ่มกฎหมายใหม่ |
| GET | /api/laws/stats/summary | สถิติ Dashboard |
| GET | /api/laws/:id/analysis | ผลวิเคราะห์ ใคร/ทำอะไร/ที่ไหน/อย่างไร |
| POST | /api/laws/:id/analysis | บันทึกการวิเคราะห์ |
| GET | /api/assessments | รายการประเมิน |
| POST | /api/assessments | สร้างการประเมินใหม่ |
| PATCH | /api/assessments/:id/items/:itemId | อัปเดตผลรายข้อ |
| PATCH | /api/assessments/:id/submit | ยืนยันผลการประเมิน |
| GET | /api/assignments | งานที่ได้รับมอบหมาย |
| POST | /api/assignments | ส่งงานแผนก |
| GET | /api/notifications | การแจ้งเตือน |
| POST | /api/scraper/run | ดึงข้อมูลจากราชกิจจาฯ (manual) |

## บัญชีผู้ใช้ตัวอย่าง (จาก seed.sql)
| username | role | หมายเหตุ |
|----------|------|---------|
| nawanun | admin | ต้องตั้ง password ใหม่ใน DB |
| somchai | officer | ต้องตั้ง password ใหม่ใน DB |

> ⚠️ seed.sql ใส่ placeholder hash ไว้ — ต้องรัน script reset password ก่อนใช้จริง

## Tech Stack
| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | HTML/CSS/JS (IBM Plex Sans Thai) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15+ |
| Auth | JWT (jsonwebtoken) |
| Scraping | node-fetch + Cheerio |
| Scheduler | node-cron (ดึงราชกิจจาฯ 08:00 ทุกวัน) |
| Notifications | Nodemailer + LINE Notify |
