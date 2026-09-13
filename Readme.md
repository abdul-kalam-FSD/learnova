# Learnova

Learnova is a multi-subject, gamified learning platform for school students in
Grades 4–12. Instead of static quizzes, each topic is taught through one of 54
interactive game mechanics (matching, builders, simulators, timed challenges,
etc.), shared across 11 subjects: Biology, Chemistry, Physics, Mathematics,
English, Tamil, History, Geography, Social Science, Commerce, and Computer
Science.

## Target Users

- **Students** (Grades 4–12) — play subject games, track XP/mastery, and get
  adaptive recommendations for what to play next.
- **Teachers** — assign work, review class/student performance, and see
  weak-area breakdowns.
- **Admins** — manage game content, sections, staff, and students.

Guest access is also supported for students without an account.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS v4 |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT (bearer tokens) |
| Frontend tests | Vitest + React Testing Library |
| Backend tests | Jest + Supertest |

## Architecture

```
React (Vercel) ──HTTP/JSON──> Express API (Render) ──Mongoose──> MongoDB
```

- The frontend is a single-page app; all data comes from the backend's
  `/api/*` REST endpoints.
- The backend is a modular monolith: `routes → controllers → models`, with
  shared logic in `utils/`.
- Every one of the 54 game types is driven through one shared frontend
  component (`GameShell`) and one backend registry
  (`backend/src/utils/gameTypeRegistry.js`), which is the single source of
  truth for what a game type is and how it's scored — individual game
  components and controllers don't duplicate that logic per game.

## Repository Structure

```
learnova/
├── backend/
│   ├── server.js              # entry point (starts the HTTP server)
│   ├── src/
│   │   ├── app.js             # Express app, middleware, route mounting
│   │   ├── config/db.js       # MongoDB connection
│   │   ├── routes/            # one file per API area (auth, games, teacher, ...)
│   │   ├── controllers/       # request handlers
│   │   ├── models/            # Mongoose schemas
│   │   ├── middleware/        # auth/admin/teacher guards, error handler
│   │   └── utils/             # gameTypeRegistry, mastery/XP logic, helpers
│   ├── scripts/audit/         # structural content-audit tooling
│   ├── migrations/            # one-off data migration scripts
│   └── tests/                 # unit/ and integration/
└── frontend/
    ├── src/
    │   ├── pages/              # route-level screens (student/teacher/admin)
    │   ├── components/         # shared UI (nav, cards, modals, ...)
    │   ├── games/              # the 54 game components, grouped by subject
    │   ├── context/            # React context providers
    │   ├── api/axios.js        # single axios instance + auth interceptor
    │   └── utils/
    └── public/
```

## Installing Dependencies

```bash
cd backend && npm install
cd frontend && npm install
```

## Development Commands

**Backend** (from `backend/`):
```bash
npm run dev     # start with nodemon (auto-restart)
npm start       # start normally (node server.js)
```

**Frontend** (from `frontend/`):
```bash
npm run dev     # Vite dev server
```

## Test Commands

**Backend** (from `backend/`):
```bash
npm test              # unit tests (jest tests/unit)
npm run test:integration
npm run test:all
npm run audit:coverage   # structural content/registry audit
```

**Frontend** (from `frontend/`):
```bash
npm test         # vitest run
npm run lint      # eslint .
```

## Build Commands

**Frontend** (from `frontend/`):
```bash
npm run build      # production build (vite build) -> frontend/dist
npm run preview    # preview the production build locally
```

The backend has no separate build step; it runs directly with Node.

## Backend Responsibilities

- Authentication and session handling (JWT issuance/verification)
- All business logic: game content delivery, attempt validation/scoring,
  XP and mastery progression, chapter/subject progress, leaderboard,
  teacher assignments, admin content management
- Talks to MongoDB via Mongoose models
- Enforces access control (student/teacher/admin roles, grade-scoping)

## Frontend Responsibilities

- Renders all student/teacher/admin screens and the 54 game UIs
- Calls the backend exclusively through `src/api/axios.js`, which attaches
  the JWT from `localStorage` to every request and redirects to a
  session-expired screen on an unexpected 401
- Contains no direct database access or business rules of its own — all
  scoring/progression logic is server-side

## Authentication Overview

- Login/register issue a JWT; the frontend stores it in `localStorage` and
  sends it as `Authorization: Bearer <token>`.
- `middleware/authMiddleware.js` (`protect`) verifies the token on protected
  routes and attaches `req.userId`.
- `middleware/adminMiddleware.js` / `teacherMiddleware.js` re-check the
  user's role by reading it fresh from MongoDB on every request (not from
  the JWT payload), so a role change or access revocation takes effect on
  the very next request rather than waiting for the token to expire.
- A small set of maintenance endpoints (e.g. guest cleanup) are called by an
  external scheduler, not a logged-in user, and are protected by a shared
  secret header instead of a JWT.

## Game Architecture Overview

- `backend/src/utils/gameTypeRegistry.js` is the single source of truth for
  which game types exist and how each is scored.
- Each game type has: a seed script (game content in MongoDB), a frontend
  component under `frontend/src/games/<subject>/`, and a scoring branch in
  `gameControllers.js`.
- The frontend's `GameShell`/`GameFrame` components provide the shared
  chrome (loading, error states, mission framing, results screen) around
  every game, so individual game components only implement their own play
  mechanic.
- A structural audit script (`backend/scripts/audit/structuralAudit.js`)
  checks that every registered game type has matching frontend routes,
  scoring coverage, and seeded content, without needing a live database
  connection.

## Database Overview

MongoDB via Mongoose. Core collections include: `User`, `Subject`,
`Chapter`, `Concept`, `Question`, `GameContent`, `QuizzSession`,
`UserConceptMastery`, `Case`, `Assignment`, `Stream`, `Section`,
`PushSubscription`.

## Development Workflow

1. Run backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in
   `frontend/`) side by side locally.
2. Make changes; run the relevant test suite before committing.
3. Run `npm run lint` (frontend) and `npm run audit:coverage` (backend) for
   any change touching game content or registry.
4. Build the frontend (`npm run build`) to confirm production build health
   before pushing.

## Deployment Overview

- **Frontend**: deployed to Vercel as a static build. `vercel.json` at the
  repo root sets the build command and output directory
  (`frontend/dist`) and rewrites all routes to `index.html` for
  client-side routing.
- **Backend**: deployed to Render as a standard Node/Express service
  (`npm start` runs `server.js`).
- **Database**: MongoDB, connected via `MONGO_URI`.

## Environment Variables (names only)

Backend (`backend/.env`, see `backend/.env.example`):

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET`
- `PERFORMANCE_SYNC_DIR`

Frontend (Vite, optional):

- `VITE_API_URL` (falls back to `http://localhost:5000/api` if unset)

No values are stored in this README or in version control; only
`backend/.env.example` is committed.

## Troubleshooting

- **CORS errors in the browser**: check that `FRONTEND_URL` on the backend
  matches the origin the frontend is actually served from.
- **401 immediately after login**: check `JWT_SECRET` is set and consistent
  between deploys/restarts — a changed secret invalidates existing tokens.
- **Push notifications disabled warning in backend logs**: expected if
  `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are unset or invalid; the app
  degrades gracefully and push is simply disabled for that run.
- **Frontend can't reach the API in production**: confirm `VITE_API_URL` is
  set for the Vercel build to point at the Render backend URL.