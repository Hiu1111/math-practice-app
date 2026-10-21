# Math Practice

A child-friendly math practice web app for ages 7–12. Students practice addition, subtraction,
multiplication and division on interactive flip cards, track their progress, and get extra practice
on questions they missed.

Built with React, TypeScript and Vite. All data is stored in the browser's `localStorage`; there
is no backend and no account.

**Live site:** deployed on Netlify (see [Deployment](#deployment)).

## Requirements

- Node.js 20 or newer (developed on Node 22)
- npm 10 or newer

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Scripts

| Command                 | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start the Vite development server             |
| `npm run build`         | Type-check and build for production (`dist/`) |
| `npm run preview`       | Serve the production build locally            |
| `npm test`              | Run all tests once (Vitest)                   |
| `npm run test:watch`    | Run tests in watch mode                       |
| `npm run test:coverage` | Run tests and report code coverage            |
| `npm run lint`          | Lint with ESLint                              |
| `npm run typecheck`     | Run the TypeScript compiler without emitting  |
| `npm run format`        | Format all files with Prettier                |
| `npm run format:check`  | Check formatting without changing files       |

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
└── test/         Test setup and helpers (render the app, play a question, fixtures)
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

## Mistakes, review and mastery

The rules live in `src/services/mistakeService.ts` and `src/services/similarQuestionGenerator.ts`.

- **Recording.** A question marked "I Got It Wrong" in regular practice is saved as a mistake
  (operation, numbers, answer, level, times missed, first/last miss). Missing the same fact again
  updates that record instead of adding a new one.
- **Similar questions** come from three strategies, and every one must fit the mistake's level:
  - nearby numbers (8 × 7 → 8 × 6, 9 × 7)
  - reversed operands for + and × only (8 × 7 → 7 × 8)
  - the fact family (8 × 7 → 56 ÷ 7, 56 ÷ 8)

  The original question is never shown again unless nothing else fits.

- **Review sessions** use the mistakes that match the chosen operations and level. Mistakes missed
  more often, more recently, or with less review progress come first. The top few take turns.
- **Mastery.** A mistake is mastered after 3 correct similar answers. You can change this number
  in Settings.
  - A wrong review answer moves progress back one step.
  - Missing the fact again in regular practice resets its progress, and brings it back if it was
    mastered.
  - A review session ends early, with a summary, once every matching mistake is mastered.
- **Storage.** Data is saved under the six `mathPractice.*` keys from the spec, plus
  `mathPractice.archive` (see [Performance](#performance-and-large-histories)). Schema version 2
  added review totals to the statistics; older data is migrated automatically. If saved data is
  damaged, only the damaged part is reset, and the student sees a plain-language notice.

## Testing

```bash
npm test               # unit, component and full-app integration tests
npm run test:coverage  # about 97% of lines and 94% of branches
```

- **Unit tests** cover question generation for every operation and level, distractors and choice
  uniqueness, statistics, mistake patterns, similar questions, mastery, and storage validation
  and migration.
- **Component tests** cover setup choices, answer selection, flipping, the right/wrong buttons,
  progress, the summary, the statistics page and the confirmation dialogs.
- **Integration tests** (`src/app/endToEnd.test.tsx` and the page tests) drive the whole app with
  clicks only. They include the spec 21.3 flow: a wrong answer updates the statistics and stores
  a mistake, and mistake review then asks similar questions until it is mastered.
- **In real browsers**, the production build was also checked with Playwright scripts:
  - keyboard-only sessions, with and without reduced motion
  - axe accessibility scans (0 issues)
  - 200% zoom and screen sizes from 320 px to desktop
  - refreshing mid-session
  - storage being blocked or full

## Performance and large histories

Measured on the production build with the CPU slowed 6× (like a budget Chromebook), with a
maximum-size history: 6000 answers and 500 saved mistakes.

|                         | Before Phase 21  | After            |
| ----------------------- | ---------------- | ---------------- |
| Statistics page appears | 1028 ms          | 180 ms           |
| Saving one answer       | 120 ms           | 56 ms            |
| localStorage used       | 2.0 M characters | 0.9 M characters |

- **Less re-rendering.** Components subscribe only to the data they read
  (`useAppData((s) => s.settings)`), statistics sections are memoized, and long mistake lists show
  10 items with a "Show all" button.
- **Compact history.** The newest 2000 answers are kept in full. Older ones are folded into
  `mathPractice.archive`, a small set of totals, so statistics stay exact and can still be
  rebuilt if they are ever damaged.
- **Smaller first download.** Statistics and Settings are loaded separately and fetched while the
  browser is idle. The first visit downloads about 120 kB (gzipped) and is usable in about 2.4 s
  on 3G with a 4× slower CPU.

## Privacy

- No accounts, and no name, email or other personal information is collected.
- Practice data never leaves the browser: no analytics, no tracking, no ads, and no external links
  in the practice screens.
- Clearing the browser's data erases progress. The footer and the Settings page say so.
- On Netlify, `public/_headers` sets a Content-Security-Policy that only allows the site's own
  files, so the browser itself would block any request to another server.

## Browser support

The build targets Chrome/Edge 111+, Firefox 114+ and Safari 16.4+ (Vite's "baseline widely
available"). Features that some of these browsers lack have fallbacks:

- `requestIdleCallback`, which Safari does not have
- `crypto.randomUUID`
- the prefixed Web Audio API used by older Safari
- the keyboard focus ring on the level and length cards, which does not need `:has()`

| Browser                | How it was checked                                         |
| ---------------------- | ---------------------------------------------------------- |
| Chrome (Chromium 141)  | Every automated browser flow above                         |
| Phone and tablet sizes | Chromium device emulation (iPhone, iPad, small Android)    |
| Safari, Firefox, Edge  | Manual checklist below (Playwright here only had Chromium) |

Manual browser checklist (about 5 minutes per browser):

1. Start a 5-question session with the keyboard only: Tab to an answer or press 1–4, Enter to
   flip, Enter on "I Got It Right".
2. Check that the card flip animates. With "Reduce motion" turned on in the OS settings, the
   card should swap instead.
3. Refresh in the middle of a session. The same question and answer should come back.
4. Open Statistics and Settings, refresh on each page, and check the counts are kept.
5. Narrow the window to phone width: there should be no sideways scrolling.

## Deployment

The app is a static site on Netlify. `netlify.toml` sets the build:

- build command: `npm run build`
- publish directory: `dist`
- Node version: 22

Two files in `public/` are copied into `dist/`:

- `_redirects` sends every path to `index.html`, so React Router routes such as `/statistics`
  work on refresh.
- `_headers` adds the privacy and security headers.

## Reference documents

- `specification.md` — application requirements
- `TODO.md` — implementation plan, with completed tasks checked off
