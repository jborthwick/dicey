import type { DieDef, Symbol } from "../types";

/**
 * Die-face definitions, keyed by id. Distinct from `../dice.ts`, which holds
 * the pure symbol-matching/requirement logic that operates on rolled `Die[]`
 * instances — this file is just the static data (what faces each die shows).
 */

const f = (a: Symbol, b: Symbol, c: Symbol, d: Symbol, e: Symbol, g: Symbol) =>
  [a, b, c, d, e, g] as DieDef["faces"];

export const DICE: Record<string, DieDef> = {
  gale: { id: "gale", name: "Gale Die", faces: f("wind", "wind", "light", "water", "earth", "blank") },
  spark: { id: "spark", name: "Spark Die", faces: f("light", "light", "wind", "water", "earth", "blank") },
  tide: { id: "tide", name: "Tide Die", faces: f("water", "water", "wind", "light", "earth", "blank") },
  stone: { id: "stone", name: "Stone Die", faces: f("earth", "earth", "wind", "light", "water", "blank") },
  prism: { id: "prism", name: "Prism Die", faces: f("wind", "light", "water", "earth", "wind", "light") },
  // Spider-flavored dice: heavy on earth/water, more blanks (worse pool).
  fang: { id: "fang", name: "Fang Die", faces: f("earth", "earth", "water", "wind", "blank", "blank") },
  web: { id: "web", name: "Web Die", faces: f("water", "water", "earth", "light", "blank", "blank") },
};

export function getDie(id: string): DieDef {
  const d = DICE[id];
  if (!d) throw new Error(`Unknown die: ${id}`);
  return d;
}
