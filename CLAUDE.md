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
| Content: dice, cards, enemies, passives, tuning | `src/core/content/` (see below) |
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
  `content/config.ts` (currently 2), and `rollAllForTurn` never locks your *last*
  die, so you always keep usable dice. Add caps for other statuses there if they
  misbehave.
- **Content is static data + a hydrator, split by domain.** `src/core/content/`:
  `config.ts` (tuning constants), `dice.ts`/`cards.ts`/`passives.ts`/`enemies.ts`
  (each a flat `Record<id, Def>` — no functions, fully serializable), `player.ts`
  (`PLAYER_DEF`), and `hydrate.ts` (`hydrateActor(def: ActorDef): Actor` — rolls
  fresh dice, resolves passive ids, used by both `makeEnemy`/`makePlayer`).
  `ActorDef` (types.ts) is the *static* starting-kit shape (id/name/hp/diceIds/
  handIds/passiveIds); `Actor` (also types.ts) is the *live* per-run shape
  hydrate produces. This split exists specifically so a future dev tool can read
  and regenerate any one content file wholesale — don't reintroduce a
  switch-statement factory or inline the def+hydration back together.
  `content/index.ts` is a barrel; `"./content"` resolves there automatically.
- **Run progression is endless.** `newRun(seed)` picks fight 1 the same way as
  every fight after it: a seeded random pick from `ENDLESS_ENEMY_IDS` (every
  enemy with a real sprite; repeats allowed, that's the "cycle"). There is no
  fixed opener. A run never wins on its own; the only terminal state is
  `lost`. There is no `runWon` phase — it was removed as genuinely unreachable when this shipped,
  don't reintroduce a fixed run length without also reintroducing that phase
  everywhere it was wired (types.ts, persist.ts, App.tsx, styles.css all
  referenced it once). On kill, phase becomes `draft` with two offers from
  `REWARD_CARD_IDS`, preferring cards not yet owned but falling back to the
  full pool once everything's collected (`rollDraftOffers` in game.ts) — a
  long run *will* exhaust the ~10-card pool, and picking an already-owned
  card must stay a harmless no-op, never a crash (`pickDraftCard`'s hand-push
  is guarded by `!hand.includes`). `pickDraftCard` adds the card + relic,
  clears combat statuses, and starts the next fight. `newGame(seed, enemyId?)`
  remains for single-encounter tests (`run.enabled = false`, phase `won` on
  kill — this is the one path that still reaches a win phase).
- **Balance is a known open question.** The spider's Poisonous Eyeball still adds
  +2 poison every player turn while poison only decays by 1 → runaway poison when
  fighting it. The skeleton's Bone Rattle has the same shape: it has good odds of
  a wind-showing die most turns, so it recasts silence often enough that even
  capped at 1 (`STATUS_CAPS`), the player can still be locked out of playing
  cards for the majority of a long fight — capping stops it from ever getting
  *worse* than one lost turn per cast, it doesn't fix the underlying frequency.
  Early enemies are tuned softer for onboarding. Adjust numbers in `content/`
  only — the rules in `game.ts` shouldn't need to change.
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
