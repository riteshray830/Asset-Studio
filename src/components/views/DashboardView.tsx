import React, { useRef } from 'react';
import { 
  Sparkles, 
  FolderOpen, 
  Plus, 
  Layers, 
  Scissors, 
  Film, 
  Grid, 
  Zap, 
  PackageCheck, 
  Trash2, 
  FileImage,
  UploadCloud,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { StudioProject } from '../../types/project';
import { createPixelKnightSample, createRPGItemsSample } from '../../services/sampleAssets';

interface DashboardViewProps {
  onNewProject: () => void;
  onOpenPsd: (file: File) => void;
  onOpenAi: (file: File) => void;
  onOpenImage: (file: File) => void;
  onImportBundle: (file: File) => void;
  onLoadSample: (project: StudioProject) => void;
  recentProjects: any[];
  onLoadRecent: (id: string) => void;
  onDeleteRecent: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNewProject,
  onOpenPsd,
  onOpenAi,
  onOpenImage,
  onImportBundle,
  onLoadSample,
  recentProjects,
  onLoadRecent,
  onDeleteRecent
}) => {
  const psdInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'psd') {
      onOpenPsd(file);
    } else if (ext === 'ai' || ext === 'eps') {
      onOpenAi(file);
    } else if (ext === 'grasset') {
      onImportBundle(file);
    } else {
      onOpenImage(file);
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto bg-[#0d0f18] text-slate-200 p-8 select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1b1e32] via-[#141624] to-[#0d0f18] border border-[#2b304c] p-8 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Game Asset & Sprite Studio</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Create, Animate, Pack & Export Game Assets in Your Browser
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Turn PSDs, images, and sprite sheets into game-ready texture atlases, animations, and metadata for Unity, Godot, and Phaser. Everything runs locally in your browser with zero server uploads.
            </p>

            {/* Quick Actions Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onNewProject}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>

              <button
                onClick={() => psdInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e2238] hover:bg-[#272c48] border border-[#2f3554] text-white text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <FileImage className="w-4 h-4 text-blue-400" />
                <span>Open PSD Document</span>
              </button>

              <button
                onClick={() => aiInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e2238] hover:bg-[#272c48] border border-[#2f3554] text-white text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black flex items-center justify-center">Ai</span>
                <span>Open Illustrator (.ai)</span>
              </button>

              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e2238] hover:bg-[#272c48] border border-[#2f3554] text-white text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <UploadCloud className="w-4 h-4 text-purple-400" />
                <span>Open Image / Sprite Sheet</span>
              </button>

              <button
                onClick={() => bundleInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e2238] hover:bg-[#272c48] border border-[#2f3554] text-slate-300 hover:text-white text-xs font-semibold transition-all"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Open .grasset</span>
              </button>
            </div>
          </div>

          {/* Privacy Guarantee Pill */}
          <div className="absolute top-6 right-6 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/20 text-emerald-400 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Client-Side Processing</span>
          </div>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={psdInputRef}
            accept=".psd"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onOpenPsd(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <input
            type="file"
            ref={aiInputRef}
            accept=".ai,.eps"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onOpenAi(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*,.zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onOpenImage(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <input
            type="file"
            ref={bundleInputRef}
            accept=".grasset,.json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onImportBundle(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>

        {/* Demo Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Quick-Start Sample Projects</h2>
              <p className="text-xs text-slate-400">Instantly test layered animations, slicing, and atlas packing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sample 1: Pixel Knight */}
            <div 
              onClick={() => onLoadSample(createPixelKnightSample())}
              className="group cursor-pointer rounded-2xl bg-[#141624] border border-[#25293d] hover:border-indigo-500/50 p-5 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-checkerboard flex items-center justify-center p-1 border border-[#2b3048] group-hover:scale-105 transition-transform">
                  <img
                    src={createPixelKnightSample().sprites[0].dataUrl}
                    alt="Pixel Knight"
                    className="w-12 h-12 pixelated object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Pixel Knight Hero
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold">
                      Layered + Anim
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    PSD-style layers (Armor, Helmet, Sword) with Idle, Run & Attack animation cycles.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>11 Sprites</span>
                    <span>•</span>
                    <span>3 Animations</span>
                    <span>•</span>
                    <span>PICO-8 Palette</span>
                  </div>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-[#1c1f32] group-hover:bg-indigo-600 text-slate-300 group-hover:text-white text-xs font-semibold transition-colors">
                Load Demo
              </button>
            </div>

            {/* Sample 2: RPG Items */}
            <div 
              onClick={() => onLoadSample(createRPGItemsSample())}
              className="group cursor-pointer rounded-2xl bg-[#141624] border border-[#25293d] hover:border-purple-500/50 p-5 transition-all hover:shadow-xl hover:shadow-purple-500/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-checkerboard flex items-center justify-center p-1 border border-[#2b3048] group-hover:scale-105 transition-transform">
                  <img
                    src={createRPGItemsSample().sprites[2].dataUrl}
                    alt="RPG Items"
                    className="w-12 h-12 pixelated object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      Fantasy RPG Item Sheet
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
                      Icons
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    Health/mana potions, gold coin spin animation, rubies, emeralds, and keys.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>8 Items</span>
                    <span>•</span>
                    <span>Coin Spin Anim</span>
                    <span>•</span>
                    <span>32x32 Grid</span>
                  </div>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-[#1c1f32] group-hover:bg-purple-600 text-slate-300 group-hover:text-white text-xs font-semibold transition-colors">
                Load Demo
              </button>
            </div>
          </div>
        </div>

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight mb-4">Recent Projects (Stored Locally)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {recentProjects.map((rp) => (
                <div
                  key={rp.id}
                  className="rounded-xl bg-[#141624] border border-[#24273c] p-4 flex flex-col justify-between group hover:border-slate-500 transition-colors"
                >
                  <div 
                    onClick={() => onLoadRecent(rp.id)}
                    className="cursor-pointer"
                  >
                    <div className="h-28 bg-checkerboard rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-[#202336]">
                      {rp.thumbnail ? (
                        <img src={rp.thumbnail} alt={rp.name} className="h-20 object-contain pixelated" />
                      ) : (
                        <FileImage className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <h4 className="font-semibold text-xs text-white truncate mb-1">{rp.name}</h4>
                    <p className="text-[10px] text-slate-500">
                      {rp.layerCount} layers • {rp.spriteCount} sprites
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1f2235]">
                    <span className="text-[10px] text-slate-500">
                      {new Date(rp.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onDeleteRecent(rp.id)}
                      title="Delete from recent list"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Overview */}
        <div className="pt-4 border-t border-[#202336] grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400">
          <div className="p-4 rounded-xl bg-[#131522] border border-[#222538]">
            <Layers className="w-5 h-5 text-indigo-400 mb-2" />
            <div className="font-bold text-white mb-1">PSD & Layer Editing</div>
            <p className="text-[11px] text-slate-400">
              Preserves layer groups, blend modes, opacity, and coordinates without flattening.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131522] border border-[#222538]">
            <Scissors className="w-5 h-5 text-purple-400 mb-2" />
            <div className="font-bold text-white mb-1">Smart Slicing & Trim</div>
            <p className="text-[11px] text-slate-400">
              Auto-detect sprites, grid slice, trim transparent margins, and normalize sizes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131522] border border-[#222538]">
            <Grid className="w-5 h-5 text-pink-400 mb-2" />
            <div className="font-bold text-white mb-1">MaxRects Atlas Packing</div>
            <p className="text-[11px] text-slate-400">
              Optimal bin packing, border extrusion (2/4/8px), 90° rotation, and multi-sheet atlases.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131522] border border-[#222538]">
            <PackageCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="font-bold text-white mb-1">Multi-Engine Export</div>
            <p className="text-[11px] text-slate-400">
              Export to Unity, Godot, Phaser 3, Animated GIFs, and 1-Click bundled ZIP packs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
