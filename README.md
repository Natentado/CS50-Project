# WOULD YOU RATHER? CS50

#### Video Demo: <URL HERE>

#### Description:

**Would You Rather? CS50** is a full-stack web game of impossible choices, built around fifty dilemmas drawn from the CS50x syllabus. Each question puts two options side by side — _hunt a segfault with no error message_ or _hunt a memory leak that never crashes anything?_ — you pick one, and the screen immediately shows how everyone else who has ever played answered the same question. It runs in three languages (English, Spanish and Portuguese), in a light or dark theme, and is designed to feel like a mobile app rather than a website: full-bleed screens, no navigation bar, no scrolling chrome.

The project is written in TypeScript on **TanStack Start** (a full-stack React framework), with **SQLite** for persistence through Node's built-in `node:sqlite` module. It has no runtime dependencies beyond React, the router, and Zod. Every visual, including the speech-bubble logo, the doodled background and the favicon, is hand-written CSS or an inline SVG data URI.

## How it plays

From the home screen you press **Play**, which calls a server function that shuffles all fifty questions and creates a game session. Each question then takes over the entire viewport: two coloured panes split the screen, left and right on a desktop and top and bottom on a phone, with an "OR" badge sitting on the seam. Tapping a side records your vote and reveals both percentages, which count up from zero rather than simply appearing. The side you passed on desaturates to grey so the result reads at a glance.

Five seconds after you answer, the game moves on by itself, with a draining ring in the corner showing how long is left. That ring is also a button, so you can skip ahead immediately if you have already absorbed the result. After the last question, a results screen streams in with your score against the majority and a per-question breakdown.

## What each file does

**`src/server/db.ts`** heart of the project and the file I spent the most time on. It holds all fifty dilemmas as a literal array of tuples — a slug, a category, and the two options in each of the three languages — and it opens and owns the SQLite database.The store it returns exposes a read-only map of questions plus three vote operations: read one, read many in a single query, and add a vote.

**`src/server/functions.ts`** defines the five server functions: `startGame`, `getGameState`, `answerGame`, `getGameResults` and `saveSettings`. Each validates its input with a Zod before the handler runs. `answerGame` is idempotent per question — answering twice returns your first choice and does not count a second vote.

**`src/routes/game.$gameId.tsx`** is the largest component. It contains the route definition (with a Zod-validated `?q=` search parameter), the split-screen "duel", the percentage count-up hook, the auto-advance timer, and the results screen. **`src/routes/__root.tsx`** renders the actual `<html>`, `<head>` and `<body>` elements, reads the settings cookie before anything else so the very first byte of HTML already carries the right `lang` and theme, and stamps a `data-screen` attribute on the body that tells the CSS which screen is showing. **`src/routes/index.tsx`** is the home screen and **`src/routes/settings.tsx`** the language and theme picker.

**`src/i18n.ts`** holds three typed dictionaries. The English one defines the `Messages` type, so the Spanish and Portuguese objects fail to compile if a key is missing — translations cannot silently drift. **`src/settings.ts`** reads the settings cookie through `createIsomorphicFn`, using request headers on the server and `document.cookie` in the browser from the same call site. **`src/PlayButton.tsx`** is a small shared button that starts a game, and **`src/router.tsx`** configures the router, including deciding whether a navigation animates forward or backward by comparing route depth and question number.

**`src/styles.css`** is all of the styling: theme tokens, the duel layout, and the animations. **`scripts/db.mjs`** is a small SQLite shell I wrote so the vote database can be inspected on the server without installing anything (`npm run db -- "SELECT ..."`, or an interactive prompt). **`vite.config.ts`** selects the deployment runtime, and `src/routeTree.gen.ts` is generated automatically from the route files.

## Design choices

**Questions live in code; only votes live in the database.** This was the decision I went back and forth on most. Putting the fifty dilemmas in SQLite felt like the "proper" thing to do, but question text is _content_, not data: it changes only when I edit it, and keeping it in the source means translations are versioned, diffable and reviewable in a commit. Vote totals are the opposite — they accumulate, they are shared between every player, and losing them is the only thing I would actually regret. So the database stores four columns: a slug, a category, and two counters.

**Each question's identity is a slug, not its position.** Originally IDs were simply the array index. That is harmless while votes live in memory, but the moment they become durable it turns into silent data corruption: inserting a question at the top of the list would shift every stored vote onto a different dilemma, with nothing erroring. I changed every row to a stable slug (`segfault-vs-leak`) before adding persistence, so questions can be added, edited or reordered freely.

**`node:sqlite` rather than `better-sqlite3`.** I intended to use `better-sqlite3`, but its prebuilt Windows binary segfaulted the process on open. Node's built-in SQLite module offers the same synchronous API — which matters, because it let the whole store stay non-`async` and kept the change contained to one file — with nothing to compile.

**Votes are incremented in SQL, never read-modify-write.** `UPDATE questions SET votes_a = votes_a + 1 ... RETURNING` makes counting a vote a single atomic statement, so two simultaneous players cannot lose one another's votes.

**Accessibility.** The counting percentages are hidden from screen readers, which get the final figure instead of a stream of meaningless numbers; the visually removed "Would you rather…" prompt survives as a hidden heading; and `prefers-reduced-motion` turns off both the count-up and the countdown animation.

## Running it

```sh
npm install
npm run dev        # http://localhost:3000
npm run build
npm start
npm run typecheck
npm run db         # inspect the vote database
```

```sh
DATABASE_PATH=/var/lib/wyr/wyr.db npm start
```

**DISCLAIMER:** Code algorithms, functions and the UI's were builded alongside CLAUDE CODE, with Human in the loop all the time supervising the work. DB definitions and System Design implemented by me, the author, Nathan Molina.
