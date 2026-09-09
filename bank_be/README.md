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
* `OPENROUTER_API_KEY` (recommended for the learning-project free-model route) or `OPENAI_API_KEY` (server-side only; required to enable support chat)

`WHITE_LIST_URLS` should contain the frontend origins allowed to access the backend.

`FRONTEND_BASE_URL` is used when generating verification links sent by email.

## AI support chat

Anyone can use `POST /support/chat`; the endpoint does not inspect login tokens or account data. It has a small, versioned TunaBank knowledge source at `src/knowledge/tunabank.ts`; update that reviewed file when product facts change. This is preferable to reading a live Google Doc on every request: it avoids external availability, unreviewed-content, and prompt-injection risks.

For this learning project, create an OpenRouter key and set `OPENROUTER_API_KEY` to use `openrouter/free`. The existing OpenAI SDK is pointed at OpenRouter's compatible API endpoint, so no additional package is needed. If no OpenRouter key is set, the service falls back to `OPENAI_API_KEY`.

### Abuse prevention and privacy design

The public chat endpoint uses scope and prompt-injection checks, bounded input/history/output, and a 10-request-per-minute per-IP burst limit. It keeps chat history only in the browser session; the backend logs metadata, never message text or secrets. Account data is never sent to the model, and prompt-like model output is discarded. Configure `CHAT_REQUESTS_PER_MINUTE` in `.env` if needed.

For defense in depth, keep the API key only in the backend environment and add a shared Redis or edge rate limiter before running more than one backend instance. The current rate limiter is intentionally lightweight and per instance, matching Pingwe.

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
