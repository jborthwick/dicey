import {
  CARD_BY_ID,
  MAX_CARDS_PER_TURN,
  RANDOM_DEBUFFS,
  REROLLS_PER_TURN,
  STATUS_CAPS,
  getCard,
  getDie,
  makePlayer,
  makeSpider,
} from "./content";
import { matchRequirement, symbolOf } from "./dice";
import { nextInt, pick, seedRng } from "./rng";
import type {
  Actor,
  BeatAction,
  Die,
  Effect,
  GameState,
  Side,
  Status,
  TurnBeat,
} from "./types";

/**
 * The rules. Every exported action is a **pure function**: it takes a state (and
 * an action's arguments) and returns a *new* state, never mutating the input.
 *
 * Implementation note: for readability we clone the incoming state once at the
 * top of each public function and then mutate the *draft*. Because the draft is
 * a fresh deep copy, callers never observe mutation — the function is pure from
 * the outside. Internal helpers take and mutate a draft directly. All randomness
 * flows through `draft.rng`, which every helper advances in place.
 */

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Flat outgoing-damage reduction while an actor is Weakened. */
const WEAKEN_DAMAGE_REDUCTION = 2;
/** Stacks applied per hit of a "random debuff". */
const RANDOM_DEBUFF_STACKS = 2;

// ---------------------------------------------------------------------------
// Small helpers (operate on a draft — never on caller-owned state)
// ---------------------------------------------------------------------------

const clone = (s: GameState): GameState => structuredClone(s);

const actorOf = (s: GameState, side: Side): Actor => (side === "player" ? s.player : s.enemy);
const opponent = (side: Side): Side => (side === "player" ? "enemy" : "player");

function log(draft: GameState, line: string): void {
  draft.log.push(line);
}

/** Advance the draft's rng and return an int in [min,max]. */
function rollInt(draft: GameState, min: number, max: number): number {
  const [v, next] = nextInt(draft.rng, min, max);
  draft.rng = next;
  return v;
}

function addStatus(actor: Actor, status: Status, stacks: number): void {
  const next = (actor.statuses[status] ?? 0) + stacks;
  const cap = STATUS_CAPS[status];
  actor.statuses[status] = cap === undefined ? next : Math.min(next, cap);
}

function stacksOf(actor: Actor, status: Status): number {
  return actor.statuses[status] ?? 0;
}

