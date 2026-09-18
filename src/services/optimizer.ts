import { OptimizationResult } from '../types/export';
import { loadImage } from './spriteDetector';

/**
 * Optimizes an image with format conversion, quality compression, and color reduction
 */
export async function optimizeImage(
  dataUrl: string,
  options: {
    format: 'png' | 'webp' | 'jpg';
    quality: number; // 0.1 to 1.0
    colorCount?: number; // 2 to 256 or undefined
    stripTransparency?: boolean;
  }
): Promise<OptimizationResult> {
  const originalBlob = await dataUrlToBlob(dataUrl);
  const originalSize = originalBlob.size;

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  // If JPG, fill transparent pixels with white or background color
  if (options.format === 'jpg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  // Apply color quantization / palette reduction if requested
  if (options.colorCount && options.colorCount < 256) {
    quantizeCanvasColors(canvas, options.colorCount);
  }

  // Count unique colors
  const colorCount = countUniqueColors(canvas);

  const mimeType = options.format === 'jpg' ? 'image/jpeg' : `image/${options.format}`;
  const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      mimeType,
      options.quality
    );
  });

  const optimizedSize = optimizedBlob.size;
  const savingsPercent = Math.max(
    0,
    Math.round(((originalSize - optimizedSize) / originalSize) * 1000) / 10
  );
  const resultDataUrl = await blobToDataUrl(optimizedBlob);

  return {
    originalBlob,
    originalSize,
    optimizedBlob,
    optimizedSize,
    dataUrl: resultDataUrl,
    format: options.format,
    savingsPercent,
    colorCount
  };
}

/**
 * Extracts top unique colors from an image canvas
 */
export function extractColorPalette(canvas: HTMLCanvasElement, maxColors = 16): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // ignore transparent pixels

    // Quantize 5-bit to group similar colors
    const r = (data[i] >> 3) << 3;
    const g = (data[i + 1] >> 3) << 3;
    const b = (data[i + 2] >> 3) << 3;
    const hex = rgbToHex(r, g, b);

    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([hex]) => hex);
}

/**
 * Quantizes canvas colors using uniform step reduction
 */
function quantizeCanvasColors(canvas: HTMLCanvasElement, targetColors: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Determine levels per channel
  const levels = Math.max(2, Math.round(Math.cbrt(targetColors)));
  const step = 255 / (levels - 1);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = Math.round(Math.round(data[i] / step) * step);
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
  }

  ctx.putImageData(imgData, 0, 0);
}

function countUniqueColors(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const set = new Set<number>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const val = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    set.add(val);
    if (set.size > 5000) break; // cap search for performance
  }

  return set.size;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
