import type { Status } from "../types";

/** Rerolls allowed per turn after the free initial roll. */
export const REROLLS_PER_TURN = 2;

/** Safety cap on how many cards one actor may play in a single turn. */
export const MAX_CARDS_PER_TURN = 6;

/**
 * Optional per-status stack caps, so a repeatedly-applied debuff can't run away.
 * Entangle is capped so the spider's Web Shot can't stack until your whole pool
 * is locked; combined with the "never lock your last die" guard in game.ts, you
 * always keep usable dice. (Poison is intentionally uncapped for now — it's the
 * spider's win condition; revisit during balance.)
 */
export const STATUS_CAPS: Partial<Record<Status, number>> = {
  entangle: 2,
};
