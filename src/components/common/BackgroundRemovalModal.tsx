import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Pipette, Eraser, Brush, RotateCcw, Check } from 'lucide-react';
import { ColorKeyOptions, removeBackground } from '../../services/bgRemoval';
import { SplitSlider } from './SplitSlider';
import { hexToRgb, rgbToHex } from '../../services/optimizer';

interface BackgroundRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDataUrl: string;
  targetName: string;
  onApply: (processedDataUrl: string) => void;
}

export const BackgroundRemovalModal: React.FC<BackgroundRemovalModalProps> = ({
  isOpen,
  onClose,
  sourceDataUrl,
  targetName,
  onApply
}) => {
  const [tolerance, setTolerance] = useState(25);
  const [feather, setFeather] = useState(2);
  const [defringe, setDefringe] = useState(1);
  const [contiguous, setContiguous] = useState(false);
  const [targetColorHex, setTargetColorHex] = useState('#ffffff');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(sourceDataUrl);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(sourceDataUrl);
      // Auto-detect corner pixel color as initial candidate
      detectCornerColor(sourceDataUrl);
    }
  }, [isOpen, sourceDataUrl]);

  const detectCornerColor = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const p = ctx.getImageData(0, 0, 1, 1).data;
        if (p[3] > 10) {
          setTargetColorHex(rgbToHex(p[0], p[1], p[2]));
        }
      }
    };
    img.src = url;
  };

  // Run background removal on change
  useEffect(() => {
    if (!isOpen || !sourceDataUrl) return;

    let isMounted = true;
    setIsProcessing(true);

    const timer = setTimeout(async () => {
      try {
        const rgb = hexToRgb(targetColorHex);
        const options: ColorKeyOptions = {
          targetR: rgb.r,
          targetG: rgb.g,
          targetB: rgb.b,
          tolerance,
          feather,
          defringe,
          contiguous
        };

        const result = await removeBackground(sourceDataUrl, options);
        if (isMounted) {
          setPreviewDataUrl(result);
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
  }, [targetColorHex, tolerance, feather, defringe, contiguous, sourceDataUrl, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(previewDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-[#141624] border border-[#2b3046] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23273c] bg-[#10121d]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Smart Background Removal: {targetName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left: Split Slider Preview */}
          <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-[#0d0e17] border-r border-[#22263b] relative">
            <SplitSlider
              beforeImage={sourceDataUrl}
              afterImage={previewDataUrl}
              beforeLabel="Original Background"
              afterLabel="Transparent Subject"
              className="w-full h-full max-h-[460px]"
            />
            {isProcessing && (
              <div className="absolute bottom-4 right-4 bg-black/75 px-3 py-1.5 rounded-lg text-xs text-indigo-400 flex items-center gap-2 border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Removing background...</span>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-5 p-6 overflow-y-auto space-y-5 bg-[#141624]">
            {/* Target Color Selector */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-2">
                Background Target Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={targetColorHex}
                  onChange={(e) => setTargetColorHex(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#2e334a] p-0.5"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={targetColorHex}
                    onChange={(e) => setTargetColorHex(e.target.value)}
                    className="w-full bg-[#1c2032] border border-[#2b3046] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {[
                  { name: 'White', color: '#ffffff' },
                  { name: 'Black', color: '#000000' },
                  { name: 'Green', color: '#00ff00' },
                  { name: 'Magenta', color: '#ff00ff' }
                ].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setTargetColorHex(c.color)}
                    className="px-2 py-0.5 rounded text-[10px] bg-[#1c2032] hover:bg-[#282e48] border border-[#2a2f46] text-slate-300 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tolerance */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Tolerance Threshold</span>
                <span className="font-mono text-indigo-400">{tolerance}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Higher tolerance catches color variations, shadows, and gradients.
              </p>
            </div>

            {/* Edge Feathering */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Edge Feathering</span>
                <span className="font-mono text-indigo-400">{feather}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Softens silhouette contours to blend with game scene backgrounds.
              </p>
            </div>

            {/* Contiguous Toggle */}
            <div className="pt-3 border-t border-[#23273c]">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#1a1d2c] p-3 rounded-lg border border-[#262a3f]">
                <input
                  type="checkbox"
                  checked={contiguous}
                  onChange={(e) => setContiguous(e.target.checked)}
                  className="rounded accent-indigo-600 mt-0.5"
                />
                <div>
                  <span className="font-medium text-slate-200 block">Contiguous Only (Magic Wand)</span>
                  <span className="text-[10px] text-slate-400">
                    Removes only background connected to the edges, preserving internal matching colors.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#23273c] bg-[#10121d] flex items-center justify-between">
          <span className="text-xs text-slate-400">Processed locally with zero cloud upload.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1a1d2c] hover:bg-[#252a3f] text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply Background Removal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
