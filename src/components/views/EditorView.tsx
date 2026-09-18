import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, 
  Crop, 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Pipette, 
  Square, 
  Circle, 
  Minus, 
  Sparkles, 
  Sliders, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Copy, 
  Layers, 
  Download, 
  Merge, 
  Palette,
  Check,
  Hand,
  Focus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { StudioLayer, StudioProject, ToolType } from '../../types/project';
import { AdjustmentsModal } from '../common/AdjustmentsModal';
import { BackgroundRemovalModal } from '../common/BackgroundRemovalModal';
import { PaletteModal } from '../common/PaletteModal';
import { extractColorPalette, rgbToHex } from '../../services/optimizer';

interface EditorViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  project,
  onUpdateProject,
  zoom,
  onZoomChange,
  onCursorMove
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [brushSize, setBrushSize] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Modal States
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showBgRemoval, setShowBgRemoval] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeLayer = project.layers.find(l => l.id === project.activeLayerId) || project.layers[0];

  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [layerDragStart, setLayerDragStart] = useState<{
    startX: number;
    startY: number;
    layerOrigX: number;
    layerOrigY: number;
  } | null>(null);

  // In-memory decoded canvas cache per layer for instant 60fps compositing and painting
  const layerCanvasMap = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [layersReadyToken, setLayersReadyToken] = useState(0);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');

  // Center canvas on project switch or resolution change
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [project.id, project.width, project.height]);

  // Spacebar pan keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Fit to screen helper
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const availW = Math.max(100, rect.width - padding);
    const availH = Math.max(100, rect.height - padding);
    const scaleX = availW / project.width;
    const scaleY = availH / project.height;
    let idealZoom = Math.min(scaleX, scaleY);
    if (idealZoom >= 1) {
      idealZoom = Math.floor(idealZoom);
    } else {
      idealZoom = Math.round(idealZoom * 10) / 10;
    }
    idealZoom = Math.max(0.2, Math.min(16, idealZoom));
    onZoomChange(idealZoom);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleCenterCanvas = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  // Synchronize layer dataUrls into decoded offscreen canvases
  useEffect(() => {
    let cancelled = false;

    const syncLayerCanvases = async () => {
      const promises = project.layers.map((layer) => {
        const cached = layerCanvasMap.current.get(layer.id);
        if (cached && (cached as any)._dataUrl === layer.dataUrl) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (cancelled) return resolve();
            const lCanvas = document.createElement('canvas');
            lCanvas.width = layer.width || img.width || project.width;
            lCanvas.height = layer.height || img.height || project.height;
            const lCtx = lCanvas.getContext('2d')!;
            lCtx.imageSmoothingEnabled = false;
            lCtx.drawImage(img, 0, 0, lCanvas.width, lCanvas.height);
            (lCanvas as any)._dataUrl = layer.dataUrl;
            layerCanvasMap.current.set(layer.id, lCanvas);
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = layer.dataUrl;
        });
      });

      await Promise.all(promises);
      if (!cancelled) {
        setLayersReadyToken((t) => t + 1);
      }
    };

    syncLayerCanvases();

    return () => {
      cancelled = true;
    };
  }, [project.layers, project.width, project.height]);

  // Synchronous composite to the main display canvas
  const compositeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = !project.settings.pixelPerfect;

    // Stacking order:
    // In UI: project.layers[0] is at the TOP of the panel (Foreground, drawn LAST).
    // project.layers[project.layers.length - 1] is at the BOTTOM of the panel (Background, drawn FIRST).
    const drawOrder = [...project.layers].reverse();

    for (const layer of drawOrder) {
      if (!layer.visible || layer.opacity <= 0) continue;
      const lCanvas = layerCanvasMap.current.get(layer.id);
      if (!lCanvas) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      ctx.globalCompositeOperation = (layer.blendMode as GlobalCompositeOperation) || 'source-over';
      ctx.drawImage(lCanvas, layer.x, layer.y, layer.width, layer.height);
      ctx.restore();
    }
  }, [project.layers, project.settings.pixelPerfect]);

  useEffect(() => {
    compositeCanvas();
  }, [compositeCanvas, layersReadyToken]);

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    const newZoom = Math.max(0.1, Math.min(32, Math.round(zoom * factor * 100) / 100));
    onZoomChange(newZoom);
  };

  // Handle Canvas Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle Click, Alt+Click, Spacebar holding, or Pan/Select tool
    if (e.button === 1 || e.buttons === 4 || e.altKey || isSpaceHeld || activeTool === 'select') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (!activeLayer || activeLayer.locked || !canvasRef.current) return;

    // Move layer tool
    if (activeTool === 'move') {
      setLayerDragStart({
        startX: e.clientX,
        startY: e.clientY,
        layerOrigX: activeLayer.x,
        layerOrigY: activeLayer.y
      });
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (activeTool === 'eyedropper') {
      sampleColorAt(coords.x, coords.y);
      return;
    }

    setIsDrawing(true);
    setDrawStartPos(coords);
    applyDrawing(coords.x, coords.y, coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (layerDragStart && activeLayer && !activeLayer.locked) {
      const dx = Math.round((e.clientX - layerDragStart.startX) / zoom);
      const dy = Math.round((e.clientY - layerDragStart.startY) / zoom);
      let nextX = layerDragStart.layerOrigX + dx;
      let nextY = layerDragStart.layerOrigY + dy;

      if (project.settings.snapToGrid && project.settings.gridSize > 0) {
        const gs = project.settings.gridSize;
        nextX = Math.round(nextX / gs) * gs;
        nextY = Math.round(nextY / gs) * gs;
      }

      activeLayer.x = nextX;
      activeLayer.y = nextY;
      compositeCanvas();
      return;
    }

    const coords = getCanvasCoords(e);
    onCursorMove(coords);

    if (!isDrawing || !coords || !activeLayer || activeLayer.locked) return;

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      applyDrawing(coords.x, coords.y, coords.x, coords.y);
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    if (layerDragStart && activeLayer) {
      onUpdateProject({
        ...project,
        layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, x: activeLayer.x, y: activeLayer.y } : l)
      });
      setLayerDragStart(null);
    }
    if (isDrawing) {
      setIsDrawing(false);
      setDrawStartPos(null);
      const lCanvas = layerCanvasMap.current.get(activeLayer?.id || '');
      if (lCanvas && activeLayer) {
        const newDataUrl = lCanvas.toDataURL('image/png');
        (lCanvas as any)._dataUrl = newDataUrl;
        onUpdateProject({
          ...project,
          layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, dataUrl: newDataUrl } : l)
        });
      }
    }
  };

  const getCanvasCoords = (e: React.PointerEvent): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoom;
    const rawY = (e.clientY - rect.top) / zoom;

    let x = Math.floor(rawX);
    let y = Math.floor(rawY);

    if (project.settings.snapToGrid && project.settings.gridSize > 0) {
      const gs = project.settings.gridSize;
      x = Math.floor(x / gs) * gs;
      y = Math.floor(y / gs) * gs;
    }

    return { x, y };
  };

  const sampleColorAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = ctx.getImageData(x, y, 1, 1).data;
    if (p[3] > 0) {
      const hex = rgbToHex(p[0], p[1], p[2]);
      onUpdateProject({ ...project, primaryColor: hex });
    }
  };

  const applyDrawing = (x: number, y: number, fromX: number, fromY: number) => {
    if (!activeLayer || activeLayer.locked) return;

    let layerCanvas = layerCanvasMap.current.get(activeLayer.id);
    if (!layerCanvas) {
      layerCanvas = document.createElement('canvas');
      layerCanvas.width = activeLayer.width || project.width;
      layerCanvas.height = activeLayer.height || project.height;
      layerCanvasMap.current.set(activeLayer.id, layerCanvas);
    }
    const ctx = layerCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const relX = x - activeLayer.x;
    const relY = y - activeLayer.y;

    if (activeTool === 'pencil') {
      ctx.fillStyle = project.primaryColor;
      ctx.fillRect(relX, relY, brushSize, brushSize);
    } else if (activeTool === 'eraser') {
      ctx.clearRect(relX, relY, brushSize, brushSize);
    } else if (activeTool === 'bucket') {
      floodFill(layerCanvas, relX, relY, project.primaryColor);
    }

    compositeCanvas();
  };

  const floodFill = (canvas: HTMLCanvasElement, startX: number, startY: number, fillHex: string) => {
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const idx = (startY * w + startX) * 4;
    const targetR = data[idx];
    const targetG = data[idx + 1];
    const targetB = data[idx + 2];
    const targetA = data[idx + 3];

    // parse fill hex
    const clean = fillHex.replace('#', '');
    const fillR = parseInt(clean.substring(0, 2), 16);
    const fillG = parseInt(clean.substring(2, 4), 16);
    const fillB = parseInt(clean.substring(4, 6), 16);
    const fillA = 255;

    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const queue: number[] = [startX, startY];
    const visited = new Uint8Array(w * h);

    while (queue.length > 0) {
      const cy = queue.pop()!;
      const cx = queue.pop()!;
      const p = (cy * w + cx);
      if (visited[p]) continue;
      visited[p] = 1;

      const pIdx = p * 4;
      if (
        data[pIdx] === targetR &&
        data[pIdx + 1] === targetG &&
        data[pIdx + 2] === targetB &&
        data[pIdx + 3] === targetA
      ) {
        data[pIdx] = fillR;
        data[pIdx + 1] = fillG;
        data[pIdx + 2] = fillB;
        data[pIdx + 3] = fillA;

        if (cx > 0) queue.push(cx - 1, cy);
        if (cx < w - 1) queue.push(cx + 1, cy);
        if (cy > 0) queue.push(cx, cy - 1);
        if (cy < h - 1) queue.push(cx, cy + 1);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const commitActiveLayerChange = () => {
    if (!activeLayer) return;
    const lCanvas = layerCanvasMap.current.get(activeLayer.id);
    if (lCanvas) {
      const dataUrl = lCanvas.toDataURL('image/png');
      (lCanvas as any)._dataUrl = dataUrl;
      onUpdateProject({
        ...project,
        layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, dataUrl } : l)
      });
    }
  };

  // Layer Actions
  const handleAddLayer = () => {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = project.width;
    newCanvas.height = project.height;
    const newId = `layer_${Date.now()}`;
    const newLayer: StudioLayer = {
      id: newId,
      name: `Layer ${project.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      x: 0,
      y: 0,
      width: project.width,
      height: project.height,
      dataUrl: newCanvas.toDataURL('image/png')
    };

    (newCanvas as any)._dataUrl = newLayer.dataUrl;
    layerCanvasMap.current.set(newId, newCanvas);

    onUpdateProject({
      ...project,
      layers: [newLayer, ...project.layers],
      activeLayerId: newLayer.id
    });
  };

  const handleDuplicateLayer = (layerId: string) => {
    const target = project.layers.find(l => l.id === layerId);
    if (!target) return;
    const newId = `layer_copy_${Date.now()}`;
    const copy: StudioLayer = {
      ...target,
      id: newId,
      name: `${target.name} (Copy)`
    };

    const targetCanvas = layerCanvasMap.current.get(layerId);
    if (targetCanvas) {
      const cloneCanvas = document.createElement('canvas');
      cloneCanvas.width = targetCanvas.width;
      cloneCanvas.height = targetCanvas.height;
      const cCtx = cloneCanvas.getContext('2d')!;
      cCtx.drawImage(targetCanvas, 0, 0);
      (cloneCanvas as any)._dataUrl = copy.dataUrl;
      layerCanvasMap.current.set(newId, cloneCanvas);
    }

    const idx = project.layers.findIndex(l => l.id === layerId);
    const nextLayers = [...project.layers];
    nextLayers.splice(idx, 0, copy);

    onUpdateProject({
      ...project,
      layers: nextLayers,
      activeLayerId: copy.id
    });
  };

  const handleDeleteLayer = (layerId: string) => {
    if (project.layers.length <= 1) return;
    layerCanvasMap.current.delete(layerId);
    const nextLayers = project.layers.filter(l => l.id !== layerId);
    onUpdateProject({
      ...project,
      layers: nextLayers,
      activeLayerId: nextLayers[0].id
    });
  };

  const handleMoveLayer = (fromIdx: number, dir: -1 | 1) => {
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= project.layers.length) return;
    const nextLayers = [...project.layers];
    const [moved] = nextLayers.splice(fromIdx, 1);
    nextLayers.splice(toIdx, 0, moved);
    onUpdateProject({
      ...project,
      layers: nextLayers
    });
  };

  const handleMergeDown = (index: number) => {
    if (index >= project.layers.length - 1) return;
    const upper = project.layers[index];
    const lower = project.layers[index + 1];

    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = project.width;
    mergeCanvas.height = project.height;
    const mCtx = mergeCanvas.getContext('2d')!;

    // Draw lower layer first
    const lowerCanvas = layerCanvasMap.current.get(lower.id);
    if (lowerCanvas) {
      mCtx.save();
      mCtx.globalAlpha = lower.opacity;
      mCtx.globalCompositeOperation = (lower.blendMode as GlobalCompositeOperation) || 'source-over';
      mCtx.drawImage(lowerCanvas, lower.x, lower.y, lower.width, lower.height);
      mCtx.restore();
    }

    // Draw upper layer on top
    const upperCanvas = layerCanvasMap.current.get(upper.id);
    if (upperCanvas) {
      mCtx.save();
      mCtx.globalAlpha = upper.opacity;
      mCtx.globalCompositeOperation = (upper.blendMode as GlobalCompositeOperation) || 'source-over';
      mCtx.drawImage(upperCanvas, upper.x, upper.y, upper.width, upper.height);
      mCtx.restore();
    }

    const mergedId = `layer_merged_${Date.now()}`;
    const mergedDataUrl = mergeCanvas.toDataURL('image/png');
    (mergeCanvas as any)._dataUrl = mergedDataUrl;
    layerCanvasMap.current.set(mergedId, mergeCanvas);

    const mergedLayer: StudioLayer = {
      ...lower,
      id: mergedId,
      name: `${lower.name} (Merged)`,
      x: 0,
      y: 0,
      width: project.width,
      height: project.height,
      opacity: 1,
      blendMode: 'source-over',
      dataUrl: mergedDataUrl
    };

    const nextLayers = project.layers.filter((_, idx) => idx !== index && idx !== index + 1);
    nextLayers.splice(index, 0, mergedLayer);

    onUpdateProject({
      ...project,
      layers: nextLayers,
      activeLayerId: mergedLayer.id
    });
  };

  const handleFinishRename = (layerId: string) => {
    if (!editingLayerName.trim()) {
      setEditingLayerId(null);
      return;
    }
    onUpdateProject({
      ...project,
      layers: project.layers.map(l => l.id === layerId ? { ...l, name: editingLayerName.trim() } : l)
    });
    setEditingLayerId(null);
  };

  const handleExportLayerPng = (layer: StudioLayer) => {
    const a = document.createElement('a');
    a.href = layer.dataUrl;
    a.download = `${layer.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0b10] select-none relative">
      {/* Left Toolbar */}
      <div className="w-12 bg-[#141624] border-r border-[#222538] flex flex-col items-center py-3 gap-2 z-20">
        {[
          { id: 'move', label: 'Move Layer (V)', icon: <Move className="w-4 h-4" /> },
          { id: 'select', label: 'Pan Canvas (H / Space)', icon: <Hand className="w-4 h-4" /> },
          { id: 'pencil', label: 'Pixel Pencil (B)', icon: <Pencil className="w-4 h-4" /> },
          { id: 'eraser', label: 'Eraser (E)', icon: <Eraser className="w-4 h-4" /> },
          { id: 'bucket', label: 'Bucket Fill (G)', icon: <PaintBucket className="w-4 h-4" /> },
          { id: 'eyedropper', label: 'Eyedropper (I)', icon: <Pipette className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id as ToolType)}
            title={t.label}
            className={`p-2 rounded-xl transition-all ${
              activeTool === t.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2337]'
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-6 h-px bg-[#262a3f] my-1" />

        {/* AI & Adjustments Triggers */}
        <button
          onClick={() => setShowBgRemoval(true)}
          title="Smart Background Removal"
          className="p-2 rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowAdjustments(true)}
          title="Image Adjustments & Filters"
          className="p-2 rounded-xl text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Color Swatches */}
        <div className="flex flex-col items-center gap-1.5 pb-2">
          <div
            onClick={() => setShowPalette(true)}
            title={`Primary Color: ${project.primaryColor} (Click to open Palette Studio)`}
            className="w-7 h-7 rounded-lg border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: project.primaryColor }}
          />
          <button
            onClick={() => setShowPalette(true)}
            title="Open Palette Studio"
            className="text-slate-400 hover:text-white p-1"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Canvas Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex-1 overflow-hidden relative flex items-center justify-center ${
          isSpaceHeld || isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool === 'move' ? 'cursor-move' : activeTool === 'select' ? 'cursor-grab' : 'cursor-crosshair'
        }`}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: isPanning || isDrawing || layerDragStart ? 'none' : 'transform 0.05s ease-out'
          }}
          className="relative inline-block shadow-2xl rounded-sm"
        >
          {/* Checkerboard Background */}
          <div
            className={`absolute inset-0 ${
              project.settings.checkerboardType === 'light'
                ? 'bg-checkerboard-light'
                : 'bg-checkerboard'
            }`}
            style={{
              width: project.width * zoom,
              height: project.height * zoom
            }}
          />

          {/* Render Canvas */}
          <canvas
            ref={canvasRef}
            width={project.width}
            height={project.height}
            className={project.settings.pixelPerfect ? 'pixelated relative z-10' : 'relative z-10'}
            style={{
              width: project.width * zoom,
              height: project.height * zoom
            }}
          />

          {/* Grid Overlay */}
          {project.settings.showGrid && project.settings.gridSize > 0 && (
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                backgroundSize: `${project.settings.gridSize * zoom}px ${project.settings.gridSize * zoom}px`,
                width: project.width * zoom,
                height: project.height * zoom
              }}
            />
          )}
        </div>

        {/* Viewport Floating Quick Bar */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#12141f]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#24283c] text-xs text-slate-300 shadow-xl z-30">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={project.settings.showGrid}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  settings: { ...project.settings, showGrid: e.target.checked }
                })
              }
              className="rounded accent-indigo-500"
            />
            <span>Grid ({project.settings.gridSize}px)</span>
          </label>

          <div className="w-px h-3 bg-[#2b2f46] mx-1" />

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={project.settings.snapToGrid}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  settings: { ...project.settings, snapToGrid: e.target.checked }
                })
              }
              className="rounded accent-indigo-500"
            />
            <span>Snap</span>
          </label>

          <div className="w-px h-3 bg-[#2b2f46] mx-1" />

          {/* Center Canvas */}
          <button
            onClick={handleCenterCanvas}
            title="Center Canvas in Viewport"
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#1f2337] text-slate-300 hover:text-white transition-colors"
          >
            <Focus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Center</span>
          </button>

          {/* Fit Screen */}
          <button
            onClick={handleFitToScreen}
            title="Fit Canvas to Viewport"
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#1f2337] text-slate-300 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Fit ({Math.round(zoom * 100)}%)</span>
          </button>
        </div>
      </div>

      {/* Right Layer Panel */}
      <div className="w-72 bg-[#141624] border-l border-[#222538] flex flex-col z-20">
        {/* Layer Panel Header */}
        <div className="p-3 border-b border-[#222538] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Layers ({project.layers.length})</span>
          </div>

          <button
            onClick={handleAddLayer}
            title="Create New Layer"
            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Layer Properties */}
        {activeLayer && (
          <div className="p-3 border-b border-[#222538] space-y-2.5 bg-[#10121d]">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Opacity</span>
              <span className="font-mono text-slate-200">
                {Math.round(activeLayer.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={activeLayer.opacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateProject({
                  ...project,
                  layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, opacity: val } : l)
                });
              }}
              className="w-full accent-indigo-500 h-1 bg-[#25293d] rounded cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Blend Mode</span>
              <select
                value={activeLayer.blendMode}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateProject({
                    ...project,
                    layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, blendMode: val } : l)
                  });
                }}
                className="bg-[#1c2032] border border-[#2b3046] rounded px-2 py-0.5 text-slate-200 text-[11px] outline-none"
              >
                <option value="source-over">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
              </select>
            </div>
          </div>
        )}

        {/* Layer Hierarchy List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {project.layers.map((layer, idx) => {
            const isActive = layer.id === project.activeLayerId;
            return (
              <div
                key={layer.id}
                onClick={() => onUpdateProject({ ...project, activeLayerId: layer.id })}
                className={`group flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-600/25 border-indigo-500/70 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-[#181b2b] border-[#22263a] hover:border-[#353a54]'
                }`}
              >
                {/* Left: Thumbnail & Name / Rename */}
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <div className="w-8 h-8 rounded bg-checkerboard border border-[#2e334c] flex items-center justify-center overflow-hidden shrink-0">
                    <img src={layer.dataUrl} alt={layer.name} className="w-6 h-6 object-contain pixelated" />
                  </div>

                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      value={editingLayerName}
                      onChange={(e) => setEditingLayerName(e.target.value)}
                      onBlur={() => handleFinishRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(layer.id);
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="bg-[#10121d] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full min-w-0"
                    />
                  ) : (
                    <div 
                      className="min-w-0 flex-1 flex items-center gap-1 group/name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingLayerId(layer.id);
                        setEditingLayerName(layer.name);
                      }}
                      title="Double-click to rename"
                    >
                      <span className={`text-xs font-medium truncate ${layer.visible ? 'text-slate-200' : 'text-slate-500'}`}>
                        {layer.name}
                      </span>
                      {layer.locked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                  )}
                </div>

                {/* Right: Layer Stacking, Lock, Visibility & Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Move Up / Down Stacking Order */}
                  <div className="flex flex-col">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(idx, -1);
                      }}
                      disabled={idx === 0}
                      title="Bring Layer Forward (Up)"
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-10"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(idx, 1);
                      }}
                      disabled={idx === project.layers.length - 1}
                      title="Send Layer Backward (Down)"
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-10"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Lock Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateProject({
                        ...project,
                        layers: project.layers.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)
                      });
                    }}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className="p-1 text-slate-500 hover:text-amber-400"
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />}
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateProject({
                        ...project,
                        layers: project.layers.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)
                      });
                    }}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                  </button>

                  {/* Merge Down */}
                  {idx < project.layers.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMergeDown(idx);
                      }}
                      title="Merge Down"
                      className="p-1 text-slate-500 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Duplicate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateLayer(layer.id);
                    }}
                    title="Duplicate Layer"
                    className="p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  {project.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      title="Delete Layer"
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adjustments Modal */}
      {activeLayer && (
        <AdjustmentsModal
          isOpen={showAdjustments}
          onClose={() => setShowAdjustments(false)}
          sourceDataUrl={activeLayer.dataUrl}
          targetName={activeLayer.name}
          onApply={(processedDataUrl) => {
            onUpdateProject({
              ...project,
              layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, dataUrl: processedDataUrl } : l)
            });
          }}
        />
      )}

      {/* Background Removal Modal */}
      {activeLayer && (
        <BackgroundRemovalModal
          isOpen={showBgRemoval}
          onClose={() => setShowBgRemoval(false)}
          sourceDataUrl={activeLayer.dataUrl}
          targetName={activeLayer.name}
          onApply={(processedDataUrl) => {
            onUpdateProject({
              ...project,
              layers: project.layers.map(l => l.id === activeLayer.id ? { ...l, dataUrl: processedDataUrl } : l)
            });
          }}
        />
      )}

      {/* Palette Modal */}
      <PaletteModal
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        activePalette={project.palettes.find(p => p.id === project.activePaletteId) || project.palettes[0]}
        onSelectPalette={(palette) => onUpdateProject({ ...project, activePaletteId: palette.id })}
        onSelectColor={(hex) => onUpdateProject({ ...project, primaryColor: hex })}
        extractedColors={canvasRef.current ? extractColorPalette(canvasRef.current, 16) : []}
      />
    </div>
  );
};
