import { StudioProject } from '../types/project';

const DB_NAME = 'GeekRushAssetStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_RECENT = 'recent_metadata';

interface RecentProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  width: number;
  height: number;
  layerCount: number;
  spriteCount: number;
  thumbnail?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECENT)) {
        db.createObjectStore(STORE_RECENT, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToDB(project: StudioProject): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PROJECTS, STORE_RECENT], 'readwrite');
    
    // Clone project without non-serializable DOM canvas elements
    const serializableProject = {
      ...project,
      updatedAt: Date.now(),
      layers: project.layers.map(l => ({ ...l, canvas: undefined })),
      sprites: project.sprites.map(s => ({ ...s, canvas: undefined })),
      packedAtlases: project.packedAtlases.map(a => ({ ...a, canvas: undefined }))
    };

    tx.objectStore(STORE_PROJECTS).put(serializableProject);

    const meta: RecentProjectMeta = {
      id: project.id,
      name: project.name,
      updatedAt: Date.now(),
      width: project.width,
      height: project.height,
      layerCount: project.layers.length,
      spriteCount: project.sprites.length,
      thumbnail: project.sprites[0]?.dataUrl || project.layers[0]?.dataUrl
    };

    tx.objectStore(STORE_RECENT).put(meta);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
  }
}

export async function loadProjectFromDB(id: string): Promise<StudioProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const req = tx.objectStore(STORE_PROJECTS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load project from IndexedDB:', err);
    return null;
  }
}

export async function getRecentProjectsFromDB(): Promise<RecentProjectMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECENT, 'readonly');
      const req = tx.objectStore(STORE_RECENT).getAll();
      req.onsuccess = () => {
        const list: RecentProjectMeta[] = req.result || [];
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get recent projects:', err);
    return [];
  }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PROJECTS, STORE_RECENT], 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.objectStore(STORE_RECENT).delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}
