import { loadImage } from './spriteDetector';

export interface ColorKeyOptions {
  targetR: number;
  targetG: number;
  targetB: number;
  tolerance: number; // 0 to 100
  feather: number; // 0 to 10 px
  defringe: number; // 0 to 5 px
  contiguous: boolean;
  startX?: number;
  startY?: number;
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
  exposure: number; // -100 to 100
  gamma: number; // 0.1 to 3.0 (default 1.0)
  blur: number; // 0 to 20 px
  sharpen: number; // 0 to 100
  grayscale: boolean;
  invert: boolean;
}

/**
 * Removes background using color-keying or contiguous magic wand flood fill
 */
export async function removeBackground(
  imageSrc: string,
  options: ColorKeyOptions
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;

  const { targetR, targetG, targetB, tolerance, contiguous, startX = 0, startY = 0 } = options;
  const maxDistance = (tolerance / 100) * 441.67; // max Euclidean color distance is sqrt(255^2*3) = 441.67

  if (!contiguous) {
    // Global color keying
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.hypot(r - targetR, g - targetG, b - targetB);

      if (dist <= maxDistance) {
        data[i + 3] = 0; // Set transparent
      } else if (options.feather > 0 && dist < maxDistance + options.feather * 10) {
        // Soft edge
        const t = (dist - maxDistance) / (options.feather * 10);
        data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, t)));
      }
    }
  } else {
    // Contiguous flood fill from starting point
    const visited = new Uint8Array(width * height);
    const queue = [startX, startY];
    const idx = (x: number, y: number) => y * width + x;

    const startPIdx = idx(startX, startY);
    visited[startPIdx] = 1;

    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      const pIdx = idx(cx, cy);

      const r = data[pIdx * 4];
      const g = data[pIdx * 4 + 1];
      const b = data[pIdx * 4 + 2];
      const dist = Math.hypot(r - targetR, g - targetG, b - targetB);

      if (dist <= maxDistance) {
        data[pIdx * 4 + 3] = 0;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = idx(nx, ny);
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Applies color and lighting adjustments to an image
 */
export async function applyAdjustments(
  imageSrc: string,
  adjustments: ImageAdjustments
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  // Apply CSS filters for blur, brightness, contrast, hue, invert
  let filterStr = '';
  if (adjustments.brightness !== 0) filterStr += `brightness(${100 + adjustments.brightness}%) `;
  if (adjustments.contrast !== 0) filterStr += `contrast(${100 + adjustments.contrast}%) `;
  if (adjustments.saturation !== 0) filterStr += `saturate(${100 + adjustments.saturation}%) `;
  if (adjustments.hue !== 0) filterStr += `hue-rotate(${adjustments.hue}deg) `;
  if (adjustments.invert) filterStr += 'invert(100%) ';
  if (adjustments.grayscale) filterStr += 'grayscale(100%) ';
  if (adjustments.blur > 0) filterStr += `blur(${adjustments.blur}px) `;

  ctx.filter = filterStr.trim() || 'none';
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';

  // Apply pixel-level Gamma & Exposure if modified
  if (adjustments.gamma !== 1.0 || adjustments.exposure !== 0 || adjustments.sharpen > 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const expFactor = Math.pow(2, adjustments.exposure / 50);
    const invGamma = 1 / Math.max(0.1, adjustments.gamma);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;

      let r = data[i] * expFactor;
      let g = data[i + 1] * expFactor;
      let b = data[i + 2] * expFactor;

      if (adjustments.gamma !== 1.0) {
        r = 255 * Math.pow(r / 255, invGamma);
        g = 255 * Math.pow(g / 255, invGamma);
        b = 255 * Math.pow(b / 255, invGamma);
      }

      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }

    // Apply sharpen convolution if sharpen > 0
    if (adjustments.sharpen > 0) {
      applySharpenConvolution(imgData, adjustments.sharpen / 100);
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

function applySharpenConvolution(imgData: ImageData, amount: number): void {
  const data = imgData.data;
  const w = imgData.width;
  const h = imgData.height;
  const copy = new Uint8ClampedArray(data);

  // Kernel:
  // [  0, -a,  0 ]
  // [ -a, 1+4a, -a ]
  // [  0, -a,  0 ]
  const a = amount;
  const center = 1 + 4 * a;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (copy[idx + 3] === 0) continue;

      const top = ((y - 1) * w + x) * 4;
      const bottom = ((y + 1) * w + x) * 4;
      const left = (y * w + (x - 1)) * 4;
      const right = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          copy[idx + c] * center -
          (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]) * a;
        data[idx + c] = Math.max(0, Math.min(255, val));
      }
    }
  }
}
