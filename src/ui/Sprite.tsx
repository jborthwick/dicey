import { useEffect, useRef, useState } from "react";
import { analyzeSheet, paintSpriteFrame, type SheetData } from "./spritesheet";
import type { SpriteClip } from "./visuals";

interface SpriteProps {
  clip: SpriteClip;
  scale?: number;
  /** Bump to restart a one-shot clip from frame 0. */
  playKey: string | number;
  onComplete?: () => void;
}

const FALLBACK_PX = 64;

/**
 * Plays a horizontal sprite sheet via canvas. Frames are auto-detected from
 * transparent gaps, so gapped itch.io exports work without manual frame counts.
 */
export function Sprite({ clip, scale = 1, playKey, onComplete }: SpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setSheet(null);
    setFailed(false);
    setFrame(0);
    let cancelled = false;
    analyzeSheet(clip.src)
      .then((data) => {
        if (!cancelled) setSheet(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clip.src, playKey]);

  const frameCount = sheet?.frames.length ?? 0;

  useEffect(() => {
    if (!sheet || frameCount <= 1) return;

    const frameMs = 1000 / clip.fps;
    let i = 0;
    setFrame(0);

    const id = setInterval(() => {
      i += 1;
      if (i >= frameCount) {
        if (clip.loop) {
          i = 0;
          setFrame(0);
        } else {
          clearInterval(id);
          setFrame(frameCount - 1);
          onCompleteRef.current?.();
        }
        return;
      }
      setFrame(i);
    }, frameMs);

    return () => clearInterval(id);
  }, [sheet, frameCount, clip.fps, clip.loop, playKey]);

  useEffect(() => {
    if (!sheet || frameCount > 1 || clip.loop) return;
    const durationMs = (frameCount / clip.fps) * 1000;
    const id = setTimeout(() => onCompleteRef.current?.(), durationMs);
    return () => clearTimeout(id);
  }, [sheet, frameCount, clip.fps, clip.loop, playKey]);

  useEffect(() => {
    if (!sheet || !canvasRef.current) return;
    paintSpriteFrame(canvasRef.current, sheet, frame, scale);
  }, [sheet, frame, scale]);

  if (failed) {
    return (
      <div
        className="sprite sprite-missing"
        style={{ width: FALLBACK_PX * scale, height: FALLBACK_PX * scale }}
        aria-hidden
      >
        ?
      </div>
    );
  }

  if (!sheet) {
    return (
      <div
        className="sprite sprite-loading"
        style={{ width: FALLBACK_PX * scale, height: FALLBACK_PX * scale }}
        aria-hidden
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="sprite"
      style={{ width: sheet.maxFrameW * scale, height: sheet.contentH * scale }}
      aria-hidden
    />
  );
}
