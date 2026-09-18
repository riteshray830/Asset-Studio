import { StudioProject } from '../types/project';

export interface ProjectBundleFile {
  version: '1.0.0';
  generator: 'GeekRush Asset Studio';
  exportedAt: number;
  project: StudioProject;
}

export function exportProjectToBundle(project: StudioProject): void {
  const serializableProject: StudioProject = {
    ...project,
    updatedAt: Date.now(),
    layers: project.layers.map(l => ({ ...l, canvas: undefined })),
    sprites: project.sprites.map(s => ({ ...s, canvas: undefined })),
    packedAtlases: project.packedAtlases.map(a => ({ ...a, canvas: undefined }))
  };

  const bundle: ProjectBundleFile = {
    version: '1.0.0',
    generator: 'GeekRush Asset Studio',
    exportedAt: Date.now(),
    project: serializableProject
  };

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `${safeName}.grasset`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importProjectFromBundle(file: File): Promise<StudioProject> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  let projectData: StudioProject;
  if (parsed.version && parsed.project) {
    projectData = parsed.project;
  } else if (parsed.layers && parsed.sprites) {
    projectData = parsed as StudioProject;
  } else {
    throw new Error('Invalid GeekRush Asset Studio (.grasset) file format.');
  }

  const defaultSettings = {
    theme: 'dark' as const,
    gridSize: 16,
    showGrid: false,
    snapToGrid: false,
    pixelPerfect: true,
    showRulers: true,
    showGuides: false,
    showCheckerboard: true,
    checkerboardType: 'dark' as const,
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevAlpha: 0.4,
      nextAlpha: 0.3
    }
  };

  // Ensure default structures exist
  return {
    ...projectData,
    id: projectData.id || `proj_${Date.now()}`,
    name: projectData.name || file.name.replace(/\.[^/.]+$/, ''),
    updatedAt: Date.now(),
    selectedSpriteIds: projectData.selectedSpriteIds || [],
    settings: Object.assign({}, defaultSettings, projectData.settings)
  };
}
