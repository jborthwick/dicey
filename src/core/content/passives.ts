import type { Passive } from "../types";

export const PASSIVES: Record<string, Passive> = {
  "tough-cap": {
    id: "tough-cap",
    name: "Tough Cap",
    text: "Gain 1 Block at the start of the opponent's turn.",
    when: "opponentTurnStart",
    effect: { kind: "block", target: "self", amount: 1 },
  },
  "pollen-cloud": {
    id: "pollen-cloud",
    name: "Pollen Cloud",
    text: "Inflict 1 Poison at the start of the opponent's turn.",
    when: "opponentTurnStart",
    effect: { kind: "status", target: "enemy", status: "poison", stacks: 1 },
  },
  "sonic-screech": {
    id: "sonic-screech",
    name: "Sonic Screech",
    text: "Inflict 1 Weaken at the start of the opponent's turn.",
    when: "opponentTurnStart",
    effect: { kind: "status", target: "enemy", status: "weaken", stacks: 1 },
  },
  // The reference's relic: at the start of the opponent's turn, poison them.
  "poisonous-eyeball": {
    id: "poisonous-eyeball",
    name: "Poisonous Eyeball",
    text: "Inflict 2 Poison at the start of the opponent's turn.",
    when: "opponentTurnStart",
    effect: { kind: "status", target: "enemy", status: "poison", stacks: 2 },
  },
  "rocky-hide": {
    id: "rocky-hide",
    name: "Rocky Hide",
    text: "Gain 2 Block at the start of the opponent's turn.",
    when: "opponentTurnStart",
    effect: { kind: "block", target: "self", amount: 2 },
  },
};

export function getPassive(id: string): Passive {
  const p = PASSIVES[id];
  if (!p) throw new Error(`Unknown passive: ${id}`);
  return p;
}
