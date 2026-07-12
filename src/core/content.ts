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
// Card pools (run progression — draft/relic flow not wired yet)
// ---------------------------------------------------------------------------

/** Two cheap single-symbol cards the player starts every run with. */
export const STARTER_CARD_IDS = ["expel", "ice-cone"] as const;

/** Cards offered after defeating enemies (pick 1 of 2 — not implemented yet). */
export const REWARD_CARD_IDS = [
  "lick",
  "tangling",
  "blind-attack",
  "physic-guidance",
  "spark-bolt",
  "tide-shield",
  "twin-slash",
  "venom-touch",
  "hush",
  "gust-slap",
] as const;

/** Early enemy order for runs. Fight 1 defaults to dust-mite. */
export const STARTER_ENEMY_IDS = [
  "dust-mite",
  "puddle-slime",
  "gust-pixie",
  "poisonous-spider",
] as const;

export type StarterEnemyId = (typeof STARTER_ENEMY_IDS)[number];

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
  // --- Player starter / reward cards ---
  {
    id: "expel",
    name: "Expel",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 6 }],
    text: "Deal 2-6 damage.",
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
  {
    id: "spark-bolt",
    name: "Spark Bolt",
    element: "light",
    requirement: { kind: "symbols", symbol: "light", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 4 }],
    text: "Deal 4 damage.",
  },
  {
    id: "tide-shield",
    name: "Tide Shield",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 4 }],
    text: "Gain 4 Block.",
  },
  {
    id: "twin-slash",
    name: "Twin Slash",
    element: "wind",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 5 }],
    text: "Deal 4-5 damage.",
  },
  {
    id: "venom-touch",
    name: "Venom Touch",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 2, max: 2 },
      { kind: "status", target: "enemy", status: "poison", stacks: 1 },
    ],
    text: "Deal 2 damage. Inflict 1 Poison.",
  },
  {
    id: "hush",
    name: "Hush",
    element: "light",
    requirement: { kind: "symbols", symbol: "light", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 2, max: 2 },
      { kind: "status", target: "enemy", status: "silence", stacks: 1 },
    ],
    text: "Deal 2 damage. Silence 1.",
  },
  {
    id: "gust-slap",
    name: "Gust Slap",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 4 }],
    text: "Deal 4 damage.",
  },

  // --- Shared weak enemy cards ---
  {
    id: "nibble",
    name: "Nibble",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 4 }],
    text: "Deal 2-4 damage.",
  },
  {
    id: "pebble-toss",
    name: "Pebble Toss",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 3 }],
    text: "Deal 3 damage.",
  },
  {
    id: "splash",
    name: "Splash",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 3 }],
    text: "Deal 2-3 damage.",
  },
  {
    id: "drip",
    name: "Drip",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 1, max: 1 },
      { kind: "status", target: "enemy", status: "poison", stacks: 1 },
    ],
    text: "Deal 1 damage. Inflict 1 Poison.",
  },
  {
    id: "breeze",
    name: "Breeze",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 4 }],
    text: "Deal 2-4 damage.",
  },
  {
    id: "mewl",
    name: "Mewl",
    element: "special",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 2 }],
    text: "Gain 2 Block.",
  },

  // --- Spider cards ---
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

const DUST_SHELL: Passive = {
  id: "dust-shell",
  name: "Dust Shell",
  text: "Gain 1 Block at the start of the opponent's turn.",
  when: "opponentTurnStart",
  effect: { kind: "block", target: "self", amount: 1 },
};

const SLIMY_COATING: Passive = {
  id: "slimy-coating",
  name: "Slimy Coating",
  text: "Inflict 1 Poison at the start of the opponent's turn.",
  when: "opponentTurnStart",
  effect: { kind: "status", target: "enemy", status: "poison", stacks: 1 },
};

const GUST_WISP: Passive = {
  id: "gust-wisp",
  name: "Gust Wisp",
  text: "Inflict 1 Weaken at the start of the opponent's turn.",
  when: "opponentTurnStart",
  effect: { kind: "status", target: "enemy", status: "weaken", stacks: 1 },
};

/** The reference's relic: at the start of the opponent's turn, poison them. */
const POISONOUS_EYEBALL: Passive = {
  id: "poisonous-eyeball",
  name: "Poisonous Eyeball",
  text: "Inflict 2 Poison at the start of the opponent's turn.",
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
    hand: [...STARTER_CARD_IDS],
    rollsRemaining: REROLLS_PER_TURN,
    passives: [],
  };
}

export function makeEnemy(id: StarterEnemyId | string): Actor {
  switch (id) {
    case "dust-mite":
      return {
        id: "dust-mite",
        name: "Dust Mite",
        hp: 40,
        maxHp: 40,
        statuses: {},
        dice: makeDice(["stone", "tide", "gale", "spark", "gale"]),
        hand: ["nibble", "pebble-toss"],
        rollsRemaining: REROLLS_PER_TURN,
        passives: [DUST_SHELL],
      };
    case "puddle-slime":
      return {
        id: "puddle-slime",
        name: "Puddle Slime",
        hp: 55,
        maxHp: 55,
        statuses: {},
        dice: makeDice(["tide", "web", "tide", "stone", "spark"]),
        hand: ["splash", "drip"],
        rollsRemaining: REROLLS_PER_TURN,
        passives: [SLIMY_COATING],
      };
    case "gust-pixie":
      return {
        id: "gust-pixie",
        name: "Gust Pixie",
        hp: 50,
        maxHp: 50,
        statuses: {},
        dice: makeDice(["gale", "gale", "spark", "prism", "gale"]),
        hand: ["breeze", "mewl"],
        rollsRemaining: REROLLS_PER_TURN,
        passives: [GUST_WISP],
      };
    case "poisonous-spider":
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
    default:
      throw new Error(`Unknown enemy: ${id}`);
  }
}

/** @deprecated Prefer makeEnemy("poisonous-spider") — kept for tests/imports. */
export function makeSpider(): Actor {
  return makeEnemy("poisonous-spider");
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
