# Smart Attendance System

A modern, biometric-based Smart Attendance System built with the MERN stack (MongoDB, Express, React, Node.js). This system utilizes facial recognition to authenticate students and seamlessly track attendance, alongside comprehensive dashboards for Students, Teachers, and Administrators.

## Features

- **Role-based Access Control (RBAC):** Distinct portals for Students, Teachers, and Admins.
- **Biometric Authentication:** Integrates `face-api.js` for real-time facial recognition and secure face data enrollment.
- **Geofencing:** Students can only initiate attendance marking when within 500 m of a configured campus coordinate (Haversine formula). The boundary is enforced **server-side**; the client cannot spoof a location to bypass it.
- **Face Matching at Mark-Time:** A live face descriptor is captured in the browser and sent to the server, which performs the Euclidean-distance comparison (threshold ≤ 0.5) against the decrypted enrolled descriptor. The client never decides the match outcome.
- **Teacher-Controlled Sessions & Timetable Enforcement:** Teachers open time-limited attendance sessions for their assigned classes, and attendance can only be marked during an open session matching the scheduled day and time window.
- **Zero-Config Local & Flexible MongoDB Setup:** Runs out of the box with no `.env` required—automatically falling back to an in-memory MongoDB (`mongodb-memory-server`), ephemeral session secrets, and auto-seeded mock data in non-production environments. Supports persistent MongoDB (`MONGO_URI` for Atlas or local) when configured.
- **Interactive Dashboards:** Vertical column charts and dynamic UI elements for visualizing attendance trends and statistics.
- **Responsive Design:** Built with Tailwind CSS for a seamless experience across all devices.

> **Note on liveness detection:** The current biometric step is *face matching* (descriptor comparison). True liveness detection — blink/head-turn challenges or depth-based anti-spoofing — is a planned future enhancement and is not yet implemented.

## Tech Stack

### Frontend
- **React 18** & **Vite** (for lightning-fast builds and HMR)
- **Tailwind CSS** (for styling and dynamic UI)
- **face-api.js** (for client-side facial recognition via WebRTC)
- **Axios** (for API communication)
- **React Router v6** (for protected routing)

### Backend
- **Node.js** & **Express**
- **MongoDB** & **Mongoose** (with optional In-Memory DB support via `mongodb-memory-server`)
- **JSON Web Tokens (JWT)** (for secure authentication)
- **Bcryptjs** (for password hashing)
- **Helmet, Express Rate Limit & Express Validator** (for security headers, rate limiting, and request validation)

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Quick Start (Single Command, No `.env` Needed)
Clone the repository and run a single command to install all dependencies and start both the backend (`http://localhost:5000`) and frontend (`http://localhost:5173`):
```bash
git clone https://github.com/debraj7777/Smart-Attendance-System && cd Smart-Attendance-System && npm start
```
> On first launch, the backend automatically starts an in-memory MongoDB instance, generates ephemeral session keys, seeds mock data, and prints the generated test account credentials to the terminal.
> For subsequent runs (after dependencies are already installed), you can run `npm run dev` from the root directory.

### Optional: Persistent Database Configuration
If you want persistent storage (MongoDB Atlas or local) instead of the in-memory database, create `backend/.env` from `backend/.env.example` and set `MONGO_URI`, `JWT_SECRET`, and `DESCRIPTOR_ENCRYPTION_KEY`.

## Default Test Accounts
Upon starting the backend for the first time, mock data is automatically imported with unique, randomly generated 8-character passwords for each account (`admin@test.com`, `teacher1@test.com`, `teacher2@test.com`, `teacher3@test.com`, `student1@test.com`, `student2@test.com`).
- Check your backend terminal output for the exact email addresses and generated passwords.

## Project Structure
```text
├── backend/
│   ├── config/         # Database connection configuration
│   ├── controllers/    # Route logic (admin, teacher, student, auth)
│   ├── middleware/     # Auth guards, rate limiting, and input validation
│   ├── models/         # Mongoose schemas (User, Routine, Attendance, AttendanceSession, Notification, AuditLog)
│   ├── routes/         # Express API routes
│   ├── utils/          # AES-256-GCM face descriptor encryption helpers
│   ├── .env.example    # Environment variable template
│   ├── seeder.js       # Mock data generator
│   └── server.js       # Entry point
└── frontend/
    ├── src/
    │   ├── api/        # Axios configuration
    │   ├── components/ # Reusable UI components (ProtectedRoute, Layout)
    │   ├── context/    # React Context (AuthContext)
    │   ├── pages/      # Route pages (Login, Dashboards, FaceEnrollment)
    │   ├── main.jsx    # React entry point
    │   └── App.jsx     # Router configuration
    ├── index.html
    └── vite.config.js  # Vite configuration with Node polyfills
```

## Security
- **JWT Authentication:** All sensitive routes are protected by Bearer tokens.
- **Biometric Enforcement & Encryption at Rest:** Students cannot access their dashboard without first enrolling their facial data, and stored face descriptors are encrypted using AES-256-GCM.
- **Rate Limiting, Helmet & Account Lockout:** Protects endpoints with HTTP security headers, IP-based rate limiting, and a 15-minute account lockout after 5 failed login attempts.
- **Audit Logging:** Key actions (logins, face enrollments, attendance marking/failures, and session open/close events) are recorded in `AuditLog`.
- **Role Guards:** Users attempting to access unauthorized dashboards are automatically redirected.
