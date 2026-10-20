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

## Difficulty levels

The specification leaves some ranges open, so these are the exact rules the generator uses
(`src/services/difficultyRules.ts`). Subtraction answers are never negative, and division always
has a whole-number answer: the generator picks a divisor and a quotient, then multiplies them to
get the dividend.

| Level            | Addition             | Subtraction | Multiplication               | Division                         |
| ---------------- | -------------------- | ----------- | ---------------------------- | -------------------------------- |
| 1 · Beginner     | 0–10 each, sum ≤ 20  | 0–10        | 0–5 × 0–5                    | divisor 1–5, answer 1–5          |
| 2 · Easy         | 0–50 each, sum ≤ 100 | 0–50        | 0–10 × 0–10                  | divisor 1–10, answer 1–10        |
| 3 · Intermediate | 0–100 each           | 0–100       | 2–9 × 2–9 or 2–9 × 10–99     | divisor 1–12, answer 1–12 (≤144) |
| 4 · Advanced     | 10–999 each          | 10–999      | 10–99 × 2–9 or 10–99 × 10–99 | divisor 2–19, answer 10–50       |

Each question has four choices: the correct answer and three wrong answers that are close to it.
Up to two of the wrong answers come from common mistakes:

- forgetting to carry or borrow
- a neighbouring times-table fact
- confusing the divisor with the answer

The remaining wrong answers are nearby numbers. Choices are shuffled, so the correct answer can
appear in any position.

## Reference documents

- `specification.md` — application requirements
- `TODO.md` — implementation plan, with completed tasks checked off
