import React, { useState, useEffect, useCallback } from 'react';
import { StudioProject, WorkspaceMode } from './types/project';
import { 
  createHistoryState, 
  pushHistoryState, 
  undoHistory, 
  redoHistory, 
  HistoryState 
} from './core/history';
import { 
  saveProjectToDB, 
  loadProjectFromDB, 
  getRecentProjectsFromDB, 
  deleteProjectFromDB 
} from './core/storage';
import { importProjectFromBundle, exportProjectToBundle } from './core/projectBundle';
import { createPixelKnightSample } from './services/sampleAssets';
import { parsePsdFile, hasPsdSignature } from './services/psdParser';
import { parseAiFile, hasPdfSignature } from './services/aiParser';
import { Header } from './components/layout/Header';
import { StatusBar } from './components/layout/StatusBar';
import { DashboardView } from './components/views/DashboardView';
import { EditorView } from './components/views/EditorView';
import { SpriteView } from './components/views/SpriteView';
import { AnimationView } from './components/views/AnimationView';
import { AtlasView } from './components/views/AtlasView';
import { OptimizeView } from './components/views/OptimizeView';
import { BatchView } from './components/views/BatchView';
import { ExportView } from './components/views/ExportView';
import { KeyboardHelpModal } from './components/common/KeyboardHelpModal';
import { exportOneClickPipelineZip } from './services/engineExporters';

