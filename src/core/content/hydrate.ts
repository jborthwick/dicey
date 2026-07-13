import type { Actor, ActorDef } from "../types";
import { ACTIONS_PER_TURN } from "./config";
import { getPassive } from "./passives";

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

/**
 * Hydrate a static `ActorDef` into a fresh, per-run `Actor`: rolled dice,
 * empty statuses, resolved passive objects. Shared by `makeEnemy()`
 * (content/enemies.ts) and `makePlayer()` (content/player.ts) — the only
 * difference between a player and an enemy is which def they hydrate.
 */
export function hydrateActor(def: ActorDef): Actor {
  return {
    id: def.id,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    statuses: {},
    dice: makeDice(def.diceIds),
    hand: [...def.handIds],
    actionsRemaining: ACTIONS_PER_TURN,
    passives: def.passiveIds.map(getPassive),
  };
}
