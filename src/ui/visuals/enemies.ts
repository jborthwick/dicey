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

export const ENEMY_VISUALS: Record<string, EnemyVisual> = {
  "dust-mite": {
    source: "monopixelart/flying-enemies (Enemy3 free)",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("dust-mite", "idle.png", 8, true),
      attack: clip("dust-mite", "attack.png", 12, false),
      hurt: clip("dust-mite", "hurt.png", 12, false),
      die: clip("dust-mite", "die.png", 10, false),
    },
  },
  "puddle-slime": {
    source: "phewcumber/skeleton-pack (Warrior free)",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("puddle-slime", "idle.png", 6, true),
      attack: clip("puddle-slime", "attack.png", 12, false),
      hurt: clip("puddle-slime", "hit.png", 10, false),
      die: clip("puddle-slime", "die.png", 8, false),
    },
  },
  "gust-pixie": {
    source: "monopixelart/flying-enemies (Enemy1 premium)",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("gust-pixie", "idle.png", 8, true),
      attack: clip("gust-pixie", "attack.png", 12, false),
      hurt: clip("gust-pixie", "hurt.png", 10, false),
      die: clip("gust-pixie", "die.png", 10, false),
    },
  },
  "poisonous-spider": {
    source: "monopixelart/flying-enemies (Enemy2 premium)",
    displayScale: ENEMY_DISPLAY_SCALE,
    defaultClip: "idle",
    clips: {
      idle: clip("poisonous-spider", "idle.png", 8, true),
      attack: clip("poisonous-spider", "attack.png", 12, false),
      hurt: clip("poisonous-spider", "hurt.png", 10, false),
      die: clip("poisonous-spider", "die.png", 10, false),
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
