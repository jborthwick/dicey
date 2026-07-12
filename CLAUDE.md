# Dicey — Agent Instructions

A web prototype of a Yahtzee-style dice battler (inspired by *Dicey Elementalist* /
*Slice & Dice*). Core loop: roll a pool of 5 dice, hold/reroll a fixed number of
times, then spend matched dice symbols to play cards that damage the enemy or
apply statuses. The enemy takes its turn the same way — it rolls its own dice and
plays from its own card set. Turn-based multi-fight runs against the starter enemy
pool; the player begins with a 2-card hand and drafts after each win.

Target is **web-only**, to be wrapped with Capacitor for iOS later — so nothing
browser-specific that can't run in a WebView.

---

## The one architectural rule

**Logic and rendering are fully separate.**

- **`src/core/`** — pure TypeScript. Zero rendering deps. Seeded RNG so runs are
  deterministic. Holds *all* game state and rules. Fully playable/testable
  headless. **If a core file imports React or any DOM/canvas API, that's a bug.**
- **`src/ui/`** — React + CSS, DOM-based (flexbox cards / dice / HP bars). The UI
  holds a `GameState`, renders it, and every control dispatches a core action and
  stores the returned state. No game rules in the UI — if you're computing damage
  in a `.tsx` file, it belongs in core.

The core exposes **pure functions**: each takes state (+ action args) and returns
a *new* state. No mutation of inputs, no side effects, no globals. Randomness
flows through `state.rng` (a serializable integer), so the same seed always
reproduces the same run.

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc --noEmit && vite build (production bundle)
npm run typecheck    # tsc --noEmit (strict)
npm run test         # vitest run
npm run headless     # play a full encounter headless (see below)
npm run check        # typecheck + tests — run before committing
```

## Headless harness (`scripts/headless.ts`)

Plays a full combat start-to-finish with a simple greedy player policy and no
rendering. This is the **regression harness for combat math** — use it whenever
you touch damage, statuses, resolve order, or the enemy AI.

```bash
npx tsx scripts/headless.ts            # default seed "dicey-default"
npx tsx scripts/headless.ts 42         # fixed seed 42 (reproducible)
npx tsx scripts/headless.ts 42 --quiet # summary only
```

Same seed ⇒ identical run. Determinism is a hard invariant; there's a test for it.

## Where things live

| Concern | File |
|---|---|
| Domain types (`Die`, `Card`, `Actor`, `GameState`, `Status`…) | `src/core/types.ts` |
| Seeded PRNG (mulberry32, state-threaded) | `src/core/rng.ts` |
| Dice symbol resolution + requirement matching | `src/core/dice.ts` |
| The rules: `newGame`, `roll`, `toggleHold`, `reroll`, `playCard`, `endTurn` | `src/core/game.ts` |
| Content: dice, cards, enemies, passives, tuning | `src/core/content.ts` |
| React shell | `src/ui/` |
| Enemy sprite visuals | `src/ui/visuals/`, `public/assets/enemies/` |

## Model notes (so you don't relearn them)

- **Actors are symmetric.** Player and enemy share the `Actor` shape (dice, hand,
  rerolls, passives). The enemy just drives its turn with `enemyTurn`'s greedy AI
  instead of user input. Smarter enemy behavior slots in there.
- **The enemy turn is animatable.** `endTurnTimeline(state)` returns an ordered
  list of board snapshots (enemy rolls, each reroll, each card, then the player's
  next turn) so the UI can play the spider's turn back with delays. `endTurn` is
  just its last frame — headless/tests use `endTurn`; the UI uses the timeline.
  Snapshots are clones that consume no RNG, so both paths are identical & seeded.
- **Effect targets are relative to the actor.** `self` = the actor, `enemy` = its
  opponent. So a spider intent with `target: "enemy"` hits the player.
- **Card cost is one of two shapes:** `{ kind: "symbols", symbol, count }` (N of a
  specific element) or `{ kind: "pairs", count }` (N disjoint same-symbol pairs,
  which may be different symbols — like the reference's Tangling / Physic Guidance).
- **Dice `held` vs `spent`:** `held` = keep across rerolls (within a turn);
  `spent` = already used to pay for a card this turn. Both reset at turn start.
- **Status timing:** poison ticks + decays at the *start* of the afflicted's turn;
  silence / entangle / weaken decay at the *end* of the actor's turn. Entangle
  locks the first N dice at roll time — locked dice are flagged `entangled` (implies
  held + spent) so the UI can render them distinctly from dice you spent yourself.
- **Entangle can't softlock or run away.** It's capped via `STATUS_CAPS` in
  `content.ts` (currently 2), and `rollAllForTurn` never locks your *last* die, so
  you always keep usable dice. Add caps for other statuses there if they misbehave.
- **Run progression.** `newRun(seed)` walks `STARTER_ENEMY_IDS` in order. On kill,
  phase becomes `draft` with two offers from `REWARD_CARD_IDS` (excluding cards
  already owned) plus the defeated enemy's relic pending. `pickDraftCard` adds the
  card + relic, clears combat statuses, and starts the next fight — or `runWon` after
  the last enemy. `newGame(seed, enemyId?)` remains for single-encounter tests
  (`run.enabled = false`, phase `won` on kill).
- **Balance is a known open question.** The spider's Poisonous Eyeball still adds
  +2 poison every player turn while poison only decays by 1 → runaway poison when
  fighting it. Early enemies are tuned softer for onboarding. Adjust numbers in
  `content.ts` only — the rules in `game.ts` shouldn't need to change.
- **Asset provenance is tracked, not assumed.** `public/assets/enemies/README.md`
  is the source-of-truth ledger (pack, license, exact source files) for every
  committed sprite; `src/ui/visuals/enemies.ts`'s `source` field is the
  quick-reference copy. **Update both in the same commit whenever you add or
  swap a sprite** — this drifted out of sync once already (folder names and
  license labels stopped matching what was actually committed) and caused a
  false "paid asset in a public repo" scare. Enemy id ⇄ folder name ⇄ display
  name should always match what the sprite actually depicts. Unreleased
  candidate art belongs in the gitignored `dicey asset src/` at the repo root,
  never committed.

## Git commit conventions

Conventional commits with a scope when the change is scoped to one system:

- `feat:` new gameplay feature / system · `fix:` bug fix · `refactor:` no-behavior
  restructure · `chore:` tooling/deps/config · `docs:` comments/docs · `test:` tests

Common scopes: `core` (rules/engine), `dice`, `cards`, `status`, `ai` (enemy),
`ui`, `content` (data/tuning), `rng`.

**One logical change per commit.** Don't bundle unrelated changes. Commit
incrementally, not all at once at the end. Run `npm run check` before committing.
