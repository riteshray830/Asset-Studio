import React from 'react';
import { 
  FolderOpen, 
  Save, 
  Download, 
  Undo2, 
  Redo2, 
  Layers, 
  Scissors, 
  Film, 
  Grid, 
  Zap, 
  Files, 
  PackageCheck, 
  Home, 
  HelpCircle,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { StudioProject, WorkspaceMode } from '../../types/project';

interface HeaderProps {
  project: StudioProject;
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onQuickExport: () => void;
  onOpenHelp: () => void;
  onToggleTheme: () => void;
  onRenameProject: (newName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeMode,
  onSelectMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onQuickExport,
  onOpenHelp,
  onToggleTheme,
  onRenameProject
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(project.name);

  React.useEffect(() => {
    setNameInput(project.name);
  }, [project.name]);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameInput.trim()) {
      onRenameProject(nameInput.trim());
    }
  };

  const navItems: { id: WorkspaceMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'editor', label: 'Editor', icon: <Layers className="w-4 h-4" /> },
    { id: 'sprites', label: 'Sprites', icon: <Scissors className="w-4 h-4" /> },
    { id: 'animation', label: 'Animation', icon: <Film className="w-4 h-4" /> },
    { id: 'atlas', label: 'Atlas', icon: <Grid className="w-4 h-4" /> },
    { id: 'optimize', label: 'Optimize', icon: <Zap className="w-4 h-4" /> },
    { id: 'batch', label: 'Batch', icon: <Files className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <PackageCheck className="w-4 h-4" /> }
  ];

  return (
    <header className="h-14 bg-[#141622] border-b border-[#242738] flex items-center justify-between px-4 z-40 select-none">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectMode('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">GeekRush</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium">STUDIO</span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-[#2b2f44] mx-1" />

        {/* Project Name Editor */}
        {isEditingName ? (
          <input
            type="text"
            className="bg-[#1e2235] border border-indigo-500 rounded px-2 py-1 text-xs text-white outline-none w-44"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            title="Click to rename project"
            className="text-xs text-slate-300 hover:text-white font-medium px-2 py-1 rounded hover:bg-[#1f2337] transition-colors flex items-center gap-1.5 max-w-[180px] truncate"
          >
            <span className="truncate">{project.name}</span>
            <span className="text-[10px] text-slate-500">✎</span>
          </button>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-[#0c0e17] p-1 rounded-xl border border-[#202336]">
        {navItems.map((item) => {
          const isActive = activeMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectMode(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a28]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Studio Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#1b1e2e] rounded-lg border border-[#272b3f] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#252a42] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#252a42] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          title="Save Project to Local IndexedDB (Ctrl+S)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2235] hover:bg-[#272c44] border border-[#2d324c] text-xs text-slate-200 hover:text-white transition-colors"
        >
          <Save className="w-3.5 h-3.5 text-indigo-400" />
          <span>Save</span>
        </button>

        {/* Quick Export One-Click Pipeline */}
        <button
          onClick={onQuickExport}
          title="Run One-Click Asset Pipeline & Download ZIP"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export ZIP</span>
        </button>

        {/* Shortcuts / Help */}
        <button
          onClick={onOpenHelp}
          title="Keyboard Shortcuts & Documentation"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2235] border border-transparent hover:border-[#2b3048] transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle Dark/Light Theme"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2235] border border-transparent hover:border-[#2b3048] transition-colors"
        >
          {project.settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};
