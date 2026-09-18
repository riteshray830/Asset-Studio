export type WorkspaceMode = 
  | 'dashboard'
  | 'editor'
  | 'sprites'
  | 'animation'
  | 'atlas'
  | 'optimize'
  | 'batch'
  | 'export';

export type ToolType =
  | 'select'
  | 'move'
  | 'crop'
  | 'slice'
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'shape-rect'
  | 'shape-circle'
  | 'shape-line'
  | 'bg-remove';

export interface StudioLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: GlobalCompositeOperation | string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string; // base64 or blob url
  canvas?: HTMLCanvasElement;
  isGroup?: boolean;
  parentId?: string;
  children?: StudioLayer[];
}

export interface SpriteFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Trimming metrics
  trimmed?: boolean;
  trimmedX?: number;
  trimmedY?: number;
  trimmedWidth?: number;
  trimmedHeight?: number;
  originalWidth: number;
  originalHeight: number;
  anchor: { x: number; y: number }; // 0 to 1 normalized, default (0.5, 1) bottom-center
  dataUrl: string;
  canvas?: HTMLCanvasElement;
}

export interface AnimationSequence {
  id: string;
  name: string;
  frameIds: string[];
  frameDurations: Record<string, number>; // frameId -> duration in ms (default 100ms)
  fps: number;
  loop: boolean;
  pingPong: boolean;
}

export interface AtlasConfig {
  maxSize: number; // 512, 1024, 2048, 4096
  padding: number;
  margin: number;
  allowRotation: boolean;
  powerOfTwo: boolean;
  extrusion: number; // 0, 2, 4, 8 px
  algorithm: 'maxrects-bssf' | 'maxrects-baf' | 'shelf';
}

export interface PackedFrame {
  id: string;
  name: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  atlasIndex: number;
}

export interface PackedAtlas {
  id: string;
  index: number;
  name: string;
  width: number;
  height: number;
  dataUrl: string;
  canvas?: HTMLCanvasElement;
  frames: PackedFrame[];
  utilization: number; // 0 - 100%
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[]; // hex codes
}

export interface StudioSettings {
  theme: 'dark' | 'light';
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  pixelPerfect: boolean;
  showRulers: boolean;
  showGuides: boolean;
  showCheckerboard: boolean;
  checkerboardType: 'dark' | 'light';
  onionSkin: {
    enabled: boolean;
    prevFrames: number;
    nextFrames: number;
    prevAlpha: number;
    nextAlpha: number;
  };
}

export interface StudioProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  layers: StudioLayer[];
  activeLayerId: string;
  sprites: SpriteFrame[];
  selectedSpriteIds: string[];
  activeSpriteId: string | null;
  animations: AnimationSequence[];
  activeAnimationId: string;
  atlasConfig: AtlasConfig;
  packedAtlases: PackedAtlas[];
  palettes: ColorPalette[];
  activePaletteId: string;
  primaryColor: string;
  secondaryColor: string;
  settings: StudioSettings;
}

export interface SliceBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
