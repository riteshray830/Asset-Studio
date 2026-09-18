import { SpriteFrame } from '../types/project';

/**
 * Automatically detects sprite regions using Connected Component Labeling on alpha channel
 */
export function detectSpritesAutomatic(
  canvas: HTMLCanvasElement,
  alphaThreshold = 10,
  minSize = 4
): SpriteFrame[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 2D visited array
  const visited = new Uint8Array(width * height);
  const boxes: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

  // Helper index
  const idx = (x: number, y: number) => y * width + x;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pIdx = idx(x, y);
      if (visited[pIdx]) continue;

      const alpha = data[pIdx * 4 + 3];
      if (alpha <= alphaThreshold) {
        visited[pIdx] = 1;
        continue;
      }

      // BFS to find connected island
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      const queue: number[] = [x, y];
      visited[pIdx] = 1;

      let head = 0;
      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-neighborhood
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
              if (data[nIdx * 4 + 3] > alphaThreshold) {
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      if (boxW >= minSize && boxH >= minSize) {
        boxes.push({ minX, minY, maxX, maxY });
      }
    }
  }

  // Sort boxes from top-to-bottom, left-to-right
  boxes.sort((a, b) => {
    const rowDiff = Math.floor(a.minY / 16) - Math.floor(b.minY / 16);
    if (rowDiff !== 0) return rowDiff;
    return a.minX - b.minX;
  });

  return boxes.map((box, index) => {
    const w = box.maxX - box.minX + 1;
    const h = box.maxY - box.minY + 1;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = w;
    spriteCanvas.height = h;
    const sCtx = spriteCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(canvas, box.minX, box.minY, w, h, 0, 0, w, h);
    }

    const numStr = String(index + 1).padStart(2, '0');
    return {
      id: `sprite_${Date.now()}_${index}`,
      name: `sprite_${numStr}`,
      x: box.minX,
      y: box.minY,
      width: w,
      height: h,
      originalWidth: w,
      originalHeight: h,
      anchor: { x: 0.5, y: 1.0 },
      dataUrl: spriteCanvas.toDataURL('image/png')
    };
  });
}

/**
 * Grid-based slicing
 */
export function sliceByGrid(
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
  spriteW?: number,
  spriteH?: number,
  margin = 0,
  padding = 0
): SpriteFrame[] {
  const width = canvas.width;
  const height = canvas.height;

  const cellW = spriteW || Math.floor((width - margin * 2 - (cols - 1) * padding) / cols);
  const cellH = spriteH || Math.floor((height - margin * 2 - (rows - 1) * padding) / rows);

  const sprites: SpriteFrame[] = [];
  let count = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = margin + c * (cellW + padding);
      const sy = margin + r * (cellH + padding);

      if (sx + cellW > width || sy + cellH > height) continue;

      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = cellW;
      spriteCanvas.height = cellH;
      const sCtx = spriteCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(canvas, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
      }

      const numStr = String(count++).padStart(2, '0');
      sprites.push({
        id: `sprite_grid_${Date.now()}_${r}_${c}`,
        name: `frame_${numStr}`,
        x: sx,
        y: sy,
        width: cellW,
        height: cellH,
        originalWidth: cellW,
        originalHeight: cellH,
        anchor: { x: 0.5, y: 1.0 },
        dataUrl: spriteCanvas.toDataURL('image/png')
      });
    }
  }

  return sprites;
}

/**
 * Trims transparent pixels from a SpriteFrame
 */
export async function trimSpriteFrame(sprite: SpriteFrame, customPadding = 0): Promise<SpriteFrame> {
  const img = await loadImage(sprite.dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sprite;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    // Entire frame is transparent
    return sprite;
  }

  const trimmedW = Math.max(1, maxX - minX + 1 + customPadding * 2);
  const trimmedH = Math.max(1, maxY - minY + 1 + customPadding * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedW;
  trimmedCanvas.height = trimmedH;
  const tCtx = trimmedCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(
      canvas,
      minX,
      minY,
      maxX - minX + 1,
      maxY - minY + 1,
      customPadding,
      customPadding,
      maxX - minX + 1,
      maxY - minY + 1
    );
  }

  return {
    ...sprite,
    trimmed: true,
    trimmedX: minX,
    trimmedY: minY,
    trimmedWidth: trimmedW,
    trimmedHeight: trimmedH,
    width: trimmedW,
    height: trimmedH,
    dataUrl: trimmedCanvas.toDataURL('image/png')
  };
}

/**
 * Normalizes multiple sprites to have uniform dimensions with specific anchor alignment
 */
export async function normalizeSprites(
  sprites: SpriteFrame[],
  mode: 'width' | 'height' | 'both' = 'both',
  anchor: 'center' | 'bottom-center' | 'top-left' = 'bottom-center'
): Promise<SpriteFrame[]> {
  if (sprites.length === 0) return [];

  let targetW = 0;
  let targetH = 0;

  for (const s of sprites) {
    if (s.width > targetW) targetW = s.width;
    if (s.height > targetH) targetH = s.height;
  }

  const results: SpriteFrame[] = [];

  for (const s of sprites) {
    const newW = (mode === 'width' || mode === 'both') ? targetW : s.width;
    const newH = (mode === 'height' || mode === 'both') ? targetH : s.height;

    let destX = 0;
    let destY = 0;

    if (anchor === 'bottom-center') {
      destX = Math.round((newW - s.width) / 2);
      destY = newH - s.height;
    } else if (anchor === 'center') {
      destX = Math.round((newW - s.width) / 2);
      destY = Math.round((newH - s.height) / 2);
    }

    const normCanvas = document.createElement('canvas');
    normCanvas.width = newW;
    normCanvas.height = newH;
    const ctx = normCanvas.getContext('2d');
    if (ctx) {
      const img = await loadImage(s.dataUrl);
      ctx.drawImage(img, destX, destY);
    }

    results.push({
      ...s,
      width: newW,
      height: newH,
      dataUrl: normCanvas.toDataURL('image/png')
    });
  }

  return results;
}

/**
 * Detects visual similarity percentage between two frames (0 - 100%)
 */
export async function calculateFrameSimilarity(frameA: SpriteFrame, frameB: SpriteFrame): Promise<number> {
  if (frameA.width !== frameB.width || frameA.height !== frameB.height) {
    return 0;
  }

  const [imgA, imgB] = await Promise.all([loadImage(frameA.dataUrl), loadImage(frameB.dataUrl)]);
  const canvasA = document.createElement('canvas');
  canvasA.width = frameA.width;
  canvasA.height = frameA.height;
  const ctxA = canvasA.getContext('2d');
  ctxA?.drawImage(imgA, 0, 0);

  const canvasB = document.createElement('canvas');
  canvasB.width = frameB.width;
  canvasB.height = frameB.height;
  const ctxB = canvasB.getContext('2d');
  ctxB?.drawImage(imgB, 0, 0);

  const dataA = ctxA?.getImageData(0, 0, frameA.width, frameA.height).data;
  const dataB = ctxB?.getImageData(0, 0, frameB.width, frameB.height).data;

  if (!dataA || !dataB) return 0;

  let totalDiff = 0;
  const totalPixels = frameA.width * frameA.height;

  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs(dataA[i] - dataB[i]);
    const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
    const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
    const da = Math.abs(dataA[i + 3] - dataB[i + 3]);
    const pixelDiff = (dr + dg + db + da) / (255 * 4);
    totalDiff += pixelDiff;
  }

  const similarity = Math.max(0, 100 - (totalDiff / totalPixels) * 100);
  return Math.round(similarity * 10) / 10;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
