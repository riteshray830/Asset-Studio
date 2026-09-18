import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Wrench } from 'lucide-react';
import { StudioProject } from '../../types/project';
import { ValidationIssue } from '../../types/export';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StudioProject;
  onNormalizeFrames: () => void;
  onRemoveDuplicateFrames: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  project,
  onNormalizeFrames,
  onRemoveDuplicateFrames
}) => {
  if (!isOpen) return null;

  const issues: ValidationIssue[] = [];

  // Check 1: Inconsistent frame dimensions in animations
  project.animations.forEach((anim) => {
    const frames = anim.frameIds
      .map(id => project.sprites.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    if (frames.length > 1) {
      const firstW = frames[0].width;
      const firstH = frames[0].height;
      const mismatched = frames.some(f => f.width !== firstW || f.height !== firstH);

      if (mismatched) {
        issues.push({
          id: `dim_mismatch_${anim.id}`,
          type: 'warning',
          title: `Dimension Mismatch in "${anim.name}"`,
          message: `Frames in animation "${anim.name}" have inconsistent widths/heights, which can cause jittering in game engines.`,
          fixable: true,
          fixAction: onNormalizeFrames
        });
      }
    }
  });

  // Check 2: Atlas size limits
  if (project.atlasConfig.maxSize > 2048) {
    issues.push({
      id: 'atlas_oversize',
      type: 'info',
      title: 'High Atlas Resolution',
      message: `Atlas max dimension is set to ${project.atlasConfig.maxSize}px. Ensure target mobile devices support textures larger than 2048px.`,
      fixable: false
    });
  }

  // Check 3: Empty animations
  project.animations.forEach((anim) => {
    if (anim.frameIds.length === 0) {
      issues.push({
        id: `empty_anim_${anim.id}`,
        type: 'error',
        title: `Empty Animation: "${anim.name}"`,
        message: `Animation "${anim.name}" has 0 frames assigned. Add frames in the Animation tab before exporting.`,
        fixable: false
      });
    }
  });

  const hasErrors = issues.some(i => i.type === 'error');
  const hasWarnings = issues.some(i => i.type === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#141624] border border-[#2b3046] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23273c] bg-[#10121d]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Game Asset Sanity Validation</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-white font-semibold text-base mb-1">Asset Pack Ready for Production</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                All frames have consistent dimensions, texture constraints are satisfied, and animations are verified.
              </p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  issue.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : issue.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                }`}
              >
                {issue.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                {issue.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                {issue.type === 'info' && <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />}

                <div className="flex-1">
                  <h4 className="font-semibold text-xs text-white mb-0.5">{issue.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{issue.message}</p>

                  {issue.fixable && issue.fixAction && (
                    <button
                      onClick={() => {
                        issue.fixAction?.();
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Fix Automatically</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#23273c] bg-[#10121d] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {issues.length === 0 ? '0 issues detected' : `${issues.length} check(s) flagged`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#1a1d2c] hover:bg-[#252a3f] text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
