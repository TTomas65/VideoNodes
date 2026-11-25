import { example, readProject, storageKey } from './project';

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
        const request = operate(transaction.objectStore('projects'));
        transaction.oncomplete = () => { db.close(); resolve(request.result); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

export function saveProject(snapshot) {
  return accessSnapshot('readwrite', (store) => store.put(snapshot, storageKey));
}

export async function getInitialProject() {
  try {
    const saved = await accessSnapshot('readonly', (store) => store.get(storageKey));
    if (saved) return { ...readProject(saved), saved: true };
  } catch { /* Check for an earlier browser save before opening the sample. */ }
  try {
    const legacy = localStorage.getItem(storageKey);
    if (legacy) return { ...readProject(JSON.parse(legacy)), saved: true };
  } catch { /* The sample also works when browser storage is disabled. */ }
  return example;
}
