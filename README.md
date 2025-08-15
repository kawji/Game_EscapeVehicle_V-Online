# Road Safety — Dodge (Online, PostgreSQL)
HTML5 เกมขับรถหลบสิ่งกีดขวาง + ระบบบัญชีออนไลน์ (เก็บ `username/password_hash/tier/stars` บน PostgreSQL)

## 1) ติดตั้ง
```bash
npm install
```

## 2) ตั้งค่า DB
- สร้างฐานข้อมูล แล้วรันสคีมา:
```bash
psql "$DATABASE_URL" -f schema.sql
```
- คัดลอก `.env.example` เป็น `.env` แล้วแก้ค่า
  - `DATABASE_URL=postgres://user:pass@host:5432/dbname`
  - `PGSSL=true` (ถ้าโฮสต์ต้องใช้ SSL)
  - `COOKIE_SECURE=false` (ทดสอบโลคัลให้ false; โปรดตั้ง true บน HTTPS จริง)
  - `PORT=3000`

## 3) รันเซิร์ฟเวอร์
```bash
node server.mjs
```
แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## 4) ฟีเจอร์
- Login/Register → เก็บบน DB (รหัสผ่านใช้ bcrypt)
- โหมดทั่วไป/แรงค์ (ranked ชนะแล้วจะเรียก `/api/win` อัปเดต tier/stars บน DB)
- Dev Info modal ตามข้อความที่ผู้พัฒนาระบุ
- สถิติ best time/score เก็บใน localStorage เฉพาะเครื่อง (ไม่บันทึก DB ตามโจทย์)

> ถ้าต้องการย้าย Leaderboard ไปเก็บบน DB ภายหลัง สามารถเพิ่มตาราง `scores` ได้ง่าย
