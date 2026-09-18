import { ColorPalette, SpriteFrame, StudioLayer, StudioProject } from '../types/project';

export const RETRO_PALETTES: ColorPalette[] = [
  {
    id: 'pico-8',
    name: 'PICO-8 (16 Colors)',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    id: 'gameboy',
    name: 'Game Boy DMG (4 Colors)',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']
  },
  {
    id: 'nes',
    name: 'NES Classic (16 Colors)',
    colors: [
      '#000000', '#2038ec', '#0058f8', '#38b0fc',
      '#007800', '#58d854', '#e40058', '#f87858',
      '#ac7c00', '#f8b800', '#fce0a8', '#ffffff',
      '#503000', '#f85898', '#6888fc', '#9878f8'
    ]
  },
  {
    id: 'cga',
    name: 'CGA Mode 1 (4 Colors)',
    colors: ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa']
  }
];

/**
 * Creates the Pixel Knight sample project
 */
export function createPixelKnightSample(): StudioProject {
  const canvasW = 320;
  const canvasH = 192;
  const frameW = 48;
  const frameH = 48;

  // Generate 8 animation frames for the Knight (4 Idle + 4 Run)
  const sprites: SpriteFrame[] = [];
  const animFrameIds: { idle: string[]; run: string[]; attack: string[] } = {
    idle: [],
    run: [],
    attack: []
  };

  // Helper to draw a pixel knight frame
  function drawKnight(variant: 'idle' | 'run' | 'attack', step: number): string {
    const c = document.createElement('canvas');
    c.width = frameW;
    c.height = frameH;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Bobbing offset
    const bob = variant === 'idle' ? (step % 2 === 0 ? 0 : 1) : 0;
    const legOffset = variant === 'run' ? (step % 2 === 0 ? -2 : 2) : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(24, 44, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs / Boots
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(19 + legOffset, 32 + bob, 4, 10);
    ctx.fillRect(25 - legOffset, 32 + bob, 4, 10);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(18 + legOffset, 40 + bob, 6, 3);
    ctx.fillRect(24 - legOffset, 40 + bob, 6, 3);

    // Body / Blue Cape
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(16, 20 + bob, 16, 14);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(18, 22 + bob, 12, 10);

    // Armor Plate
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(20, 24 + bob, 8, 8);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(21, 25 + bob, 6, 3);

    // Helmet & Visor
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(18, 10 + bob, 12, 11);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(20, 11 + bob, 8, 3);
    // Dark visor slit
    ctx.fillStyle = '#111827';
    ctx.fillRect(22, 15 + bob, 8, 3);
    // Red plume on helmet
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(21, 6 + bob, 5, 5);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(22, 7 + bob, 3, 3);

    // Weapon / Sword
    if (variant === 'attack') {
      const slashAngle = step * 0.4;
      ctx.save();
      ctx.translate(28, 26 + bob);
      ctx.rotate(slashAngle);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, -18, 4, 20);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-3, 0, 10, 3); // guard
      ctx.restore();
    } else {
      // Resting sword
      ctx.fillStyle = '#d97706';
      ctx.fillRect(30, 24 + bob, 4, 2);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(31, 14 + bob, 2, 12);
      // Shield
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(14, 22 + bob, 4, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(15, 25 + bob, 2, 4);
    }

    return c.toDataURL('image/png');
  }

  // Generate Idle frames (4 frames)
  for (let i = 0; i < 4; i++) {
    const id = `knight_idle_${i + 1}`;
    sprites.push({
      id,
      name: `knight_idle_${String(i + 1).padStart(2, '0')}`,
      x: i * frameW,
      y: 0,
      width: frameW,
      height: frameH,
      originalWidth: frameW,
      originalHeight: frameH,
      anchor: { x: 0.5, y: 1.0 },
      dataUrl: drawKnight('idle', i)
    });
    animFrameIds.idle.push(id);
  }

  // Generate Run frames (4 frames)
  for (let i = 0; i < 4; i++) {
    const id = `knight_run_${i + 1}`;
    sprites.push({
      id,
      name: `knight_run_${String(i + 1).padStart(2, '0')}`,
      x: i * frameW,
      y: frameH,
      width: frameW,
      height: frameH,
      originalWidth: frameW,
      originalHeight: frameH,
      anchor: { x: 0.5, y: 1.0 },
      dataUrl: drawKnight('run', i)
    });
    animFrameIds.run.push(id);
  }

  // Generate Attack frames (3 frames)
  for (let i = 0; i < 3; i++) {
    const id = `knight_attack_${i + 1}`;
    sprites.push({
      id,
      name: `knight_attack_${String(i + 1).padStart(2, '0')}`,
      x: i * frameW,
      y: frameH * 2,
      width: frameW,
      height: frameH,
      originalWidth: frameW,
      originalHeight: frameH,
      anchor: { x: 0.5, y: 1.0 },
      dataUrl: drawKnight('attack', i)
    });
    animFrameIds.attack.push(id);
  }

  // Generate layered document representation (Simulating a PSD with layers)
  const layers: StudioLayer[] = [
    {
      id: 'layer_shadow',
      name: 'Shadow',
      visible: true,
      locked: false,
      opacity: 0.7,
      blendMode: 'multiply',
      x: 0,
      y: 0,
      width: canvasW,
      height: canvasH,
      dataUrl: createLayerCanvasUrl(canvasW, canvasH, (ctx) => {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.ellipse(i * frameW + 24, 44, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      })
    },
    {
      id: 'layer_body',
      name: 'Body & Armor',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      x: 0,
      y: 0,
      width: canvasW,
      height: canvasH,
      dataUrl: createLayerCanvasUrl(canvasW, canvasH, (ctx) => {
        sprites.forEach((s) => {
          const img = new Image();
          img.src = s.dataUrl;
          ctx.drawImage(img, s.x, s.y);
        });
      })
    }
  ];

  return {
    id: `project_knight_${Date.now()}`,
    name: 'Pixel Knight Hero',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: canvasW,
    height: canvasH,
    layers,
    activeLayerId: layers[1].id,
    sprites,
    selectedSpriteIds: [sprites[0].id],
    activeSpriteId: sprites[0].id,
    animations: [
      {
        id: 'anim_idle',
        name: 'Idle',
        frameIds: animFrameIds.idle,
        frameDurations: {
          [animFrameIds.idle[0]]: 120,
          [animFrameIds.idle[1]]: 120,
          [animFrameIds.idle[2]]: 120,
          [animFrameIds.idle[3]]: 120
        },
        fps: 8,
        loop: true,
        pingPong: false
      },
      {
        id: 'anim_run',
        name: 'Run',
        frameIds: animFrameIds.run,
        frameDurations: {},
        fps: 12,
        loop: true,
        pingPong: false
      },
      {
        id: 'anim_attack',
        name: 'Attack',
        frameIds: animFrameIds.attack,
        frameDurations: {},
        fps: 10,
        loop: false,
        pingPong: false
      }
    ],
    activeAnimationId: 'anim_idle',
    atlasConfig: {
      maxSize: 1024,
      padding: 2,
      margin: 4,
      allowRotation: false,
      powerOfTwo: true,
      extrusion: 2,
      algorithm: 'maxrects-bssf'
    },
    packedAtlases: [],
    palettes: RETRO_PALETTES,
    activePaletteId: 'pico-8',
    primaryColor: '#3b82f6',
    secondaryColor: '#f59e0b',
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
        enabled: true,
        prevFrames: 1,
        nextFrames: 1,
        prevAlpha: 0.4,
        nextAlpha: 0.3
      }
    }
  };
}

