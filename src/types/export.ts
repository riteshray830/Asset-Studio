export type ExportFormat = 'png' | 'webp' | 'jpg' | 'gif' | 'zip';

export type EngineTarget = 'unity' | 'godot' | 'phaser-hash' | 'phaser-array' | 'generic-json' | 'generic-xml' | 'generic-csv';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  fixable: boolean;
  fixAction?: () => void;
  affectedSpriteIds?: string[];
}

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  dataUrl?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  resultDataUrl?: string;
  resultBlob?: Blob;
  resultSize?: number;
}

export interface BatchConfig {
  operations: {
    trim: boolean;
    removeBackground: boolean;
    bgTolerance: number;
    resize: boolean;
    resizeMode: 'exact' | 'scale' | 'fit';
    targetWidth: number;
    targetHeight: number;
    scalePercent: number;
    normalize: boolean;
    formatConvert: boolean;
    targetFormat: 'png' | 'webp' | 'jpg';
    quality: number;
    rename: boolean;
    renamePrefix: string;
    renameSuffix: string;
    renameSearch: string;
    renameReplace: string;
    renameSequenceStart: number;
    renameSequencePadding: number;
  };
}

export interface OptimizationResult {
  originalBlob: Blob;
  originalSize: number;
  optimizedBlob: Blob;
  optimizedSize: number;
  dataUrl: string;
  format: 'png' | 'webp' | 'jpg';
  savingsPercent: number;
  colorCount: number;
}
