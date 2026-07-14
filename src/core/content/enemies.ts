import type { Actor, ActorDef } from "../types";
import { hydrateActor } from "./hydrate";

export const ENEMIES: Record<string, ActorDef> = {
  mushroom: {
    id: "mushroom",
    name: "Spore Mushroom",
    hp: 40,
    diceIds: ["stone", "tide", "gale", "spark", "gale"],
    handIds: ["nibble", "pebble-toss"],
    passiveIds: ["tough-cap"],
  },
  "bloom-sprite": {
    id: "bloom-sprite",
    name: "Bloom Sprite",
    hp: 55,
    diceIds: ["tide", "web", "tide", "stone", "spark"],
    handIds: ["splash", "drip"],
    passiveIds: ["pollen-cloud"],
  },
  bat: {
    id: "bat",
    name: "Cave Bat",
    hp: 50,
    diceIds: ["gale", "gale", "spark", "prism", "gale"],
    handIds: ["breeze", "mewl"],
    passiveIds: ["sonic-screech"],
  },
  // poisonous-spider has no sprite yet (still just a .gitkeep), so it's
  // deliberately left out of ENDLESS_ENEMY_IDS below — add it once it has art.
  "poisonous-spider": {
    id: "poisonous-spider",
    name: "Poisonous Spider",
    hp: 102,
    diceIds: ["fang", "web", "fang", "stone", "web"],
    handIds: ["bite", "web-shot", "venom-spit", "skitter"],
    passiveIds: ["poisonous-eyeball"],
  },
  "golem-blue": {
    id: "golem-blue",
    name: "Blue Golem",
    hp: 75,
    diceIds: ["stone", "stone", "tide", "gale", "spark"],
    handIds: ["boulder-slam", "stone-guard"],
    passiveIds: ["rocky-hide"],
  },
  "golem-orange": {
    id: "golem-orange",
    name: "Orange Golem",
    hp: 70,
    diceIds: ["stone", "stone", "gale", "spark", "prism"],
    handIds: ["boulder-slam", "magma-punch"],
    passiveIds: ["rocky-hide"],
  },
  skeleton: {
    id: "skeleton",
    name: "Skeleton",
    hp: 35,
    diceIds: ["stone", "tide", "gale", "gale", "spark"],
    handIds: ["claw-swipe", "bone-rattle"],
    passiveIds: ["tough-cap"],
  },
  "skeleton-sword": {
    id: "skeleton-sword",
    name: "Skeleton Warrior",
    hp: 45,
    diceIds: ["stone", "stone", "tide", "gale", "spark"],
    handIds: ["sword-slash", "bone-rattle"],
    passiveIds: ["tough-cap"],
  },
  "rat-white": {
    id: "rat-white",
    name: "White Rat",
    hp: 25,
    diceIds: ["gale", "gale", "tide", "spark", "stone"],
    handIds: ["gnaw", "scurry-bite"],
    passiveIds: ["filthy-bite"],
  },
  "flying-demon": {
    id: "flying-demon",
    name: "Flying Demon",
    hp: 60,
    diceIds: ["gale", "gale", "spark", "prism", "tide"],
    handIds: ["demon-claw", "dark-pact"],
    passiveIds: ["sonic-screech"],
  },
  knight: {
    id: "knight",
    name: "Knight",
    hp: 80,
    diceIds: ["stone", "stone", "stone", "tide", "spark"],
    handIds: ["shield-bash", "heavy-slash"],
    passiveIds: ["battle-stance"],
  },
  "kobold-warrior": {
    id: "kobold-warrior",
    name: "Kobold Warrior",
    hp: 30,
    diceIds: ["stone", "tide", "gale", "gale", "spark"],
    handIds: ["rusty-shank", "warcry"],
    passiveIds: ["tough-cap"],
  },
};

/**
 * Every enemy with a real sprite — eligible for random selection for every
 * fight of a run (see `newRun`/`pickDraftCard` in game.ts). Deliberately
 * explicit (not derived from `ENEMIES`) so a newly-added-but-not-yet-sprited
 * enemy (like `poisonous-spider`) never gets picked and hits the missing-
 * sprite placeholder mid-run. Add an id here once its sprite is committed.
 */
export const ENDLESS_ENEMY_IDS = [
  "mushroom",
  "bloom-sprite",
  "bat",
  "golem-blue",
  "golem-orange",
  "skeleton",
  "skeleton-sword",
  "rat-white",
  "flying-demon",
  "knight",
  "kobold-warrior",
] as const;

/** Low-HP, onboarding-friendly enemies — fight 1 of a run draws from here. */
export const STARTER_ENEMY_IDS = ["rat-white", "skeleton", "kobold-warrior"] as const;

export function makeEnemy(id: string): Actor {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return hydrateActor(def);
}

/** @deprecated Prefer makeEnemy("poisonous-spider") — kept for tests/imports. */
export function makeSpider(): Actor {
  return makeEnemy("poisonous-spider");
}
