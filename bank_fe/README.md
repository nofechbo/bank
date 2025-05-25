# Banking App Frontend

This is the frontend for a secure full-stack banking application. It was built with **React**, **TypeScript**, **Vite**, and **Material UI**.

## Features

* Modern login and signup with email verification
* JWT-based authentication with token persistence
* Dashboard with user info, balance, recent transactions
* Transfer funds between users
* Real-time balance and transaction updates via WebSocket
* Full error handling and UI feedback (loading, modals)
* Responsive, clean UI using the [Matx design system](https://ui-lib.com/downloads/matx-free-react-admin-template/)

---

## Project Structure

```
.
├── public/                         # Static assets
├── src/                 
│   ├── App.tsx                     # Main app and routes
│   ├── main.tsx                    # Entry point
│   ├── config.ts                   # Centralized env config
│   ├── contexts/                   # React Context (Auth)
│   ├── components/                 # Reusable components (forms, modals, UI blocks)
|   │   ├── dashboardComponents/    # Dashboard UI blocks + WebSocket hook
│   ├── pages/                      # Route-level views (Dashboard, Signup, Login, etc.)
│   ├── styles/                     # Shared styling and layout helpers
│   ├── types/                      # Shared TypeScript types
│   └── vite-env.d.ts               # Vite globals
├── index.html
├── vite.config.ts        # Vite config
├── tsconfig*.json        # TypeScript config
├── eslint.config.js
└── .env.example          # Env variable example file
```

---

## Environment Variables

All environment variables are defined in `.env.example`. Copy it as `.env` and fill in your backend URL:

```
VITE_API_URL=http://localhost:3030
```

This value is used in `src/config.ts` to construct API requests. Change it to your deployment address when deploying.

---

## Setup & Development

1. **Install dependencies**:

```bash
npm install
```

2. **Start the dev server**:

```bash
npm run dev -- --host=0.0.0.0
```

* Visit the app at: [http://localhost:5173](http://localhost:5173)
* `--host=0.0.0.0` allows testing on other devices on your local network

---

## Production Build

```bash
npm run build
```

The built files will be in `/dist`. You can deploy them using any static server or integrate with the backend server to serve as static assets.

---

## Notes

* Uses `localStorage` to persist login across refreshes
* Authentication state is managed by a React Context (`AuthContext`)
* All sensitive routes are protected using a `ProtectedRoutes` wrapper
* WebSocket connection is handled by a custom hook (useDashboardSocket) in the dashboard. It listens for dashboard:update messages and triggers a data refresh.
* `/dashboard`, `/transfer`, and `/verify` are fully functional
* `.env` is **not committed to git** — instead, `.env.example` is provided

---

## Author

Nofech Ben-Or
