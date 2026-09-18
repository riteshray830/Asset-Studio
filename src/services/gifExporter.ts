import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { SpriteFrame } from '../types/project';
import { loadImage } from './spriteDetector';

export interface GifExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  loop?: boolean;
  durations?: Record<string, number>;
}

/**
 * Encodes sprite frames into an animated GIF in the browser using gifenc
 */
export async function exportFramesToGif(
  frames: SpriteFrame[],
  options: GifExportOptions = {}
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames provided for GIF export');
  }

  const fps = options.fps || 12;
  const defaultDelay = Math.round(1000 / fps);
  const targetW = options.width || frames[0].width;
  const targetH = options.height || frames[0].height;

  const gif = GIFEncoder();
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for GIF rendering');

  for (const frame of frames) {
    ctx.clearRect(0, 0, targetW, targetH);
    const img = await loadImage(frame.dataUrl);

    // Center sprite in target GIF canvas
    const dx = Math.round((targetW - frame.width) / 2);
    const dy = Math.round((targetH - frame.height) / 2);
    ctx.drawImage(img, dx, dy);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const rgba = imgData.data;

    // Quantize into 256 color palette with transparent index support
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    const delay = (options.durations && options.durations[frame.id]) || defaultDelay;

    gif.writeFrame(index, targetW, targetH, {
      palette,
      delay,
      repeat: options.loop !== false ? 0 : -1
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
}
