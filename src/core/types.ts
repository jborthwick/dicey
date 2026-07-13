import type { Rng } from "./rng";

/**
 * Core domain types. Pure data — no methods, no rendering concerns. The rules
 * that operate on these live in `game.ts`; the concrete dice/cards/enemies live
 * in `content.ts`.
 *
 * Design note: player and enemy are the *same* shape (`Actor`). Both own a dice
 * pool, a hand of cards, rerolls, and passives, and both take a turn by rolling
 * and spending dice on cards. The enemy just drives its turn with a simple AI
 * (`enemyTurn` in game.ts) instead of user input. This mirrors the reference
 * game, where the enemy rolls and plays from its own card set.
 */

// ---------------------------------------------------------------------------
// Symbols (die faces)
// ---------------------------------------------------------------------------

/**
 * The elemental symbols a die face can show. `blank` is the dead "closed eye"
 * face from the reference art — it matches nothing and can't pay for cards.
 * Keep this a closed union so exhaustiveness checks work.
 */
export type Symbol = "wind" | "light" | "water" | "earth" | "blank";

export const SYMBOLS: readonly Symbol[] = ["wind", "light", "water", "earth", "blank"];

/** Payable symbols (everything except the blank). */
export const ELEMENTS: readonly Symbol[] = ["wind", "light", "water", "earth"];

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

/**
 * Stackable status effects. The number stored on an actor is the stack count
 * (interpreted per-status in `game.ts`):
 *  - poison:   damage taken at the start of the afflicted's turn; ticks down 1.
 *  - silence:  the next card the afflicted actor plays fizzles (dice spent,
 *              no effect), consuming 1 stack; also ticks down 1 per turn.
 *  - entangle: locks that many dice from being rerolled. Ticks down 1 per turn.
 *  - weaken:   outgoing damage reduced while > 0. Ticks down 1 per turn.
 *  - block:    absorbs incoming damage; cleared at the start of the owner's turn.
 */
export type Status = "poison" | "silence" | "entangle" | "weaken" | "block";

export type Statuses = Partial<Record<Status, number>>;

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

/** A die definition: an ordered list of exactly 6 faces. */
export interface DieDef {
  id: string;
  name: string;
  faces: [Symbol, Symbol, Symbol, Symbol, Symbol, Symbol];
}

/** A die instance in play. `face` indexes into its def's `faces`. */
export interface Die {
  defId: string;
  face: number;
  /** Kept across rerolls (the owner toggles this). */
  held: boolean;
  /** Consumed by a card this turn; can't pay for another card until reset. */
  spent: boolean;
  /** Locked by the Entangle status this turn (implies held + spent). Tracked
   *  separately so the UI can show "webbed" distinctly from "I spent this". */
  entangled: boolean;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/**
 * What a card demands from the current dice pool.
 *  - `{ kind: "symbols" }`  needs `count` unspent dice showing `symbol`.
 *  - `{ kind: "pairs" }`    needs `count` disjoint pairs (two dice sharing a
 *                           symbol); the two pairs may be different symbols, as
 *                           in the reference art's Tangling / Physic Guidance.
 */
export type Requirement =
  | { kind: "symbols"; symbol: Symbol; count: number }
  | { kind: "pairs"; count: number };

/** A single effect a card (or passive) applies. `target` is relative to the
 *  actor performing it: `self` = the actor, `enemy` = the actor's opponent.
 *  Damage may be fixed (min === max) or a seeded range ("Deal 2-6 Damage"). */
export type Effect =
  | { kind: "damage"; target: Target; min: number; max: number }
  | { kind: "block"; target: Target; amount: number }
  | { kind: "status"; target: Target; status: Status; stacks: number }
  | { kind: "randomDebuff"; target: Target; times: number };

export type Target = "self" | "enemy";

export interface CardDef {
  id: string;
  name: string;
  /** Drives UI color; also a loose "school" tag. */
  element: Symbol | "special";
  requirement: Requirement;
  effects: Effect[];
  /** Human-readable summary shown on the card face. */
  text: string;
}

// ---------------------------------------------------------------------------
// Passives (relics)
// ---------------------------------------------------------------------------

/**
 * Always-on modifiers owned by an actor. The reference's "Poisonous Eyeball"
 * (inflict Poison on the opponent at the start of the opponent's turn) is one
 * of these. Kept as a small tagged union so hooks in game.ts stay exhaustive.
 */
export type Passive = {
  id: string;
  name: string;
  /** Human-readable summary shown when inspecting the relic. */
  text: string;
  /** Trigger: when the opponent's turn begins, apply `effect` (from this
   *  actor's frame of reference — so `target: "enemy"` hits the opponent). */
  when: "opponentTurnStart";
  effect: Effect;
};

// ---------------------------------------------------------------------------
// Actor (player or enemy)
// ---------------------------------------------------------------------------

export interface Actor {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  statuses: Statuses;
  dice: Die[];
  /** Card ids this actor can play. */
  hand: string[];
  /** Rerolls left in the current turn (the initial roll doesn't count). */
  actionsRemaining: number;
  passives: Passive[];
}

/**
 * Static, serializable starting kit for a player or enemy — the shape a
 * content editor reads/writes. `makeEnemy`/`makePlayer` in
 * `content/enemies.ts` / `content/player.ts` hydrate this into a live
 * `Actor` (fresh `statuses`, rolled `dice`, resolved `passives`). Kept
 * separate from `Actor` because `Actor` carries per-run state (current hp,
 * dice faces, statuses) that has no business in a content file.
 */
export interface ActorDef {
  id: string;
  name: string;
  hp: number;
  /** Die-def ids (from DICE) rolled fresh into `Die[]` each turn. */
  diceIds: string[];
  /** Card ids (from CARDS) this actor can play. */
  handIds: string[];
  /** Passive ids (from PASSIVES), always-on relics. */
  passiveIds: string[];
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/**
 * "won" is single-encounter mode's terminal state (`newGame`, `run.enabled ===
 * false`). Multi-fight runs (`newRun`) never reach a win phase — they cycle
 * enemies forever via `pickDraftCard`'s endless phase until the player dies.
 */
export type Phase = "playerTurn" | "enemyTurn" | "draft" | "won" | "lost";

/** Multi-fight run metadata. Single-encounter mode sets `enabled: false`. */
export interface RunProgress {
  enabled: boolean;
  /** Zero-based index of the current fight (0 = fight 1). */
  fightIndex: number;
  /** Two reward cards offered after a fight win; null outside draft. */
  draftOffers: [string, string] | null;
  /** Relic from the enemy just defeated; applied when a draft card is picked. */
  pendingRelic: Passive | null;
}

export interface GameState {
  seed: number | string;
  rng: Rng;
  turn: number;
  phase: Phase;
  player: Actor;
  enemy: Actor;
  run: RunProgress;
  /** Human-readable event log, newest last. */
  log: string[];
}

/** Which side an actor reference is. Used to resolve `Target` -> concrete actor. */
export type Side = "player" | "enemy";

/** What produced a given beat of an animated turn resolution — lets the UI
 *  highlight, e.g. the enemy card being played. */
export type BeatAction =
  | { kind: "enemyStart" } // enemy turn begins and rolls
  | { kind: "reroll" } // enemy rerolled toward a playable hand
  | { kind: "play"; cardId: string } // enemy played a card
  | { kind: "idle" } // enemy found no affordable move
  | { kind: "resolve" }; // back to the player (or game over)

/** One beat of an animated turn: a board snapshot plus what caused it. */
export interface TurnBeat {
  state: GameState;
  action: BeatAction;
}
