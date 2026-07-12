# Dicey

**[Play Now](https://jborthwick.github.io/dicey/)**

A web prototype of a Yahtzee-style dice battler — inspired by *Dicey Elementalist*
and *Slice & Dice*. Roll five dice, hold and reroll, then spend matched elemental
symbols to play cards that damage the enemy or apply statuses. The enemy rolls and
plays from its own deck on its turn.

## Quick start

```bash
npm install
npm run dev        # play at http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run test` | Vitest unit tests |
| `npm run headless` | Play a full encounter in the terminal (deterministic) |
| `npm run check` | Type-check + tests (pre-commit gate) |

```bash
npx tsx scripts/headless.ts 42   # reproducible run under seed 42
```

## Architecture

Logic and rendering are kept completely separate:

- **`src/core/`** — pure, deterministic TypeScript. All game state and rules. No
  rendering deps. Fully playable headless (that's what `scripts/headless.ts`
  exercises). Actions are pure functions: `state -> newState`.
- **`src/ui/`** — a thin React + CSS shell that renders a `GameState` and
  dispatches core actions.

See [CLAUDE.md](CLAUDE.md) for the model and contributor conventions.

Web-only for now; intended to be wrapped with Capacitor for iOS later.

## Roadmap

The current build is a **multi-fight run** against the starter enemy pool with a
**2-card starter hand**. After each win you pick **1 of 2** reward cards and gain
that enemy's relic. The intended run loop:

1. Start with **2 starter cards** and no relics.
2. Fight enemies from an ordered early pool (`STARTER_ENEMY_IDS` in `src/core/content.ts`).
3. On win: pick **1 of 2** offered reward cards; gain that enemy's **relic** (passive).
4. Repeat until the run ends.

Content pools (`STARTER_CARD_IDS`, `REWARD_CARD_IDS`, enemy definitions) all live in
[`src/core/content.ts`](src/core/content.ts). Run rules (`newRun`, `pickDraftCard`) live in
[`src/core/game.ts`](src/core/game.ts). The Poisonous Spider remains in the pool
as a harder mid/late fight — not the default encounter.
