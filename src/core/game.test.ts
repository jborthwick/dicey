import { describe, expect, it } from "vitest";
import {
  canPlayCard,
  canReroll,
  cancelDraftPick,
  endTurn,
  endTurnTimeline,
  healInsteadOfDraft,
  newGame,
  newRun,
  pickDraftCard,
  playCard,
  replaceDraftCard,
  reroll,
  toggleHold,
} from "./game";
import {
  BASIC_CARD_IDS,
  DRAFT_HEAL_AMOUNT,
  ENDLESS_ENEMY_IDS,
  HAND_SIZE,
  REWARD_CARD_IDS,
} from "./content";
import { matchRequirement } from "./dice";
import { nextInt, seedRng } from "./rng";
import type { Die, GameState } from "./types";

// A helper to build a dice pool from symbol strings for matcher tests. Uses
// real die defs whose face 0 / face indices we can pin, but simplest: fabricate
// dice whose defId maps to a def and pick a face showing the wanted symbol.
// Instead we test the matcher against hand-rolled Die[] using the "prism" die
// (faces: wind light water earth wind light) so every element is reachable.
function prismDie(symbol: "wind" | "light" | "water" | "earth"): Die {
  const face = { wind: 0, light: 1, water: 2, earth: 3 }[symbol];
  return { defId: "prism", face, held: false, spent: false, entangled: false };
}

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = seedRng("hello");
    const b = seedRng("hello");
    expect(nextInt(a, 0, 100)).toEqual(nextInt(b, 0, 100));
  });

  it("differs across seeds", () => {
    const seq = (seed: string) => {
      let r = seedRng(seed);
      const out: number[] = [];
      for (let i = 0; i < 5; i++) {
        const [v, n] = nextInt(r, 0, 1_000_000);
        out.push(v);
        r = n;
      }
      return out.join(",");
    };
    expect(seq("a")).not.toEqual(seq("b"));
  });
});

describe("matchRequirement", () => {
  it("matches N of a specific symbol", () => {
    const dice = [prismDie("wind"), prismDie("water"), prismDie("wind")];
    expect(matchRequirement(dice, { kind: "symbols", symbol: "wind", count: 2 })).toEqual([0, 2]);
    expect(matchRequirement(dice, { kind: "symbols", symbol: "wind", count: 3 })).toBeNull();
  });

  it("forms disjoint pairs across different symbols", () => {
    const dice = [
      prismDie("wind"),
      prismDie("light"),
      prismDie("wind"),
      prismDie("light"),
    ];
    // Two pairs: wind pair (0,2) + light pair (1,3).
    expect(matchRequirement(dice, { kind: "pairs", count: 2 })).toEqual([0, 2, 1, 3]);
  });

  it("fails when not enough pairs exist", () => {
    const dice = [prismDie("wind"), prismDie("light"), prismDie("water")];
    expect(matchRequirement(dice, { kind: "pairs", count: 1 })).toBeNull();
  });

  it("ignores spent dice", () => {
    const dice = [prismDie("wind"), { ...prismDie("wind"), spent: true }];
    expect(matchRequirement(dice, { kind: "symbols", symbol: "wind", count: 2 })).toBeNull();
  });
});

describe("game — purity & determinism", () => {
  it("does not mutate the input state", () => {
    const s = newGame(1);
    const snapshot = structuredClone(s);
    reroll(s);
    toggleHold(s, 0);
    endTurn(s);
    expect(s).toEqual(snapshot);
  });

  it("same seed => identical run", () => {
    const play = (seed: number) => {
      let s: GameState = newGame(seed);
      let guard = 0;
      while (s.phase === "playerTurn" && guard++ < 100) {
        while (
          canReroll(s) &&
          !s.player.hand.some((c) => canPlayCard(s, c))
        ) {
          s = reroll(s);
        }
        const card = s.player.hand.find((c) => canPlayCard(s, c));
        s = card ? playCard(s, card) : endTurn(s);
      }
      return { phase: s.phase, turn: s.turn, php: s.player.hp, ehp: s.enemy.hp };
    };
    expect(play(123)).toEqual(play(123));
  });
});

