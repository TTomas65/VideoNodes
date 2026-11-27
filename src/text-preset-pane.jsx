import { useEffect, useRef, useState } from 'react';
import { EyeOff, RotateCcw, Save } from 'lucide-react';
import { listTextPresets, openTextPreset, presetPreviewUrl, saveTextPreset, setTextPresetHidden } from './text-presets';

const date = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' });

export function TextPresetPane({ caption, width, onLoad, children }) {
  const [kind, setKind] = useState('style');
  const [entries, setEntries] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [name, setName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = useRef(onLoad);
  const mounted = useRef(false);
  load.current = onLoad;

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    listTextPresets(controller.signal).then((data) => {
      if (!controller.signal.aborted) setEntries(data);
    }).catch((issue) => {
      if (!controller.signal.aborted) setError(issue.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => { mounted.current = false; controller.abort(); };
  }, []);

  async function perform(action) {
    setBusy(true);
    setNotice('');
    setError('');
    try { await action(); }
    catch (issue) { if (mounted.current) setError(issue.message); }
    finally { if (mounted.current) setBusy(false); }
  }

  const visible = entries.filter((entry) => entry.kind === kind && Boolean(entry.hidden) === showHidden);
  const hidden = entries.filter((entry) => entry.kind === kind && entry.hidden).length;
  const isCard = kind === 'card';
  const saveLabel = isCard ? 'Teljes kártya mentése' : 'Mentés szövegsablonként';

  return <div className="text-preset-pane">
    <div className="text-preset-switch" role="group" aria-label="Sablon típusa">
      {[['style', 'Szövegsablonok'], ['card', 'Teljes kártyamentések']].map(([type, label]) =>
        <button type="button" key={type} className="button" aria-pressed={kind === type} disabled={busy} onClick={() => {
          setKind(type);
          setShowHidden(false);
          setName(null);
          setNotice('');
        }}>{label}</button>)}
    </div>
    <div className="text-preset-tools">
      <button type="button" className="button" disabled={busy || loading} onClick={() => {
        setShowHidden(false);
        setName(caption.text.split('\n').find((line) => line.trim())?.trim().slice(0, 64) ?? '');
      }}><Save size={14} /> {saveLabel}</button>
      {(hidden > 0 || showHidden) && <button type="button" className="button" disabled={busy} aria-pressed={showHidden}
        onClick={() => { setShowHidden(!showHidden); setName(null); setNotice(''); }}>
        <EyeOff size={14} /> Levett sablonok ({hidden})
      </button>}
    </div>
    {name !== null && <form className="text-preset-save" onSubmit={(event) => {
      event.preventDefault();
      if (!name.trim() || busy) return;
      perform(async () => {
        const entry = await saveTextPreset(name, kind, caption, width);
        if (!mounted.current) return;
        setEntries((current) => [entry, ...current.filter(({ id }) => id !== entry.id)]);
        setName(null);
        setNotice('A sablon elmentve.');
      });
    }}>
      <label className="field">Sablon neve<input autoFocus type="text" maxLength={64} value={name} required disabled={busy}
        onChange={(event) => setName(event.target.value)} /></label>
      <div>
        <button type="button" className="button" disabled={busy} onClick={() => setName(null)}>Mégse</button>
        <button type="submit" className="button primary" disabled={busy || !name.trim()}>Sablon mentése</button>
      </div>
    </form>}
    {error && <p className="text-preset-error" role="alert">{error}</p>}
    {notice && <p className="text-preset-status" role="status">{notice}</p>}
    <section className="text-preset-list" aria-busy={loading || busy}>
      <h3>{showHidden ? 'Levett sablonok' : isCard ? 'Mentett kártyák' : 'Saját szövegsablonok'}</h3>
      {loading && <p className="text-preset-status">Sablonok betöltése…</p>}
      {!loading && !error && visible.length === 0 &&
        <p className="text-preset-status">{showHidden ? 'Nincs levett sablon.' : 'Itt jelennek meg a saját mentéseid.'}</p>}
      <div className="text-preset-grid">
        {visible.map((entry) => <article className="text-preset-card" key={entry.id}>
          <button className="text-preset-preview" type="button" disabled={busy || showHidden}
            aria-label={`${entry.title} betöltése`} onClick={() => perform(async () => {
              const preset = await openTextPreset(entry.id);
              if (mounted.current) { load.current(preset); setNotice(`Betöltve · ${entry.title}`); }
            })}>
            <img src={presetPreviewUrl(entry.id)} alt="" loading="lazy" width="480" height="270" />
            <strong title={entry.title}>{entry.title}</strong>
            <small>{date.format(entry.at)}</small>
          </button>
          <button className="button text-preset-visibility" type="button" disabled={busy}
            aria-label={`${entry.title} ${showHidden ? 'visszahelyezése' : 'levétele'}`} onClick={() => perform(async () => {
              const { hidden } = await setTextPresetHidden(entry.id, !showHidden);
              if (mounted.current) setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, hidden } : item));
            })}>
            {showHidden ? <RotateCcw size={13} /> : <EyeOff size={13} />} {showHidden ? 'Visszahelyezés' : 'Levétel'}
          </button>
        </article>)}
      </div>
    </section>
    {!isCard && !showHidden && <section className="text-preset-list"><h3>Beépített sablonok</h3>{children}</section>}
  </div>;
}
