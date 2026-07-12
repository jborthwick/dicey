import type { Actor, CardDef, DieDef, Passive, Status, Symbol } from "./types";

/**
 * Concrete game content. This is the data layer — tweak numbers here to balance;
 * the rules in `game.ts` stay untouched. Everything is keyed by id and looked up
 * through the maps at the bottom.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Rerolls allowed per turn after the free initial roll. */
export const REROLLS_PER_TURN = 2;

/** Safety cap on how many cards one actor may play in a single turn. */
export const MAX_CARDS_PER_TURN = 6;

/**
 * Optional per-status stack caps, so a repeatedly-applied debuff can't run away.
 * Entangle is capped so the spider's Web Shot can't stack until your whole pool
 * is locked; combined with the "never lock your last die" guard in game.ts, you
 * always keep usable dice. (Poison is intentionally uncapped for now — it's the
 * spider's win condition; revisit during balance.)
 */
export const STATUS_CAPS: Partial<Record<Status, number>> = {
  entangle: 2,
};

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

const f = (a: Symbol, b: Symbol, c: Symbol, d: Symbol, e: Symbol, g: Symbol) =>
  [a, b, c, d, e, g] as DieDef["faces"];

export const DICE: DieDef[] = [
  { id: "gale", name: "Gale Die", faces: f("wind", "wind", "light", "water", "earth", "blank") },
  { id: "spark", name: "Spark Die", faces: f("light", "light", "wind", "water", "earth", "blank") },
  { id: "tide", name: "Tide Die", faces: f("water", "water", "wind", "light", "earth", "blank") },
  { id: "stone", name: "Stone Die", faces: f("earth", "earth", "wind", "light", "water", "blank") },
  { id: "prism", name: "Prism Die", faces: f("wind", "light", "water", "earth", "wind", "light") },
  // Spider-flavored dice: heavy on earth/water, more blanks (worse pool).
  { id: "fang", name: "Fang Die", faces: f("earth", "earth", "water", "wind", "blank", "blank") },
  { id: "web", name: "Web Die", faces: f("water", "water", "earth", "light", "blank", "blank") },
];

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export const CARDS: CardDef[] = [
  // --- Player cards (from the reference layout) ---
  {
    id: "expel",
    name: "Expel",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 6 }],
    text: "Deal 2-6 damage.",
  },
  {
    id: "lick",
    name: "Lick",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 3, max: 3 },
      { kind: "status", target: "enemy", status: "weaken", stacks: 1 },
    ],
    text: "Deal 3 damage. Weaken 1.",
  },
  {
    id: "ice-cone",
    name: "Ice Cone",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 3 }],
    text: "Deal 3 damage.",
  },
  {
    id: "tangling",
    name: "Tangling",
    element: "wind",
    requirement: { kind: "pairs", count: 2 },
    effects: [{ kind: "status", target: "enemy", status: "entangle", stacks: 3 }],
    text: "Inflict 3 Entangle.",
  },
  {
    id: "blind-attack",
    name: "Blind Attack",
    element: "wind",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 6 }],
    text: "Deal 2-6 damage.",
  },
  {
    id: "physic-guidance",
    name: "Physic Guidance",
    element: "special",
    requirement: { kind: "pairs", count: 2 },
    effects: [
      { kind: "damage", target: "enemy", min: 8, max: 8 },
      { kind: "randomDebuff", target: "enemy", times: 1 },
    ],
    text: "Deal 8 damage. Inflict a random debuff.",
  },

  // --- Enemy cards ---
  {
    id: "bite",
    name: "Bite",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 5, max: 8 }],
    text: "Deal 5-8 damage.",
  },
  {
    id: "web-shot",
    name: "Web Shot",
    element: "water",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "status", target: "enemy", status: "entangle", stacks: 2 }],
    text: "Inflict 2 Entangle.",
  },
  {
    id: "venom-spit",
    name: "Venom Spit",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 3, max: 3 },
      { kind: "status", target: "enemy", status: "poison", stacks: 2 },
    ],
    text: "Deal 3 damage. Inflict 2 Poison.",
  },
  {
    id: "skitter",
    name: "Skitter",
    element: "special",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 4 }],
    text: "Gain 4 Block.",
  },
];

/** Debuffs that "Inflict a random debuff" can roll. */
export const RANDOM_DEBUFFS = ["poison", "silence", "entangle", "weaken"] as const;

// ---------------------------------------------------------------------------
// Passives (relics)
// ---------------------------------------------------------------------------

/** The reference's relic: at the start of the opponent's turn, poison them. */
const POISONOUS_EYEBALL: Passive = {
  id: "poisonous-eyeball",
  name: "Poisonous Eyeball",
  when: "opponentTurnStart",
  effect: { kind: "status", target: "enemy", status: "poison", stacks: 2 },
};

// ---------------------------------------------------------------------------
// Actor factories
// ---------------------------------------------------------------------------

/** Turn a list of die-def ids into fresh, unrolled dice. */
function makeDice(defIds: string[]): Actor["dice"] {
  return defIds.map((defId) => ({
    defId,
    face: 0,
    held: false,
    spent: false,
    entangled: false,
  }));
}

export function makePlayer(): Actor {
  return {
    id: "player",
    name: "Elementalist",
    hp: 86,
    maxHp: 86,
    statuses: {},
    dice: makeDice(["gale", "spark", "tide", "prism", "gale"]),
    hand: ["expel", "lick", "ice-cone", "tangling", "blind-attack", "physic-guidance"],
    rollsRemaining: REROLLS_PER_TURN,
    passives: [],
  };
}

export function makeSpider(): Actor {
  return {
    id: "poisonous-spider",
    name: "Poisonous Spider",
    hp: 102,
    maxHp: 102,
    statuses: {},
    dice: makeDice(["fang", "web", "fang", "stone", "web"]),
    hand: ["bite", "web-shot", "venom-spit", "skitter"],
    rollsRemaining: REROLLS_PER_TURN,
    passives: [POISONOUS_EYEBALL],
  };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const DIE_BY_ID = new Map(DICE.map((d) => [d.id, d]));
export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getDie(id: string): DieDef {
  const d = DIE_BY_ID.get(id);
  if (!d) throw new Error(`Unknown die: ${id}`);
  return d;
}

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}
