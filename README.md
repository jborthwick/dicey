# Dicey

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
