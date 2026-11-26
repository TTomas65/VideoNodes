import { isLegacyExample, makeExample, readProject, storageKey } from './project';
import { createDiskBackup, listDiskBackups, readDiskBackup } from './backups';
import starter from '../backups/starter.json';
import starterPreview from '../backups/starter.png';

const previousStarterKey = `${storageKey}-previous-starter`;
const previewKey = 'gallery:';
const projectKey = 'archive:';
export const starterBackup = { id: 'starter', source: 'starter', title: starter.name, preview: starterPreview };

function accessSnapshot(mode, operate) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('present-fflow', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('projects');
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new Error('A böngészőtár egy másik ablakban használatban van.'));
    opening.onsuccess = () => {
      const db = opening.result;
      try {
        const transaction = db.transaction('projects', mode);
        const readResult = operate(transaction.objectStore('projects'));
        transaction.oncomplete = () => { db.close(); resolve(readResult?.()); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

export async function saveProject(snapshot, preview, previousStarterSnapshot) {
  const id = crypto.randomUUID();
  const onDisk = await createDiskBackup(id, snapshot, preview);
  const remembered = await accessSnapshot('readwrite', (store) => {
    if (previousStarterSnapshot) {
      const backup = store.get(previousStarterKey);
      backup.onsuccess = () => {
        if (!readSnapshot(backup.result)) store.put(previousStarterSnapshot, previousStarterKey);
      };
    }
    store.put(snapshot, storageKey);
    if (!onDisk) {
      store.put(snapshot, `${projectKey}${id}`);
      store.put({ id, title: snapshot.name, at: Date.now(), preview, source: 'browser' }, `${previewKey}${id}`);
    }
    return () => true;
  }).catch((error) => {
    if (!onDisk) throw error;
    return false;
  });
  return { onDisk, remembered };
}

export async function listProjectBackups() {
  const [disk, browser] = await Promise.allSettled([
    listDiskBackups(),
    accessSnapshot('readonly', (store) => {
      const request = store.getAll(IDBKeyRange.bound(previewKey, `${previewKey}\uffff`));
      return () => request.result;
    }),
  ]);
  const entries = [
    ...(disk.status === 'fulfilled' ? disk.value ?? [] : []),
    ...(browser.status === 'fulfilled' ? browser.value : []),
  ].sort((a, b) => b.at - a.at);
  const error = disk.status === 'rejected' ? disk.reason.message : null;
  return { entries: [starterBackup, ...entries], error };
}

export async function openProjectBackup(entry) {
  if (entry.source === 'starter') return makeExample();
  const snapshot = entry.source === 'disk' ? await readDiskBackup(entry.id) : await accessSnapshot('readonly', (store) => {
    const request = store.get(`${projectKey}${entry.id}`);
    return () => request.result;
  });
  if (!snapshot) throw new Error('Ez a mentés nem található.');
  return readProject(snapshot);
}

function readSnapshot(snapshot) {
  if (!snapshot) return null;
  try { return readProject(snapshot); } catch { return null; }
}

function readLocalSnapshot() {
  try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
}

export async function getInitialProject() {
  const [current, backup] = await accessSnapshot('readonly', (store) => {
    const active = store.get(storageKey);
    const previous = store.get(previousStarterKey);
    return () => [active.result, previous.result];
  }).catch(() => []);

  let snapshot = current;
  let saved = readSnapshot(snapshot);
  if (!saved) {
    snapshot = readLocalSnapshot();
    saved = readSnapshot(snapshot);
  }
  const previousStarter = readSnapshot(backup);
  if (!previousStarter && isLegacyExample(saved)) {
    return { ...makeExample(), previousStarter: saved, previousStarterSnapshot: snapshot };
  }
  return { ...(saved ?? makeExample()), saved: Boolean(saved), previousStarter };
}