describe("game — starting state", () => {
  it("opens on the player's turn with a full board", () => {
    const s = newGame(1);
    expect(s.phase).toBe("playerTurn");
    expect(s.turn).toBe(1);
    expect(s.player.hp).toBe(86);
    expect(s.enemy.hp).toBe(40);
    expect(s.enemy.name).toBe("Spore Mushroom");
    expect(s.player.hand).toHaveLength(2);
    expect(s.player.hand[0]).not.toBe(s.player.hand[1]);
    s.player.hand.forEach((id) => expect(BASIC_CARD_IDS).toContain(id));
    expect(s.player.dice).toHaveLength(5);
    expect(s.player.hp).toBe(s.player.maxHp);
    expect(s.player.statuses.poison ?? 0).toBe(0);
  });

  it("rejects illegal plays", () => {
    const s = newGame(1);
    expect(() => playCard(s, "not-a-card")).toThrow();
  });
});

describe("game — reroll consumes a reroll and respects holds", () => {
  it("decrements actionsRemaining", () => {
    const s = newGame(1);
    const r = reroll(s);
    expect(r.player.actionsRemaining).toBe(s.player.actionsRemaining - 1);
  });

  it("keeps held dice fixed across a reroll", () => {
    let s = newGame(1);
    // Hold a non-spent die and remember its face.
    const idx = s.player.dice.findIndex((d) => !d.spent);
    s = toggleHold(s, idx);
    const face = s.player.dice[idx]!.face;
    // Reroll many times; held die must not move.
    for (let i = 0; i < 2; i++) s = reroll(s);
    expect(s.player.dice[idx]!.held).toBe(true);
    expect(s.player.dice[idx]!.face).toBe(face);
  });

  it("does not reroll or consume a reroll when every die is held or spent", () => {
    let s = newGame(1);
    for (let i = 0; i < s.player.dice.length; i++) {
      s = toggleHold(s, i);
    }
    expect(canReroll(s)).toBe(false);
    const before = s.player.actionsRemaining;
    s = reroll(s);
    expect(s.player.actionsRemaining).toBe(before);
  });
});

describe("game — poison ramps via the relic", () => {
  it("player takes escalating poison each turn against the spider", () => {
    let s = newGame(7, "poisonous-spider");
    const hp0 = s.player.hp;
    s = endTurn(s); // -> enemy turn -> back to player turn 2, poison ticks
    expect(s.turn).toBe(2);
    // Poison was 2 at start; it should have ticked and been re-applied by relic.
    expect(s.player.hp).toBeLessThan(hp0);
    expect((s.player.statuses.poison ?? 0)).toBeGreaterThan(0);
  });
});

describe("game — entangle is bounded and never softlocks", () => {
  // Drive a realistic run (the flow that surfaced the bug: hold + reroll + end)
  // and assert entangle stays capped and never locks the whole pool.
  function driveAndInspect(seed: number) {
    let s = newGame(seed, "poisonous-spider");
    const observations: { entangle: number; spent: number; entangled: number; dice: number }[] =
      [];
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 60) {
      // Observe the *clean turn start*, before any of our own dice-spending.
      observations.push({
        entangle: s.player.statuses.entangle ?? 0,
        spent: s.player.dice.filter((d) => d.spent).length,
        entangled: s.player.dice.filter((d) => d.entangled).length,
        dice: s.player.dice.length,
      });
      // Then play the whole turn (the flow from the bug report): hold, reroll,
      // spend everything affordable, and end.
      const holdable = s.player.dice.findIndex((d) => !d.spent);
      if (holdable >= 0) s = toggleHold(s, holdable);
      if (canReroll(s)) s = reroll(s);
      let inner = 0;
      while (s.phase === "playerTurn" && inner++ < 10) {
        const card = s.player.hand.find((c) => canPlayCard(s, c));
        if (!card) break;
        s = playCard(s, card);
      }
      s = endTurn(s);
    }
    return observations;
  }

  it("entangle never exceeds its cap (2) and never locks every die", () => {
    for (const seed of [1, 2, 3, 7, 42, 99, 123]) {
      for (const o of driveAndInspect(seed)) {
        expect(o.entangle).toBeLessThanOrEqual(2);
        expect(o.spent).toBeLessThan(o.dice); // at least one usable die remains
      }
    }
  });

  it("dice locked at turn start are flagged entangled (not just spent)", () => {
    for (const seed of [2, 42, 99, 123]) {
      for (const o of driveAndInspect(seed)) {
        // Every die spent *at the start of a turn* is there because of entangle.
        expect(o.entangled).toBe(o.spent);
      }
    }
  });
});

