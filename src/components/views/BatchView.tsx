import React, { useState, useRef } from 'react';
import { 
  Files, 
  UploadCloud, 
  Play, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Crop,
  Layers,
  ArrowRight
} from 'lucide-react';
import JSZip from 'jszip';
import { BatchConfig, BatchItem } from '../../types/export';
import { removeBackground } from '../../services/bgRemoval';
import { trimSpriteFrame } from '../../services/spriteDetector';
import { optimizeImage } from '../../services/optimizer';

export const BatchView: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedZipBlob, setProcessedZipBlob] = useState<Blob | null>(null);

  const [config, setConfig] = useState<BatchConfig>({
    operations: {
      trim: true,
      removeBackground: false,
      bgTolerance: 20,
      resize: false,
      resizeMode: 'scale',
      targetWidth: 64,
      targetHeight: 64,
      scalePercent: 100,
      normalize: false,
      formatConvert: true,
      targetFormat: 'png',
      quality: 85,
      rename: true,
      renamePrefix: 'asset_',
      renameSuffix: '',
      renameSearch: '',
      renameReplace: '',
      renameSequenceStart: 1,
      renameSequencePadding: 2
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = (files: FileList | File[]) => {
    const newItems: BatchItem[] = Array.from(files).map((f, i) => ({
      id: `batch_${Date.now()}_${i}`,
      file: f,
      name: f.name,
      originalSize: f.size,
      status: 'pending'
    }));

    setItems(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const runBatchProcessing = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setProcessedZipBlob(null);

    const zip = new JSZip();
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      item.status = 'processing';
      setItems([...updatedItems]);

      try {
        // Read file to data URL
        const dataUrl = await fileToDataUrl(item.file);

        let currentDataUrl = dataUrl;

        // Step 1: Background removal if enabled
        if (config.operations.removeBackground) {
          currentDataUrl = await removeBackground(currentDataUrl, {
            targetR: 255,
            targetG: 255,
            targetB: 255,
            tolerance: config.operations.bgTolerance,
            feather: 1,
            defringe: 1,
            contiguous: false
          });
        }

        // Step 2: Trim if enabled
        if (config.operations.trim) {
          const fakeSprite = {
            id: item.id,
            name: item.name,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            originalWidth: 100,
            originalHeight: 100,
            anchor: { x: 0.5, y: 1 },
            dataUrl: currentDataUrl
          };
          const trimmed = await trimSpriteFrame(fakeSprite);
          currentDataUrl = trimmed.dataUrl;
        }

        // Step 3: Format conversion & optimization
        const opt = await optimizeImage(currentDataUrl, {
          format: config.operations.formatConvert ? config.operations.targetFormat : 'png',
          quality: config.operations.quality / 100
        });

        // Step 4: Determine output filename
        let outName = item.name.replace(/\.[^/.]+$/, '');
        if (config.operations.rename) {
          if (config.operations.renameSearch) {
            outName = outName.replace(
              new RegExp(config.operations.renameSearch, 'g'),
              config.operations.renameReplace
            );
          }
          const seqNum = String(config.operations.renameSequenceStart + i).padStart(
            config.operations.renameSequencePadding,
            '0'
          );
          outName = `${config.operations.renamePrefix}${outName}${config.operations.renameSuffix}_${seqNum}`;
        }
        outName += `.${config.operations.formatConvert ? config.operations.targetFormat : 'png'}`;

        // Add to ZIP
        zip.file(outName, opt.optimizedBlob);

        item.status = 'done';
        item.resultDataUrl = opt.dataUrl;
        item.resultBlob = opt.optimizedBlob;
        item.resultSize = opt.optimizedSize;
      } catch (err: any) {
        console.error(err);
        item.status = 'error';
        item.errorMessage = err.message || 'Processing failed';
      }

      setProgress(Math.round(((i + 1) / updatedItems.length) * 100));
      setItems([...updatedItems]);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    setProcessedZipBlob(zipBlob);
    setIsProcessing(false);
  };

  const handleDownloadZip = () => {
    if (!processedZipBlob) return;
    const url = URL.createObjectURL(processedZipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_processed_assets.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0f18] select-none">
      {/* Left Configuration Sidebar */}
      <div className="w-80 bg-[#141624] border-r border-[#222538] p-5 flex flex-col justify-between overflow-y-auto z-10">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Files className="w-4 h-4 text-indigo-400" />
            <span>Batch Pipeline Settings</span>
          </div>

          {/* Operations Checklist */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#181a29] p-2.5 rounded-xl border border-[#262a3f]">
              <input
                type="checkbox"
                checked={config.operations.trim}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    operations: { ...config.operations, trim: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600"
              />
              <div className="flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto Trim Transparency</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#181a29] p-2.5 rounded-xl border border-[#262a3f]">
              <input
                type="checkbox"
                checked={config.operations.removeBackground}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    operations: { ...config.operations, removeBackground: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600 mt-0.5"
              />
              <div>
                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Remove White Background</span>
                </div>
                {config.operations.removeBackground && (
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400">Tolerance: {config.operations.bgTolerance}%</span>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={config.operations.bgTolerance}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          operations: { ...config.operations, bgTolerance: Number(e.target.value) }
                        })
                      }
                      className="w-full accent-indigo-500 h-1 bg-[#25293d] rounded cursor-pointer mt-1"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer bg-[#181a29] p-2.5 rounded-xl border border-[#262a3f]">
              <input
                type="checkbox"
                checked={config.operations.formatConvert}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    operations: { ...config.operations, formatConvert: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600 mt-0.5"
              />
              <div className="w-full">
                <span className="font-medium text-slate-200 block mb-1">Convert & Optimize</span>
                {config.operations.formatConvert && (
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {['webp', 'png', 'jpg'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() =>
                          setConfig({
                            ...config,
                            operations: { ...config.operations, targetFormat: fmt as any }
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                          config.operations.targetFormat === fmt
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#12141f] text-slate-400'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Batch Rename Rules */}
          <div className="pt-3 border-t border-[#23273c]">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.operations.rename}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    operations: { ...config.operations, rename: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600"
              />
              <span>Batch Rename Pattern</span>
            </label>

            {config.operations.rename && (
              <div className="space-y-2.5 bg-[#10121d] p-3 rounded-xl border border-[#222538]">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Prefix</span>
                  <input
                    type="text"
                    value={config.operations.renamePrefix}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        operations: { ...config.operations, renamePrefix: e.target.value }
                      })
                    }
                    className="w-full bg-[#181a29] border border-[#262a3f] rounded px-2 py-1 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Start Number</span>
                    <input
                      type="number"
                      min="0"
                      value={config.operations.renameSequenceStart}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          operations: {
                            ...config.operations,
                            renameSequenceStart: parseInt(e.target.value) || 1
                          }
                        })
                      }
                      className="w-full bg-[#181a29] border border-[#262a3f] rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Digits (Padding)</span>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={config.operations.renameSequencePadding}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          operations: {
                            ...config.operations,
                            renameSequencePadding: parseInt(e.target.value) || 2
                          }
                        })
                      }
                      className="w-full bg-[#181a29] border border-[#262a3f] rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <button
            onClick={runBatchProcessing}
            disabled={items.length === 0 || isProcessing}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isProcessing ? `Processing (${progress}%)` : `Process ${items.length} Assets`}</span>
          </button>
        </div>
      </div>

      {/* Main File Queue & Progress */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Queue Bar */}
        <div className="h-14 bg-[#141624] border-b border-[#24283c] px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-200">
              Queue: {items.length} File(s)
            </span>
            {isProcessing && (
              <div className="w-40 bg-[#25293d] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2b3048] text-xs font-semibold text-slate-200 transition-colors"
            >
              Add Files
            </button>

            {items.length > 0 && (
              <button
                onClick={() => setItems([])}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {processedZipBlob && (
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Processed ZIP</span>
              </button>
            )}
          </div>
        </div>

        {/* Items List / Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex-1 overflow-y-auto p-6"
        >
          {items.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-full border-2 border-dashed border-[#282d44] hover:border-indigo-500/50 rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors bg-[#11131e]/50"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Drop Game Assets Here</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Drag & drop hundreds of PNGs, JPGs, WebPs, or ZIP archives to trim, remove background, optimize, and rename in batch.
              </p>
              <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md">
                Browse Files
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#141624] border border-[#222538]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-checkerboard border border-[#272b40] flex items-center justify-center overflow-hidden shrink-0">
                      {item.resultDataUrl ? (
                        <img src={item.resultDataUrl} alt={item.name} className="w-8 h-8 object-contain pixelated" />
                      ) : (
                        <Files className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Original: {formatBytes(item.originalSize)}
                        {item.resultSize && (
                          <span className="text-emerald-400 ml-2">
                            → Result: {formatBytes(item.resultSize)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Queued</span>
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="flex items-center gap-1 text-[11px] text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span>Processing</span>
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400" title={item.errorMessage}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
