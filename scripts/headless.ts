/**
 * Headless encounter runner. Plays a full combat start-to-finish with a simple
 * greedy player policy and no rendering — the regression harness for combat math.
 *
 *   npx tsx scripts/headless.ts            # default seed
 *   npx tsx scripts/headless.ts 42         # fixed seed 42 (reproducible)
 *   npx tsx scripts/headless.ts 42 --quiet # summary only, no per-event log
 *
 * Same seed => same run. Use it to lock in combat behavior before touching UI.
 */

import {
  canPlayCard,
  endTurn,
  getCard,
  newGame,
  playCard,
  reroll,
  symbolOf,
  type GameState,
} from "../src/core/index";

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const seedArg = args.find((a) => !a.startsWith("--"));
const seed: number | string = seedArg ?? "dicey-default";
const MAX_TURNS = 100;

/** Greedy player: reroll while nothing is playable, then play every affordable
 *  card (re-checking after each, since a play frees dice / changes the board). */
function takePlayerTurn(state: GameState): GameState {
  let s = state;
  while (s.player.rollsRemaining > 0 && !anyPlayable(s)) {
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

function run(): void {
  let s = newGame(seed);
  let printed = 0;

  while (s.phase === "playerTurn" && s.turn <= MAX_TURNS) {
    if (!quiet) {
      console.log(`\n── Turn ${s.turn} ──`);
      console.log(`  player ${s.player.hp}/${s.player.maxHp} HP  ${statusStr(s, "player")}`);
      console.log(`  spider ${s.enemy.hp}/${s.enemy.maxHp} HP  ${statusStr(s, "enemy")}`);
      console.log(`  dice:  ${diceLine(s)}  (rerolls: ${s.player.rollsRemaining})`);
    }
    const before = s.log.length;
    s = takePlayerTurn(s);
    if (!quiet) {
      for (const line of s.log.slice(before)) console.log(`    · ${line}`);
    }
    printed++;
    if (printed > MAX_TURNS) break;
  }

  console.log("\n════════ RESULT ════════");
  console.log(`seed:    ${JSON.stringify(seed)}`);
  console.log(`outcome: ${s.phase.toUpperCase()} on turn ${s.turn}`);
  console.log(`player:  ${s.player.hp}/${s.player.maxHp} HP`);
  console.log(`spider:  ${s.enemy.hp}/${s.enemy.maxHp} HP`);
  console.log(`events:  ${s.log.length}`);
  console.log(`cards:   ${[...s.player.hand].map((id) => getCard(id).name).join(", ")}`);
}

function statusStr(s: GameState, side: "player" | "enemy"): string {
  const st = (side === "player" ? s.player : s.enemy).statuses;
  const parts = Object.entries(st)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${k}:${v}`);
  return parts.length ? `[${parts.join(" ")}]` : "";
}

run();