/**
 * Creates the Fantasy RPG Items sample project
 */
export function createRPGItemsSample(): StudioProject {
  const itemSize = 32;
  const items = [
    { name: 'potion_health', color: '#ef4444', accent: '#fca5a5', type: 'bottle' },
    { name: 'potion_mana', color: '#3b82f6', accent: '#93c5fd', type: 'bottle' },
    { name: 'gold_coin', color: '#eab308', accent: '#fef08a', type: 'coin' },
    { name: 'ruby_gem', color: '#ec4899', accent: '#fbcfe8', type: 'gem' },
    { name: 'emerald_gem', color: '#10b981', accent: '#a7f3d0', type: 'gem' },
    { name: 'golden_key', color: '#f59e0b', accent: '#fef3c7', type: 'key' },
    { name: 'iron_sword', color: '#94a3b8', accent: '#f1f5f9', type: 'sword' },
    { name: 'wooden_shield', color: '#78350f', accent: '#b45309', type: 'shield' }
  ];

  const sprites: SpriteFrame[] = items.map((it, idx) => {
    const c = document.createElement('canvas');
    c.width = itemSize;
    c.height = itemSize;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Draw item
    if (it.type === 'bottle') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(13, 4, 6, 4); // cork
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(12, 8, 8, 4); // neck
      ctx.fillStyle = it.color;
      ctx.fillRect(8, 12, 16, 16); // liquid
      ctx.fillStyle = it.accent;
      ctx.fillRect(10, 14, 4, 8); // highlight
    } else if (it.type === 'coin') {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = it.accent;
      ctx.beginPath();
      ctx.arc(15, 15, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('$', 13, 20);
    } else if (it.type === 'gem') {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.moveTo(16, 6);
      ctx.lineTo(26, 14);
      ctx.lineTo(16, 26);
      ctx.lineTo(6, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = it.accent;
      ctx.fillRect(12, 10, 6, 6);
    } else if (it.type === 'key') {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(12, 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(12, 12, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = it.color;
      ctx.fillRect(16, 10, 12, 4);
      ctx.fillRect(22, 14, 3, 5);
      ctx.fillRect(26, 14, 2, 4);
    } else if (it.type === 'sword') {
      ctx.fillStyle = it.accent;
      ctx.fillRect(18, 6, 4, 16);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(14, 20, 12, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(18, 23, 4, 6);
    } else {
      ctx.fillStyle = it.color;
      ctx.fillRect(8, 8, 16, 16);
    }

    return {
      id: `item_${it.name}_${idx}`,
      name: it.name,
      x: (idx % 4) * itemSize,
      y: Math.floor(idx / 4) * itemSize,
      width: itemSize,
      height: itemSize,
      originalWidth: itemSize,
      originalHeight: itemSize,
      anchor: { x: 0.5, y: 0.5 },
      dataUrl: c.toDataURL('image/png')
    };
  });

  const canvasW = 128;
  const canvasH = 64;

  return {
    id: `project_rpg_items_${Date.now()}`,
    name: 'RPG Item Sheet',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: canvasW,
    height: canvasH,
    layers: [
      {
        id: 'layer_items',
        name: 'Item Icons',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        x: 0,
        y: 0,
        width: canvasW,
        height: canvasH,
        dataUrl: createLayerCanvasUrl(canvasW, canvasH, (ctx) => {
          sprites.forEach(s => {
            const img = new Image();
            img.src = s.dataUrl;
            ctx.drawImage(img, s.x, s.y);
          });
        })
      }
    ],
    activeLayerId: 'layer_items',
    sprites,
    selectedSpriteIds: [sprites[0].id],
    activeSpriteId: sprites[0].id,
    animations: [
      {
        id: 'anim_coin_spin',
        name: 'Coin Spin',
        frameIds: [sprites[2].id],
        frameDurations: {},
        fps: 8,
        loop: true,
        pingPong: false
      }
    ],
    activeAnimationId: 'anim_coin_spin',
    atlasConfig: {
      maxSize: 512,
      padding: 2,
      margin: 2,
      allowRotation: false,
      powerOfTwo: true,
      extrusion: 0,
      algorithm: 'maxrects-bssf'
    },
    packedAtlases: [],
    palettes: RETRO_PALETTES,
    activePaletteId: 'pico-8',
    primaryColor: '#eab308',
    secondaryColor: '#ef4444',
    settings: {
      theme: 'dark',
      gridSize: 32,
      showGrid: true,
      snapToGrid: true,
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
}

function createLayerCanvasUrl(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx);
  }
  return canvas.toDataURL('image/png');
}
