/** Semantic animation clips the UI can request for any enemy visual. */
export type EnemyClip = "idle" | "attack" | "hurt" | "die" | "spawn";

/** One exported sprite strip (PNG) and how to play it. */
export interface SpriteClip {
  src: string;
  fps: number;
  loop: boolean;
}

/** Maps a game enemy id to pack-agnostic sprite clips. UI-only. */
export interface EnemyVisual {
  /** itch pack id — for credits / debugging only. */
  source: string;
  /** Screen scale (4 = 64px-tall sheet renders at 256px). */
  displayScale: number;
  clips: Partial<Record<EnemyClip, SpriteClip>>;
  /** Used when a clip is missing (e.g. no spawn anim). */
  defaultClip?: EnemyClip;
}