/** Apply raw damage to an actor, absorbed by Block first. */
function damageActor(target: Actor, amount: number): void {
  let remaining = amount;
  const block = stacksOf(target, "block");
  if (block > 0) {
    const absorbed = Math.min(block, remaining);
    target.statuses.block = block - absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
}

// ---------------------------------------------------------------------------
// Effect resolution
// ---------------------------------------------------------------------------

/** Resolve one effect performed by `sourceSide`. Mutates the draft. */
function applyEffect(draft: GameState, effect: Effect, sourceSide: Side): void {
  const source = actorOf(draft, sourceSide);
  const targetSide = effect.target === "self" ? sourceSide : opponent(sourceSide);
  const target = actorOf(draft, targetSide);

  switch (effect.kind) {
    case "damage": {
      let amount = rollInt(draft, effect.min, effect.max);
      if (stacksOf(source, "weaken") > 0) {
        amount = Math.max(0, amount - WEAKEN_DAMAGE_REDUCTION);
      }
      damageActor(target, amount);
      log(draft, `${source.name} deals ${amount} to ${target.name} (${target.hp} HP left).`);
      break;
    }
    case "block": {
      addStatus(target, "block", effect.amount);
      log(draft, `${target.name} gains ${effect.amount} Block.`);
      break;
    }
    case "status": {
      addStatus(target, effect.status, effect.stacks);
      log(draft, `${target.name} gains ${effect.stacks} ${effect.status}.`);
      break;
    }
    case "randomDebuff": {
      for (let i = 0; i < effect.times; i++) {
        const [status, next] = pick(draft.rng, RANDOM_DEBUFFS);
        draft.rng = next;
        addStatus(target, status, RANDOM_DEBUFF_STACKS);
        log(draft, `${target.name} is afflicted with ${RANDOM_DEBUFF_STACKS} ${status}.`);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Dice rolling
// ---------------------------------------------------------------------------

/** Roll a single die to a uniformly-random face. */
function rollDie(draft: GameState, die: Die): void {
  const faces = getDie(die.defId).faces.length;
  die.face = rollInt(draft, 0, faces - 1);
}

/**
 * Fresh full roll for an actor at the start of its turn: unhold + unspend all
 * dice, roll every one, then lock the first `entangle` dice so they can't be
 * rerolled or spent this turn. Locked dice are flagged `entangled` (implies
 * held + spent) so the UI can render them distinctly. We never lock the *last*
 * die — the owner always keeps at least one usable die, so entangle can slow you
 * but never fully softlock a turn.
 */
function rollAllForTurn(draft: GameState, side: Side): void {
  const actor = actorOf(draft, side);
  for (const die of actor.dice) {
    die.held = false;
    die.spent = false;
    die.entangled = false;
    rollDie(draft, die);
  }
  const locked = Math.min(stacksOf(actor, "entangle"), actor.dice.length - 1);
  for (let i = 0; i < locked; i++) {
    const die = actor.dice[i]!;
    die.held = true;
    die.spent = true;
    die.entangled = true;
  }
  actor.rollsRemaining = REROLLS_PER_TURN;
}

// ---------------------------------------------------------------------------
// Turn lifecycle
// ---------------------------------------------------------------------------

/**
 * Begin `side`'s turn: clear Block, tick Poison, fire the opponent's
 * turn-start passives (e.g. Poisonous Eyeball), then roll. Poison ticks *before*
 * passives so freshly-applied poison waits until next turn — that's why turn 1
 * starts clean even though the spider's relic will poison the player.
 */
function startTurn(draft: GameState, side: Side): void {
  const actor = actorOf(draft, side);
  const foe = actorOf(draft, opponent(side));

  actor.statuses.block = 0;

  const poison = stacksOf(actor, "poison");
  if (poison > 0) {
    damageActor(actor, poison);
    actor.statuses.poison = poison - 1;
    log(draft, `${actor.name} takes ${poison} Poison (${actor.hp} HP left).`);
  }

  for (const passive of foe.passives) {
    if (passive.when === "opponentTurnStart") {
      log(draft, `${foe.name}'s ${passive.name} triggers.`);
      applyEffect(draft, passive.effect, opponent(side));
    }
  }

  if (draft.phase === "won" || draft.phase === "lost") return;
  rollAllForTurn(draft, side);
}

/** Decrement turn-gating statuses at the end of an actor's turn. */
function endOfTurnDecay(actor: Actor): void {
  for (const s of ["silence", "entangle", "weaken"] as const) {
    const v = stacksOf(actor, s);
    if (v > 0) actor.statuses[s] = v - 1;
  }
}

/** Set win/loss phase if anyone is dead. Returns true if the game ended. */
function checkGameOver(draft: GameState): boolean {
  if (draft.enemy.hp <= 0) {
    draft.phase = "won";
    return true;
  }
  if (draft.player.hp <= 0) {
    draft.phase = "lost";
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

/** First card (in hand order) the actor can currently pay for, or null. */
function firstAffordable(actor: Actor): string | null {
  for (const id of actor.hand) {
    if (matchRequirement(actor.dice, getCard(id).requirement)) return id;
  }
  return null;
}

/**
 * Drive the enemy's turn: reroll toward something playable, then greedily play
 * affordable cards until it can't (or the player dies). `onStep` fires after
 * each visible action (a reroll batch or a card play) so callers can snapshot
 * the board for animated playback. Deliberately simple — the seam where a
 * smarter AI slots in later.
 */
function enemyTurn(draft: GameState, onStep: (action: BeatAction) => void): void {
  const enemy = draft.enemy;

  if (stacksOf(enemy, "silence") > 0) {
    log(draft, `${enemy.name} is Silenced and cannot act.`);
    onStep({ kind: "idle" });
    return;
  }

  // Reroll all unheld/unspent dice while nothing is affordable.
  while (enemy.rollsRemaining > 0 && firstAffordable(enemy) === null) {
    for (const die of enemy.dice) {
      if (!die.held && !die.spent) rollDie(draft, die);
    }
    enemy.rollsRemaining--;
    onStep({ kind: "reroll" });
  }

  let played = 0;
  for (; played < MAX_CARDS_PER_TURN; played++) {
    const cardId = firstAffordable(enemy);
    if (cardId === null) break;
    spendAndResolve(draft, "enemy", cardId);
    onStep({ kind: "play", cardId });
    if (checkGameOver(draft)) return;
  }
  if (played === 0) {
    log(draft, `${enemy.name} finds no move.`);
    onStep({ kind: "idle" });
  }
}

// ---------------------------------------------------------------------------
// Shared card resolution
// ---------------------------------------------------------------------------

/** Spend the matching dice for a card and apply its effects. Assumes the card
 *  is in hand and affordable (callers validate). Mutates the draft. */
function spendAndResolve(draft: GameState, side: Side, cardId: string): void {
  const actor = actorOf(draft, side);
  const card = getCard(cardId);
  const indices = matchRequirement(actor.dice, card.requirement);
  if (!indices) throw new Error(`${actor.name} cannot pay for ${card.name}`);
  for (const i of indices) actor.dice[i]!.spent = true;
  const spentSymbols = indices.map((i) => symbolOf(actor.dice[i]!)).join(", ");
  log(draft, `${actor.name} plays ${card.name} [${spentSymbols}].`);
  for (const effect of card.effects) applyEffect(draft, effect, side);
}

// ===========================================================================
// Public API — pure actions
// ===========================================================================

/** Create a fresh encounter and start the player's first turn. */
export function newGame(seed: number | string): GameState {
  const base: GameState = {
    seed,
    rng: seedRng(seed),
    turn: 1,
    phase: "playerTurn",
    player: makePlayer(),
    enemy: makeSpider(),
    log: [],
  };
  const draft = clone(base);
  log(draft, `Encounter: ${draft.player.name} vs ${draft.enemy.name}.`);
  startTurn(draft, "player");
  return draft;
}

/**
 * Low-level primitive: reroll all of a side's non-held, non-spent dice without
 * consuming a reroll. `startTurn` uses this for the free initial roll; exposed
 * mainly for tests/headless. Normal play uses {@link reroll}.
 */
export function roll(state: GameState, side: Side = "player"): GameState {
  const draft = clone(state);
  const actor = actorOf(draft, side);
  for (const die of actor.dice) {
    if (!die.held && !die.spent) rollDie(draft, die);
  }
  return draft;
}

/** Toggle a player die's held flag (kept across rerolls). No-ops off-turn or on
 *  spent dice. */
export function toggleHold(state: GameState, dieIndex: number): GameState {
  const draft = clone(state);
  const die = draft.player.dice[dieIndex];
  if (draft.phase === "playerTurn" && die && !die.spent) {
    die.held = !die.held;
  }
  return draft;
}

/** Spend one reroll: reroll all of the player's non-held, non-spent dice. */
export function reroll(state: GameState): GameState {
  const draft = clone(state);
  if (draft.phase !== "playerTurn" || draft.player.rollsRemaining <= 0) return draft;
  for (const die of draft.player.dice) {
    if (!die.held && !die.spent) rollDie(draft, die);
  }
  draft.player.rollsRemaining--;
  return draft;
}

/** Whether the player may currently play `cardId`. */
export function canPlayCard(state: GameState, cardId: string): boolean {
  if (state.phase !== "playerTurn") return false;
  if (stacksOf(state.player, "silence") > 0) return false;
  if (!state.player.hand.includes(cardId)) return false;
  const card = CARD_BY_ID.get(cardId);
  if (!card) return false;
  return matchRequirement(state.player.dice, card.requirement) !== null;
}

/** Play a player card, spending the matching dice. Throws if illegal — gate the
 *  UI with {@link canPlayCard}. */
export function playCard(state: GameState, cardId: string): GameState {
  if (!canPlayCard(state, cardId)) {
    throw new Error(`Illegal play: ${cardId}`);
  }
  const draft = clone(state);
  spendAndResolve(draft, "player", cardId);
  checkGameOver(draft);
  return draft;
}

/**
 * Resolve everything between the player pressing End Turn and the start of their
 * next turn, returning an **ordered list of board snapshots** — one per visible
 * beat (enemy turn begins & rolls, each enemy reroll, each enemy card, then the
 * player's next turn begins). The UI plays these back with delays to show the
 * spider act; the final snapshot is the next player-turn state.
 *
 * Pure & deterministic: the snapshots are clones and consume no RNG, so the
 * sequence of random draws is identical to a single atomic resolution.
 */
export function endTurnTimeline(state: GameState): TurnBeat[] {
  if (state.phase !== "playerTurn") {
    return [{ state: clone(state), action: { kind: "resolve" } }];
  }

  const draft = clone(state);
  const beats: TurnBeat[] = [];
  const snap = (action: BeatAction) => beats.push({ state: clone(draft), action });

  endOfTurnDecay(draft.player);

  // Enemy turn begins: clear block, tick poison, fire player passives, roll.
  draft.phase = "enemyTurn";
  startTurn(draft, "enemy");
  snap({ kind: "enemyStart" });

  if (!checkGameOver(draft)) {
    enemyTurn(draft, snap);
  }

  // Back to the player (unless someone died during the enemy's turn).
  if (!checkGameOver(draft)) {
    endOfTurnDecay(draft.enemy);
    draft.turn++;
    draft.phase = "playerTurn";
    startTurn(draft, "player");
    checkGameOver(draft);
  }
  snap({ kind: "resolve" });
  return beats;
}

/**
 * End the player's turn and return the resulting next-turn state directly (the
 * last beat of {@link endTurnTimeline}). Headless/tests use this; the UI uses
 * the timeline to animate the enemy's turn.
 */
export function endTurn(state: GameState): GameState {
  const beats = endTurnTimeline(state);
  return beats[beats.length - 1]!.state;
}

// Re-exports so UI/headless can pull everything from one module.
export { symbolOf, matchRequirement } from "./dice";
export { getCard, getDie } from "./content";
