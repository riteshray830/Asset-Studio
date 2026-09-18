import React, { useState } from 'react';
import { 
  Grid, 
  Settings, 
  RotateCw, 
  Maximize, 
  Download, 
  Sparkles, 
  Layers, 
  ShieldCheck,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { AtlasConfig, PackedAtlas, PackedFrame, StudioProject } from '../../types/project';
import { packTextureAtlases } from '../../services/atlasPacker';
import { generateGodotTres, generatePhaserHashJson, generateUnityMeta } from '../../services/engineExporters';

interface AtlasViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const AtlasView: React.FC<AtlasViewProps> = ({ project, onUpdateProject }) => {
  const [config, setConfig] = useState<AtlasConfig>(project.atlasConfig);
  const [activeAtlasIndex, setActiveAtlasIndex] = useState(0);
  const [isPacking, setIsPacking] = useState(false);
  const [hoveredFrame, setHoveredFrame] = useState<PackedFrame | null>(null);

  const activeAtlas: PackedAtlas | undefined = project.packedAtlases[activeAtlasIndex] || project.packedAtlases[0];

  const handlePack = async () => {
    if (project.sprites.length === 0) return;

    setIsPacking(true);
    try {
      const atlases = await packTextureAtlases(project.sprites, config);
      onUpdateProject({
        ...project,
        atlasConfig: config,
        packedAtlases: atlases
      });
      setActiveAtlasIndex(0);
    } catch (err) {
      console.error('Atlas packing error:', err);
    } finally {
      setIsPacking(false);
    }
  };

  const handleDownloadAtlasPng = (atlas: PackedAtlas) => {
    const a = document.createElement('a');
    a.href = atlas.dataUrl;
    a.download = `${atlas.name}.png`;
    a.click();
  };

  const handleDownloadPhaserJson = (atlas: PackedAtlas) => {
    const jsonStr = generatePhaserHashJson(atlas);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atlas.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGodotTres = (atlas: PackedAtlas) => {
    const tresStr = generateGodotTres(atlas, project);
    const blob = new Blob([tresStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atlas.name}.tres`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0f18] select-none">
      {/* Left Configuration Sidebar */}
      <div className="w-80 bg-[#141624] border-r border-[#222538] p-5 flex flex-col justify-between overflow-y-auto z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Atlas Packing Settings</span>
          </div>

          {/* Max Size */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-2">
              Max Texture Dimension (px)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[512, 1024, 2048, 4096].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setConfig({ ...config, maxSize: sz })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    config.maxSize === sz
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#1b1e2e] border border-[#272a3f] text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Padding & Margin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Padding</span>
                <span className="font-mono text-indigo-400">{config.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={config.padding}
                onChange={(e) => setConfig({ ...config, padding: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Margin</span>
                <span className="font-mono text-indigo-400">{config.margin}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={config.margin}
                onChange={(e) => setConfig({ ...config, margin: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Texture Bleed Extrusion */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Texture Extrusion</span>
              <span className="font-mono text-indigo-400">{config.extrusion}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="2"
              value={config.extrusion}
              onChange={(e) => setConfig({ ...config, extrusion: Number(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Duplicates border pixels outward to prevent texture filtering seams in Unity/Godot.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-[#23273c]">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#181a29] p-2.5 rounded-lg border border-[#262a3f]">
              <input
                type="checkbox"
                checked={config.allowRotation}
                onChange={(e) => setConfig({ ...config, allowRotation: e.target.checked })}
                className="rounded accent-indigo-600"
              />
              <span>Allow 90° Sprite Rotation</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#181a29] p-2.5 rounded-lg border border-[#262a3f]">
              <input
                type="checkbox"
                checked={config.powerOfTwo}
                onChange={(e) => setConfig({ ...config, powerOfTwo: e.target.checked })}
                className="rounded accent-indigo-600"
              />
              <span>Force Power of Two (POT)</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handlePack}
          disabled={project.sprites.length === 0 || isPacking}
          className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isPacking ? 'Packing Sprites...' : 'Pack Texture Atlases'}</span>
        </button>
      </div>

      {/* Main Atlas Canvas Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Atlas Sheets Tab Bar */}
        {project.packedAtlases.length > 0 && (
          <div className="h-12 bg-[#141624] border-b border-[#24283c] px-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {project.packedAtlases.map((atlas, idx) => {
                const isActive = idx === activeAtlasIndex;
                return (
                  <button
                    key={atlas.id}
                    onClick={() => setActiveAtlasIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#1f2236]'
                    }`}
                  >
                    <span>{atlas.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">
                      {atlas.utilization}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Export Downloads for active sheet */}
            {activeAtlas && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadAtlasPng(activeAtlas)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c2032] hover:bg-[#262c44] border border-[#2b3048] text-xs text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={() => handleDownloadPhaserJson(activeAtlas)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c2032] hover:bg-[#262c44] border border-[#2b3048] text-xs text-slate-200 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Phaser JSON</span>
                </button>

                <button
                  onClick={() => handleDownloadGodotTres(activeAtlas)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c2032] hover:bg-[#262c44] border border-[#2b3048] text-xs text-slate-200 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Godot .tres</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Atlas Canvas Viewport */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[#090a10] relative">
          {activeAtlas ? (
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-[#24283c]">
              <div className="bg-checkerboard relative">
                <img
                  src={activeAtlas.dataUrl}
                  alt={activeAtlas.name}
                  className="max-w-[70vw] max-h-[70vh] object-contain pixelated pointer-events-none"
                />

                {/* Interactive Bounding Boxes Overlay */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  viewBox={`0 0 ${activeAtlas.width} ${activeAtlas.height}`}
                >
                  {activeAtlas.frames.map((f) => (
                    <rect
                      key={f.id}
                      x={f.frame.x}
                      y={f.frame.y}
                      width={f.frame.w}
                      height={f.frame.h}
                      fill="transparent"
                      stroke="rgba(99, 102, 241, 0.4)"
                      strokeWidth="1"
                      className="hover:stroke-indigo-400 hover:fill-indigo-500/20 cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredFrame(f)}
                      onMouseLeave={() => setHoveredFrame(null)}
                    />
                  ))}
                </svg>
              </div>

              {/* Hover Tooltip */}
              {hoveredFrame && (
                <div className="absolute top-3 left-3 px-3 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-indigo-500/30 text-white text-xs font-mono shadow-xl pointer-events-none space-y-0.5">
                  <div className="font-bold text-indigo-300">{hoveredFrame.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Pos: ({hoveredFrame.frame.x}, {hoveredFrame.frame.y})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Size: {hoveredFrame.frame.w} × {hoveredFrame.frame.h}
                    {hoveredFrame.rotated ? ' (Rotated 90°)' : ''}
                  </div>
                  {hoveredFrame.trimmed && (
                    <div className="text-[10px] text-emerald-400">Trimmed sprite</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                <Grid className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">No Atlases Packed Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Click <strong>Pack Texture Atlases</strong> in the left sidebar to automatically pack all {project.sprites.length} sprites using the MaxRects bin packing algorithm.
              </p>
              <button
                onClick={handlePack}
                disabled={project.sprites.length === 0}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Pack Texture Atlases
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
