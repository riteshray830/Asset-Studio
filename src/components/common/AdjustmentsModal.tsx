import React, { useState, useEffect } from 'react';
import { X, Sliders, RotateCcw, Check } from 'lucide-react';
import { ImageAdjustments, applyAdjustments } from '../../services/bgRemoval';
import { SplitSlider } from './SplitSlider';

interface AdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDataUrl: string;
  targetName: string;
  onApply: (processedDataUrl: string) => void;
}

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  exposure: 0,
  gamma: 1.0,
  blur: 0,
  sharpen: 0,
  grayscale: false,
  invert: false
};

export const AdjustmentsModal: React.FC<AdjustmentsModalProps> = ({
  isOpen,
  onClose,
  sourceDataUrl,
  targetName,
  onApply
}) => {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(sourceDataUrl);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setPreviewDataUrl(sourceDataUrl);
    }
  }, [isOpen, sourceDataUrl]);

  // Update preview when adjustments change
  useEffect(() => {
    if (!isOpen || !sourceDataUrl) return;

    let isMounted = true;
    setIsProcessing(true);

    const timer = setTimeout(async () => {
      try {
        const result = await applyAdjustments(sourceDataUrl, adjustments);
        if (isMounted) {
          setPreviewDataUrl(result);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setIsProcessing(false);
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [adjustments, sourceDataUrl, isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  const handleSave = () => {
    onApply(previewDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#141624] border border-[#2b3046] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23273c] bg-[#10121d]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>Image Adjustments & Filters: {targetName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c2032] hover:bg-[#252b44] text-xs text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202436] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left: Split Slider Preview */}
          <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-[#0d0e17] border-r border-[#22263b] relative">
            <SplitSlider
              beforeImage={sourceDataUrl}
              afterImage={previewDataUrl}
              beforeLabel="Original"
              afterLabel="Adjusted"
              className="w-full h-full max-h-[460px]"
            />
            {isProcessing && (
              <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded-lg text-xs text-indigo-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Applying filters...</span>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-5 p-6 overflow-y-auto space-y-4 bg-[#141624]">
            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Brightness</span>
                <span className="font-mono text-slate-400">{adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.brightness}
                onChange={(e) => setAdjustments({ ...adjustments, brightness: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-slate-400">{adjustments.contrast}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.contrast}
                onChange={(e) => setAdjustments({ ...adjustments, contrast: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-slate-400">{adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.saturation}
                onChange={(e) => setAdjustments({ ...adjustments, saturation: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Hue */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Hue Rotate</span>
                <span className="font-mono text-slate-400">{adjustments.hue}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={adjustments.hue}
                onChange={(e) => setAdjustments({ ...adjustments, hue: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Exposure */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Exposure</span>
                <span className="font-mono text-slate-400">{adjustments.exposure}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.exposure}
                onChange={(e) => setAdjustments({ ...adjustments, exposure: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Sharpen */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Sharpen</span>
                <span className="font-mono text-slate-400">{adjustments.sharpen}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments.sharpen}
                onChange={(e) => setAdjustments({ ...adjustments, sharpen: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Blur */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Blur</span>
                <span className="font-mono text-slate-400">{adjustments.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={adjustments.blur}
                onChange={(e) => setAdjustments({ ...adjustments, blur: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-[#25293d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-[#23273c] grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#1a1d2c] p-2.5 rounded-lg border border-[#262a3f]">
                <input
                  type="checkbox"
                  checked={adjustments.grayscale}
                  onChange={(e) => setAdjustments({ ...adjustments, grayscale: e.target.checked })}
                  className="rounded accent-indigo-600"
                />
                <span>Grayscale</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#1a1d2c] p-2.5 rounded-lg border border-[#262a3f]">
                <input
                  type="checkbox"
                  checked={adjustments.invert}
                  onChange={(e) => setAdjustments({ ...adjustments, invert: e.target.checked })}
                  className="rounded accent-indigo-600"
                />
                <span>Invert Colors</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#23273c] bg-[#10121d] flex items-center justify-between">
          <span className="text-xs text-slate-400">Drag center slider to inspect before/after differences.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1a1d2c] hover:bg-[#252a3f] text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply Adjustments</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
