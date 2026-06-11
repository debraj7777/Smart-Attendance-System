# Smart Attendance System

A modern, biometric-based Smart Attendance System built with the MERN stack (MongoDB, Express, React, Node.js). This system utilizes facial recognition to authenticate students and seamlessly track attendance, alongside comprehensive dashboards for Students, Teachers, and Administrators.

## Features

- **Role-based Access Control (RBAC):** Distinct portals for Students, Teachers, and Admins.
- **Biometric Authentication:** Integrates `face-api.js` for real-time facial recognition and secure face data enrollment.
- **In-Memory MongoDB:** Zero-setup database configuration utilizing `mongodb-memory-server` for instant development and testing with pre-seeded mock data.
- **Interactive Dashboards:** Vertical column charts and dynamic UI elements for visualizing attendance trends and statistics.
- **Responsive Design:** Built with Tailwind CSS for a seamless experience across all devices.

## Tech Stack

### Frontend
- **React 18** & **Vite** (for lightning-fast builds and HMR)
- **Tailwind CSS** (for styling and dynamic UI)
- **face-api.js** (for client-side facial recognition via WebRTC)
- **Axios** (for API communication)
- **React Router v6** (for protected routing)

### Backend
- **Node.js** & **Express**
- **MongoDB** & **Mongoose** (with In-Memory DB support)
- **JSON Web Tokens (JWT)** (for secure authentication)
- **Bcryptjs** (for password hashing)

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "6th Sem project"
```

### 2. Start the Backend
The backend runs an in-memory MongoDB instance, meaning you don't need to install or configure MongoDB locally. It also auto-seeds mock data for testing.
```bash
cd backend
npm install
npm run dev
```
> The backend will start on `http://localhost:5000` and output account credentials for testing.

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
> The frontend will start on `http://localhost:5173`.

## Default Test Accounts
Upon starting the backend, mock data is automatically imported. You can log in using these default credentials (all accounts share the same password):
- **Password for all accounts:** `1234test`
- Check your backend terminal output for specific email addresses for Admin, Teacher, and Student accounts.

## Project Structure
```text
├── backend/
│   ├── config/         # Database and environment configurations
│   ├── controllers/    # Route logic (admin, teacher, student, auth)
│   ├── models/         # Mongoose schemas (User, Routine, Attendance, Notification)
│   ├── routes/         # Express API routes
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
- **Biometric Enforcement:** Students cannot access their dashboard without first enrolling their facial data.
- **Role Guards:** Users attempting to access unauthorized dashboards are automatically redirected.

---
*Developed for 6th Semester University Project.*
