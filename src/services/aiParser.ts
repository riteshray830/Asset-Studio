import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { StudioLayer } from '../types/project';

// Set up local worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface AiParseResult {
  width: number;
  height: number;
  layers: StudioLayer[];
  flattenedDataUrl?: string;
  artboardCount: number;
  warnings: string[];
}

/**
 * Checks if buffer has a PDF stream signature (Modern Adobe Illustrator file)
 */
export function hasPdfSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 2048));
  const text = new TextDecoder('latin1').decode(bytes);
  return text.includes('%PDF-');
}

/**
 * Parses Adobe Illustrator (.ai) files preserving layers and artboards
 */
export async function parseAiFile(file: File, scale = 2): Promise<AiParseResult> {
  const buffer = await file.arrayBuffer();
  const warnings: string[] = [];

  // Check if modern PDF-compatible Illustrator file
  if (!hasPdfSignature(buffer)) {
    // Attempt to extract legacy EPS/Postscript layers or embedded thumbnail
    return parseLegacyAiFile(buffer, file.name);
  }

  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      stopAtErrors: false
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const layers: StudioLayer[] = [];

    // Get page 1 dimensions
    const page1 = await pdfDoc.getPage(1);
    const viewport1 = page1.getViewport({ scale });
    const docWidth = Math.round(viewport1.width);
    const docHeight = Math.round(viewport1.height);

    // Try to retrieve Optional Content Groups (Illustrator Layers)
    const ocgEntries: [string, any][] = [];
    try {
      const optionalContentConfig = await pdfDoc.getOptionalContentConfig();
      if (optionalContentConfig) {
        if (typeof (optionalContentConfig as any)[Symbol.iterator] === 'function') {
          for (const [id, group] of (optionalContentConfig as any)) {
            ocgEntries.push([id, group]);
          }
        } else if (typeof (optionalContentConfig as any).getOrder === 'function') {
          const order = (optionalContentConfig as any).getOrder();
          if (Array.isArray(order)) {
            for (const id of order) {
              const grp = (optionalContentConfig as any).getGroup(id);
              if (grp) ocgEntries.push([id, grp]);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not read OCG layer config from AI:', e);
    }

    if (ocgEntries.length > 0) {
      // Modern AI with individual Illustrator Layers
      for (let i = 0; i < ocgEntries.length; i++) {
        const [groupId, groupObj] = ocgEntries[i];
        const layerName = groupObj?.name || `Layer ${i + 1}`;

        // Render page with ONLY this layer visible
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = docWidth;
        layerCanvas.height = docHeight;
        const ctx = layerCanvas.getContext('2d');
        if (!ctx) continue;

        // Isolate current layer
        try {
          const customConfig = await pdfDoc.getOptionalContentConfig();
          for (const [gid] of ocgEntries) {
            customConfig.setVisibility(gid, gid === groupId);
          }

          const renderContext = {
            canvas: layerCanvas,
            canvasContext: ctx,
            viewport: viewport1,
            optionalContentConfigPromise: Promise.resolve(customConfig)
          };

          await (page1.render(renderContext as any) as any).promise;

          layers.push({
            id: `ai_layer_${Date.now()}_${i}`,
            name: layerName,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
            x: 0,
            y: 0,
            width: docWidth,
            height: docHeight,
            dataUrl: layerCanvas.toDataURL('image/png')
          });
        } catch (err) {
          console.warn(`Error rendering AI layer ${layerName}:`, err);
        }
      }
    }

    // If no individual OCG layers were detected or rendered, render each Artboard / Page
    if (layers.length === 0) {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const pWidth = Math.round(viewport.width);
        const pHeight = Math.round(viewport.height);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = pWidth;
        pageCanvas.height = pHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) continue;

        await (page.render({
          canvas: pageCanvas,
          canvasContext: ctx,
          viewport
        } as any) as any).promise;

        const artboardName = numPages > 1 ? `Artboard ${pageNum}` : (file.name.replace(/\.[^/.]+$/, '') || 'Layer 1');

        layers.push({
          id: `ai_artboard_${Date.now()}_${pageNum}`,
          name: artboardName,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
          dataUrl: pageCanvas.toDataURL('image/png')
        });
      }
    }

    // Render composite flattened thumbnail
    const flattenedCanvas = document.createElement('canvas');
    flattenedCanvas.width = docWidth;
    flattenedCanvas.height = docHeight;
    const fCtx = flattenedCanvas.getContext('2d');
    if (fCtx) {
      await (page1.render({
        canvas: flattenedCanvas,
        canvasContext: fCtx,
        viewport: viewport1
      } as any) as any).promise;
    }

    return {
      width: docWidth,
      height: docHeight,
      layers: layers.length > 0 ? layers : [createFallbackLayer(docWidth, docHeight, flattenedCanvas.toDataURL('image/png'))],
      flattenedDataUrl: flattenedCanvas.toDataURL('image/png'),
      artboardCount: numPages,
      warnings
    };
  } catch (err: any) {
    console.error('Error parsing Illustrator document:', err);
    throw new Error(`Unable to parse Illustrator document: ${err.message || 'Corrupt or unsupported stream'}`);
  }
}

/**
 * Handles PostScript-based legacy Illustrator files or provides helpful guidance
 */
function parseLegacyAiFile(buffer: ArrayBuffer, filename: string): AiParseResult {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('latin1').decode(bytes.slice(0, 100000));

  // Check if it's an EPS / Postscript file with embedded TIFF/JPEG preview
  // Look for %%BoundingBox: llx lly urx ury
  const bboxMatch = text.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)/);
  let w = 800;
  let h = 600;
  if (bboxMatch) {
    const urx = parseInt(bboxMatch[3]);
    const ury = parseInt(bboxMatch[4]);
    const llx = parseInt(bboxMatch[1]);
    const lly = parseInt(bboxMatch[2]);
    w = Math.max(100, Math.abs(urx - llx));
    h = Math.max(100, Math.abs(ury - lly));
  }

  // Look for PostScript layer headers: %AI5_BeginLayer
  const layerMatches = Array.from(text.matchAll(/%AI5_BeginLayer[\r\n]+([^\r\n]+)/g));
  const layers: StudioLayer[] = [];

  if (layerMatches.length > 0) {
    layerMatches.forEach((m, idx) => {
      const rawName = m[1].replace(/^\([^)]*\)\s*/, '').trim() || `Layer ${idx + 1}`;
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = w;
      dummyCanvas.height = h;
      layers.push({
        id: `legacy_ai_layer_${Date.now()}_${idx}`,
        name: rawName,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        x: 0,
        y: 0,
        width: w,
        height: h,
        dataUrl: dummyCanvas.toDataURL('image/png')
      });
    });
  }

  if (layers.length > 0) {
    return {
      width: w,
      height: h,
      layers,
      artboardCount: 1,
      warnings: [
        'This legacy Illustrator file was parsed using PostScript metadata. For full vector rasterization, save with "Create PDF Compatible File" enabled.'
      ]
    };
  }

  throw new Error(
    `This Adobe Illustrator file ("${filename}") was saved without PDF Compatibility. ` +
    `To edit layers in GeekRush Studio, open the file in Adobe Illustrator, select File > Save As, and ensure "Create PDF Compatible File" is checked.`
  );
}


function createFallbackLayer(w: number, h: number, dataUrl: string): StudioLayer {
  return {
    id: `ai_layer_${Date.now()}`,
    name: 'Artwork',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'source-over',
    x: 0,
    y: 0,
    width: w,
    height: h,
    dataUrl
  };
}
