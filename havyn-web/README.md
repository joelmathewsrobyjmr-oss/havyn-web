# 🪶 HAVYN — Resident Care Management

A modern web application for managing residents, tracking daily attendance, and generating detailed reports. Built with **React + Vite** and **Firebase**, with a companion **Express.js** server for image storage.

---

## ✨ Features

### 👤 Resident Management
- Add, edit, and delete resident profiles
- Upload **profile photos** and **Aadhaar card** images (camera or gallery)
- Resident status tracking: **Active**, **Inactive**, **Discharged**, **Died**
- Searchable resident list with circular profile avatars and colored status badges

### 📋 Daily Attendance
- Mark each resident as present or absent
- Visual check/cross buttons for quick marking
- Per-day attendance records stored in Firestore

### 📊 Attendance Reports
- Select any **date range** to generate a report
- Filter by resident status (Active / Inactive / Discharged / Died)
- Summary statistics: total Present, Absent, Unmarked
- Per-resident attendance percentage with a **daily color-coded grid**
- **Download CSV** with per-day columns showing each resident's status

### 🔐 Authentication
- Firebase Authentication (Email/Password)
- Protected routes — login required for all pages
- Role selection screen (Admin / Staff)

### 🎨 UI / UX
- Glassmorphism design with smooth animations
- Global back-navigation button in the header
- Responsive mobile-first layout
- Reusable component library (Input, Button, GlassCard, ResidentCard)

---

## 🛠️ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, React Router 7, Vite 7   |
| Icons     | Lucide React                        |
| Backend   | Express.js, Multer (image uploads)  |
| Database  | Firebase Firestore                  |
| Auth      | Firebase Authentication             |
| Styling   | Vanilla CSS with CSS variables      |

---

## 📁 Project Structure

```
havyn-web/
├── server/                    # Express image server
│   ├── index.js               # Server entry point (port 3001)
│   └── uploads/               # Stored images (auto-created)
│       ├── profile/           # Resident profile photos
│       └── aadhaar/           # Aadhaar card scans
├── src/
│   ├── components/
│   │   ├── Button.jsx         # Reusable button (primary/outline)
│   │   ├── GlassCard.jsx      # Glassmorphism card wrapper
│   │   ├── Header.jsx         # App header with global back button
│   │   ├── Input.jsx          # Text input with icon support
│   │   ├── ProtectedRoute.jsx # Auth route guard
│   │   └── ResidentCard.jsx   # Resident list item with avatar
│   ├── pages/
│   │   ├── SplashView.jsx     # Splash / loading screen
│   │   ├── RoleSelectionView.jsx # Admin / Staff role picker
│   │   ├── LoginView.jsx      # Login & signup form
│   │   ├── DashboardView.jsx  # Main dashboard with nav cards
│   │   ├── ResidentListView.jsx  # Searchable resident list
│   │   ├── ResidentFormView.jsx  # Add/Edit resident + photo uploads
│   │   └── AttendanceView.jsx    # Mark attendance + Report tab
│   ├── firebase.js            # Firebase config & exports
│   ├── AuthContext.jsx        # Auth state context provider
│   ├── App.jsx                # Route definitions
│   └── main.jsx               # App entry point
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20+ installed
- A Firebase project with **Authentication** and **Firestore** enabled

### 1. Install Dependencies

```bash
cd havyn-web
npm install
```

### 2. Configure Firebase

Edit `src/firebase.js` and replace the config with your own Firebase project credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Run Everything

```bash
npm run dev:all
```

This starts both servers simultaneously:

| Service        | URL                        |
|----------------|----------------------------|
| Frontend       | http://localhost:5173       |
| Image Server   | http://localhost:3001       |

#### Run individually:
```bash
npm run dev        # Frontend only
npm run server     # Image server only
```

---

## 📊 Firestore Data Model

```
residents/                     # Collection
  └── {residentId}/            # Document
        ├── name: string
        ├── email: string
        ├── phone: string
        ├── address: string
        ├── status: "active" | "inactive" | "discharged" | "died"
        ├── profileImage: string (URL)
        ├── aadhaarImage: string (URL)
        └── createdAt: string (ISO)

attendance/                    # Collection
  └── {YYYY-MM-DD}/            # Document (date key)
        └── records/           # Sub-collection
              └── {residentId}/
                    ├── name: string
                    ├── present: boolean
                    └── timestamp: string (ISO)
```

---

## 📥 CSV Report Format

The downloadable attendance report CSV includes:

| Column      | Description                                    |
|-------------|------------------------------------------------|
| Name        | Resident's full name                           |
| Phone       | Phone number                                   |
| Status      | Current status (Active/Inactive/Discharged/Died)|
| DD/MM cols  | One column per day: Present / Absent / Discharged / Died / -- |
| Present     | Total present days                             |
| Absent      | Total absent days                              |
| Unmarked    | Total unmarked days                            |
| %           | Attendance percentage                          |

---

## 🔑 API Endpoints (Image Server)

Images are organised per resident: `uploads/residents/{residentId}/profile.jpg|aadhaar.jpg`

| Method | Endpoint                                          | Description                       |
|--------|---------------------------------------------------|-----------------------------------|
| POST   | `/api/residents/:residentId/upload/profile`       | Upload profile photo for resident |
| POST   | `/api/residents/:residentId/upload/aadhaar`       | Upload Aadhaar card for resident  |
| GET    | `/api/residents/:residentId/images`               | Get all image URLs for a resident |
| GET    | `/api/residents/:residentId/image/:type`          | Get single image URL              |
| DELETE | `/api/residents/:residentId/image/:type`          | Delete a specific image           |
| DELETE | `/api/residents/:residentId/images`               | Delete all images (on resident delete) |
| GET    | `/uploads/residents/:residentId/:filename`        | Serve stored image file           |
| GET    | `/api/health`                                     | Health check                      |

**Upload example:**
```bash
curl -X POST http://localhost:3001/api/residents/abc123/upload/profile \
  -F "image=@photo.jpg"
```

**Get images example:**
```bash
curl http://localhost:3001/api/residents/abc123/images
# → { "success": true, "residentId": "abc123", "profile": "http://...", "aadhaar": "http://..." }
```

---

## 📝 License

This project is for internal use.
