import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Download, 
  Check, 
  ArrowRight, 
  Sliders, 
  Layers, 
  Scissors, 
  Grid,
  FileCheck2
} from 'lucide-react';
import { StudioProject } from '../../types/project';
import { OptimizationResult } from '../../types/export';
import { optimizeImage } from '../../services/optimizer';
import { SplitSlider } from '../common/SplitSlider';

interface OptimizeViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const OptimizeView: React.FC<OptimizeViewProps> = ({ project, onUpdateProject }) => {
  const [targetType, setTargetType] = useState<'layer' | 'sprite' | 'atlas'>('sprite');
  const [selectedItemId, setSelectedItemId] = useState<string>(
    project.sprites[0]?.id || project.layers[0]?.id || ''
  );
  const [format, setFormat] = useState<'png' | 'webp' | 'jpg'>('webp');
  const [quality, setQuality] = useState(85);
  const [colorReduction, setColorReduction] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine current source image
  let currentSourceUrl = '';
  let currentItemName = '';

  if (targetType === 'sprite') {
    const s = project.sprites.find(sp => sp.id === selectedItemId) || project.sprites[0];
    currentSourceUrl = s?.dataUrl || '';
    currentItemName = s?.name || 'Sprite';
  } else if (targetType === 'layer') {
    const l = project.layers.find(ly => ly.id === selectedItemId) || project.layers[0];
    currentSourceUrl = l?.dataUrl || '';
    currentItemName = l?.name || 'Layer';
  } else {
    const a = project.packedAtlases.find(at => at.id === selectedItemId) || project.packedAtlases[0];
    currentSourceUrl = a?.dataUrl || '';
    currentItemName = a?.name || 'Atlas';
  }

  // Run optimization on config change
  useEffect(() => {
    if (!currentSourceUrl) return;

    let isMounted = true;
    setIsProcessing(true);

    const timer = setTimeout(async () => {
      try {
        const opt = await optimizeImage(currentSourceUrl, {
          format,
          quality: quality / 100,
          colorCount: colorReduction
        });
        if (isMounted) {
          setResult(opt);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setIsProcessing(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentSourceUrl, format, quality, colorReduction]);

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.dataUrl;
    a.download = `${currentItemName.toLowerCase()}_opt.${format}`;
    a.click();
  };

  const handleApplyToProject = () => {
    if (!result) return;

    if (targetType === 'sprite') {
      onUpdateProject({
        ...project,
        sprites: project.sprites.map(s => s.id === selectedItemId ? { ...s, dataUrl: result.dataUrl } : s)
      });
    } else if (targetType === 'layer') {
      onUpdateProject({
        ...project,
        layers: project.layers.map(l => l.id === selectedItemId ? { ...l, dataUrl: result.dataUrl } : l)
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0f18] select-none">
      {/* Left Settings Sidebar */}
      <div className="w-80 bg-[#141624] border-r border-[#222538] p-5 flex flex-col justify-between overflow-y-auto z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Asset Optimization</span>
          </div>

          {/* Target Type Selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">Target Asset</label>
            <div className="grid grid-cols-3 gap-1 bg-[#10121d] p-1 rounded-xl border border-[#23273c]">
              {[
                { id: 'sprite', label: 'Sprite' },
                { id: 'layer', label: 'Layer' },
                { id: 'atlas', label: 'Atlas' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTargetType(t.id as any);
                    if (t.id === 'sprite') setSelectedItemId(project.sprites[0]?.id || '');
                    if (t.id === 'layer') setSelectedItemId(project.layers[0]?.id || '');
                    if (t.id === 'atlas') setSelectedItemId(project.packedAtlases[0]?.id || '');
                  }}
                  className={`py-1 rounded-lg text-xs font-semibold transition-colors ${
                    targetType === t.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Target Item Dropdown */}
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full mt-2 bg-[#1c2032] border border-[#2b3046] rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              {targetType === 'sprite' &&
                project.sprites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.width}×{s.height})</option>)}
              {targetType === 'layer' &&
                project.layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              {targetType === 'atlas' &&
                project.packedAtlases.map(a => <option key={a.id} value={a.id}>{a.name} ({a.width}×{a.height})</option>)}
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">Target Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'webp', label: 'WebP', desc: 'Best compression' },
                { id: 'png', label: 'PNG', desc: 'Lossless' },
                { id: 'jpg', label: 'JPEG', desc: 'Small' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    format === f.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-[#1a1d2d] border-[#25293d] text-slate-300 hover:border-[#383e5a]'
                  }`}
                >
                  <div className="text-xs font-bold">{f.label}</div>
                  <div className="text-[9px] opacity-75">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Compression Quality</span>
              <span className="font-mono text-indigo-400">{quality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded cursor-pointer"
            />
          </div>

          {/* Color Reduction Palette */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">
              Color Reduction / Quantization
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Original', val: undefined },
                { label: '256 Colors', val: 256 },
                { label: '128 Colors', val: 128 },
                { label: '64 Colors', val: 64 },
                { label: '32 Colors', val: 32 },
                { label: '16 Colors', val: 16 }
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorReduction(c.val)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                    colorReduction === c.val
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-[#1a1d2d] border-[#25293d] text-slate-300 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <button
            onClick={handleDownload}
            disabled={!result}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Optimized</span>
          </button>

          {targetType !== 'atlas' && (
            <button
              onClick={handleApplyToProject}
              disabled={!result}
              className="w-full py-2 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply to Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Inspection View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Metrics Cards */}
        {result && (
          <div className="h-16 bg-[#141624] border-b border-[#24283c] px-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Original Size</div>
                <div className="text-sm font-bold text-slate-200 font-mono">{formatBytes(result.originalSize)}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Optimized Size</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{formatBytes(result.optimizedSize)}</div>
              </div>

              <div className="h-8 w-px bg-[#262a3f]" />

              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Total Savings</div>
                <div className="text-sm font-extrabold text-indigo-400 font-mono">
                  {result.savingsPercent}%
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Unique Colors</div>
                <div className="text-sm font-semibold text-slate-300 font-mono">{result.colorCount}</div>
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Compressing...</span>
              </div>
            )}
          </div>
        )}

        {/* Split Comparison View */}
        <div className="flex-1 p-8 flex items-center justify-center bg-[#090a10]">
          {result && currentSourceUrl ? (
            <SplitSlider
              beforeImage={currentSourceUrl}
              afterImage={result.dataUrl}
              beforeLabel={`Original (${formatBytes(result.originalSize)})`}
              afterLabel={`Optimized ${format.toUpperCase()} (${formatBytes(result.optimizedSize)})`}
              className="w-full max-w-2xl h-[500px]"
            />
          ) : (
            <div className="text-xs text-slate-500">No asset selected for optimization</div>
          )}
        </div>
      </div>
    </div>
  );
};
