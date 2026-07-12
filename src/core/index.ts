/** Public surface of the pure game core. No rendering deps live below this. */
export * from "./types";
export * from "./rng";
export * from "./dice";
export * from "./game";
export {
  CARDS,
  DICE,
  RANDOM_DEBUFFS,
  REROLLS_PER_TURN,
  MAX_CARDS_PER_TURN,
  makePlayer,
  makeSpider,
} from "./content";
