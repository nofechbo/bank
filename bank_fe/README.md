# Banking App Frontend

Frontend application for a full-stack banking platform, built with React, TypeScript, Vite, and Material UI.

The interface supports authentication, email verification, account balances, transaction history, fund transfers, and real-time dashboard updates from the backend.

## Features

* User signup and login
* Email-verification flow
* JWT-based authentication with session persistence
* Account balance and recent-transaction dashboard
* Fund transfers between users
* Real-time dashboard refresh through WebSockets
* Loading, success, and error feedback
* Protected application routes
* Responsive desktop and mobile layouts
* Material UI / Matx-based component design

## Live deployment

**Frontend:**
https://tunabank.onrender.com

The deployed frontend communicates with the corresponding backend REST API and WebSocket server.

## Project structure

```text
bank_fe/
├── public/                         # Static assets
├── src/
│   ├── App.tsx                     # Main application and routes
│   ├── main.tsx                    # Application entry point
│   ├── config.ts                   # Environment-based configuration
│   ├── contexts/                   # React contexts
│   ├── components/
│   │   └── dashboardComponents/    # Dashboard UI and WebSocket logic
│   ├── pages/                      # Login, signup, dashboard, transfer, etc.
│   ├── styles/                     # Shared styling and layout helpers
│   ├── types/                      # Shared TypeScript types
│   └── vite-env.d.ts
├── index.html
├── vite.config.ts
├── tsconfig*.json
├── eslint.config.js
└── .env.example
```

## Environment variables

Copy the example file:

```bash
cp .env.example .env
```

Configure the backend URL:

```dotenv
VITE_API_URL=http://localhost:3030
```

`src/config.ts` uses this value when constructing API requests.

## Running locally

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev -- --host=0.0.0.0
```

Open:

http://localhost:5173

Using `--host=0.0.0.0` also makes the development server reachable from other devices on the local network.

## Production build

```bash
npm run build
```

The optimized application is generated in `dist/`.

It can be deployed through a static hosting service or served through a web server such as Nginx.

## Authentication flow

Authentication state is managed through React Context and persisted using `localStorage`.

Protected areas of the application are wrapped by `ProtectedRoutes`, preventing unauthenticated users from accessing pages such as the dashboard and transfer interface.

## Real-time updates

The dashboard uses a WebSocket connection to receive update notifications from the backend.

After a successful transfer, the backend can emit a `dashboard:update` event to affected users. The frontend reacts by refreshing account and transaction data.

## Responsive design

The application is designed to work across desktop and mobile screen sizes.

Responsive behavior includes:

* Adaptive form and page layouts
* Scaled illustrations and branding
* Mobile-friendly dashboard navigation
* Scrollable tables and charts where required
* Responsive modal widths and spacing
* Touch-friendly controls
* Stacked actions on narrow screens

No separate mobile build is required.

## Technology stack

| Area                 | Technologies               |
| -------------------- | -------------------------- |
| Framework            | React                      |
| Language             | TypeScript                 |
| Build tooling        | Vite                       |
| UI                   | Material UI, Matx          |
| Authentication state | React Context              |
| Real-time updates    | WebSockets                 |
| Styling              | MUI and application styles |

## Related backend

The Express backend is located in [`../bank_be`](../bank_be).

For the overall application architecture and Docker setup, see the [root README](../README.md).

## Author

Built by **Nofech Ben-Or**.
