# Banking App Backend

This is the backend for a secure full-stack banking web application.

## Features

* User signup with email verification
* JWT-based authentication and logout
* Balance and transaction dashboard
* Real-time dashboard updates via WebSockets (after transfers)
* Transfer funds between users
* Revoked token handling
* Periodic cleanup of unverified users and expired tokens
* Swagger API documentation
* CORS setup to allow frontend access

---

## Project Structure

```
.
├── dist/                  # Compiled JS output
├── prisma/                # Prisma schema and migrations
├── src/                   # Source code
│   ├── controllers/       # Route handlers
│   ├── db/                # DB instance, cleanup logic, and TS types
│   ├── middleware/        # Auth middleware
│   ├── routes/            # Route definitions
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Email utils  
│   ├── websockets/        # WebSocket server and push logic
│   └── index.ts           # App entry point
├── swagger.yaml           # Swagger OpenAPI 3.0 spec
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Installation & Setup

### 1. Clone the repository:

```bash
git clone <repo-url>
cd bank_be
```

### 2. Install dependencies:

```bash
npm install
```

### 3. Set up the database:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

(Optional) Open Prisma Studio to inspect the DB:

```bash
npx prisma studio
```

### 4. Run the development server:

```bash
npm run dev
```

Runs with ts-node at `http://localhost:3030`

### 5. Run in production:

```bash
npm start
```

Compiles TypeScript and runs compiled JS from `dist/`

---

## API Documentation

Visit: `http://localhost:3030/api-docs` (when running locally)

* Uses `swagger-ui-express`
* Based on `swagger.yaml` in the root directory
* Covers all major routes including `/auth/*` and `/dashboard/*`

---

## Real-Time WebSocket Updates

* A WebSocket server runs alongside the Express server
* Authenticated clients (via JWT) register their connection on page load
* On successful fund transfer, the server sends a dashboard:update message to both sender and receiver
* The frontend responds by refreshing the dashboard

---

## Cleanup Tasks

On server start, a background job runs hourly to:

* Delete revoked tokens older than 1 hour
* Delete unverified users older than 15 minutes
* Logs actions to the console

---

## Notes

* Environment variables are documented in `.env.example`, which is included in the repo. Copy and fill it as `.env` before running.
* CORS origin whitelisting is configured via the WHITE_LIST_URLS environment variable. This should be a comma-separated list of allowed frontend origins
* FRONTEND_BASE_URL should be set to the base URL of your *frontend app*; it is used in verification email links*
* JWT secret is required for signing and verifying tokens
* Nodemailer sends real email verification links (via Gmail SMTP)
* Swagger is available at `/api-docs`
* Uses ESM with `ts-node` for dev, `tsc` for prod\`
* All routes include consistent error handling with appropriate HTTP status codes and descriptive error messages.

## Author

Nofech Ben-Or
