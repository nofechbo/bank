# TunaBank backend

Express and TypeScript API for TunaBank. It owns authentication, account and transfer data, WebSocket refresh notifications, email verification, public support chat, and the authenticated banking assistant.

For the project overview and local quick start, begin with the [root README](../README.md).

## Responsibilities

- JWT authentication, revoked-token checks, signup, verification, and logout
- PostgreSQL persistence through Prisma
- Dashboard data, authenticated transfers, and WebSocket refresh events
- `POST /support/chat`: public support only; no token or account access
- `POST /assistant/chat`: authenticated, read-only account assistant
- Swagger UI at `/api-docs`

## Assistant routes and boundaries

The assistant route uses the JWT identity to resolve the account. It exposes only narrow, server-owned read tools:

- Current balance
- Recent transfers
- One owned transfer by ID
- Sent/received summary for a bounded date range

The model cannot select an account or execute a transfer. Transfer guidance produces a draft for the frontend’s existing transfer form; that form and `POST /dashboard/transfer` remain the only path that can move money.

Chat history received from the browser is untrusted context, not evidence or authorization. The service uses fresh database values for account facts, limits concurrent/model/tool work, and applies shared in-memory IP, user, and daily model-call limits to both chat routes. These counters are intentionally process-local and reset on restart.

Free OpenRouter models sometimes return prose instead of a required routing tool call. Clear balance, transaction, summary, and transfer intents have a narrow local fallback; malformed tool calls still fail closed.

## Local setup

```bash
cd bank_be
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

The default local API is `http://localhost:3030`; Swagger is at `http://localhost:3030/api-docs`.

Useful commands:

```bash
npm run dev      # TypeScript development server
npm run build    # Compile to dist/
npm test         # Build and run Node test suite
npm start        # Build and run compiled server
```

## Environment

Copy `.env.example`; do not commit `.env` files or credentials.

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `3030` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing and verification secret |
| `WHITE_LIST_URLS` | Comma-separated permitted frontend origins |
| `FRONTEND_BASE_URL` | Verification-link and OpenRouter site URL fallback |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | SMTP verification-email credentials |
| `OPENROUTER_API_KEY` | Server-only key for the authenticated assistant and preferred public-chat provider |
| `OPENROUTER_CHAT_MODEL` | OpenRouter model; defaults to `openrouter/free` |
| `OPENAI_API_KEY` | Optional server-only fallback for **public support chat** when OpenRouter is not configured |
| `TRUST_PROXY` | Set only behind a trusted proxy so rate limits see the client IP |

The authenticated assistant currently requires OpenRouter because it relies on tool calling. Public support uses OpenRouter when configured, otherwise OpenAI. Provider keys must never be exposed to the frontend.

## Structure

```text
src/
├── controllers/        HTTP route handlers
├── middleware/         JWT and revoked-token checks
├── services/assistant/ LangChain/LangGraph workflow and scoped data tools
├── services/           Authentication, transfer, dashboard, chat, and quota services
├── utils/              Validation, prompts, logging, and shared constants
├── websockets/         Dashboard-update server
└── index.ts            Express application entry point
prisma/schema.prisma    PostgreSQL models
tests/                  Node test suite
swagger.yaml            OpenAPI specification
```

## Tests and privacy notes

`npm test` covers JWT expiry/revocation, body-identity forgery, cross-account transaction access, exact assistant decimals, provider failures, quota limits, stale workflow behavior, and transfer drafts.

Avoid logging prompts, browser history, tokens, credentials, or account data. Existing chat logs contain operational metadata only. Account data sent to OpenRouter leaves this backend; review provider retention and privacy settings before handling non-demo information.

## Related project

The React client is in [`../bank_fe`](../bank_fe).
