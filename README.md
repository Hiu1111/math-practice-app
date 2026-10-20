# Math Practice

A child-friendly math practice web app for ages 7–12. Students practice addition, subtraction,
multiplication and division on interactive flip cards, track their progress, and get extra practice
on questions they missed.

Built with React, TypeScript and Vite. All data is stored in the browser's `localStorage`; there
is no backend and no account.

## Requirements

- Node.js 20 or newer (developed on Node 22)
- npm 10 or newer

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Scripts

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the Vite development server             |
| `npm run build`        | Type-check and build for production (`dist/`) |
| `npm run preview`      | Serve the production build locally            |
| `npm test`             | Run all tests once (Vitest)                   |
| `npm run test:watch`   | Run tests in watch mode                       |
| `npm run lint`         | Lint with ESLint                              |
| `npm run typecheck`    | Run the TypeScript compiler without emitting  |
| `npm run format`       | Format all files with Prettier                |
| `npm run format:check` | Check formatting without changing files       |

## Project structure

```text
src/
├── app/          App root, routes and context provider
├── components/   Reusable UI (layout, practice, statistics, common)
├── pages/        One component per route
├── services/     Question generation, statistics, storage
├── hooks/        Custom React hooks
├── types/        Shared TypeScript types (from specification.md)
├── utils/        Small pure helpers (random numbers, shuffle, ids)
├── styles/       Global CSS
└── test/         Test setup
```

## Reference documents

- `specification.md` — application requirements
- `TODO.md` — implementation plan, with completed tasks checked off
