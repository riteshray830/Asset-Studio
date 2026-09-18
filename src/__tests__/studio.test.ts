import { describe, it, expect } from 'vitest';
import { 
  generatePhaserHashJson, 
  generatePhaserArrayJson, 
  generateGodotTres, 
  generateUnityMeta, 
  generateGenericJson,
  generateGenericXml,
  generateGenericCsv
} from '../services/engineExporters';
import { PackedAtlas, StudioProject } from '../types/project';
import { hexToRgb, rgbToHex } from '../services/optimizer';
import { RETRO_PALETTES } from '../services/sampleAssets';

describe('GeekRush Asset Studio - Engine Exporters', () => {
  const mockAtlas: PackedAtlas = {
    id: 'atlas_test_01',
    index: 0,
    name: 'atlas_01',
    width: 512,
    height: 512,
    dataUrl: 'data:image/png;base64,mock',
    utilization: 85.5,
    frames: [
      {
        id: 'sprite_01',
        name: 'player_idle_01',
        frame: { x: 4, y: 4, w: 48, h: 48 },
        rotated: false,
        trimmed: true,
        spriteSourceSize: { x: 2, y: 2, w: 44, h: 44 },
        sourceSize: { w: 48, h: 48 },
        atlasIndex: 0
      },
      {
        id: 'sprite_02',
        name: 'player_idle_02',
        frame: { x: 56, y: 4, w: 48, h: 48 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 48, h: 48 },
        sourceSize: { w: 48, h: 48 },
        atlasIndex: 0
      }
    ]
  };

  const mockProject: StudioProject = {
    id: 'proj_test',
    name: 'Test Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: 512,
    height: 512,
    layers: [],
    activeLayerId: '',
    sprites: [],
    selectedSpriteIds: [],
    activeSpriteId: null,
    animations: [
      {
        id: 'anim_idle',
        name: 'Idle',
        frameIds: ['sprite_01', 'sprite_02'],
        frameDurations: {},
        fps: 12,
        loop: true,
        pingPong: false
      }
    ],
    activeAnimationId: 'anim_idle',
    atlasConfig: {
      maxSize: 512,
      padding: 2,
      margin: 4,
      allowRotation: false,
      powerOfTwo: true,
      extrusion: 2,
      algorithm: 'maxrects-bssf'
    },
    packedAtlases: [mockAtlas],
    palettes: RETRO_PALETTES,
    activePaletteId: 'pico-8',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    settings: {
      theme: 'dark',
      gridSize: 16,
      showGrid: true,
      snapToGrid: false,
      pixelPerfect: true,
      showRulers: true,
      showGuides: false,
      showCheckerboard: true,
      checkerboardType: 'dark',
      onionSkin: {
        enabled: false,
        prevFrames: 1,
        nextFrames: 1,
        prevAlpha: 0.4,
        nextAlpha: 0.3
      }
    }
  };

  it('generates valid Phaser 3 JSON Hash format', () => {
    const jsonStr = generatePhaserHashJson(mockAtlas);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.meta.image).toBe('atlas_01.png');
    expect(parsed.meta.size.w).toBe(512);
    expect(parsed.frames['player_idle_01']).toBeDefined();
    expect(parsed.frames['player_idle_01'].frame.x).toBe(4);
    expect(parsed.frames['player_idle_01'].frame.w).toBe(48);
  });

  it('generates valid Phaser 3 JSON Array format', () => {
    const jsonStr = generatePhaserArrayJson(mockAtlas);
    const parsed = JSON.parse(jsonStr);

    expect(Array.isArray(parsed.frames)).toBe(true);
    expect(parsed.frames.length).toBe(2);
    expect(parsed.frames[0].filename).toBe('player_idle_01');
  });

  it('generates Godot 4 SpriteFrames .tres resource', () => {
    const tres = generateGodotTres(mockAtlas, mockProject);

    expect(tres).toContain('[gd_resource type="SpriteFrames" load_steps=2 format=3]');
    expect(tres).toContain('[ext_resource type="Texture2D" path="res://atlas_01.png" id="1_atlas"]');
    expect(tres).toContain('region = Rect2(4, 4, 48, 48)');
    expect(tres).toContain('"name": &"Idle"');
  });

  it('generates Unity 2D SpriteSheet .meta YAML', () => {
    const meta = generateUnityMeta(mockAtlas);

    expect(meta).toContain('fileFormatVersion: 2');
    expect(meta).toContain('TextureImporter:');
    expect(meta).toContain('spriteMode: 2');
    expect(meta).toContain('name: player_idle_01');
    expect(meta).toContain('width: 48');
  });

  it('generates Generic JSON, XML and CSV', () => {
    const genericJson = JSON.parse(generateGenericJson(mockAtlas));
    expect(genericJson.frames.length).toBe(2);

    const xml = generateGenericXml(mockAtlas);
    expect(xml).toContain('<TextureAtlas');
    expect(xml).toContain('name="player_idle_01"');

    const csv = generateGenericCsv(mockAtlas);
    expect(csv).toContain('"player_idle_01",4,4,48,48,false,true');
  });
});

describe('GeekRush Asset Studio - Color & Palette Utilities', () => {
  it('converts RGB to Hex and back', () => {
    const hex = rgbToHex(255, 128, 0);
    expect(hex.toLowerCase()).toBe('#ff8000');

    const rgb = hexToRgb(hex);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(128);
    expect(rgb.b).toBe(0);
  });

  it('provides retro palettes with valid colors', () => {
    expect(RETRO_PALETTES.length).toBeGreaterThanOrEqual(4);
    const pico8 = RETRO_PALETTES.find(p => p.id === 'pico-8');
    expect(pico8).toBeDefined();
    expect(pico8?.colors.length).toBe(16);
    expect(pico8?.colors[0].startsWith('#')).toBe(true);
  });
});
