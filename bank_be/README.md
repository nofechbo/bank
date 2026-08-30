# Banking App Backend

Backend service for a full-stack banking application, built with Node.js, Express, TypeScript, PostgreSQL, and Prisma.

It handles authentication, email verification, account balances, fund transfers, transaction history, WebSocket updates, cleanup tasks, and API documentation.

## Features

* User signup with email verification
* JWT-based authentication and logout
* Balance and transaction dashboard
* Fund transfers between users
* Real-time dashboard updates through WebSockets
* Revoked-token handling
* Periodic cleanup of expired tokens and unverified users
* Swagger / OpenAPI documentation
* Configurable CORS whitelist
* PostgreSQL persistence through Prisma ORM

## Live deployment

**Backend API:**
https://tuna-bank-be.onrender.com

**Swagger documentation:**
https://tuna-bank-be.onrender.com/api-docs

## Project structure

```text
bank_be/
├── dist/                  # Compiled JavaScript output
├── prisma/                # Prisma schema and migrations
├── src/
│   ├── controllers/       # Route handlers
│   ├── db/                # Database setup, cleanup logic, and types
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API route definitions
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Email and supporting utilities
│   ├── websockets/        # WebSocket server and update logic
│   └── index.ts           # Application entry point
├── swagger.yaml           # OpenAPI 3.0 specification
├── tsconfig.json
├── package.json
└── .env.example
```

## Running locally

### 1. Clone the repository

```bash
git clone https://github.com/nofechbo/bank.git
cd bank/bank_be
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required values, including:

* PostgreSQL connection
* JWT secret
* Gmail credentials
* Allowed frontend origins
* Frontend base URL

### 4. Prepare the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Optional database inspection:

```bash
npx prisma studio
```

### 5. Start the development server

```bash
npm run dev
```

The backend runs locally at:

```text
http://localhost:3030
```

### 6. Production build

```bash
npm start
```

The production workflow compiles the TypeScript source and runs the generated JavaScript from `dist/`.

## API documentation

When running locally, Swagger UI is available at:

```text
http://localhost:3030/api-docs
```

The API specification is stored in `swagger.yaml` and documents the main authentication and dashboard routes.

## Real-time updates

A WebSocket server runs alongside the Express application.

Authenticated clients register their connections after login. When a fund transfer succeeds, both the sender and recipient can receive a `dashboard:update` event, allowing their dashboards to refresh without requiring a manual reload.

## Background cleanup

A periodic cleanup task runs after server startup.

It removes:

* Expired revoked tokens
* Accounts that were created but never verified within the configured window

This prevents temporary authentication and signup data from accumulating indefinitely.

## Environment configuration

Environment variables are documented in `.env.example`.

Important values include:

* `PORT`
* `WHITE_LIST_URLS`
* `FRONTEND_BASE_URL`
* `JWT_SECRET`
* `GMAIL_ADDRESS`
* `GMAIL_APP_PASSWORD`
* `DATABASE_URL`

`WHITE_LIST_URLS` should contain the frontend origins allowed to access the backend.

`FRONTEND_BASE_URL` is used when generating verification links sent by email.

## Technology stack

| Area              | Technologies            |
| ----------------- | ----------------------- |
| Runtime           | Node.js                 |
| Language          | TypeScript              |
| API               | Express                 |
| Database          | PostgreSQL              |
| ORM               | Prisma                  |
| Authentication    | JWT                     |
| Real-time updates | WebSockets              |
| Email             | Nodemailer / Gmail SMTP |
| API documentation | Swagger / OpenAPI       |

## Related application

The React frontend is located in [`../bank_fe`](../bank_fe).

For the full project overview and Docker instructions, see the [root README](../README.md).

## Author

Built by **Nofech Ben-Or**.