describe("game — silence fizzles a played card instead of blocking play", () => {
  it("canPlayCard ignores silence entirely", () => {
    let s = newGame(1);
    const dice = [...s.player.dice];
    dice[0] = prismDie("water");
    s = {
      ...s,
      player: { ...s.player, dice, hand: ["ice-cone"], statuses: { silence: 5 } },
    };
    expect(canPlayCard(s, "ice-cone")).toBe(true);
  });

  it("playing a card while silenced spends dice, skips the effect, and consumes 1 stack", () => {
    let s = newGame(1);
    const dice = [...s.player.dice];
    dice[0] = prismDie("water");
    s = {
      ...s,
      player: { ...s.player, dice, hand: ["ice-cone"], statuses: { silence: 2 } },
    };
    const hpBefore = s.enemy.hp;

    const r = playCard(s, "ice-cone");

    expect(r.enemy.hp).toBe(hpBefore); // Ice Cone's damage never applied
    expect(r.player.dice[0]!.spent).toBe(true); // the die is still spent
    expect(r.player.statuses.silence).toBe(1); // one stack consumed
    expect(r.log.at(-1)).toMatch(/fizzles/);
  });

  it("play resolves normally again once silence reaches 0", () => {
    let s = newGame(1);
    const dice = [...s.player.dice];
    dice[0] = prismDie("water");
    s = { ...s, player: { ...s.player, dice, hand: ["ice-cone"], statuses: {} } };
    const hpBefore = s.enemy.hp;

    const r = playCard(s, "ice-cone");

    expect(r.enemy.hp).toBeLessThan(hpBefore); // Ice Cone's damage actually landed
  });

  it("never exceeds its cap (2) against the skeleton's repeat Bone Rattle casts", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      let s = newGame(seed, "skeleton");
      let guard = 0;
      while (s.phase === "playerTurn" && guard++ < 60) {
        expect(s.player.statuses.silence ?? 0).toBeLessThanOrEqual(2);
        if (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
          s = reroll(s);
        }
        const card = s.player.hand.find((c) => canPlayCard(s, c));
        s = card ? playCard(s, card) : endTurn(s);
      }
    }
  });
});

describe("endTurnTimeline", () => {
  it("last beat equals endTurn(); beats are ordered snapshots", () => {
    const s = newGame(42);
    const beats = endTurnTimeline(s);
    expect(beats.length).toBeGreaterThanOrEqual(2);
    // First beat is the enemy's turn (or a terminal state), never the player's.
    expect(beats[0]!.state.phase).not.toBe("playerTurn");
    expect(beats[0]!.action.kind).toBe("enemyStart");
    // The atomic endTurn is exactly the final beat's state.
    expect(beats[beats.length - 1]!.state).toEqual(endTurn(s));
    // A card the spider played is reported for highlighting.
    const plays = beats.filter((b) => b.action.kind === "play");
    expect(plays.length).toBeGreaterThan(0);
  });

  it("does not mutate the input state", () => {
    const s = newGame(3);
    const snapshot = structuredClone(s);
    endTurnTimeline(s);
    expect(s).toEqual(snapshot);
  });
});

