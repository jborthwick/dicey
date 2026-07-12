/**
 * Concrete game content, split by domain. This is the data layer — tweak
 * numbers/defs here to balance; the rules in `../game.ts` stay untouched.
 *
 * `ENEMIES`/`PLAYER_DEF`/`CARDS`/`DICE`/`PASSIVES` are all flat
 * `Record<id, Def>` objects of plain, serializable data (no functions, no
 * runtime state) — deliberately, so a future dev tool can read and
 * regenerate any one of these files wholesale (à la kobold's TilePicker)
 * without needing to parse a switch-statement. `makeEnemy`/`makePlayer` are
 * the only place static defs turn into a live, per-run `Actor` — see
 * `hydrate.ts`.
 */
export * from "./config";
export * from "./dice";
export * from "./cards";
export * from "./passives";
export * from "./enemies";
export * from "./player";
export * from "./hydrate";
