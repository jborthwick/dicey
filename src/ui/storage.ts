/**
 * Browser storage adapter for durable `GameState` saves.
 * Core owns encode/decode; this file is the only place that touches localStorage.
 */

import {
  decodeSave,
  encodeSave,
  isStablePhase,
  type GameState,
} from "../core";

export const SAVE_STORAGE_KEY = "dicey.save";

/** Read a restorable run from localStorage, or `null` if missing/corrupt. */
export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return decodeSave(raw);
  } catch {
    // Private mode / disabled storage / quota — treat as no save.
    return null;
  }
}

/** Persist a stable run. No-ops for mid-enemy-turn snapshots. */
export function saveGame(state: GameState): void {
  if (!isStablePhase(state.phase)) return;
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, encodeSave(state));
  } catch {
    // Ignore quota / privacy errors — the run continues in memory.
  }
}

/** Drop the saved run (e.g. before starting over, if desired). */
export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
