/**
 * Headless encounter runner. Plays a full combat start-to-finish with a simple
 * greedy player policy and no rendering — the regression harness for combat math.
 *
 *   npx tsx scripts/headless.ts            # default seed, single fight
 *   npx tsx scripts/headless.ts --run      # full multi-fight run
 *   npx tsx scripts/headless.ts 42         # fixed seed 42 (reproducible)
 *   npx tsx scripts/headless.ts 42 --quiet # summary only, no per-event log
 *
 * Same seed => same run. Use it to lock in combat behavior before touching UI.
 */

import {
  canPlayCard,
  canReroll,
  endTurn,
  getCard,
  newGame,
  newRun,
  pickDraftCard,
  playCard,
  reroll,
  symbolOf,
  type GameState,
} from "../src/core/index";

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const fullRun = args.includes("--run");
const seedArg = args.find((a) => !a.startsWith("--"));
const seed: number | string = seedArg ?? "dicey-default";
const MAX_TURNS = 100;

/** Greedy player: reroll while nothing is playable, then play every affordable
 *  card (re-checking after each, since a play frees dice / changes the board). */
function takePlayerTurn(state: GameState): GameState {
  let s = state;
  while (s.player.rollsRemaining > 0 && !anyPlayable(s) && canReroll(s)) {
    s = reroll(s);
  }
  let guard = 0;
  while (s.phase === "playerTurn" && guard++ < 20) {
    const cardId = s.player.hand.find((id) => canPlayCard(s, id));
    if (!cardId) break;
    s = playCard(s, cardId);
  }
  return endTurn(s);
}

function anyPlayable(s: GameState): boolean {
  return s.player.hand.some((id) => canPlayCard(s, id));
}

function diceLine(s: GameState): string {
  return s.player.dice
    .map((d) => {
      const sym = symbolOf(d).padEnd(5);
      return d.spent ? `(${sym.trim()})` : sym.trim();
    })
    .join(" ");
}

function autoPickDraft(s: GameState): GameState {
  const [first] = s.run.draftOffers ?? [];
  if (!first) throw new Error("Draft with no offers");
  return pickDraftCard(s, first);
}

function run(): void {
  let s = fullRun ? newRun(seed) : newGame(seed);
  let printed = 0;

  while (printed <= MAX_TURNS) {
    if (s.phase === "draft") {
      if (!quiet) console.log(`\n── Draft ── pick ${s.run.draftOffers?.map(getCard).map((c) => c.name).join(" / ")}`);
      s = autoPickDraft(s);
      continue;
    }
    if (s.phase !== "playerTurn") break;

    if (!quiet) {
      console.log(`\n── Turn ${s.turn} ──`);
      console.log(`  player ${s.player.hp}/${s.player.maxHp} HP  ${statusStr(s, "player")}`);
      console.log(`  ${s.enemy.name.toLowerCase()} ${s.enemy.hp}/${s.enemy.maxHp} HP  ${statusStr(s, "enemy")}`);
      console.log(`  dice:  ${diceLine(s)}  (rerolls: ${s.player.rollsRemaining})`);
    }
    const before = s.log.length;
    s = takePlayerTurn(s);
    if (!quiet) {
      for (const line of s.log.slice(before)) console.log(`    · ${line}`);
    }
    printed++;
  }

  console.log("\n════════ RESULT ════════");
  console.log(`seed:    ${JSON.stringify(seed)}`);
  console.log(`mode:    ${fullRun ? "run" : "single fight"}`);
  console.log(`outcome: ${s.phase.toUpperCase()} on turn ${s.turn}`);
  console.log(`player:  ${s.player.hp}/${s.player.maxHp} HP`);
  console.log(`enemy:   ${s.enemy.name} ${s.enemy.hp}/${s.enemy.maxHp} HP`);
  console.log(`events:  ${s.log.length}`);
  console.log(`cards:   ${[...s.player.hand].map((id) => getCard(id).name).join(", ")}`);
  if (s.player.passives.length) {
    console.log(`relics:  ${s.player.passives.map((p) => p.name).join(", ")}`);
  }
}

function statusStr(s: GameState, side: "player" | "enemy"): string {
  const st = (side === "player" ? s.player : s.enemy).statuses;
  const parts = Object.entries(st)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${k}:${v}`);
  return parts.length ? `[${parts.join(" ")}]` : "";
}

run();
