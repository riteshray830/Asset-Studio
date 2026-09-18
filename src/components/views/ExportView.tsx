import React, { useState } from 'react';
import { 
  PackageCheck, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileCode, 
  Film, 
  FolderArchive, 
  Wrench,
  ChevronRight
} from 'lucide-react';
import { StudioProject } from '../../types/project';
import { exportOneClickPipelineZip, generateGodotTres, generatePhaserHashJson, generateUnityMeta, generateGenericJson } from '../../services/engineExporters';
import { exportProjectToBundle } from '../../core/projectBundle';
import { ValidationModal } from '../common/ValidationModal';
import { normalizeSprites } from '../../services/spriteDetector';

interface ExportViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ project, onUpdateProject }) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Run One-Click Game Asset Pipeline
  const handleRunOneClickPipeline = async () => {
    setIsExportingZip(true);
    setExportProgress(5);
    setExportStatusText('Initializing game asset pipeline...');

    try {
      const zipBlob = await exportOneClickPipelineZip(project, (status, percent) => {
        setExportStatusText(status);
        setExportProgress(percent);
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project.name || 'GameAssetPack').replace(/\s+/g, '_');
      a.download = `${safeName}_CompletePack.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleNormalizeAll = async () => {
    const norm = await normalizeSprites(project.sprites, 'both', 'bottom-center');
    onUpdateProject({ ...project, sprites: norm });
  };

  const handleRemoveDuplicates = () => {
    // Already in SpriteView, trigger normalization or cleanup
    handleNormalizeAll();
  };

  const primaryAtlas = project.packedAtlases[0];

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f18] text-slate-200 p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <PackageCheck className="w-6 h-6 text-indigo-400" />
              <span>Game Engine Export & Pipeline</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Produce game-ready assets and metadata formatted specifically for your game engine.
            </p>
          </div>

          <button
            onClick={() => setShowValidationModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1d2d] hover:bg-[#24283c] border border-[#2b3048] text-xs font-semibold text-slate-200 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Validate Asset Health</span>
          </button>
        </div>

        {/* Big One-Click Game Asset Pipeline Card */}
        <div className="rounded-3xl p-8 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#141624] border-2 border-indigo-500/40 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ONE-CLICK COMPLETE PIPELINE</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
              Process & Export GameAssetPack.zip
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Automatically packages packed texture atlases (PNG, Godot .tres, Unity .meta, Phaser JSON), animation GIFs, individual sprite PNGs, layer exports, and project backup into a structured archive.
            </p>

            {isExportingZip ? (
              <div className="space-y-2 max-w-sm">
                <div className="flex justify-between text-xs text-indigo-300 font-semibold">
                  <span>{exportStatusText}</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-[#1c2032] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleRunOneClickPipeline}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete Asset Pack</span>
              </button>
            )}
          </div>

          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:block opacity-30 pointer-events-none">
            <FolderArchive className="w-52 h-52 text-indigo-400" />
          </div>
        </div>

        {/* Dedicated Engine Cards */}
        <div>
          <h3 className="text-base font-bold text-white mb-4">Export by Target Engine</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Unity Card */}
            <div className="rounded-2xl bg-[#141624] border border-[#222538] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                  <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center font-bold text-xs">U</div>
                  <span>Unity 2D</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Generates sprite atlas texture + <code>.meta</code> YAML slice specifications with bottom-left coordinate mapping.
                </p>
              </div>

              <button
                disabled={!primaryAtlas}
                onClick={() => primaryAtlas && handleDownloadFile(generateUnityMeta(primaryAtlas), `${primaryAtlas.name}.meta`, 'text/yaml')}
                className="w-full py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-xs font-semibold text-slate-200 transition-colors disabled:opacity-40"
              >
                Download Unity .meta
              </button>
            </div>

            {/* Godot Card */}
            <div className="rounded-2xl bg-[#141624] border border-[#222538] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">G</div>
                  <span>Godot 4</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Generates Godot <code>.tres</code> resource defining AtlasTextures and SpriteFrames with configured animation speeds.
                </p>
              </div>

              <button
                disabled={!primaryAtlas}
                onClick={() => primaryAtlas && handleDownloadFile(generateGodotTres(primaryAtlas, project), `${primaryAtlas.name}.tres`, 'text/plain')}
                className="w-full py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-xs font-semibold text-slate-200 transition-colors disabled:opacity-40"
              >
                Download Godot .tres
              </button>
            </div>

            {/* Phaser 3 Card */}
            <div className="rounded-2xl bg-[#141624] border border-[#222538] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                  <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs">P</div>
                  <span>Phaser 3</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Standard TexturePacker JSON Hash and Array format with trimmed coordinates and anchor pivots.
                </p>
              </div>

              <button
                disabled={!primaryAtlas}
                onClick={() => primaryAtlas && handleDownloadFile(generatePhaserHashJson(primaryAtlas), `${primaryAtlas.name}.json`, 'application/json')}
                className="w-full py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-xs font-semibold text-slate-200 transition-colors disabled:opacity-40"
              >
                Download Phaser JSON
              </button>
            </div>
          </div>
        </div>

        {/* Project Bundle Backup */}
        <div className="rounded-2xl bg-[#141624] border border-[#222538] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">
                Save Studio Project (.grasset)
              </h4>
              <p className="text-xs text-slate-400">
                Retains all layers, sliced sprite coordinates, timeline animations, atlas configs, and color palettes in a single portable file.
              </p>
            </div>
          </div>

          <button
            onClick={() => exportProjectToBundle(project)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-xs font-semibold text-white transition-colors shrink-0"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export .grasset</span>
          </button>
        </div>
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        project={project}
        onNormalizeFrames={handleNormalizeAll}
        onRemoveDuplicateFrames={handleRemoveDuplicates}
      />
    </div>
  );
};