describe("game — run progression", () => {
  it("enters draft after beating the first enemy in a run", () => {
    let s = newRun(99);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 80) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    expect(s.phase).toBe("draft");
    expect(s.run.draftOffers).toHaveLength(2);
    expect(s.run.pendingRelic).toBeTruthy();
  });

  it("pickDraftCard adds the card, relic, and starts the next fight", () => {
    let s = newRun(99);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 80) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    const [pick] = s.run.draftOffers!;
    const relicId = s.run.pendingRelic?.id;
    s = pickDraftCard(s, pick);
    expect(s.phase).toBe("playerTurn");
    expect(s.run.fightIndex).toBe(1);
    expect(ENDLESS_ENEMY_IDS as readonly string[]).toContain(s.enemy.id);
    expect(s.player.hand).toContain(pick);
    expect(s.player.passives.some((p) => p.id === relicId)).toBe(true);
  });

  it("healInsteadOfDraft heals HP, skips the card, and starts the next fight", () => {
    let s = newRun(99);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 80) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    const handBefore = [...s.player.hand];
    const hpBefore = s.player.hp;
    const relicId = s.run.pendingRelic?.id;
    s = healInsteadOfDraft(s);
    expect(s.phase).toBe("playerTurn");
    expect(s.run.fightIndex).toBe(1);
    expect(ENDLESS_ENEMY_IDS as readonly string[]).toContain(s.enemy.id);
    expect(s.player.hand).toEqual(handBefore);
    expect(s.player.hp).toBe(Math.min(s.player.maxHp, hpBefore + DRAFT_HEAL_AMOUNT));
    expect(s.player.passives.some((p) => p.id === relicId)).toBe(true);
  });

  it("healInsteadOfDraft never heals past maxHp", () => {
    let s = newRun(99);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 80) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    s = { ...s, player: { ...s.player, hp: s.player.maxHp } };
    s = healInsteadOfDraft(s);
    expect(s.player.hp).toBe(s.player.maxHp);
  });

  /** Auto-win every fight and auto-pick the first draft offer each time,
   *  up to `maxFights` wins (or until the player dies). */
  function grindRun(seed: number, maxFights: number): GameState {
    let s = newRun(seed);
    let guard = 0;
    while (s.phase !== "lost" && s.run.fightIndex < maxFights && guard++ < 2000) {
      if (s.phase === "draft") {
        const [first] = s.run.draftOffers ?? [];
        if (!first) break;
        s = pickDraftCard(s, first);
        if (s.run.pendingDraftPick) {
          // Hand full — drop the oldest card to make room.
          const drop = s.player.hand[0];
          if (!drop) break;
          s = replaceDraftCard(s, drop);
        }
        continue;
      }
      if (s.phase !== "playerTurn") break;
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    return s;
  }

  it("never wins — runs only end when the player dies", () => {
    // Grind well past several fights; regardless of outcome, "won"/"runWon"
    // must never appear as a terminal phase for a run.enabled game.
    const s = grindRun(11, 30);
    expect(["playerTurn", "draft", "lost"]).toContain(s.phase);
  });

  it("cycles random enemies (seeded) every fight", () => {
    const s = grindRun(11, 5);
    // Enough fights happened, or the player died trying — either way,
    // nothing crashed getting here, and every enemy comes from the pool.
    if (s.phase !== "lost") {
      expect(ENDLESS_ENEMY_IDS as readonly string[]).toContain(s.enemy.id);
    }
  });

  it("never throws once every reward card has been collected", () => {
    // REWARD_CARD_IDS.length wins exhausts the pool; a few more must still
    // succeed via the already-owned fallback instead of crashing.
    expect(() => grindRun(11, REWARD_CARD_IDS.length + 5)).not.toThrow();
  });

  it("picking an already-owned reward card doesn't duplicate it in hand", () => {
    const s = grindRun(11, REWARD_CARD_IDS.length + 5);
    const counts = new Map<string, number>();
    for (const id of s.player.hand) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) expect(n, `duplicate card in hand: ${id}`).toBe(1);
  });

  it("hand never exceeds HAND_SIZE", () => {
    const s = grindRun(11, HAND_SIZE + 8);
    expect(s.player.hand.length).toBeLessThanOrEqual(HAND_SIZE);
  });
});

