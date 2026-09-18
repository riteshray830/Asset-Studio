import { AtlasConfig, PackedAtlas, PackedFrame, SpriteFrame } from '../types/project';
import { loadImage } from './spriteDetector';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

class MaxRectsBinPacker {
  binWidth: number;
  binHeight: number;
  allowRotation: boolean;
  freeRectangles: Rect[] = [];

  constructor(width: number, height: number, allowRotation = false) {
    this.binWidth = width;
    this.binHeight = height;
    this.allowRotation = allowRotation;
    this.freeRectangles.push({ x: 0, y: 0, w: width, h: height });
  }

  insert(width: number, height: number): { rect: Rect; rotated: boolean } | null {
    let bestShortSideFit = Number.MAX_VALUE;
    let bestLongSideFit = Number.MAX_VALUE;
    let bestNode: Rect | null = null;
    let bestRotated = false;

    for (let i = 0; i < this.freeRectangles.length; i++) {
      const free = this.freeRectangles[i];

      // Try non-rotated
      if (free.w >= width && free.h >= height) {
        const leftoverX = Math.abs(free.w - width);
        const leftoverY = Math.abs(free.h - height);
        const shortSideFit = Math.min(leftoverX, leftoverY);
        const longSideFit = Math.max(leftoverX, leftoverY);

        if (
          shortSideFit < bestShortSideFit ||
          (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
        ) {
          bestNode = { x: free.x, y: free.y, w: width, h: height };
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
          bestRotated = false;
        }
      }

      // Try rotated 90 degrees
      if (this.allowRotation && free.w >= height && free.h >= width) {
        const leftoverX = Math.abs(free.w - height);
        const leftoverY = Math.abs(free.h - width);
        const shortSideFit = Math.min(leftoverX, leftoverY);
        const longSideFit = Math.max(leftoverX, leftoverY);

        if (
          shortSideFit < bestShortSideFit ||
          (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
        ) {
          bestNode = { x: free.x, y: free.y, w: height, h: width };
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
          bestRotated = true;
        }
      }
    }

    if (!bestNode) return null;

    this.splitFreeRectangles(bestNode);
    this.pruneFreeList();

    return { rect: bestNode, rotated: bestRotated };
  }

  private splitFreeRectangles(used: Rect): void {
    const nextFree: Rect[] = [];

    for (let i = 0; i < this.freeRectangles.length; i++) {
      const free = this.freeRectangles[i];

      // Test intersection
      if (
        used.x >= free.x + free.w ||
        used.x + used.w <= free.x ||
        used.y >= free.y + free.h ||
        used.y + used.h <= free.y
      ) {
        nextFree.push(free);
        continue;
      }

      // Split horizontally and vertically
      if (used.x < free.x + free.w && used.x + used.w > free.x) {
        // Top slice
        if (used.y > free.y && used.y < free.y + free.h) {
          nextFree.push({ x: free.x, y: free.y, w: free.w, h: used.y - free.y });
        }
        // Bottom slice
        if (used.y + used.h < free.y + free.h) {
          nextFree.push({
            x: free.x,
            y: used.y + used.h,
            w: free.w,
            h: free.y + free.h - (used.y + used.h)
          });
        }
      }

      if (used.y < free.y + free.h && used.y + used.h > free.y) {
        // Left slice
        if (used.x > free.x && used.x < free.x + free.w) {
          nextFree.push({ x: free.x, y: free.y, w: used.x - free.x, h: free.h });
        }
        // Right slice
        if (used.x + used.w < free.x + free.w) {
          nextFree.push({
            x: used.x + used.w,
            y: free.y,
            w: free.x + free.w - (used.x + used.w),
            h: free.h
          });
        }
      }
    }

    this.freeRectangles = nextFree;
  }

  private pruneFreeList(): void {
    for (let i = 0; i < this.freeRectangles.length; i++) {
      for (let j = i + 1; j < this.freeRectangles.length; j++) {
        if (this.isContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
          this.freeRectangles.splice(i, 1);
          i--;
          break;
        }
        if (this.isContainedIn(this.freeRectangles[j], this.freeRectangles[i])) {
          this.freeRectangles.splice(j, 1);
          j--;
        }
      }
    }
  }

  private isContainedIn(a: Rect, b: Rect): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.w <= b.x + b.w &&
      a.y + a.h <= b.y + b.h
    );
  }
}

/**
 * Packs multiple SpriteFrames into one or more texture atlases using MaxRects
 */
