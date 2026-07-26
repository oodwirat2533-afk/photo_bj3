# 🏫 School Photo Gallery & Management Web App (Google Apps Script)

ระบบจัดการคลังรูปภาพและกิจกรรมโรงเรียน พัฒนาด้วย **HTML5, Modern Vanilla CSS (Glassmorphism), JavaScript** เชื่อมต่อกับ **Google Apps Script (`Code.gs`) และ Google Drive Storage**

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **บุคคลทั่วไป (Public Viewers):**
   * เรียกดูรูปภาพกิจกรรมโรงเรียนแยกตามอัลบั้ม/โฟลเดอร์
   * ค้นหารูปภาพตามชื่อหรือกิจกรรม
   * ดูภาพขยายใหญ่เต็มจอ (Lightbox View) และดาวน์โหลดรูปภาพความคมชัดสูงได้ทันที

2. **ระบบสิทธิ์ยืนยันตัวตน (Dual Super Admin & User Approval):**
   * **Super Admin คู่:** กำหนดให้อีเมล `ood.wirat2533@gmail.com` และ **เจ้าของโปรเจกต์ (Script Owner)** เป็น Super Admin ร่วมกันโดยอัตโนมัติ
   * **User Registration:** บัญชี Google ทั่วไปสามารถกด "ขอสิทธิ์ผู้ดูแล" เพื่อส่งคำขออนุมัติ
   * **Super Admin Dashboard:** Super Admin สามารถเลือกกดอนุมัติผู้สมัครให้เป็น **Admin** หรือ **ผู้ช่วย Admin** ได้จากหน้าเว็บ

3. **ผู้ดูแลระบบ (Admin & Assistant Admin):**
   * สร้างอัลบั้ม / โฟลเดอร์ใหม่เข้า Google Drive
   * Drag & Drop อัปโหลดรูปภาพทีละหลายไฟล์พร้อมกัน
   * ลบรูปภาพออกจากระบบ (เฉพาะ Admin และ Super Admin)

---

## 🛠️ ขั้นตอนการใช้งาน Clasp CLI เพื่ออัปโหลดขึ้น Google Apps Script

### 1. การติดตั้งและ Login ผ่าน Clasp CLI

เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ (`c:\Users\oodwi\Documents\photo_bj3`) แล้วรันคำสั่ง:

```bash
# 1. ติดตั้ง Clasp CLI dependencies
npm install

# 2. ล็อกอินเข้าสู่ระบบ Google ผ่าน Clasp
npx clasp login
```

*(ระบบจะเปิดหน้าเบราว์เซอร์ ให้เลือกบัญชี Google และกด อนุญาต/Allow)*

> **หมายเหตุสำคัญ:** ก่อนรันคำสั่งสร้าง Script ต้องเปิดสิทธิ์ Google Apps Script API ในบัญชีของคุณที่: [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) และเปลี่ยนสถานะเป็น **ON (เปิดใช้งาน)**

---

### 2. การสร้าง Script หรือเชื่อมต่อกับ Project ที่มีอยู่แล้ว

#### กรณีที่ 1: สร้าง Google Apps Script ใหม่ผ่าน Clasp
```bash
npx clasp create --type webapp --title "School Photo Gallery"
```
*(คำสั่งนี้จะสร้างไฟล์ Script ใน Google Drive ของคุณ และอัปเดตไฟล์ `.clasp.json` ด้วย `scriptId` อัตโนมัติ)*

#### กรณีที่ 2: มี Google Apps Script Project อยู่แล้ว
1. เปิดไฟล์ Google Apps Script Project ของคุณบนเว็บ
2. คัดลอก `Script ID` จาก URL (เช่น `https://script.google.com/d/YOUR_SCRIPT_ID_HERE/edit`)
3. นำมาใส่ในไฟล์ `.clasp.json` ในโฟลเดอร์นี้:
```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
```

---

### 3. สั่ง Push โค้ดขึ้น Google Apps Script

```bash
npx clasp push
```
*(ไฟล์ทั้งหมด `Code.gs`, `Index.html`, `Stylesheet.html`, `JavaScript.html`, `appsscript.json` จะถูกอัปโหลดขึ้น Google Apps Script ทันที)*

---

### 4. การเปิดไฟล์ใน Browser และการ Deploy เป็น Web App

#### 1. เปิดสคริปต์ใน Google Apps Script Editor:
```bash
npx clasp open
```

#### 2. ตั้งค่าการ Deploy เป็น Web App:
1. ในหน้า Google Apps Script Editor กดปุ่ม **"Deploy" (ทำให้ใช้งานได้)** -> เลือก **"New deployment" (การทำให้ใช้งานได้ใหม่)**
2. คลิกรูปเฟืองเลือกประเภท **"Web app" (เว็บแอป)**
3. ตั้งค่าการใช้งานดังนี้:
   * **Execute as (เรียกใช้งานในฐานะ):** `Me (คุณ)` *(ใช้อีเมลของคุณในการอ่าน/เขียน Google Drive)*
   * **Who has access (ผู้มีสิทธิ์เข้าถึง):** `Anyone (ทุกคน)` *(เพื่อให้บุคคลทั่วไปเปิดดูภาพได้โดยไม่ต้องตั้งค่าสิทธิ์ให้ยุ่งยาก)*
4. กด **"Deploy"** และคัดลอก **Web App URL** เพื่อนำไปแชร์ให้ใช้งานได้ทันที!

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
photo_bj3/
├── Code.gs            # Backend GAS: Drive Storage, Role & User Approval, Dual Super Admin
├── Index.html         # Frontend HTML5 Semantic Structure & Modals
├── Stylesheet.html    # Modern Design System (Glassmorphic Theme, Responsive Layout)
├── JavaScript.html    # Client-Side Application Logic & State Engine
├── appsscript.json    # Apps Script Manifest (Timezone, OAuth Scopes)
├── package.json       # Node.js NPM Scripts & Clasp Dependency
├── .clasp.json        # Clasp CLI Configuration
├── .gitignore         # Git Ignore file
└── README.md          # คู่มือการใช้งานภาษาไทย
```
