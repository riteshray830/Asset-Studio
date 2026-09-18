import React, { useState } from 'react';
import { X, Palette, Plus, Download, RefreshCw, Check } from 'lucide-react';
import { ColorPalette } from '../../types/project';
import { RETRO_PALETTES } from '../../services/sampleAssets';

interface PaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePalette: ColorPalette;
  onSelectPalette: (palette: ColorPalette) => void;
  onSelectColor: (hex: string) => void;
  extractedColors: string[];
}

export const PaletteModal: React.FC<PaletteModalProps> = ({
  isOpen,
  onClose,
  activePalette,
  onSelectPalette,
  onSelectColor,
  extractedColors
}) => {
  const [selectedHex, setSelectedHex] = useState(activePalette.colors[0] || '#ffffff');

  if (!isOpen) return null;

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(activePalette, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePalette.name.toLowerCase().replace(/\s+/g, '_')}_palette.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGpl = () => {
    let gpl = `GIMP Palette\nName: ${activePalette.name}\nColumns: 8\n#\n`;
    for (const hex of activePalette.colors) {
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      gpl += `${r.toString().padStart(3, ' ')} ${g.toString().padStart(3, ' ')} ${b.toString().padStart(3, ' ')} Untitled\n`;
    }
    const blob = new Blob([gpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePalette.name.toLowerCase().replace(/\s+/g, '_')}.gpl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#141624] border border-[#2b3046] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23273c] bg-[#10121d]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Palette className="w-5 h-5 text-indigo-400" />
            <span>Palette Studio & Presets</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preset Palettes */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Retro Game Presets
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RETRO_PALETTES.map((p) => {
                const isSelected = p.id === activePalette.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPalette(p)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-sm'
                        : 'bg-[#181b2b] border-[#25293d] hover:border-[#3b415e]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white mb-2">{p.name}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {p.colors.slice(0, 8).map((c, i) => (
                        <div
                          key={i}
                          className="w-3.5 h-3.5 rounded-sm border border-black/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Palette Color Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Palette: {activePalette.name}
              </h4>
              <span className="text-xs font-mono text-slate-400">Selected: {selectedHex}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0e101a] border border-[#222538] flex items-center gap-2 flex-wrap min-h-[64px]">
              {activePalette.colors.map((hex, i) => {
                const isCurrent = hex.toLowerCase() === selectedHex.toLowerCase();
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedHex(hex);
                      onSelectColor(hex);
                    }}
                    className={`w-9 h-9 rounded-lg border-2 transition-transform ${
                      isCurrent ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                );
              })}
            </div>
          </div>

          {/* Extracted from Document */}
          {extractedColors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Colors Extracted From Current Asset
              </h4>
              <div className="p-3 rounded-xl bg-[#0e101a] border border-[#222538] flex items-center gap-2 flex-wrap">
                {extractedColors.map((hex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedHex(hex);
                      onSelectColor(hex);
                    }}
                    className="w-7 h-7 rounded-md border border-white/20 hover:scale-105 transition-transform"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#23273c] bg-[#10121d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b2b] hover:bg-[#22263d] border border-[#272b42] text-xs text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleExportGpl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b2b] hover:bg-[#22263d] border border-[#272b42] text-xs text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GPL</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
