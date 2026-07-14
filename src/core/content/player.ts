import type { Actor, ActorDef } from "../types";
import type { Rng } from "../rng";
import { pick } from "../rng";
import { BASIC_CARD_IDS } from "./cards";
import { hydrateActor } from "./hydrate";

export const PLAYER_DEF: ActorDef = {
  id: "player",
  name: "Elementalist",
  hp: 86,
  diceIds: ["gale", "spark", "tide", "prism", "gale"],
  handIds: [BASIC_CARD_IDS[0], BASIC_CARD_IDS[1]],
  passiveIds: [],
};

/** Hydrate the player with a 2-card starting hand drawn from the basic pool. */
export function makePlayer(rng: Rng): [Actor, Rng] {
  const [first, rng1] = pick(rng, BASIC_CARD_IDS);
  const rest = BASIC_CARD_IDS.filter((id) => id !== first);
  const [second, rng2] = pick(rng1, rest);
  const actor = hydrateActor({ ...PLAYER_DEF, handIds: [first, second] });
  return [actor, rng2];
}
