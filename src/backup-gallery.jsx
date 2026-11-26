import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Search, Upload, X } from 'lucide-react';
import { listProjectBackups, openProjectBackup, starterBackup } from './project-storage';

const formatDate = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' });

export function BackupGallery({ onSelect, onImportFile, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState([starterBackup]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const visible = entries.filter(({ title }) => title.toLocaleLowerCase('hu').includes(query.trim().toLocaleLowerCase('hu')));

  useEffect(() => {
    dialog.current.showModal();
    let active = true;
    listProjectBackups().then(({ entries, error }) => {
      if (!active) return;
      setEntries(entries);
      setError(error ?? '');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function select(entry) {
    setOpening(true);
    setError('');
    try {
      const project = await openProjectBackup(entry);
      if (dialog.current?.open && onSelect(project, entry)) dialog.current.close();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setOpening(false);
    }
  }

  return createPortal(<dialog ref={dialog} className="backup-dialog" aria-labelledby={title} onClose={onClose} onKeyDown={(event) => event.stopPropagation()}>
    <header>
      <FolderOpen size={19} />
      <h2 id={title}>Projekt importálása</h2>
      <button type="button" className="icon-button" aria-label="Projektválasztó bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <div className="backup-tools">
      <label className="backup-search"><Search size={16} /><input aria-label="Projekt keresése" placeholder="Projekt keresése…" value={query}
        onChange={(event) => setQuery(event.target.value)} /></label>
      <button type="button" className="button" onClick={() => { dialog.current.close(); onImportFile(); }}><Upload size={15} /> JSON-fájl megnyitása</button>
    </div>
    {error && <p className="backup-message" role="alert">{error}</p>}
    <div className="backup-grid" aria-busy={loading || opening}>
      {visible.map((entry) => <button type="button" className="backup-card" key={entry.id} disabled={opening} onClick={() => select(entry)}>
        <img src={entry.preview} alt="" loading="lazy" />
        <span><strong>{entry.title}</strong><small>{entry.source === 'starter' ? 'Kezdőprojekt' : formatDate.format(entry.at)}</small></span>
      </button>)}
      {visible.length === 0 && <p className="backup-message">{loading ? 'Mentések betöltése…' : 'Nincs találat.'}</p>}
    </div>
  </dialog>, document.body);
}
