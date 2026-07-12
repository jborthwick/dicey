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
  "poisonous-spider": {
    id: "poisonous-spider",
    name: "Poisonous Spider",
    hp: 102,
    diceIds: ["fang", "web", "fang", "stone", "web"],
    handIds: ["bite", "web-shot", "venom-spit", "skitter"],
    passiveIds: ["poisonous-eyeball"],
  },
};

/** Early enemy order for runs. Fight 1 defaults to mushroom. */
export const STARTER_ENEMY_IDS = [
  "mushroom",
  "bloom-sprite",
  "bat",
  "poisonous-spider",
] as const;

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
