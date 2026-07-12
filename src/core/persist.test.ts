import { describe, expect, it } from "vitest";
import {
  canPlayCard,
  endTurn,
  newRun,
  playCard,
  toggleHold,
} from "./game";
import { decodeSave, encodeSave, isStablePhase, SAVE_VERSION } from "./persist";

describe("persist", () => {
  it("round-trips a fresh run", () => {
    const s = newRun("save-me");
    const raw = encodeSave(s, 1_700_000_000_000);
    const loaded = decodeSave(raw);
    expect(loaded).toEqual(s);
  });

  it("round-trips after play + end turn", () => {
    let s = newRun(42);
    const playable = s.player.hand.find((id) => canPlayCard(s, id));
    if (playable) s = playCard(s, playable);
    s = endTurn(s);
    expect(isStablePhase(s.phase)).toBe(true);
    expect(decodeSave(encodeSave(s))).toEqual(s);
  });

  it("preserves held dice flags", () => {
    let s = newRun(7);
    s = toggleHold(s, 0);
    const loaded = decodeSave(encodeSave(s))!;
    expect(loaded.player.dice[0]?.held).toBe(true);
    expect(loaded).toEqual(s);
  });

  it("rejects garbage JSON", () => {
    expect(decodeSave("not-json")).toBeNull();
    expect(decodeSave("{}")).toBeNull();
    expect(decodeSave("null")).toBeNull();
  });

  it("rejects wrong version", () => {
    const s = newRun(1);
    const raw = JSON.stringify({
      version: SAVE_VERSION + 1,
      savedAt: 1,
      state: s,
    });
    expect(decodeSave(raw)).toBeNull();
  });

  it("rejects enemyTurn (unstable) saves", () => {
    const s = { ...newRun(1), phase: "enemyTurn" as const };
    expect(decodeSave(encodeSave(s))).toBeNull();
  });

  it("rejects truncated actor payloads", () => {
    const s = newRun(1);
    const broken = {
      version: SAVE_VERSION,
      savedAt: 1,
      state: { ...s, player: { id: "x", name: "y" } },
    };
    expect(decodeSave(JSON.stringify(broken))).toBeNull();
  });
});
