/**
 * Serialize / deserialize `GameState` for durable saves.
 *
 * Pure: no `localStorage`, no DOM. The UI (or any host) owns the storage
 * medium and calls these helpers. Corrupt or version-mismatched payloads
 * return `null` so the host can fall back to a fresh run.
 *
 * We only treat "stable" phases as restorable — never mid-`enemyTurn`, since
 * the UI's animated timeline isn't part of the save and reloading mid-beat
 * would strand the player.
 */

import type {
  Actor,
  Die,
  GameState,
  Passive,
  Phase,
  RunProgress,
  Status,
  Statuses,
} from "./types";

export const SAVE_VERSION = 1 as const;

/** Phases safe to hydrate into after a refresh. */
export const STABLE_PHASES: readonly Phase[] = [
  "playerTurn",
  "draft",
  "won",
  "lost",
] as const;

export type SaveEnvelope = {
  version: typeof SAVE_VERSION;
  savedAt: number;
  state: GameState;
};

export function isStablePhase(phase: Phase): boolean {
  return (STABLE_PHASES as readonly string[]).includes(phase);
}

/** JSON string for a host to write to storage. */
export function encodeSave(state: GameState, now = Date.now()): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: now,
    state,
  };
  return JSON.stringify(envelope);
}

/** Parse a stored payload. Returns `null` if unusable. */
export function decodeSave(raw: string): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isSaveEnvelope(parsed)) return null;
  if (parsed.version !== SAVE_VERSION) return null;
  if (!isStablePhase(parsed.state.phase)) return null;
  return parsed.state;
}

// ---------------------------------------------------------------------------
// Lightweight structural checks — enough to reject trash, not a schema lib.
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSaveEnvelope(v: unknown): v is SaveEnvelope {
  if (!isRecord(v)) return false;
  if (v.version !== SAVE_VERSION) return false;
  if (typeof v.savedAt !== "number" || !Number.isFinite(v.savedAt)) return false;
  return isGameState(v.state);
}

function isGameState(v: unknown): v is GameState {
  if (!isRecord(v)) return false;
  if (!(typeof v.seed === "string" || typeof v.seed === "number")) return false;
  if (typeof v.rng !== "number" || !Number.isFinite(v.rng)) return false;
  if (typeof v.turn !== "number" || !Number.isFinite(v.turn)) return false;
  if (!isPhase(v.phase)) return false;
  if (!isActor(v.player) || !isActor(v.enemy)) return false;
  if (!isRunProgress(v.run)) return false;
  if (!Array.isArray(v.log) || !v.log.every((line) => typeof line === "string")) {
    return false;
  }
  return true;
}

function isPhase(v: unknown): v is Phase {
  return (
    v === "playerTurn" ||
    v === "enemyTurn" ||
    v === "draft" ||
    v === "won" ||
    v === "lost"
  );
}

function isActor(v: unknown): v is Actor {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.name !== "string") return false;
  if (typeof v.hp !== "number" || typeof v.maxHp !== "number") return false;
  if (typeof v.actionsRemaining !== "number") return false;
  if (!isStatuses(v.statuses)) return false;
  if (!Array.isArray(v.dice) || !v.dice.every(isDie)) return false;
  if (!Array.isArray(v.hand) || !v.hand.every((id) => typeof id === "string")) {
    return false;
  }
  if (!Array.isArray(v.passives) || !v.passives.every(isPassive)) return false;
  return true;
}

const STATUS_KEYS: readonly Status[] = [
  "poison",
  "silence",
  "entangle",
  "weaken",
  "block",
];

function isStatuses(v: unknown): v is Statuses {
  if (!isRecord(v)) return false;
  for (const [k, n] of Object.entries(v)) {
    if (!(STATUS_KEYS as readonly string[]).includes(k)) return false;
    if (typeof n !== "number" || !Number.isFinite(n)) return false;
  }
  return true;
}

function isDie(v: unknown): v is Die {
  if (!isRecord(v)) return false;
  return (
    typeof v.defId === "string" &&
    typeof v.face === "number" &&
    typeof v.held === "boolean" &&
    typeof v.spent === "boolean" &&
    typeof v.entangled === "boolean"
  );
}

function isPassive(v: unknown): v is Passive {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.name !== "string") return false;
  if (typeof v.text !== "string") return false;
  if (v.when !== "opponentTurnStart") return false;
  return isRecord(v.effect);
}

function isRunProgress(v: unknown): v is RunProgress {
  if (!isRecord(v)) return false;
  if (typeof v.enabled !== "boolean") return false;
  if (typeof v.fightIndex !== "number") return false;
  if (v.draftOffers !== null) {
    if (
      !Array.isArray(v.draftOffers) ||
      v.draftOffers.length !== 2 ||
      !v.draftOffers.every((id) => typeof id === "string")
    ) {
      return false;
    }
  }
  if (v.pendingRelic !== null && !isPassive(v.pendingRelic)) return false;
  return true;
}
