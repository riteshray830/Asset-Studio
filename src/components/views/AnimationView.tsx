import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square as StopSquare, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Plus, 
  Trash2, 
  Copy, 
  Film, 
  Layers, 
  Download, 
  Sparkles,
  Eye,
  Sliders
} from 'lucide-react';
import { AnimationSequence, SpriteFrame, StudioProject } from '../../types/project';
import { exportFramesToGif } from '../../services/gifExporter';

interface AnimationViewProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const AnimationView: React.FC<AnimationViewProps> = ({ project, onUpdateProject }) => {
  const [activeAnimId, setActiveAnimId] = useState<string>(
    project.activeAnimationId || project.animations[0]?.id || ''
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewBg, setPreviewBg] = useState<'checker' | 'dark' | 'light' | 'green'>('checker');
  const [previewZoom, setPreviewZoom] = useState(300); // 300%
  const [isPingPongReversing, setIsPingPongReversing] = useState(false);

  const activeAnim = project.animations.find(a => a.id === activeAnimId) || project.animations[0];

  // Resolve frames for active animation
  const animFrames: SpriteFrame[] = (activeAnim?.frameIds || [])
    .map(id => project.sprites.find(s => s.id === id))
    .filter((s): s is SpriteFrame => s !== undefined);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || animFrames.length <= 1 || !activeAnim) return;

    const currentFrameId = animFrames[currentFrameIndex]?.id;
    const duration = (activeAnim.frameDurations && activeAnim.frameDurations[currentFrameId]) ||
      Math.round(1000 / (activeAnim.fps || 12));

    const timer = setTimeout(() => {
      if (activeAnim.pingPong) {
        if (!isPingPongReversing) {
          if (currentFrameIndex >= animFrames.length - 1) {
            setIsPingPongReversing(true);
            setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1));
          } else {
            setCurrentFrameIndex(currentFrameIndex + 1);
          }
        } else {
          if (currentFrameIndex <= 0) {
            setIsPingPongReversing(false);
            setCurrentFrameIndex(Math.min(animFrames.length - 1, currentFrameIndex + 1));
          } else {
            setCurrentFrameIndex(currentFrameIndex - 1);
          }
        }
      } else {
        if (currentFrameIndex >= animFrames.length - 1) {
          if (activeAnim.loop) {
            setCurrentFrameIndex(0);
          } else {
            setIsPlaying(false);
          }
        } else {
          setCurrentFrameIndex(currentFrameIndex + 1);
        }
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentFrameIndex, animFrames.length, activeAnim, isPingPongReversing]);

  // Handle Add New Animation
  const handleAddAnimation = () => {
    const newId = `anim_${Date.now()}`;
    const newSeq: AnimationSequence = {
      id: newId,
      name: `Animation ${project.animations.length + 1}`,
      frameIds: project.sprites.slice(0, 4).map(s => s.id),
      frameDurations: {},
      fps: 12,
      loop: true,
      pingPong: false
    };

    onUpdateProject({
      ...project,
      animations: [...project.animations, newSeq],
      activeAnimationId: newId
    });
    setActiveAnimId(newId);
    setCurrentFrameIndex(0);
  };

  // Smart Auto Animation Grouping by filename prefix
  const handleAutoGroup = () => {
    const groups = new Map<string, string[]>();

    project.sprites.forEach(sprite => {
      // e.g. player_run_01 -> group "run", idle_2 -> group "idle"
      const match = sprite.name.match(/^(?:.*_)?([a-zA-Z]+)(?:_|\d)+/);
      const groupName = match ? match[1].toLowerCase() : 'default';
      const capitalized = groupName.charAt(0).toUpperCase() + groupName.slice(1);

      if (!groups.has(capitalized)) {
        groups.set(capitalized, []);
      }
      groups.get(capitalized)!.push(sprite.id);
    });

    const newAnimations: AnimationSequence[] = [];
    groups.forEach((fIds, name) => {
      newAnimations.push({
        id: `anim_${name.toLowerCase()}_${Date.now()}`,
        name,
        frameIds: fIds,
        frameDurations: {},
        fps: 12,
        loop: true,
        pingPong: false
      });
    });

    if (newAnimations.length > 0) {
      onUpdateProject({
        ...project,
        animations: newAnimations,
        activeAnimationId: newAnimations[0].id
      });
      setActiveAnimId(newAnimations[0].id);
      setCurrentFrameIndex(0);
    }
  };

  // Export current animation as GIF
  const handleExportGif = async () => {
    if (animFrames.length === 0 || !activeAnim) return;
    const blob = await exportFramesToGif(animFrames, {
      fps: activeAnim.fps,
      loop: activeAnim.loop,
      durations: activeAnim.frameDurations
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeAnim.name.toLowerCase().replace(/\s+/g, '_')}.gif`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveFrameFromTimeline = (idx: number) => {
    if (!activeAnim) return;
    const nextFrames = [...activeAnim.frameIds];
    nextFrames.splice(idx, 1);

    onUpdateProject({
      ...project,
      animations: project.animations.map(a =>
        a.id === activeAnim.id ? { ...a, frameIds: nextFrames } : a
      )
    });
    if (currentFrameIndex >= nextFrames.length) {
      setCurrentFrameIndex(Math.max(0, nextFrames.length - 1));
    }
  };

  const handleAddSpriteToTimeline = (spriteId: string) => {
    if (!activeAnim) return;
    onUpdateProject({
      ...project,
      animations: project.animations.map(a =>
        a.id === activeAnim.id ? { ...a, frameIds: [...a.frameIds, spriteId] } : a
      )
    });
  };

  const currentSprite = animFrames[currentFrameIndex];
  const prevSprite = currentFrameIndex > 0 ? animFrames[currentFrameIndex - 1] : animFrames[animFrames.length - 1];
  const nextSprite = currentFrameIndex < animFrames.length - 1 ? animFrames[currentFrameIndex + 1] : animFrames[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f18] select-none">
      {/* Animation Selector Tab Bar */}
      <div className="h-12 bg-[#141624] border-b border-[#24283c] px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {project.animations.map((anim) => {
            const isActive = anim.id === activeAnimId;
            return (
              <button
                key={anim.id}
                onClick={() => {
                  setActiveAnimId(anim.id);
                  setCurrentFrameIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2032]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{anim.name}</span>
                <span className="text-[10px] opacity-75">({anim.frameIds.length})</span>
              </button>
            );
          })}

          <button
            onClick={handleAddAnimation}
            title="Create New Animation Sequence"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2236] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Auto Group Button */}
          <button
            onClick={handleAutoGroup}
            title="Automatically detect animations by file prefixes (e.g. idle_01, run_01)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2032] hover:bg-[#252a42] border border-[#2c314b] text-xs font-medium text-purple-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Auto Group Sequences</span>
          </button>

          <button
            onClick={handleExportGif}
            disabled={animFrames.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GIF</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Preview + Bank) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Center Live Preview Viewport */}
        <div className="md:col-span-8 p-6 flex flex-col items-center justify-center bg-[#090a10] border-r border-[#202336] relative overflow-hidden">
          {/* Viewport Canvas Frame */}
          <div
            className={`relative rounded-2xl p-6 border border-[#272b40] shadow-2xl flex items-center justify-center min-w-[240px] min-h-[240px] overflow-hidden ${
              previewBg === 'checker'
                ? 'bg-checkerboard'
                : previewBg === 'dark'
                ? 'bg-[#11131c]'
                : previewBg === 'light'
                ? 'bg-white'
                : 'bg-[#00ff00]'
            }`}
          >
            {/* Onion Skin: Previous Frame Ghost */}
            {project.settings.onionSkin.enabled && prevSprite && isPlaying === false && (
              <img
                src={prevSprite.dataUrl}
                alt="Previous Ghost"
                className="absolute pixelated pointer-events-none filter drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]"
                style={{
                  width: prevSprite.width * (previewZoom / 100),
                  height: prevSprite.height * (previewZoom / 100),
                  opacity: project.settings.onionSkin.prevAlpha
                }}
              />
            )}

            {/* Active Current Frame */}
            {currentSprite ? (
              <img
                src={currentSprite.dataUrl}
                alt={currentSprite.name}
                className="relative z-10 pixelated pointer-events-none transition-transform"
                style={{
                  width: currentSprite.width * (previewZoom / 100),
                  height: currentSprite.height * (previewZoom / 100)
                }}
              />
            ) : (
              <div className="text-xs text-slate-500 font-medium">No frames in animation</div>
            )}

            {/* Onion Skin: Next Frame Ghost */}
            {project.settings.onionSkin.enabled && nextSprite && isPlaying === false && (
              <img
                src={nextSprite.dataUrl}
                alt="Next Ghost"
                className="absolute pixelated pointer-events-none filter drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]"
                style={{
                  width: nextSprite.width * (previewZoom / 100),
                  height: nextSprite.height * (previewZoom / 100),
                  opacity: project.settings.onionSkin.nextAlpha
                }}
              />
            )}
          </div>

          {/* Viewport Floating Options Bar */}
          <div className="absolute top-4 left-4 flex items-center gap-3 bg-[#141624]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#262a3f] text-xs text-slate-300 shadow-xl">
            {/* Zoom dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Zoom:</span>
              {[100, 200, 300, 400, 600].map((z) => (
                <button
                  key={z}
                  onClick={() => setPreviewZoom(z)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                    previewZoom === z ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>

            <div className="w-px h-3 bg-[#2b2f46]" />

            {/* Background switcher */}
            <div className="flex items-center gap-1">
              {[
                { id: 'checker', label: 'Check' },
                { id: 'dark', label: 'Dark' },
                { id: 'light', label: 'Light' },
                { id: 'green', label: 'Chroma' }
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setPreviewBg(bg.id as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    previewBg === bg.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-[#1f2236]'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            <div className="w-px h-3 bg-[#2b2f46]" />

            {/* Onion Skin Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={project.settings.onionSkin.enabled}
                onChange={(e) =>
                  onUpdateProject({
                    ...project,
                    settings: {
                      ...project.settings,
                      onionSkin: { ...project.settings.onionSkin, enabled: e.target.checked }
                    }
                  })
                }
                className="rounded accent-indigo-500"
              />
              <span>Onion Skin</span>
            </label>
          </div>
        </div>

        {/* Right Sprite Frame Bank (Click to add to timeline) */}
        <div className="md:col-span-4 bg-[#12141f] border-l border-[#202336] p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sprite Library</h3>
            <span className="text-[11px] text-slate-400">Click to append to animation</span>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2.5 p-1">
            {project.sprites.map((sprite) => (
              <div
                key={sprite.id}
                onClick={() => handleAddSpriteToTimeline(sprite.id)}
                className="group rounded-xl bg-[#181b2b] border border-[#23273c] hover:border-indigo-500 p-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105"
                title={`Add ${sprite.name} to timeline`}
              >
                <div className="w-14 h-14 bg-checkerboard rounded-lg flex items-center justify-center overflow-hidden mb-1">
                  <img src={sprite.dataUrl} alt={sprite.name} className="w-10 h-10 object-contain pixelated" />
                </div>
                <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">
                  {sprite.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Timeline Section */}
      <div className="h-44 bg-[#141624] border-t border-[#24283c] flex flex-col select-none z-20">
        {/* Timeline Control Bar */}
        <div className="h-10 bg-[#10121d] border-b border-[#202336] px-6 flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
              title="Previous Frame"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2235] transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(0);
              }}
              title="Stop"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2235] transition-colors"
            >
              <StopSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentFrameIndex(Math.min(animFrames.length - 1, currentFrameIndex + 1))}
              title="Next Frame"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2235] transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[#2b2f46] mx-2" />

            {/* Loop Toggle */}
            <button
              onClick={() => {
                if (!activeAnim) return;
                onUpdateProject({
                  ...project,
                  animations: project.animations.map(a =>
                    a.id === activeAnim.id ? { ...a, loop: !a.loop } : a
                  )
                });
              }}
              title="Loop Animation"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeAnim?.loop
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop</span>
            </button>

            {/* Ping-Pong Toggle */}
            <button
              onClick={() => {
                if (!activeAnim) return;
                onUpdateProject({
                  ...project,
                  animations: project.animations.map(a =>
                    a.id === activeAnim.id ? { ...a, pingPong: !a.pingPong } : a
                  )
                });
              }}
              title="Ping-Pong Playback (Forward then Reverse)"
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeAnim?.pingPong
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Ping-Pong
            </button>
          </div>

          {/* FPS Slider */}
          {activeAnim && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">FPS:</span>
              <input
                type="range"
                min="1"
                max="60"
                value={activeAnim.fps}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 12;
                  onUpdateProject({
                    ...project,
                    animations: project.animations.map(a =>
                      a.id === activeAnim.id ? { ...a, fps: val } : a
                    )
                  });
                }}
                className="w-24 accent-indigo-500 h-1 bg-[#25293d] rounded cursor-pointer"
              />
              <span className="font-mono text-xs text-indigo-400 font-bold w-6">{activeAnim.fps}</span>
            </div>
          )}
        </div>

        {/* Timeline Frame Sequence Track */}
        <div className="flex-1 overflow-x-auto p-3 flex items-center gap-2">
          {animFrames.map((frame, idx) => {
            const isCurrent = idx === currentFrameIndex;
            return (
              <div
                key={`${frame.id}_${idx}`}
                onClick={() => {
                  setCurrentFrameIndex(idx);
                  setIsPlaying(false);
                }}
                className={`relative group rounded-xl p-1.5 border cursor-pointer shrink-0 transition-all flex flex-col items-center justify-between w-20 h-24 ${
                  isCurrent
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md scale-105'
                    : 'bg-[#181b2b] border-[#24283c] hover:border-[#383d5a]'
                }`}
              >
                <div className="w-full flex-1 bg-checkerboard rounded-lg flex items-center justify-center overflow-hidden mb-1">
                  <img src={frame.dataUrl} alt={frame.name} className="w-12 h-12 object-contain pixelated" />
                </div>

                <div className="text-[10px] font-mono text-slate-300 w-full text-center truncate">
                  #{String(idx + 1).padStart(2, '0')}
                </div>

                {/* Remove from sequence button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFrameFromTimeline(idx);
                  }}
                  title="Remove from animation"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
