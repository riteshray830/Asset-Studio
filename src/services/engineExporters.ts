import JSZip from 'jszip';
import { PackedAtlas, StudioProject } from '../types/project';
import { exportFramesToGif } from './gifExporter';
import { dataUrlToBlob } from './optimizer';

/**
 * Generates Phaser 3 JSON Hash format
 */
export function generatePhaserHashJson(atlas: PackedAtlas): string {
  const framesObj: Record<string, any> = {};

  for (const pf of atlas.frames) {
    framesObj[pf.name] = {
      frame: { x: pf.frame.x, y: pf.frame.y, w: pf.frame.w, h: pf.frame.h },
      rotated: pf.rotated,
      trimmed: pf.trimmed,
      spriteSourceSize: pf.spriteSourceSize,
      sourceSize: pf.sourceSize,
      pivot: { x: 0.5, y: 1.0 }
    };
  }

  const output = {
    frames: framesObj,
    meta: {
      app: 'GeekRush Game Asset Studio',
      version: '1.0.0',
      image: `${atlas.name}.png`,
      format: 'RGBA8888',
      size: { w: atlas.width, h: atlas.height },
      scale: '1'
    }
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generates Phaser 3 JSON Array format
 */
export function generatePhaserArrayJson(atlas: PackedAtlas): string {
  const framesArr = atlas.frames.map(pf => ({
    filename: pf.name,
    frame: { x: pf.frame.x, y: pf.frame.y, w: pf.frame.w, h: pf.frame.h },
    rotated: pf.rotated,
    trimmed: pf.trimmed,
    spriteSourceSize: pf.spriteSourceSize,
    sourceSize: pf.sourceSize,
    pivot: { x: 0.5, y: 1.0 }
  }));

  const output = {
    frames: framesArr,
    meta: {
      app: 'GeekRush Game Asset Studio',
      version: '1.0.0',
      image: `${atlas.name}.png`,
      format: 'RGBA8888',
      size: { w: atlas.width, h: atlas.height },
      scale: '1'
    }
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generates Godot 4 SpriteFrames / AtlasTexture Resource (.tres)
 */
export function generateGodotTres(atlas: PackedAtlas, project: StudioProject): string {
  let tres = `[gd_resource type="SpriteFrames" load_steps=2 format=3]\n\n`;
  tres += `[ext_resource type="Texture2D" path="res://${atlas.name}.png" id="1_atlas"]\n\n`;

  // Define AtlasTextures
  atlas.frames.forEach((pf, i) => {
    const subResId = `sub_resource_${i + 1}`;
    tres += `[sub_resource type="AtlasTexture" id="${subResId}"]\n`;
    tres += `atlas = ExtResource("1_atlas")\n`;
    tres += `region = Rect2(${pf.frame.x}, ${pf.frame.y}, ${pf.frame.w}, ${pf.frame.h})\n\n`;
  });

  tres += `[resource]\nanimations = [{\n`;

  const animSections = project.animations.map(anim => {
    const matchedFrames = anim.frameIds
      .map(fid => atlas.frames.findIndex(f => f.id === fid))
      .filter(idx => idx !== -1)
      .map(idx => `SubResource("sub_resource_${idx + 1}")`);

    return `  "name": &"${anim.name}",\n  "speed": ${anim.fps}.0,\n  "loop": ${anim.loop},\n  "frames": [${matchedFrames.join(', ')}]`;
  });

  tres += animSections.join('\n}, {\n');
  tres += `\n}]\n`;

  return tres;
}

/**
 * Generates Unity SpriteSheet YAML / .meta slice metadata
 */
export function generateUnityMeta(atlas: PackedAtlas): string {
  let meta = `fileFormatVersion: 2\nguid: 10000000000000000000000000000000\nTextureImporter:\n`;
  meta += `  fileIDToRecycleName: {}\n  externalObjects: {}\n  serializedVersion: 12\n`;
  meta += `  textureType: 8\n  spriteMode: 2\n  spritePixelsToUnits: 100\n`;
  meta += `  spriteSheet:\n    serializedVersion: 2\n    sprites:\n`;

  atlas.frames.forEach((pf) => {
    // Unity rect coordinates are bottom-left origin (y is inverted)
    const unityY = atlas.height - (pf.frame.y + pf.frame.h);
    meta += `    - serializedVersion: 2\n`;
    meta += `      name: ${pf.name}\n`;
    meta += `      rect:\n        serializedVersion: 2\n`;
    meta += `        x: ${pf.frame.x}\n        y: ${unityY}\n        width: ${pf.frame.w}\n        height: ${pf.frame.h}\n`;
    meta += `      alignment: 7\n      pivot: {x: 0.5, y: 0}\n      border: {x: 0, y: 0, z: 0, w: 0}\n`;
  });

  return meta;
}

/**
 * Generates generic JSON
 */
export function generateGenericJson(atlas: PackedAtlas): string {
  return JSON.stringify({
    name: atlas.name,
    width: atlas.width,
    height: atlas.height,
    utilization: `${atlas.utilization}%`,
    frames: atlas.frames.map(f => ({
      name: f.name,
      x: f.frame.x,
      y: f.frame.y,
      width: f.frame.w,
      height: f.frame.h,
      rotated: f.rotated,
      trimmed: f.trimmed
    }))
  }, null, 2);
}

/**
 * Generates generic XML
 */
export function generateGenericXml(atlas: PackedAtlas): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<TextureAtlas imagePath="${atlas.name}.png" width="${atlas.width}" height="${atlas.height}">\n`;
  for (const f of atlas.frames) {
    xml += `  <SubTexture name="${f.name}" x="${f.frame.x}" y="${f.frame.y}" width="${f.frame.w}" height="${f.frame.h}" />\n`;
  }
  xml += `</TextureAtlas>`;
  return xml;
}

/**
 * Generates CSV metadata
 */
export function generateGenericCsv(atlas: PackedAtlas): string {
  let csv = 'name,x,y,width,height,rotated,trimmed\n';
  for (const f of atlas.frames) {
    csv += `"${f.name}",${f.frame.x},${f.frame.y},${f.frame.w},${f.frame.h},${f.rotated},${f.trimmed}\n`;
  }
  return csv;
}

/**
 * One-Click Game Asset Pipeline: bundles complete asset pack into a structured ZIP
 */
export async function exportOneClickPipelineZip(
  project: StudioProject,
  onProgress?: (status: string, percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  onProgress?.('Preparing texture atlases...', 15);
  const atlasFolder = zip.folder('atlas');
  if (atlasFolder) {
    for (const atlas of project.packedAtlases) {
      const atlasBlob = await dataUrlToBlob(atlas.dataUrl);
      atlasFolder.file(`${atlas.name}.png`, atlasBlob);
      atlasFolder.file(`${atlas.name}.json`, generatePhaserHashJson(atlas));
      atlasFolder.file(`${atlas.name}.tres`, generateGodotTres(atlas, project));
      atlasFolder.file(`${atlas.name}.meta`, generateUnityMeta(atlas));
      atlasFolder.file(`${atlas.name}.xml`, generateGenericXml(atlas));
      atlasFolder.file(`${atlas.name}.csv`, generateGenericCsv(atlas));
    }
  }

  onProgress?.('Generating animation GIFs and data...', 45);
  const animFolder = zip.folder('animations');
  if (animFolder) {
    const animManifest: any[] = [];
    for (const anim of project.animations) {
      const animFrames = anim.frameIds
        .map(id => project.sprites.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (animFrames.length > 0) {
        try {
          const gifBlob = await exportFramesToGif(animFrames, {
            fps: anim.fps,
            loop: anim.loop,
            durations: anim.frameDurations
          });
          animFolder.file(`${anim.name}.gif`, gifBlob);
        } catch (e) {
          console.warn(`Could not encode GIF for ${anim.name}:`, e);
        }
      }

      animManifest.push({
        name: anim.name,
        fps: anim.fps,
        loop: anim.loop,
        pingPong: anim.pingPong,
        frames: anim.frameIds.map(id => {
          const s = project.sprites.find(sp => sp.id === id);
          return {
            id,
            name: s?.name || id,
            duration: anim.frameDurations[id] || Math.round(1000 / anim.fps)
          };
        })
      });
    }
    animFolder.file('animations.json', JSON.stringify(animManifest, null, 2));
  }

  onProgress?.('Exporting individual sprite frames...', 70);
  const spritesFolder = zip.folder('sprites');
  if (spritesFolder) {
    for (const sprite of project.sprites) {
      const spriteBlob = await dataUrlToBlob(sprite.dataUrl);
      spritesFolder.file(`${sprite.name}.png`, spriteBlob);
    }
  }

  onProgress?.('Exporting layers...', 85);
  const layersFolder = zip.folder('layers');
  if (layersFolder) {
    for (const layer of project.layers) {
      if (layer.dataUrl) {
        const layerBlob = await dataUrlToBlob(layer.dataUrl);
        const safeName = layer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        layersFolder.file(`${safeName}.png`, layerBlob);
      }
    }
  }

  // Include project file for instant project reload
  const serializableProject = {
    ...project,
    layers: project.layers.map(l => ({ ...l, canvas: undefined })),
    sprites: project.sprites.map(s => ({ ...s, canvas: undefined })),
    packedAtlases: project.packedAtlases.map(a => ({ ...a, canvas: undefined }))
  };
  zip.file(`${project.name || 'project'}.grasset`, JSON.stringify(serializableProject, null, 2));

  onProgress?.('Compressing ZIP archive...', 95);
  const content = await zip.generateAsync({ type: 'blob' });
  onProgress?.('Completed!', 100);

  return content;
}