describe("game — full-hand draft replace", () => {
  /** Reach a draft, then surgically fill the hand to HAND_SIZE. */
  function fullHandAtDraft(seed: number): GameState {
    let s = newRun(seed);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 80) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    expect(s.phase).toBe("draft");
    expect(s.run.draftOffers).toBeTruthy();

    const hand = [...s.player.hand];
    for (const id of REWARD_CARD_IDS) {
      if (hand.length >= HAND_SIZE) break;
      if (!hand.includes(id)) hand.push(id);
    }
    expect(hand.length).toBe(HAND_SIZE);

    return {
      ...s,
      player: { ...s.player, hand },
    };
  }

  it("pickDraftCard parks a pending pick when the hand is full", () => {
    let s = fullHandAtDraft(42);
    const offer =
      s.run.draftOffers?.find((id) => !s.player.hand.includes(id)) ??
      // Fabricate an unowned offer so the replace path is exercised.
      REWARD_CARD_IDS.find((id) => !s.player.hand.includes(id)) ??
      null;
    expect(offer).toBeTruthy();
    // Ensure the fabricated id is a legal offer for this draft.
    s = {
      ...s,
      run: {
        ...s.run,
        draftOffers: [offer!, s.run.draftOffers![1] ?? offer!],
      },
    };
    const handBefore = [...s.player.hand];
    s = pickDraftCard(s, offer!);
    expect(s.phase).toBe("draft");
    expect(s.run.pendingDraftPick).toBe(offer);
    expect(s.player.hand).toEqual(handBefore);
  });

  it("replaceDraftCard swaps the chosen hand card for the pending offer", () => {
    let s = fullHandAtDraft(7);
    const offer =
      REWARD_CARD_IDS.find((id) => !s.player.hand.includes(id)) ?? null;
    expect(offer).toBeTruthy();
    s = {
      ...s,
      run: {
        ...s.run,
        draftOffers: [offer!, offer!],
      },
    };
    const drop = s.player.hand[0]!;
    s = pickDraftCard(s, offer!);
    s = replaceDraftCard(s, drop);
    expect(s.phase).toBe("playerTurn");
    expect(s.player.hand).toContain(offer);
    expect(s.player.hand).not.toContain(drop);
    expect(s.player.hand.length).toBe(HAND_SIZE);
    expect(s.run.pendingDraftPick).toBeNull();
  });

  it("cancelDraftPick returns to the offer choice", () => {
    let s = fullHandAtDraft(13);
    const offer =
      REWARD_CARD_IDS.find((id) => !s.player.hand.includes(id)) ?? null;
    expect(offer).toBeTruthy();
    s = {
      ...s,
      run: {
        ...s.run,
        draftOffers: [offer!, offer!],
      },
    };
    s = pickDraftCard(s, offer!);
    expect(s.run.pendingDraftPick).toBe(offer);
    s = cancelDraftPick(s);
    expect(s.run.pendingDraftPick).toBeNull();
    expect(s.phase).toBe("draft");
    expect(s.run.draftOffers).toBeTruthy();
  });
});

// Keep fightToDraft referenced if unused - actually I defined it but might not use it.
// Remove unused fightToDraft from the replace describe to avoid lint issues.

describe("game — reaches a terminal state", () => {
  it("ends in win or loss within a bounded number of turns", () => {
    let s = newGame(42);
    let guard = 0;
    while (s.phase === "playerTurn" && guard++ < 100) {
      while (canReroll(s) && !s.player.hand.some((c) => canPlayCard(s, c))) {
        s = reroll(s);
      }
      const card = s.player.hand.find((c) => canPlayCard(s, c));
      s = card ? playCard(s, card) : endTurn(s);
    }
    expect(["won", "lost"]).toContain(s.phase);
    expect(guard).toBeLessThan(100);
  });
});
