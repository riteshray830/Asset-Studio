import { readPsd, Layer as AgPsdLayer, Psd } from 'ag-psd';
import { StudioLayer } from '../types/project';

export interface PsdParseResult {
  width: number;
  height: number;
  layers: StudioLayer[];
  flattenedDataUrl?: string;
  warnings: string[];
}

/**
 * Checks if buffer has a Photoshop PSD signature ('8BPS')
 */
export function hasPsdSignature(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return view.getUint32(0) === 0x38425053; // '8BPS'
}

/**
 * Parses an Adobe Photoshop PSD file into editable StudioLayers
 */
export async function parsePsdFile(file: File): Promise<PsdParseResult> {
  const buffer = await file.arrayBuffer();
  const warnings: string[] = [];

  try {
    let psd: Psd;
    try {
      psd = readPsd(buffer, {
        skipThumbnail: false,
        skipLayerImageData: false,
        useImageData: true,
        totalMemoryLimit: undefined // Explicitly removes artificial 2GB cumulative memory ceiling
      });
    } catch (memErr: any) {
      console.warn('Initial PSD read failed, retrying with optimized options:', memErr);
      psd = readPsd(buffer, {
        skipThumbnail: true,
        skipLayerImageData: false,
        useImageData: true,
        totalMemoryLimit: undefined
      });
    }

    const width = psd.width || 800;
    const height = psd.height || 600;
    const layers: StudioLayer[] = [];

    // Helper to recursively process layers
    function processLayer(node: AgPsdLayer, parentId?: string): StudioLayer {
      const id = `layer_${Math.random().toString(36).substring(2, 9)}`;
      const nodeW = (node.right !== undefined && node.left !== undefined) 
        ? Math.max(1, node.right - node.left) 
        : (node.canvas?.width || width);
      const nodeH = (node.bottom !== undefined && node.top !== undefined) 
        ? Math.max(1, node.bottom - node.top) 
        : (node.canvas?.height || height);

      const layerCanvas = node.canvas || createCanvasFromImageData(node.imageData, nodeW, nodeH);
      const dataUrl = layerCanvas 
        ? layerCanvas.toDataURL('image/png') 
        : createEmptyCanvasUrl(nodeW, nodeH);

      const isGroup = Array.isArray(node.children) && node.children.length > 0;
      const layer: StudioLayer = {
        id,
        name: node.name || 'Untitled Layer',
        visible: !node.hidden,
        locked: false,
        opacity: typeof node.opacity === 'number' ? Math.max(0, Math.min(1, node.opacity)) : 1,
        blendMode: mapBlendMode(node.blendMode),
        x: node.left || 0,
        y: node.top || 0,
        width: nodeW,
        height: nodeH,
        dataUrl,
        isGroup,
        parentId,
        children: []
      };

      if (isGroup && node.children) {
        layer.children = node.children.map(child => processLayer(child, id));
      }

      return layer;
    }

    if (psd.children && psd.children.length > 0) {
      for (const child of psd.children) {
        layers.push(processLayer(child));
      }
    } else if (psd.canvas) {
      // Single flattened document
      layers.push({
        id: `layer_${Date.now()}`,
        name: 'Background',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        x: 0,
        y: 0,
        width,
        height,
        dataUrl: psd.canvas.toDataURL('image/png')
      });
    }

    const flattenedDataUrl = psd.canvas?.toDataURL('image/png');

    return {
      width,
      height,
      layers,
      flattenedDataUrl,
      warnings
    };
  } catch (err: any) {
    console.error('PSD parsing error:', err);
    throw new Error(`Unable to parse PSD file: ${err?.message || 'Unsupported format'}`);
  }
}

function createCanvasFromImageData(imageData?: any, width?: number, height?: number): HTMLCanvasElement | null {
  if (!imageData || !imageData.data) return null;
  const w = width || imageData.width;
  const h = height || imageData.height;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    try {
      const imgData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width || w,
        imageData.height || h
      );
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('ImageData conversion failed:', e);
    }
  }
  return canvas;
}

function createEmptyCanvasUrl(w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  return canvas.toDataURL('image/png');
}

function mapBlendMode(blendMode?: string): GlobalCompositeOperation {
  switch (blendMode) {
    case 'multiply': return 'multiply';
    case 'screen': return 'screen';
    case 'overlay': return 'overlay';
    case 'darken': return 'darken';
    case 'lighten': return 'lighten';
    case 'color-dodge': return 'color-dodge';
    case 'color-burn': return 'color-burn';
    case 'hard-light': return 'hard-light';
    case 'soft-light': return 'soft-light';
    case 'difference': return 'difference';
    case 'exclusion': return 'exclusion';
    default: return 'source-over';
  }
}