export function App() {
  const [history, setHistory] = useState<HistoryState>(() =>
    createHistoryState(createPixelKnightSample())
  );
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('dashboard');
  const [zoom, setZoom] = useState(1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const project = history.present;

  // Refresh recent projects from IndexedDB
  const refreshRecentList = useCallback(async () => {
    try {
      const list = await getRecentProjectsFromDB();
      setRecentProjects(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshRecentList();
  }, [refreshRecentList]);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Push new project state into history
  const updateProject = useCallback((newProject: StudioProject) => {
    setHistory((prev) => pushHistoryState(prev, newProject));
  }, []);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    setHistory((prev) => undoHistory(prev));
    showToast('Undo');
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => redoHistory(prev));
    showToast('Redo');
  }, []);

  // Save Project
  const handleSave = useCallback(async () => {
    await saveProjectToDB(project);
    await refreshRecentList();
    showToast(`Project "${project.name}" saved to browser IndexedDB!`);
  }, [project, refreshRecentList]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(32, z * 1.25));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => Math.max(0.1, z * 0.8));
      } else if (mod && e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

  // New Blank Project
  const handleNewProject = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const blank: StudioProject = {
      id: `proj_${Date.now()}`,
      name: 'Untitled Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      width: 512,
      height: 512,
      layers: [
        {
          id: `layer_${Date.now()}`,
          name: 'Layer 1',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
          x: 0,
          y: 0,
          width: 512,
          height: 512,
          dataUrl: canvas.toDataURL('image/png')
        }
      ],
      activeLayerId: `layer_${Date.now()}`,
      sprites: [],
      selectedSpriteIds: [],
      activeSpriteId: null,
      animations: [],
      activeAnimationId: '',
      atlasConfig: {
        maxSize: 2048,
        padding: 2,
        margin: 4,
        allowRotation: false,
        powerOfTwo: true,
        extrusion: 2,
        algorithm: 'maxrects-bssf'
      },
      packedAtlases: [],
      palettes: project.palettes,
      activePaletteId: 'pico-8',
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      settings: project.settings
    };

    setHistory(createHistoryState(blank));
    setActiveMode('editor');
    setZoom(1);
    showToast('Created new blank project');
  };

  // Open PSD Document
  const handleOpenPsd = async (file: File): Promise<void> => {
    try {
      const headerBuffer = await file.slice(0, 2048).arrayBuffer();
      if (hasPdfSignature(headerBuffer)) {
        await handleOpenAi(file);
        return;
      }
    } catch (_) {}

    showToast(`Parsing Photoshop document "${file.name}"...`);
    try {
      const parsed = await parsePsdFile(file);
      const newProject: StudioProject = {
        id: `psd_${Date.now()}`,
        name: file.name.replace(/\.psd$/i, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        width: parsed.width,
        height: parsed.height,
        layers: parsed.layers,
        activeLayerId: parsed.layers[0]?.id || '',
        sprites: [],
        selectedSpriteIds: [],
        activeSpriteId: null,
        animations: [],
        activeAnimationId: '',
        atlasConfig: project.atlasConfig,
        packedAtlases: [],
        palettes: project.palettes,
        activePaletteId: 'pico-8',
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        settings: project.settings
      };

      setHistory(createHistoryState(newProject));
      setActiveMode('editor');
      setZoom(1);
      saveProjectToDB(newProject).then(refreshRecentList);
      showToast(`Loaded PSD with ${parsed.layers.length} editable layers!`);
    } catch (err: any) {
      alert(`Could not parse PSD: ${err.message}`);
    }
  };

  // Open Adobe Illustrator (.ai) Document
  const handleOpenAi = async (file: File): Promise<void> => {
    try {
      const headerBuffer = await file.slice(0, 2048).arrayBuffer();
      if (hasPsdSignature(headerBuffer)) {
        await handleOpenPsd(file);
        return;
      }
    } catch (_) {}

    showToast(`Parsing Illustrator document "${file.name}"...`);
    try {
      const parsed = await parseAiFile(file);
      const newProject: StudioProject = {
        id: `ai_${Date.now()}`,
        name: file.name.replace(/\.(ai|eps)$/i, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        width: parsed.width,
        height: parsed.height,
        layers: parsed.layers,
        activeLayerId: parsed.layers[0]?.id || '',
        sprites: [],
        selectedSpriteIds: [],
        activeSpriteId: null,
        animations: [],
        activeAnimationId: '',
        atlasConfig: project.atlasConfig,
        packedAtlases: [],
        palettes: project.palettes,
        activePaletteId: 'pico-8',
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        settings: project.settings
      };

      setHistory(createHistoryState(newProject));
      setActiveMode('editor');
      setZoom(1);
      saveProjectToDB(newProject).then(refreshRecentList);
      showToast(`Loaded Illustrator file with ${parsed.layers.length} editable layers!`);
    } catch (err: any) {
      alert(`Could not parse Illustrator file: ${err.message}`);
    }
  };

  // Open Common Image (PNG, JPG, WebP, etc.)
  const handleOpenImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const newProject: StudioProject = {
          id: `img_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          width: img.width,
          height: img.height,
          layers: [
            {
              id: `layer_${Date.now()}`,
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              x: 0,
              y: 0,
              width: img.width,
              height: img.height,
              dataUrl
            }
          ],
          activeLayerId: `layer_${Date.now()}`,
          sprites: [],
          selectedSpriteIds: [],
          activeSpriteId: null,
          animations: [],
          activeAnimationId: '',
          atlasConfig: project.atlasConfig,
          packedAtlases: [],
          palettes: project.palettes,
          activePaletteId: 'pico-8',
          primaryColor: '#6366f1',
          secondaryColor: '#ec4899',
          settings: project.settings
        };

        const initZoom = img.width <= 128 ? 4 : img.width <= 320 ? 2 : 1;
        setHistory(createHistoryState(newProject));
        setActiveMode('sprites');
        setZoom(initZoom);
        saveProjectToDB(newProject).then(refreshRecentList);
        showToast(`Imported ${file.name} (${img.width}×${img.height})`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Import .grasset Project
  const handleImportBundle = async (file: File) => {
    try {
      const imported = await importProjectFromBundle(file);
      const initZoom = imported.width <= 128 ? 4 : imported.width <= 320 ? 2 : 1;
      setHistory(createHistoryState(imported));
      setActiveMode('editor');
      setZoom(initZoom);
      saveProjectToDB(imported).then(refreshRecentList);
      showToast(`Imported project "${imported.name}"`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Load Sample Project
  const handleLoadSample = (sample: StudioProject) => {
    const initZoom = sample.width <= 128 ? 4 : sample.width <= 320 ? 2 : 1;
    setHistory(createHistoryState(sample));
    setActiveMode('editor');
    setZoom(initZoom);
    saveProjectToDB(sample).then(refreshRecentList);
    showToast(`Loaded demo: ${sample.name}`);
  };

  // Fit Canvas to Screen
  const handleFitScreen = useCallback(() => {
    const availW = window.innerWidth - 380;
    const availH = window.innerHeight - 150;
    const scaleX = availW / project.width;
    const scaleY = availH / project.height;
    let ideal = Math.min(scaleX, scaleY) * 0.85;
    if (ideal >= 1) {
      ideal = Math.floor(ideal);
    } else {
      ideal = Math.round(ideal * 10) / 10;
    }
    setZoom(Math.max(0.2, Math.min(16, ideal)));
    showToast(`Fit to Screen (${Math.round(ideal * 100)}%)`);
  }, [project.width, project.height]);

  // Load Recent Project from DB
  const handleLoadRecent = async (id: string) => {
    const loaded = await loadProjectFromDB(id);
    if (loaded) {
      const initZoom = loaded.width <= 128 ? 4 : loaded.width <= 320 ? 2 : 1;
      setHistory(createHistoryState(loaded));
      setActiveMode('editor');
      setZoom(initZoom);
      showToast(`Loaded recent project "${loaded.name}"`);
    }
  };

  // Delete Recent Project
  const handleDeleteRecent = async (id: string) => {
    await deleteProjectFromDB(id);
    await refreshRecentList();
    showToast('Project removed from recents');
  };

  // Quick Export One-Click Pipeline
  const handleQuickExport = async () => {
    showToast('Running One-Click Game Asset Pipeline...');
    try {
      const zipBlob = await exportOneClickPipelineZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project.name || 'GameAssetPack').replace(/\s+/g, '_');
      a.download = `${safeName}_CompletePack.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Game Asset Pack downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('Export failed.');
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${project.settings.theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      {/* Top Header */}
      <Header
        project={project}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onQuickExport={handleQuickExport}
        onOpenHelp={() => setShowHelpModal(true)}
        onToggleTheme={() =>
          updateProject({
            ...project,
            settings: {
              ...project.settings,
              theme: project.settings.theme === 'dark' ? 'light' : 'dark'
            }
          })
        }
        onRenameProject={(newName) => updateProject({ ...project, name: newName })}
      />

      {/* Main Workspace View Switcher */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeMode === 'dashboard' && (
          <DashboardView
            onNewProject={handleNewProject}
            onOpenPsd={handleOpenPsd}
            onOpenAi={handleOpenAi}
            onOpenImage={handleOpenImage}
            onImportBundle={handleImportBundle}
            onLoadSample={handleLoadSample}
            recentProjects={recentProjects}
            onLoadRecent={handleLoadRecent}
            onDeleteRecent={handleDeleteRecent}
          />
        )}

        {activeMode === 'editor' && (
          <EditorView
            project={project}
            onUpdateProject={updateProject}
            zoom={zoom}
            onZoomChange={setZoom}
            onCursorMove={setCursorPos}
          />
        )}

        {activeMode === 'sprites' && (
          <SpriteView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {activeMode === 'animation' && (
          <AnimationView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {activeMode === 'atlas' && (
          <AtlasView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {activeMode === 'optimize' && (
          <OptimizeView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {activeMode === 'batch' && <BatchView />}

        {activeMode === 'export' && (
          <ExportView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {/* Global Toast Alert */}
        {toastMessage && (
          <div className="absolute bottom-10 right-6 bg-[#161826]/95 backdrop-blur-md border border-indigo-500/40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        project={project}
        zoom={zoom}
        cursorPos={cursorPos}
        onZoomIn={() => setZoom((z) => Math.min(32, z * 1.25))}
        onZoomOut={() => setZoom((z) => Math.max(0.1, z * 0.8))}
        onZoomReset={() => setZoom(1)}
        onFitScreen={handleFitScreen}
        onTogglePixelPerfect={() =>
          updateProject({
            ...project,
            settings: { ...project.settings, pixelPerfect: !project.settings.pixelPerfect }
          })
        }
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}

export default App;
