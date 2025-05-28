# Full-Stack Banking App

This is a secure, full-featured banking web application built with a React frontend and Node.js backend. It supports user signup with email verification, secure authentication, fund transfers, and personal financial dashboards.

---

## Live Demo

Frontend: [https://tunabank.onrender.com](https://tunabank.onrender.com)  
Backend API: [https://tuna-bank-be.onrender.com](https://tuna-bank-be.onrender.com)  
Swagger Docs: [https://tuna-bank-be.onrender.com/api-docs](https://tuna-bank-be.onrender.com/api-docs)


---

## 🌐 Overview

| Layer    | Tech Stack                           |
|----------|--------------------------------------|
| Frontend | React (TypeScript), Vite, MUI (Matx) |
| Backend  | Node.js, Express, PostgreSQL, Prisma |
| Auth     | JWT with Email Verification          |
| Docs     | Swagger (OpenAPI 3.0)                |

---

## 🔒 Features

- User registration and login with real email verification
- JWT-based authentication and logout
- Secure transfer of funds between users
- Transaction history and balance dashboard
- Real-time updates using WebSockets (live dashboard refresh)
- Auto-cleanup of expired tokens and unverified accounts
- Responsive UI with polished components
- All frontend pages are fully mobile-friendly with adaptive layouts and scrollable components.
- REST API with Swagger documentation

---

## 📂 Repository Structure

```
.
bank/
├── bank_fe/ # Frontend (React, Vite)
├── bank_be/ # Backend (Node.js, Express, Prisma)
└── README.md # General overview (this file)
```

- For backend-specific instructions, see [`bank_be/README.md`](./bank_be/README.md)
- For frontend setup and usage, see [`bank_fe/README.md`](./bank_fe/README.md)

---

## 🔧 Setup Instructions

Each app (backend and frontend) has its own README with setup steps, including:

- `.env.example` files to guide environment variable setup
- `npm install` and run scripts
- Database initialization (Prisma + PostgreSQL)
- Running locally and in production

---

## 📌 Notes

- Frontend uses `VITE_API_URL` in `.env` to configure backend endpoint.
- Backend uses `FRONTEND_BASE_URL` for email link generation, and a whitelist array (`WHITE_LIST_URLS`) for CORS.
- Emails are sent using Gmail SMTP (see backend docs).
- Tokens expire after 1 hour; unverified accounts are deleted after 15 minutes.
- Swagger docs available at `/api-docs` on the backend.

---

## 👨‍💻 Author

Built by **Nofech Ben-Or**

---

