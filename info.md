
# ABSTRACT

Digi Care (HAYVN) is a web-based system developed to improve the management of orphanages and elderly care homes. Many institutions still rely on manual methods for maintaining resident attendance, personal records, and important documents, which can lead to errors, data loss, and inefficient record management. The lack of a structured digital system also makes it difficult to manage donations and maintain transparency.

The proposed system provides a centralized digital platform that allows administrators to manage resident information, mark attendance, and securely store important documents. The application consists of two separate portals: an **Admin portal** for institutional management and a **Viewer portal** for public users who wish to contribute through food or fund donations.

The Admin portal enables authorized staff to add and manage resident details, upload documents, track attendance, and monitor donation records. The Viewer portal allows public users to log in and donate food by selecting institutions based on districts or contribute funds through QR-based payment systems.

By digitizing institutional management and introducing a transparent donation system, Digi Care improves administrative efficiency, ensures secure data storage, and encourages community participation in supporting orphanages and elderly care homes.

---


# Digi Care (HAYVN) — Product Requirements Document (PRD)

---

## 1. Title & Context

* **Product name:** Digi Care (HAYVN)
* **Type:** Web application (role-based)
* **Primary users:** Orphanage / elderly home administrators (Admin), Public Donors / Viewers (Viewer)
* **Project goal:** Replace manual registers and paper files with a secure, centralized web platform for resident management, attendance tracking, document storage, and transparent donation handling (food + funds).

---

## 2. Goals & Success Metrics

### Goals

* Digitize resident records, attendance, and document storage for institutions.
* Provide secure role-based access: Admin (internal) vs Viewer (public donor).
* Enable transparent donation handling: district-based food booking + QR-based fund donations.
* Reduce manual admin time and data-loss incidents.

### Success metrics (KPIs)

* Reduce average time to record attendance by ≥ 80% (vs manual).
* Number of institutions onboarded (target pilot: 3–5).
* Number of donation transactions recorded per month.
* Uptime ≥ 99.5% (production).
* Average page load time < 1.5s for dashboard actions.

---

## 3. Stakeholders

* **Project Sponsor / Guide:** (Add name)
* **Product Owner:** Team lead (Joel / Jobiya or assigned)
* **Developers:** Frontend, Backend (Django), DB admin
* **QA / Testers**
* **Target customers:** Orphanage & elderly care institutions (admins) and donors (public viewers)
* **Ops / Deployment:** DevOps / Cloud admin

---

## 4. Assumptions & Constraints

* Institutions will provide admin account details and sample resident data for testing.
* No mandatory integration with real payment gateway in MVP; QR + mock/redirect payment acceptable initially.
* MVP targets desktop & tablet; mobile responsive is required but mobile app not in MVP.
* Authentication for Viewer uses email/password; social login optional later.
* Database: start with SQLite for dev; MySQL/Postgres for production.

---

## 5. User Personas & Primary Use Cases

### Persona A — Admin (Institution Manager)

* Add/update/delete residents
* Upload and view resident documents
* Mark attendance daily (present/absent)
* Post donation requirements and view incoming donations
* View reports (attendance, donations)

### Persona B — Viewer (Donor)

* Discover institutions by district
* Book food donation slots
* Make fund donations via QR/payment
* View confirmation and donation history

---

## 6. MVP Scope (Must-have)

**Admin**

* Secure login / account creation
* Dashboard with 4 tabs: Residents, Attendance, Donations, Documents
* CRUD for Residents (Add, List, View profile, Delete)
* Document upload and view per resident
* Attendance marking per resident (present/absent) and simple attendance view for a day
* Donation view: list of donations & booking requests

**Viewer**

* Login (email/password) and landing donation dashboard
* Food donation: district selection → list institutions → view requirements → book slot
* Fund donation: choose institution → show QR / payment info → confirm donation
* Donation confirmation page (and record logged)

**Common**

* Centralized DB to store all records
* Role-based access control (Admin vs Viewer)
* Input validation and file upload security (size/type limits)
* Admin dashboard visual summary (counts)

---

## 7. Detailed Functional Requirements

### 7.1 Authentication & Authorization

* **Admin login:** fields: institution_name, institution_id, password
* **Admin registration:** institution_name, email, admin_name, password, contact_number, district
* **Viewer login:** email, password
* **Password reset:** via email link (MVP: simulated)
* **Access control:** routes protected; Admin pages accessible only to admin roles.

### 7.2 Resident Management

* Add resident: name, DOB, gender, admission_date, photo (optional), contact, notes
* List residents (paginated)
* View profile: details + documents
* Delete resident (with confirmation)
* Audit log: record who added/removed resident (basic)

### 7.3 Document Management

