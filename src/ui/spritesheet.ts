/** Bounding box of one frame inside a horizontal sprite sheet. */
export interface FrameRect {
  x: number;
  w: number;
}

export interface SheetData {
  img: HTMLImageElement;
  frames: FrameRect[];
  sheetH: number;
  maxFrameW: number;
}

const sheetCache = new Map<string, Promise<SheetData>>();

/** Split a sheet into frames by scanning for transparent column gaps. */
export function parseSheetFrames(imageData: ImageData): FrameRect[] {
  const { width: w, height: h, data } = imageData;
  const hasContent: boolean[] = [];

  for (let x = 0; x < w; x++) {
    let any = false;
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3]! > 0) {
        any = true;
        break;
      }
    }
    hasContent.push(any);
  }

  const frames: FrameRect[] = [];
  let inFrame = false;
  let start = 0;

  for (let x = 0; x <= w; x++) {
    const v = x < w && hasContent[x]!;
    if (v && !inFrame) {
      start = x;
      inFrame = true;
    } else if (!v && inFrame) {
      frames.push({ x: start, w: x - start });
      inFrame = false;
    }
  }

  return frames;
}

async function loadSheet(src: string): Promise<SheetData> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
    el.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, 0, 0);

  const frames = parseSheetFrames(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (frames.length === 0) {
    frames.push({ x: 0, w: img.naturalWidth });
  }

  return {
    img,
    frames,
    sheetH: img.naturalHeight,
    maxFrameW: Math.max(...frames.map((f) => f.w)),
  };
}

/** Detect frames once per sheet URL, then reuse (clip switches, re-mounts). */
export function analyzeSheet(src: string): Promise<SheetData> {
  let pending = sheetCache.get(src);
  if (!pending) {
    pending = loadSheet(src);
    sheetCache.set(src, pending);
  }
  return pending;
}

/** Paint one frame onto a canvas (caller sets canvas pixel size). */
export function paintSpriteFrame(
  canvas: HTMLCanvasElement,
  sheet: SheetData,
  frameIndex: number,
  scale: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const viewW = sheet.maxFrameW * scale;
  const viewH = sheet.sheetH * scale;
  canvas.width = viewW;
  canvas.height = viewH;

  ctx.clearRect(0, 0, viewW, viewH);
  ctx.imageSmoothingEnabled = false;

  const f = sheet.frames[frameIndex] ?? sheet.frames[0]!;
  const dx = (viewW - f.w * scale) / 2;
  ctx.drawImage(sheet.img, f.x, 0, f.w, sheet.sheetH, dx, 0, f.w * scale, viewH);
}
