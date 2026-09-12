# Would You Rather? CS50 — TanStack Start

A mobile-app-style "Would You Rather? CS50" game built on TanStack Start:
file-based routing, validated search params, route loaders, typed server
functions, streaming, and runtime-agnostic deployment — presented as
full-screen app screens (no site chrome), in three languages, with two blue
themes.

## The app

- **Home** — speech-bubble logo on a doodled blue background with two stacked
  pill actions: **Play** and **Settings**.
- **Play** — pick a session length: **Quick (10)**, **Classic (25)** or
  **Marathon (50)**. A server function creates the shuffled, no-repeats game
  session.
- **Game** (`/game/$gameId?q=N`) — the two options split the whole viewport,
  side by side above 720px and stacked on phones, with an OR badge on the seam.
  The home screen's doodles carry straight through: one white artwork, tiled
  against the viewport so the pattern is continuous across the seam, with each
  side applying its own filter — etched dark on the warm pane, left light on the
  cool one. Results and settings stay plain.
  Chrome is deliberately thin: a hairline of progress, a close button and a
  counter. Answering reveals both percentages, dims the side you passed on, and
  starts a five-second countdown that carries you to the next question — there
  is no Next button. The countdown ring doubles as the control if you want to
  move on sooner, and coming *back* to an answered question never re-arms it.
- **Results** — streamed in ("crunching the numbers…"): your score vs. the
  majority plus a per-question breakdown.
- **Settings** — **Language** (English, Español, Português) and **Theme**
  (light = vivid blue, dark = deep navy). Persisted in a cookie; the server
  renders the next request already in your language and theme.

## Run it

```sh
npm install
npm run dev        # dev server on http://localhost:3000
npm run build      # production build -> .output/
npm start          # node .output/server/index.mjs
npm run typecheck  # tsc --noEmit
```

## Where each capability lives

| Capability | Where | How |
| --- | --- | --- |
| File-based routes | `src/routes/` | `__root.tsx`, `index.tsx`, `play.tsx`, `game.$gameId.tsx`, `settings.tsx`; tree generated into `src/routeTree.gen.ts` |
| Document shell | `src/routes/__root.tsx` | Root renders `<html>/<head>/<body>`; `beforeLoad` reads the settings cookie so the first byte already has the right `<html lang>` and `data-theme` |
| Validated search params | `src/routes/game.$gameId.tsx` | `?q=` (current question) validated by zod; `?q=abc` is 307-redirected to the canonical `?q=1` |
| Route loaders | play/game | The game loader wires `params` + `loaderDeps` + router `context` (language) into `getGameState` |
| Typed server functions | `src/server/functions.ts` | `createServerFn().validator(zodSchema).handler(...)`; GET for reads, POST for `startGame`/`answerGame`/`saveSettings`; `notFound()` propagates to the router; `answerGame` is idempotent per question |
| Server-only boundary | `src/server/db.ts` | Store accessor wrapped in `createServerOnlyFn`; the 50 CS50 questions × 3 languages and the SQLite handle never appear in a client bundle — only the current question, in one language, crosses the wire |
| Persistence | `src/server/db.ts` | Vote totals live in SQLite via Node's built-in `node:sqlite` — no driver to compile, no connection string. Question *text* stays in code; only counters are stored |
| Isomorphic boundary | `src/settings.ts` | `createIsomorphicFn`: cookie read from request headers on the server, `document.cookie` in the browser — same call site, zero network hops |
| Streaming | `src/routes/game.$gameId.tsx` | The finished-game loader returns the slow `getGameResults` promise **unawaited**; the screen shows instantly and the summary streams into `<Suspense>` + `<Await>` |
| i18n | `src/i18n.ts` | Typed dictionaries for `en`/`es`/`pt` (UI *and* question content) |

`/settings` opts out of server rendering entirely (`ssr: false`) — it's a
personal, interactive screen. Everything else keeps the default; it costs
nothing and makes first paint instant.

## Deployment runtime

The runtime target is selected in [vite.config.ts](vite.config.ts) via the
Nitro Vite plugin and **never leaks into application code**. Nitro is applied
only for `vite build` (TanStack Start serves dev itself):

```ts
command === 'build' ? nitro({ preset }) : []
```

- Default: `node-server` → `npm run build && npm start`.
- Other runtimes: set `TARGET_PRESET` (e.g. `bun`, `vercel`, `netlify`,
  `cloudflare_module`) at build time, or swap in a host-specific plugin.
  Routes, loaders, and server functions are unchanged either way.

Two constraints come from the store, not from Nitro:

- **A writable local disk.** Vote totals are a SQLite file, so the serverless
  presets do not work as-is; a VPS or any host with a volume does. Set
  `DATABASE_PATH` to somewhere that survives a redeploy — `.output/` is
  rebuilt every time, so the default `./wyr.db` is for development only:

  ```sh
  DATABASE_PATH=/var/lib/wyr/wyr.db npm start
  ```

  Back it up with `sqlite3 wyr.db ".backup /backups/wyr-$(date +%F).db"` rather
  than `cp`, so a vote landing mid-copy cannot tear the file.

- **A single process.** Game sessions are in memory, so a game started on one
  worker is unknown to another — run one instance, not pm2 cluster mode. (The
  SQLite file itself is fine with many processes; the sessions are not.)
  Moving sessions into SQLite would lift this, at the cost of a cleanup job.

## Notes

- The store (`src/server/db.ts`) splits three kinds of state deliberately:
  **question text** is content, so it stays in the `ROWS` literal — versioned,
  diffable, translatable in a commit, and re-read on every boot; **vote totals**
  are the only thing that must outlive the process, so they live in SQLite;
  **game sessions** are single-user and disposable, so they stay on
  `globalThis` (capped at 200, oldest evicted) where they also survive dev HMR.
- Each question's identity is its **slug**, not its position in `ROWS`. Votes
  are keyed on it, so rows can be added, edited or reordered freely — but
  renaming or reusing a slug would silently reattach votes to another dilemma.
  Boot re-seeds new slugs and never overwrites an existing row's counters.
- Votes are incremented in SQL (`votes_a = votes_a + 1`), never read-modify-write,
  and `answerGame` stays idempotent per question, so a double-tap counts once.
- Server functions are protected by TanStack Start's built-in CSRF middleware.
- All visuals (logo bubble, doodle background, favicon) are hand-drawn
  CSS/SVG data URIs — no emoji, no external assets, fully self-contained.