* Upload documents per resident: type (Aadhaar, Health Cert, Bank Account, Other), file (PDF/JPG/PNG), upload_date, uploader_id
* View document: inline preview (images/PDF) or download
* File size limit: 10 MB (configurable)
* File type whitelist: pdf, jpg, jpeg, png

### 7.4 Attendance

* Daily view: shows all residents with toggle Present/Absent
* Mark attendance for date (default = today) in bulk or per resident
* Attendance history view (by date range) and export CSV per month (MVP: basic view)
* Attendance stored as records: resident_id, date, status, marked_by

### 7.5 Donations

**Admin Side**

* View incoming food bookings and fund donations
* Post requirement requests (food items & quantities, pickup slots)
* Mark donation status (Pending, Received, Acknowledged)

**Viewer Side**

* Food Donation:

  * Select district → list institutions → view requirements → book a slot (date/time or timeslot)
  * Booking confirmation with unique booking ID
* Fund Donation:

  * Select institution → show QR code + bank/payment info
  * After payment, viewer can upload transaction screenshot (optional) and fill reference number
  * Donation logged for admin to verify

### 7.6 Notifications

* Admin: new booking/donation notification (in-app alert)
* Viewer: booking confirmation + donation receipt (in-app; email optional later)

### 7.7 Reporting (MVP basic)

* Simple donation list: filters by date, type (food/fund)
* Attendance summary: present/absent counts for date
* Resident list export (CSV)

---

## 8. Non-Functional Requirements

* **Security:** HTTPS, strong password hashing (bcrypt), CSRF protection (Django default)
* **Performance:** Dashboard actions return <2s for typical dataset (<200 residents)
* **Scalability:** Horizontal scaling plan for backend; DB optimized by indices on frequent queries
* **Reliability:** Data backups daily (initial approach); export/backup facility
* **Maintainability:** Modular Django apps (auth, residents, attendance, donations, documents)
* **Accessibility:** UI basic accessibility (aria labels, keyboard navigation)
* **Privacy & Compliance:** Sensitive personal info not exposed to public; documents available only to authenticated admin users

---

## 9. Data Model (Schema summary)

(Represented as core tables with key fields)

### Users / Institutions

* `Institution` (id, name, institution_id, email, password_hash, district, contact, created_at)
* `User` (id, name, email, role [admin/viewer], password_hash, institution_id (nullable), created_at)

### Residents

* `Resident` (id, institution_id, name, dob, gender, admission_date, photo_url, notes, created_by, created_at)

### Documents

* `Document` (id, resident_id, doc_type, file_path, uploaded_by, uploaded_at)

### Attendance

* `Attendance` (id, resident_id, date, status (present/absent), marked_by, marked_at)

### Donations

* `FoodBooking` (id, institution_id, viewer_id, district, slot_date, slot_time, items_details, status, created_at)
* `FundDonation` (id, institution_id, viewer_id, amount, payment_ref, qr_id (or placeholder), status, created_at)

### Audit & Logs

* `ActivityLog` (id, user_id, action, entity_type, entity_id, timestamp)

---

## 10. API / Endpoint Spec (High level)

> All endpoints under `/api/v1/`

**Auth**

* `POST /auth/admin/login` — payload: {institution_id, password} → returns JWT/session
* `POST /auth/viewer/login` — payload: {email, password}
* `POST /auth/admin/register` — payload: {institution_name, email, password, district, contact}

**Residents**

* `GET /institutions/{id}/residents` — list residents
* `POST /institutions/{id}/residents` — create resident
* `GET /residents/{id}` — resident profile
* `DELETE /residents/{id}` — delete resident

**Documents**

* `POST /residents/{id}/documents` — upload
* `GET /residents/{id}/documents` — list
* `GET /documents/{id}/download` — preview/download

**Attendance**

* `GET /institutions/{id}/attendance?date=YYYY-MM-DD`
* `POST /institutions/{id}/attendance` — payload: [{resident_id, status}, ...]

**Donations**

* `GET /donations/food/districts` — list districts with institutions (or client-side list)
* `GET /donations/food/institutions?district=X`
* `POST /donations/food/book` — payload: {institution_id, viewer_id, slot_date, slot_time, items}
* `POST /donations/fund` — payload: {institution_id, viewer_id, amount, payment_ref}

**Reports**

* `GET /institutions/{id}/reports/attendance?from=&to=`
* `GET /institutions/{id}/donations?from=&to=`

Authentication required for protected routes; role checks on server.

---

## 11. UI / UX Flow & Wireframe Notes

