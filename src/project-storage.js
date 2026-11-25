import { isLegacyExample, makeExample, readProject, storageKey } from './project';

const previousStarterKey = `${storageKey}-previous-starter`;

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

export function saveProject(snapshot, previousStarterSnapshot) {
  return accessSnapshot('readwrite', (store) => {
    if (previousStarterSnapshot) {
      const backup = store.get(previousStarterKey);
      backup.onsuccess = () => {
        if (!readSnapshot(backup.result)) store.put(previousStarterSnapshot, previousStarterKey);
      };
    }
    store.put(snapshot, storageKey);
  });
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
