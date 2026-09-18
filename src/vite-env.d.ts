/// <reference types="vite/client" />

declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
  }
  export interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }
  export interface GIFEncoderInstance {
    writeFrame: (index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    reset: () => void;
  }
  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors?: number, opts?: any): number[][];
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
}
