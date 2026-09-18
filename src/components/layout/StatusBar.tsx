import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, ShieldCheck, Layers, Scissors, Film } from 'lucide-react';
import { StudioProject } from '../../types/project';

interface StatusBarProps {
  project: StudioProject;
  zoom: number;
  cursorPos: { x: number; y: number } | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitScreen: () => void;
  onTogglePixelPerfect: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  project,
  zoom,
  cursorPos,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitScreen,
  onTogglePixelPerfect
}) => {
  return (
    <footer className="h-7 bg-[#10121c] border-t border-[#202336] text-[11px] text-slate-400 flex items-center justify-between px-3 select-none z-30">
      {/* Left: Project Stats & Privacy */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium" title="All processing occurs entirely in your browser. No files are uploaded.">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Local In-Browser Processing</span>
        </div>

        <div className="h-3 w-px bg-[#262a3f]" />

        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-500">Canvas:</span>
          <span>{project.width} × {project.height} px</span>
        </div>

        {cursorPos && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">X:</span>
            <span>{cursorPos.x}</span>
            <span className="text-slate-500 ml-1">Y:</span>
            <span>{cursorPos.y}</span>
          </div>
        )}
      </div>

      {/* Center: Inventory Counts */}
      <div className="hidden md:flex items-center gap-4 text-slate-400">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>{project.layers.length} Layers</span>
        </div>
        <div className="flex items-center gap-1">
          <Scissors className="w-3 h-3 text-purple-400" />
          <span>{project.sprites.length} Sprites</span>
        </div>
        <div className="flex items-center gap-1">
          <Film className="w-3 h-3 text-pink-400" />
          <span>{project.animations.length} Animations</span>
        </div>
      </div>

      {/* Right: Zoom & Pixel Perfect Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePixelPerfect}
          title="Toggle Pixel-Perfect Crisp Nearest-Neighbor Scaling"
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
            project.settings.pixelPerfect
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Pixel Perfect
        </button>

        <div className="h-3 w-px bg-[#262a3f]" />

        <div className="flex items-center gap-1 bg-[#171a28] rounded px-1 py-0.5 border border-[#23273c]">
          <button
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="hover:text-white p-0.5 transition-colors"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <button
            onClick={onZoomReset}
            title="Reset Zoom to 100%"
            className="w-11 text-center font-mono font-medium hover:text-white transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="hover:text-white p-0.5 transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={onFitScreen}
          title="Fit Canvas to Viewport"
          className="p-1 hover:text-white transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};
