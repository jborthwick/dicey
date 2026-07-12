import { useEffect, useRef, useState } from "react";
import { Sprite } from "./Sprite";
import type { EnemyClip } from "./visuals";
import { getEnemyVisual, resolveEnemyClip } from "./visuals";

interface EnemySpriteProps {
  enemyId: string;
  hp: number;
  /** HP-bar hit nonce — bumps when the player damages this enemy. */
  hitN: number;
  /** Enemy card being played this timeline beat, if any. */
  playingCardId: string | null;
}

export function EnemySprite({ enemyId, hp, hitN, playingCardId }: EnemySpriteProps) {
  const visual = getEnemyVisual(enemyId);
  const [clip, setClip] = useState<EnemyClip>("idle");
  const [playKey, setPlayKey] = useState(0);
  const lastHit = useRef(hitN);
  const defeated = hp <= 0;

  useEffect(() => {
    setClip("idle");
    setPlayKey(0);
    lastHit.current = hitN;
  }, [enemyId]);

  useEffect(() => {
    if (defeated) {
      setClip("die");
      setPlayKey((k) => k + 1);
    }
  }, [defeated]);

  useEffect(() => {
    if (defeated) return;
    if (playingCardId) {
      setClip("attack");
      setPlayKey((k) => k + 1);
    } else {
      setClip((c) => (c === "attack" ? "idle" : c));
    }
  }, [playingCardId, defeated]);

  useEffect(() => {
    if (defeated) return;
    if (hitN > lastHit.current) {
      lastHit.current = hitN;
      setClip("hurt");
      setPlayKey((k) => k + 1);
    }
  }, [hitN, defeated]);

  const onComplete = () => {
    setClip((c) => (c === "die" || c === "idle" ? c : "idle"));
  };

  if (!visual) return null;

  const spriteClip = resolveEnemyClip(visual, clip);
  if (!spriteClip) return null;

  return (
    <div className="enemy-sprite">
      <Sprite
        clip={spriteClip}
        scale={visual.displayScale}
        playKey={`${clip}-${playKey}`}
        onComplete={onComplete}
      />
    </div>
  );
}
