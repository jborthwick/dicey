import { getDie } from "./content";
import type { Die, Requirement, Symbol } from "./types";

/** The symbol a die currently shows. */
export function symbolOf(die: Die): Symbol {
  return getDie(die.defId).faces[die.face]!;
}

/** Dice that are available to pay for a card: not held-aside... actually held
 *  dice are still payable; only `spent` dice (already used this turn) and blanks
 *  are excluded. Returns indices into the pool. */
export function payableIndices(dice: Die[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < dice.length; i++) {
    const d = dice[i]!;
    if (!d.spent && symbolOf(d) !== "blank") out.push(i);
  }
  return out;
}

/**
 * Find a concrete set of dice (by index) that satisfies a requirement, or
 * `null` if the pool can't pay for it. Deterministic: always chooses the
 * lowest-index dice so replays are stable.
 */
export function matchRequirement(dice: Die[], req: Requirement): number[] | null {
  const available = payableIndices(dice);

  if (req.kind === "symbols") {
    const matching = available.filter((i) => symbolOf(dice[i]!) === req.symbol);
    return matching.length >= req.count ? matching.slice(0, req.count) : null;
  }

  // pairs: greedily form `req.count` disjoint pairs from same-symbol dice.
  const bySymbol = new Map<Symbol, number[]>();
  for (const i of available) {
    const s = symbolOf(dice[i]!);
    (bySymbol.get(s) ?? bySymbol.set(s, []).get(s)!).push(i);
  }
  const chosen: number[] = [];
  let pairsNeeded = req.count;
  // Iterate symbols in a stable order (by first-seen index) for determinism.
  const symbolsInOrder = [...bySymbol.keys()].sort(
    (a, b) => bySymbol.get(a)![0]! - bySymbol.get(b)![0]!,
  );
  for (const sym of symbolsInOrder) {
    const idxs = bySymbol.get(sym)!;
    while (pairsNeeded > 0 && idxs.length >= 2) {
      chosen.push(idxs.shift()!, idxs.shift()!);
      pairsNeeded--;
    }
    if (pairsNeeded === 0) break;
  }
  return pairsNeeded === 0 ? chosen : null;
}

/** Whether the current pool can pay for a requirement. */
export function canPay(dice: Die[], req: Requirement): boolean {
  return matchRequirement(dice, req) !== null;
}
