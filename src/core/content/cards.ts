import type { CardDef } from "../types";

export const CARDS: Record<string, CardDef> = {
  // --- Player starter / reward cards ---
  expel: {
    id: "expel",
    name: "Expel",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 6 }],
    text: "Deal 2-6 damage.",
  },
  "ice-cone": {
    id: "ice-cone",
    name: "Ice Cone",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 3 }],
    text: "Deal 3 damage.",
  },
  lick: {
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
  tangling: {
    id: "tangling",
    name: "Tangling",
    element: "wind",
    requirement: { kind: "pairs", count: 2 },
    effects: [{ kind: "status", target: "enemy", status: "entangle", stacks: 3 }],
    text: "Inflict 3 Entangle.",
  },
  "blind-attack": {
    id: "blind-attack",
    name: "Blind Attack",
    element: "wind",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 6 }],
    text: "Deal 2-6 damage.",
  },
  "physic-guidance": {
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
  "spark-bolt": {
    id: "spark-bolt",
    name: "Spark Bolt",
    element: "light",
    requirement: { kind: "symbols", symbol: "light", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 4 }],
    text: "Deal 4 damage.",
  },
  "tide-shield": {
    id: "tide-shield",
    name: "Tide Shield",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 4 }],
    text: "Gain 4 Block.",
  },
  "twin-slash": {
    id: "twin-slash",
    name: "Twin Slash",
    element: "wind",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 5 }],
    text: "Deal 4-5 damage.",
  },
  "venom-touch": {
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
  hush: {
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
  "gust-slap": {
    id: "gust-slap",
    name: "Gust Slap",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 4 }],
    text: "Deal 4 damage.",
  },

  // --- Shared weak enemy cards ---
  nibble: {
    id: "nibble",
    name: "Nibble",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 4 }],
    text: "Deal 2-4 damage.",
  },
  "pebble-toss": {
    id: "pebble-toss",
    name: "Pebble Toss",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 3 }],
    text: "Deal 3 damage.",
  },
  splash: {
    id: "splash",
    name: "Splash",
    element: "water",
    requirement: { kind: "symbols", symbol: "water", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 3 }],
    text: "Deal 2-3 damage.",
  },
  drip: {
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
  breeze: {
    id: "breeze",
    name: "Breeze",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 4 }],
    text: "Deal 2-4 damage.",
  },
  mewl: {
    id: "mewl",
    name: "Mewl",
    element: "special",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 2 }],
    text: "Gain 2 Block.",
  },

  // --- Spider cards ---
  bite: {
    id: "bite",
    name: "Bite",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 5, max: 8 }],
    text: "Deal 5-8 damage.",
  },
  "web-shot": {
    id: "web-shot",
    name: "Web Shot",
    element: "water",
    requirement: { kind: "pairs", count: 1 },
    effects: [{ kind: "status", target: "enemy", status: "entangle", stacks: 2 }],
    text: "Inflict 2 Entangle.",
  },
  "venom-spit": {
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
  skitter: {
    id: "skitter",
    name: "Skitter",
    element: "special",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 4 }],
    text: "Gain 4 Block.",
  },

  // --- Golem cards ---
  "boulder-slam": {
    id: "boulder-slam",
    name: "Boulder Slam",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 5, max: 7 }],
    text: "Deal 5-7 damage.",
  },
  "stone-guard": {
    id: "stone-guard",
    name: "Stone Guard",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "block", target: "self", amount: 5 }],
    text: "Gain 5 Block.",
  },
  "magma-punch": {
    id: "magma-punch",
    name: "Magma Punch",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 6, max: 9 }],
    text: "Deal 6-9 damage.",
  },

  // --- Skeleton cards ---
  "claw-swipe": {
    id: "claw-swipe",
    name: "Claw Swipe",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 5 }],
    text: "Deal 3-5 damage.",
  },
  "bone-rattle": {
    id: "bone-rattle",
    name: "Bone Rattle",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "status", target: "enemy", status: "silence", stacks: 1 }],
    text: "Silence 1.",
  },
  "sword-slash": {
    id: "sword-slash",
    name: "Sword Slash",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 4, max: 6 }],
    text: "Deal 4-6 damage.",
  },

  // --- Rat cards ---
  gnaw: {
    id: "gnaw",
    name: "Gnaw",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 2, max: 3 }],
    text: "Deal 2-3 damage.",
  },
  "scurry-bite": {
    id: "scurry-bite",
    name: "Scurry Bite",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 1, max: 2 },
      { kind: "status", target: "enemy", status: "poison", stacks: 1 },
    ],
    text: "Deal 1-2 damage. Inflict 1 Poison.",
  },

  // --- Flying Demon cards ---
  "demon-claw": {
    id: "demon-claw",
    name: "Demon Claw",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 5, max: 7 }],
    text: "Deal 5-7 damage.",
  },
  "dark-pact": {
    id: "dark-pact",
    name: "Dark Pact",
    element: "wind",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 2, max: 3 },
      { kind: "status", target: "enemy", status: "weaken", stacks: 1 },
    ],
    text: "Deal 2-3 damage. Weaken 1.",
  },

  // --- Knight cards ---
  "shield-bash": {
    id: "shield-bash",
    name: "Shield Bash",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [
      { kind: "damage", target: "enemy", min: 3, max: 4 },
      { kind: "block", target: "self", amount: 3 },
    ],
    text: "Deal 3-4 damage. Gain 3 Block.",
  },
  "heavy-slash": {
    id: "heavy-slash",
    name: "Heavy Slash",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 6, max: 8 }],
    text: "Deal 6-8 damage.",
  },

  // --- Kobold Warrior cards ---
  "rusty-shank": {
    id: "rusty-shank",
    name: "Rusty Shank",
    element: "earth",
    requirement: { kind: "symbols", symbol: "earth", count: 1 },
    effects: [{ kind: "damage", target: "enemy", min: 3, max: 4 }],
    text: "Deal 3-4 damage.",
  },
  warcry: {
    id: "warcry",
    name: "Warcry",
    element: "special",
    requirement: { kind: "symbols", symbol: "wind", count: 1 },
    effects: [{ kind: "status", target: "enemy", status: "weaken", stacks: 1 }],
    text: "Weaken 1.",
  },
};

export function getCard(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

/** Two cheap single-symbol cards the player starts every run with. */
export const STARTER_CARD_IDS = ["expel", "ice-cone"] as const;

/** Cards offered after defeating enemies (pick 1 of 2). */
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

/** Debuffs that "Inflict a random debuff" can roll. */
export const RANDOM_DEBUFFS = ["poison", "silence", "entangle", "weaken"] as const;
