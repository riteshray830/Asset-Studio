import React, { useState } from 'react';
import { 
  Scissors, 
  Grid, 
  Crop, 
  CheckSquare, 
  Square, 
  Trash2, 
  Copy, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Maximize, 
  Download, 
  Sparkles,
  Layers,
  ArrowDownUp
} from 'lucide-react';
import { SpriteFrame, StudioProject } from '../../types/project';
import { 
  detectSpritesAutomatic, 
  sliceByGrid, 
  trimSpriteFrame, 
  normalizeSprites, 
  calculateFrameSimilarity 
} from '../../services/spriteDetector';
import JSZip from 'jszip';
import { dataUrlToBlob } from '../../services/optimizer';

interface SpriteViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const SpriteView: React.FC<SpriteViewProps> = ({ project, onUpdateProject }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(project.selectedSpriteIds || []);
  const [showGridModal, setShowGridModal] = useState(false);
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(4);
  const [gridCellW, setGridCellW] = useState(48);
  const [gridCellH, setGridCellH] = useState(48);
  const [gridMargin, setGridMargin] = useState(0);
  const [gridPadding, setGridPadding] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto Slice using Connected Component detection
  const handleAutoSlice = () => {
    setIsProcessing(true);
    setStatusMessage('Scanning transparent alpha islands...');

    setTimeout(() => {
      // Find active layer or composite canvas
      const targetLayer = project.layers.find(l => l.id === project.activeLayerId) || project.layers[0];
      if (!targetLayer) {
        setIsProcessing(false);
        return;
      }

      const img = new Image();
      img.src = targetLayer.dataUrl;
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const detected = detectSpritesAutomatic(c, 10, 6);
        if (detected.length > 0) {
          onUpdateProject({
            ...project,
            sprites: detected,
            selectedSpriteIds: [detected[0].id],
            activeSpriteId: detected[0].id
          });
          setSelectedIds([detected[0].id]);
          setStatusMessage(`Successfully detected ${detected.length} discrete sprites!`);
        } else {
          setStatusMessage('No discrete sprite islands detected. Try Grid Slicing.');
        }
        setIsProcessing(false);
      };
    }, 100);
  };

  // Grid Slice
  const handleApplyGridSlice = () => {
    setShowGridModal(false);
    setIsProcessing(true);

    const targetLayer = project.layers.find(l => l.id === project.activeLayerId) || project.layers[0];
    if (!targetLayer) {
      setIsProcessing(false);
      return;
    }

    const img = new Image();
    img.src = targetLayer.dataUrl;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const sliced = sliceByGrid(c, gridCols, gridRows, gridCellW, gridCellH, gridMargin, gridPadding);
      onUpdateProject({
        ...project,
        sprites: sliced,
        selectedSpriteIds: sliced.length > 0 ? [sliced[0].id] : [],
        activeSpriteId: sliced.length > 0 ? sliced[0].id : null
      });
      setSelectedIds(sliced.length > 0 ? [sliced[0].id] : []);
      setIsProcessing(false);
      setStatusMessage(`Grid sliced into ${sliced.length} frames.`);
    };
  };

  // Auto Trim Selected Sprites
  const handleTrimSelected = async () => {
    setIsProcessing(true);
    setStatusMessage('Trimming transparent borders...');

    const targets = selectedIds.length > 0
      ? project.sprites.filter(s => selectedIds.includes(s.id))
      : project.sprites;

    const updated = await Promise.all(targets.map(s => trimSpriteFrame(s, 0)));

    const nextSprites = project.sprites.map(s => {
      const found = updated.find(u => u.id === s.id);
      return found || s;
    });

    onUpdateProject({
      ...project,
      sprites: nextSprites
    });

    setIsProcessing(false);
    setStatusMessage(`Trimmed ${updated.length} sprite(s).`);
  };

  // Normalize Selected Sprites
  const handleNormalize = async (anchor: 'bottom-center' | 'center' | 'top-left' = 'bottom-center') => {
    setIsProcessing(true);
    setStatusMessage('Normalizing frame dimensions...');

    const targets = selectedIds.length > 0
      ? project.sprites.filter(s => selectedIds.includes(s.id))
      : project.sprites;

    const normalized = await normalizeSprites(targets, 'both', anchor);

    const nextSprites = project.sprites.map(s => {
      const found = normalized.find(n => n.id === s.id);
      return found || s;
    });

    onUpdateProject({
      ...project,
      sprites: nextSprites
    });

    setIsProcessing(false);
    setStatusMessage(`Normalized ${normalized.length} sprites to identical dimensions.`);
  };

  // Remove Duplicate Frames
  const handleRemoveDuplicates = async () => {
    setIsProcessing(true);
    setStatusMessage('Checking for duplicate frames...');

    const duplicatesToRemove = new Set<string>();
    const sprites = project.sprites;

    for (let i = 0; i < sprites.length; i++) {
      if (duplicatesToRemove.has(sprites[i].id)) continue;
      for (let j = i + 1; j < sprites.length; j++) {
        if (duplicatesToRemove.has(sprites[j].id)) continue;
        const sim = await calculateFrameSimilarity(sprites[i], sprites[j]);
        if (sim >= 99.5) {
          // Flag j as duplicate
          duplicatesToRemove.add(sprites[j].id);
        }
      }
    }

    if (duplicatesToRemove.size > 0) {
      const filtered = project.sprites.filter(s => !duplicatesToRemove.has(s.id));
      onUpdateProject({
        ...project,
        sprites: filtered
      });
      setStatusMessage(`Removed ${duplicatesToRemove.size} duplicate frame(s).`);
    } else {
      setStatusMessage('No duplicate frames detected.');
    }

    setIsProcessing(false);
  };

  // Delete Selected Frames
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const remaining = project.sprites.filter(s => !selectedIds.includes(s.id));
    onUpdateProject({
      ...project,
      sprites: remaining,
      selectedSpriteIds: []
    });
    setSelectedIds([]);
  };

  // Export Selected as ZIP
  const handleExportZip = async () => {
    const zip = new JSZip();
    const targets = selectedIds.length > 0
      ? project.sprites.filter(s => selectedIds.includes(s.id))
      : project.sprites;

    for (const s of targets) {
      const blob = await dataUrlToBlob(s.dataUrl);
      zip.file(`${s.name}.png`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_sprites.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedIds(project.sprites.map(s => s.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f18] select-none">
      {/* Top Operations Bar */}
      <div className="h-14 bg-[#141624] border-b border-[#24283c] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {/* Auto Slice */}
          <button
            onClick={handleAutoSlice}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Scissors className="w-4 h-4" />
            <span>Auto Slice</span>
          </button>

          {/* Grid Slice */}
          <button
            onClick={() => setShowGridModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-slate-200 text-xs font-semibold transition-colors"
          >
            <Grid className="w-4 h-4 text-purple-400" />
            <span>Grid Slice</span>
          </button>

          <div className="w-px h-5 bg-[#2b2f46] mx-2" />

          {/* Auto Trim */}
          <button
            onClick={handleTrimSelected}
            disabled={project.sprites.length === 0 || isProcessing}
            title="Trim transparent margins while preserving origin anchor"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-slate-300 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Crop className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trim Transparency</span>
          </button>

          {/* Normalize */}
          <button
            onClick={() => handleNormalize('bottom-center')}
            disabled={project.sprites.length === 0 || isProcessing}
            title="Normalize selected frames to equal dimensions (Bottom-Center aligned)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-slate-300 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Maximize className="w-3.5 h-3.5 text-blue-400" />
            <span>Normalize Dimensions</span>
          </button>

          {/* Detect Duplicates */}
          <button
            onClick={handleRemoveDuplicates}
            disabled={project.sprites.length === 0 || isProcessing}
            title="Detect and remove identical/redundant animation frames"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-slate-300 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Detect Duplicates</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={selectedIds.length === project.sprites.length ? selectNone : selectAll}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            {selectedIds.length === project.sprites.length ? 'Deselect All' : 'Select All'}
          </button>

          {selectedIds.length > 0 && (
            <>
              <button
                onClick={handleDeleteSelected}
                title="Delete Selected Sprites"
                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportZip}
                title="Download Selected Sprites as ZIP"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-xs font-semibold text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ({selectedIds.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="bg-indigo-600/15 border-b border-indigo-500/30 px-6 py-2 text-xs text-indigo-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-indigo-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Frame Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {project.sprites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Scissors className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold text-base mb-1">No Sliced Sprites Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Click <strong>Auto Slice</strong> to detect individual character/item islands, or <strong>Grid Slice</strong> to divide a sprite sheet into regular tiles.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAutoSlice}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Run Auto Slicer
              </button>
              <button
                onClick={() => setShowGridModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-xs font-semibold text-slate-200 transition-colors"
              >
                Configure Grid Slice
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {project.sprites.map((sprite) => {
              const isSelected = selectedIds.includes(sprite.id);
              return (
                <div
                  key={sprite.id}
                  onClick={() => toggleSelect(sprite.id)}
                  className={`group rounded-2xl p-3 border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-600/10'
                      : 'bg-[#141624] border-[#222538] hover:border-[#353a56]'
                  }`}
                >
                  {/* Thumbnail Box */}
                  <div className="h-28 bg-checkerboard rounded-xl flex items-center justify-center p-2 mb-2 relative overflow-hidden border border-[#24273c]">
                    <img
                      src={sprite.dataUrl}
                      alt={sprite.name}
                      className="max-h-full max-w-full object-contain pixelated group-hover:scale-105 transition-transform"
                    />

                    {/* Trimmed Badge */}
                    {sprite.trimmed && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-bold text-emerald-400">
                        TRIM
                      </span>
                    )}

                    {/* Checkbox indicator */}
                    <div className="absolute top-1.5 left-1.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400 drop-shadow" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Frame Info */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={sprite.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateProject({
                          ...project,
                          sprites: project.sprites.map(s => s.id === sprite.id ? { ...s, name: val } : s)
                        });
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-200 hover:bg-[#1a1d2d] focus:bg-[#1a1d2d] px-1 py-0.5 rounded outline-none border border-transparent focus:border-indigo-500 truncate"
                    />

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                      <span>{sprite.width}×{sprite.height}</span>
                      <span>#{sprite.name.replace(/[^0-9]/g, '') || '•'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Slice Configuration Modal */}
      {showGridModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#141624] border border-[#2b3046] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Grid className="w-4 h-4 text-purple-400" />
              <span>Configure Grid Slicing</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Columns</label>
                <input
                  type="number"
                  min="1"
                  value={gridCols}
                  onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Rows</label>
                <input
                  type="number"
                  min="1"
                  value={gridRows}
                  onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Sprite Width (px)</label>
                <input
                  type="number"
                  min="4"
                  value={gridCellW}
                  onChange={(e) => setGridCellW(Math.max(4, parseInt(e.target.value) || 4))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Sprite Height (px)</label>
                <input
                  type="number"
                  min="4"
                  value={gridCellH}
                  onChange={(e) => setGridCellH(Math.max(4, parseInt(e.target.value) || 4))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Margin (px)</label>
                <input
                  type="number"
                  min="0"
                  value={gridMargin}
                  onChange={(e) => setGridMargin(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  value={gridPadding}
                  onChange={(e) => setGridPadding(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGridModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2032] text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyGridSlice}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-md shadow-purple-600/30"
              >
                Apply Grid Slice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
