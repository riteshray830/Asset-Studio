import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Z', desc: 'Undo last action' },
    { key: 'Ctrl + Y / Ctrl + Shift + Z', desc: 'Redo previously undone action' },
    { key: 'Ctrl + S', desc: 'Save project to browser IndexedDB storage' },
    { key: 'Space + Drag', desc: 'Pan canvas viewport smoothly' },
    { key: 'Middle Mouse + Drag', desc: 'Pan canvas viewport' },
    { key: 'Mouse Wheel', desc: 'Zoom canvas in and out' },
    { key: '+ / -', desc: 'Zoom in / Zoom out' },
    { key: 'Ctrl + 0', desc: 'Reset zoom to 100%' },
    { key: 'B', desc: 'Pixel Pencil / Brush tool' },
    { key: 'E', desc: 'Eraser tool' },
    { key: 'G', desc: 'Bucket Fill tool' },
    { key: 'I', desc: 'Eyedropper / Color Picker' },
    { key: 'V', desc: 'Select / Move tool' },
    { key: 'C', desc: 'Crop tool' },
    { key: 'Delete / Backspace', desc: 'Delete selected layer or sprite frame' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#161826] border border-[#2d3148] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#25293d] bg-[#12141f]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <span>Studio Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#202436] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#1a1d2d] border border-[#24273c]"
            >
              <span className="text-xs text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#11131e] border border-[#2d324c] font-mono text-[11px] text-indigo-300 font-semibold shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[#25293d] bg-[#12141f] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
