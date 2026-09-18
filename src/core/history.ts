import { StudioProject } from '../types/project';

const MAX_HISTORY_STEPS = 40;

export interface HistoryState {
  past: StudioProject[];
  present: StudioProject;
  future: StudioProject[];
}

export function createHistoryState(initialProject: StudioProject): HistoryState {
  return {
    past: [],
    present: initialProject,
    future: []
  };
}

export function pushHistoryState(
  history: HistoryState,
  newProject: StudioProject
): HistoryState {
  const past = [...history.past, history.present];
  if (past.length > MAX_HISTORY_STEPS) {
    past.shift();
  }

  return {
    past,
    present: newProject,
    future: [] // Clear future on new branch
  };
}

export function undoHistory(history: HistoryState): HistoryState {
  if (history.past.length === 0) return history;

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);

  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future]
  };
}

export function redoHistory(history: HistoryState): HistoryState {
  if (history.future.length === 0) return history;

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture
  };
}
