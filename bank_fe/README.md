# TunaBank frontend

React, TypeScript, Vite, and Material UI client for TunaBank. It provides the authentication flow, dashboard, transfer form, live update handling, and a single floating Tuna chat window.

Start with the [root README](../README.md) for the full project overview.

## User experience

- Signup, email verification, sign-in, and sign-out
- Protected dashboard with balance and transaction history
- Transfer form with explicit confirmation before submission
- WebSocket-driven dashboard refreshes after transfers
- Responsive desktop and mobile layouts
- One floating chat with two modes:
  - **Public support** on signed-out/public pages
  - **Tuna · Your banking assistant** on signed-in dashboard and transfer pages

The authenticated assistant offers balance, recent-transaction, and transfer-preparation suggestions. A transfer draft displays a **Review transfer** action, which opens `/transfer` with the validated recipient and amount prefilled. The user must still review the fields, check the confirmation box, and submit normally.

## Chat lifecycle and privacy

- Public and authenticated chats use separate `sessionStorage` keys.
- Private chat history is scoped to the signed-in email and is cleared on logout or account switch.
- Private replies arriving after logout/account switch are discarded.
- JWTs are sent only to the private `/assistant/chat` route, never to public support.
- The browser sends its current IANA time zone only to format already-authorized transaction timestamps for the user.
- A `429` response honors `Retry-After`, shows a countdown, and never retries a message automatically.

Browser storage is display state only: it is never proof of account access, tool results, or a completed transfer.

## Local setup

```bash
cd bank_fe
cp .env.example .env
```

Set the API address:

```dotenv
VITE_BACKEND_URL=http://localhost:3030
```

Then install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Useful commands:

```bash
npm run dev
npm test
npm run build
npm run lint
```

## Structure

```text
src/
├── components/
│   ├── SupportChat.tsx             Floating public/private chat shell
│   ├── chatComponents/             Chat storage, request, and UI helpers
│   ├── TransferForm.tsx            Authenticated, confirmed transfer submission
│   └── dashboardComponents/        Dashboard and WebSocket UI
├── contexts/AuthContext.tsx        Login restoration and logout state
├── pages/                          Public and protected screens
├── config.ts                       VITE_BACKEND_URL configuration
└── styles/                         Shared styles
tests/                              Vitest browser-session tests
```

## Testing

```bash
npm test
npm run build
```

The tests cover chat history restoration, logout/account separation, stale reply cancellation, session-expiry behavior, rate-limit cooldowns, token boundaries, and transfer-draft validation.

## Related project

The API is in [`../bank_be`](../bank_be).
