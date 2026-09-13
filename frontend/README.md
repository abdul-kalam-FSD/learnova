# Learnova — Frontend

React + Vite single-page application for Learnova. Renders the student,
teacher, and admin experiences and the 54 subject game UIs. Contains no
business logic or database access of its own — everything is served by the
backend API.

See the repository root [README.md](../README.md) for the full project
overview, architecture, and deployment details.

## Setup

```bash
npm install
npm run dev
```

The dev server runs via Vite. By default the app talks to
`http://localhost:5000/api`; set `VITE_API_URL` to point at a different
backend.

## Important Directories

- `src/pages/` — route-level screens (student, teacher, admin)
- `src/components/` — shared UI (nav, cards, modals, headers)
- `src/games/` — the 54 game components, one folder per subject, plus
  `src/games/core/` for the shared `GameShell`/`GameFrame` chrome
- `src/context/` — React context providers (theme, grade band, mission,
  focused mode)
- `src/api/axios.js` — the single axios instance used for every API call,
  including the auth token interceptor and session-expired handling
- `src/utils/` — shared helper functions (achievements, mastery display,
  chapter icons, etc.)

## Commands

```bash
npm run dev       # start the Vite dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build locally
npm test          # run the Vitest test suite
npm run lint      # run ESLint
```

## Talking to the Backend

All requests go through `src/api/axios.js`, which:

- sets the base URL from `VITE_API_URL` (or `http://localhost:5000/api`)
- attaches the stored JWT as `Authorization: Bearer <token>` on every request
- redirects to `/session-expired` if the backend returns an unexpected 401
  (login/register/guest-upgrade attempts are excluded, since those can
  legitimately 401 as part of normal form validation)

No component talks to the backend directly outside of this file.