* **Landing / Splash:** HAYVN branding → loading → role selection (Admin / Viewer)
* **Admin login page:** fields: org name / id, password, create account link
* **Admin Dashboard:** four tabs: Residents | Attendance | Donations | Documents

  * Residents tab: Add Resident button → form modal → created resident listed with thumbnail and delete icon
  * Resident profile: photo, details, document upload widget, list of documents with view/download
  * Attendance tab: date selector, resident list with toggle or radio for present/absent; Save button
  * Donations tab (admin): list of bookings + funds with status & ability to mark acknowledged
  * Documents tab: consolidated view of uploaded documents for all residents (filter by type)
* **Viewer flow:** login → donation dashboard → choose Food/Fund

  * Food: district select → list of institutions → view requirements → Book slot modal (confirm)
  * Fund: choose institution → show QR and payment instruction → confirm donation form (optional proof upload)
* **Notifications:** small in-app bell with unread count

---

## 12. Acceptance Criteria (per feature)

* **Auth:** Admins/viewers can log in and access only authorized pages; invalid credentials rejected with message.
* **Residents CRUD:** Admin can add/view/delete residents; data persists and listed immediately.
* **Documents:** Admin can upload files (size/type checks), view files inline and download.
* **Attendance:** Admin can mark attendance for any date and records persist; CSV export available for month.
* **Food booking:** Viewer can book a food slot; booking appears in admin Donations tab with status.
* **Fund donation:** Viewer sees QR; after posting payment ref, the donation list shows pending verification; admin can mark acknowledged.
* **Security:** Admin-only pages return 403 for viewer role; public cannot access private data.

---

## 13. Testing Plan

* **Unit tests:** models, auth logic, attendance recording, document upload validation
* **Integration tests:** end-to-end flows for add resident → upload doc → mark attendance; viewer booking → admin view
* **Security tests:** auth bypass attempts, CSRF, file injection attempts, file size/type tests
* **Performance tests:** dashboard with 200 residents; simulate concurrent viewer bookings
* **User acceptance tests:** sample scenarios with institution admin and viewer users

---

## 14. Risks & Mitigations

* **Payment gateway integration delays**

  * *Mitigation:* Start with QR + simulated payment flow; integrate gateway in phase 2.
* **Data privacy concerns**

  * *Mitigation:* RBAC, encrypted backups, minimal public exposure of PII.
* **Limited institution participation for testing**

  * *Mitigation:* Use realistic sample data and sandbox testing; plan pilot onboarding later.
* **File storage and size growth**

  * *Mitigation:* Add retention policy, archive old documents, use cloud storage (S3) in production.

---

## 15. Deployment & DevOps

* **Environment:** dev / staging / production
* **Hosting options:** Heroku / AWS Elastic Beanstalk / DigitalOcean (MVP: simple VM; Prod: managed)
* **Database:** Postgres recommended for production
* **Storage:** Local storage for MVP; Cloud object store (S3/Azure Blob) for production
* **CI/CD:** GitHub Actions for lint, tests, and deployment
* **Backups:** Daily DB dump to cloud storage; weekly file backups

---

## 16. Roadmap & Milestones (Example)

* **Week 0–1:** Project setup, requirements finalization, DB schema
* **Week 2–4:** Auth, Admin dashboard, Resident CRUD
* **Week 5–6:** Document upload, Attendance module
* **Week 7–8:** Donation flows (Viewer + Admin), simple QR/payment simulation
* **Week 9:** Reporting, CSV export, notifications
* **Week 10:** Testing (unit & integration), bug fixes
* **Week 11–12:** Deployment to staging, UAT with sample institutions, final fixes, production launch

(Adjust per your semester schedule)

---

## 17. Metrics & Monitoring

* Track: daily active admins, daily donations (food/fund), reservations vs completions, API error rate, server CPU/memory, DB growth rate.
* Set alerts for: failed backups, high error rate, disk usage > 75%.

---

## 18. Future Phases / Features (Post-MVP)

* Payment gateway integration (Razorpay / Stripe / UPI)
* Multi-language support (Malayalam + English)
* NFC / RFID attendance integration
* Health & medication reminders (integrate with wearables)
* Mobile app wrapper (React Native) or PWA
* Analytics dashboard for donors & institutions
* Integration with NGO / government dashboards

---

## 19. Acceptance & Sign-off

* **Deliverables for sign-off:**

  * Working web app deployed to staging
  * Admin + Viewer flows working end-to-end
  * Test results summary
  * User guide for admins
* **Sign-off parties:** Project guide, Product owner, Dev lead

---

## 20. Appendices (Useful artifacts to attach)

* Wireframe screenshots (use your design image `/mnt/data/PROJECT DESIGN.jpeg`)
* Sample CSV for attendance export
* API contract (Postman collection)
* Data privacy & consent template (for resident data)