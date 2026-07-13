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
  // Not in STARTER_ENEMY_IDS — available (makeEnemy/newGame/headless) but not
  // part of the default run. Add an id here to STARTER_ENEMY_IDS to wire one
  // into the main rotation. poisonous-spider specifically has no sprite yet
  // (public/assets/enemies/poisonous-spider/ is still just a .gitkeep).
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

/** Early enemy order for runs. Fight 1 defaults to mushroom. */
export const STARTER_ENEMY_IDS = ["mushroom", "bloom-sprite", "bat"] as const;

export type StarterEnemyId = (typeof STARTER_ENEMY_IDS)[number];

export function makeEnemy(id: StarterEnemyId | string): Actor {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return hydrateActor(def);
}

/** @deprecated Prefer makeEnemy("poisonous-spider") — kept for tests/imports. */
export function makeSpider(): Actor {
  return makeEnemy("poisonous-spider");
}
