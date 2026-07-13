import type { EnemyClip, EnemyVisual, SpriteClip } from "./types";

/** Vite `base` is `./` — relative paths work in dev and Capacitor WebView. */
const ASSET_BASE = "./assets/enemies";

/** Screen pixels per source pixel (4 = 64px-tall sheet renders at 256px). */
export const ENEMY_DISPLAY_SCALE = 4;

function clip(enemyId: string, file: string, fps: number, loop: boolean): SpriteClip {
  return {
    src: `${ASSET_BASE}/${enemyId}/${file}`,
    fps,
    loop,
  };
}

/**
 * `source` here is the quick-reference provenance for each enemy's sprite —
 * pack, license, and which exact animation variant was used. It must match
 * `public/assets/enemies/README.md`, which carries the full detail (itch.io
 * links, per-file source names). Update BOTH in the same commit whenever you
 * swap or add a sprite — see the "Asset provenance" note in CLAUDE.md.
 */
export const ENEMY_VISUALS: Record<string, EnemyVisual> = {
  mushroom: {
    source: "Forest_Monsters_FREE / Mushroom (with-VFX hurt) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("mushroom", "idle.png", 8, true),
      attack: clip("mushroom", "attack.png", 12, false),
      hurt: clip("mushroom", "hurt.png", 12, false),
      die: clip("mushroom", "die.png", 10, false),
    },
  },
  "bloom-sprite": {
    source: "FlyingForestEnemies_FREE / Enemy3 (Movement-In-Animation hit) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("bloom-sprite", "idle.png", 6, true),
      attack: clip("bloom-sprite", "attack.png", 12, false),
      hurt: clip("bloom-sprite", "hit.png", 10, false),
      die: clip("bloom-sprite", "die.png", 8, false),
    },
  },
  bat: {
    source: "DarkFantasyEnemies_FREE / Bat (with-VFX attack1 + hurt) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("bat", "idle.png", 8, true),
      attack: clip("bat", "attack.png", 12, false),
      hurt: clip("bat", "hurt.png", 10, false),
      die: clip("bat", "die.png", 10, false),
    },
  },
  "poisonous-spider": {
    source: "unassigned — no sprite committed yet, see README",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("poisonous-spider", "idle.png", 8, true),
      attack: clip("poisonous-spider", "attack.png", 12, false),
      hurt: clip("poisonous-spider", "hurt.png", 10, false),
      die: clip("poisonous-spider", "die.png", 10, false),
    },
  },
  "golem-blue": {
    source: "Golems_Free_Version / Golem_1 Blue (white-swoosh-VFX attack+hurt) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("golem-blue", "idle.png", 6, true),
      attack: clip("golem-blue", "attack.png", 10, false),
      hurt: clip("golem-blue", "hurt.png", 10, false),
      die: clip("golem-blue", "die.png", 8, false),
    },
  },
  "golem-orange": {
    source: "Golems_Free_Version / Golem_1 Orange (white-swoosh-VFX attack+hurt) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("golem-orange", "idle.png", 6, true),
      attack: clip("golem-orange", "attack.png", 10, false),
      hurt: clip("golem-orange", "hurt.png", 10, false),
      die: clip("golem-orange", "die.png", 8, false),
    },
  },
  // No die clip — pack has no death frame. resolveEnemyClip falls back to
  // defaultClip (idle) on defeat; see the "missing die anim" note in README.
  skeleton: {
    source: "FREE_SkeletonPack_ByPhewcumber / Default Unarmed (no shield) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("skeleton", "idle.png", 6, true),
      attack: clip("skeleton", "attack.png", 10, false),
      hurt: clip("skeleton", "hurt.png", 10, false),
    },
  },
  "skeleton-sword": {
    source: "FREE_SkeletonPack_ByPhewcumber / Default Sword (no shield) — free",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("skeleton-sword", "idle.png", 6, true),
      attack: clip("skeleton-sword", "attack.png", 10, false),
      hurt: clip("skeleton-sword", "hurt.png", 10, false),
    },
  },
};

export function getEnemyVisual(enemyId: string): EnemyVisual | undefined {
  return ENEMY_VISUALS[enemyId];
}

export function resolveEnemyClip(
  visual: EnemyVisual,
  clip: EnemyClip,
): SpriteClip | undefined {
  return (
    visual.clips[clip] ??
    visual.clips[visual.defaultClip ?? "idle"] ??
    visual.clips.idle
  );
}
