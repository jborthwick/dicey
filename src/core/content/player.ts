import type { Actor, ActorDef } from "../types";
import { STARTER_CARD_IDS } from "./cards";
import { hydrateActor } from "./hydrate";

export const PLAYER_DEF: ActorDef = {
  id: "player",
  name: "Elementalist",
  hp: 86,
  diceIds: ["gale", "spark", "tide", "prism", "gale"],
  handIds: [...STARTER_CARD_IDS],
  passiveIds: [],
};

export function makePlayer(): Actor {
  return hydrateActor(PLAYER_DEF);
}
