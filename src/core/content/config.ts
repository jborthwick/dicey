import type { Status } from "../types";

/** Actions (reroll or block) allowed per turn, after the free initial roll. */
export const ACTIONS_PER_TURN = 3;

/** Shield granted by spending an action on Block. */
export const BLOCK_ACTION_AMOUNT = 4;

/** Safety cap on how many cards one actor may play in a single turn. */
export const MAX_CARDS_PER_TURN = 6;

/** HP restored by healing instead of drafting a reward card after a win. */
export const DRAFT_HEAL_AMOUNT = 10;

/**
 * Optional per-status stack caps, so a repeatedly-applied debuff can't run away.
 * Entangle is capped so the spider's Web Shot can't stack until your whole pool
 * is locked; combined with the "never lock your last die" guard in game.ts, you
 * always keep usable dice. Silence is capped at 1 (matching Bone Rattle's own
 * "Silence 1" text) for the same reason: the skeleton has ~2/3 odds of a
 * wind-showing die most turns, so it recasts Bone Rattle often enough that
 * stacking silence — even capped at 2 — kept canPlayCard() locked out for the
 * large majority of the fight (verified via a headless sim: cap 2 won 6/10
 * seeds with up to 91% of turns stuck; cap 1 won 8/10 with a worse case of
 * 63%). Capping at 1 doesn't fully eliminate the lock (Bone Rattle can still
 * land turn after turn), but it caps each application back down to a single
 * lost turn instead of letting repeat casts extend it further. (Poison is
 * intentionally uncapped for now — it's the spider's win condition; revisit
 * during balance.)
 */
export const STATUS_CAPS: Partial<Record<Status, number>> = {
  entangle: 2,
  silence: 1,
};