export async function packTextureAtlases(
  sprites: SpriteFrame[],
  config: AtlasConfig
): Promise<PackedAtlas[]> {
  if (sprites.length === 0) return [];

  // Sort sprites descending by max dimension / area (heuristic for optimal bin packing)
  const items = [...sprites].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });

  const maxSize = config.maxSize || 2048;
  const padding = config.padding ?? 2;
  const margin = config.margin ?? 4;
  const extrusion = config.extrusion ?? 0;
  const allowRotation = config.allowRotation ?? false;

  const atlases: PackedAtlas[] = [];
  let remainingSprites = [...items];
  let atlasIndex = 0;

  while (remainingSprites.length > 0) {
    // Determine canvas size (can grow up to maxSize or match power-of-two)
    const targetSize = config.powerOfTwo ? maxSize : Math.min(maxSize, 2048);
    const packer = new MaxRectsBinPacker(
      targetSize - margin * 2,
      targetSize - margin * 2,
      allowRotation
    );

    const packedFrames: PackedFrame[] = [];
    const unplaced: SpriteFrame[] = [];
    let usedArea = 0;

    for (const sprite of remainingSprites) {
      // Dimensions including padding and extrusion
      const itemW = sprite.width + padding * 2 + extrusion * 2;
      const itemH = sprite.height + padding * 2 + extrusion * 2;

      const placement = packer.insert(itemW, itemH);

      if (placement) {
        const posX = placement.rect.x + margin + padding + extrusion;
        const posY = placement.rect.y + margin + padding + extrusion;

        packedFrames.push({
          id: sprite.id,
          name: sprite.name,
          frame: {
            x: posX,
            y: posY,
            w: placement.rotated ? sprite.height : sprite.width,
            h: placement.rotated ? sprite.width : sprite.height
          },
          rotated: placement.rotated,
          trimmed: !!sprite.trimmed,
          spriteSourceSize: {
            x: sprite.trimmedX ?? 0,
            y: sprite.trimmedY ?? 0,
            w: sprite.trimmedWidth ?? sprite.width,
            h: sprite.trimmedHeight ?? sprite.height
          },
          sourceSize: {
            w: sprite.originalWidth || sprite.width,
            h: sprite.originalHeight || sprite.height
          },
          atlasIndex
        });

        usedArea += sprite.width * sprite.height;
      } else {
        unplaced.push(sprite);
      }
    }

    if (packedFrames.length === 0 && unplaced.length > 0) {
      // A single sprite is larger than targetSize! Place it anyway in an enlarged sheet
      const oversized = unplaced.shift()!;
      const neededW = Math.max(targetSize, oversized.width + margin * 2);
      const neededH = Math.max(targetSize, oversized.height + margin * 2);
      packedFrames.push({
        id: oversized.id,
        name: oversized.name,
        frame: {
          x: margin,
          y: margin,
          w: oversized.width,
          h: oversized.height
        },
        rotated: false,
        trimmed: !!oversized.trimmed,
        spriteSourceSize: {
          x: 0,
          y: 0,
          w: oversized.width,
          h: oversized.height
        },
        sourceSize: {
          w: oversized.originalWidth || oversized.width,
          h: oversized.originalHeight || oversized.height
        },
        atlasIndex
      });
    }

    // Render atlas to canvas
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = targetSize;
    atlasCanvas.height = targetSize;
    const ctx = atlasCanvas.getContext('2d');

    if (ctx) {
      for (const pf of packedFrames) {
        const spriteObj = sprites.find(s => s.id === pf.id);
        if (!spriteObj) continue;

        const img = await loadImage(spriteObj.dataUrl);

        ctx.save();
        if (pf.rotated) {
          ctx.translate(pf.frame.x + pf.frame.w, pf.frame.y);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, 0);
        } else {
          ctx.drawImage(img, pf.frame.x, pf.frame.y);
        }

        // Apply texture bleed extrusion if specified
        if (extrusion > 0) {
          applyExtrusion(ctx, pf.frame.x, pf.frame.y, pf.frame.w, pf.frame.h, extrusion);
        }

        ctx.restore();
      }
    }

    const totalAtlasArea = targetSize * targetSize;
    const utilization = Math.min(100, Math.round((usedArea / totalAtlasArea) * 1000) / 10);

    const atlasName = `atlas_${String(atlasIndex + 1).padStart(2, '0')}`;
    atlases.push({
      id: `atlas_${Date.now()}_${atlasIndex}`,
      index: atlasIndex,
      name: atlasName,
      width: targetSize,
      height: targetSize,
      dataUrl: atlasCanvas.toDataURL('image/png'),
      frames: packedFrames,
      utilization
    });

    atlasIndex++;
    remainingSprites = unplaced;

    // Safety guard against infinite loops
    if (atlasIndex > 20) break;
  }

  return atlases;
}

/**
 * Extrudes the border pixels outward to avoid filtering artifacts in game engines
 */
function applyExtrusion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  px: number
): void {
  for (let i = 1; i <= px; i++) {
    // Top border
    ctx.drawImage(ctx.canvas, x, y, w, 1, x, y - i, w, 1);
    // Bottom border
    ctx.drawImage(ctx.canvas, x, y + h - 1, w, 1, x, y + h - 1 + i, w, 1);
    // Left border
    ctx.drawImage(ctx.canvas, x, y, 1, h, x - i, y, 1, h);
    // Right border
    ctx.drawImage(ctx.canvas, x + w - 1, y, 1, h, x + w - 1 + i, y, 1, h);
  }
}
