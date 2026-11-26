import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, Type, X } from 'lucide-react';
import { captionFontFamily, commonGoogleFonts, fontChoice, fontName, fontSource, googleFontNames, loadCaptionFont, readCaptionFont } from './caption-fonts';

const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])$/i;
const pageSize = 100;
const googleFonts = [...new Set([...commonGoogleFonts, ...googleFontNames])];

function useFontSpecimens(results, names, source) {
  const [ready, setReady] = useState(() => new Set());
  useEffect(() => {
    if (source !== 'google') return;
    const queued = new Set();
    let active = 0;
    let alive = true;

    function loadVisible() {
      while (alive && active < 4 && queued.size) {
        const row = queued.values().next().value;
        queued.delete(row);
        observer.unobserve(row);
        const { specimen } = row.dataset;
        active += 1;
        loadCaptionFont(specimen, specimen, 400).then((loaded) => {
          active -= 1;
          if (!alive) return;
          if (loaded) setReady((current) => current.has(specimen) ? current : new Set([...current, specimen]));
          loadVisible();
        });
      }
    }

    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) queued.add(target);
        else queued.delete(target);
      }
      loadVisible();
    }, { root: results.current, rootMargin: '55px 0px' });
    results.current.querySelectorAll('[data-specimen]').forEach((row) => { if (!ready.has(row.dataset.specimen)) observer.observe(row); });
    return () => { alive = false; observer.disconnect(); };
  }, [results, names, source]);
  return ready;
}

function FontOptions({ value, selectedValue, onChoose, search }) {
  const results = useRef(null);
  const localAvailable = loopback.test(location.hostname);
  const [source, setSource] = useState(() => localAvailable ? fontSource(value) : 'google');
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState(null);
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    if (source !== 'local' || local !== null) return;
    const controller = new AbortController();
    setStatus('Telepített betűtípusok beolvasása…');
    fetch(`${import.meta.env.BASE_URL}api/local-fonts`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const { families } = await response.json();
      if (!Array.isArray(families)) throw new Error();
      if (controller.signal.aborted) return;
      setLocal(families.filter((name) => typeof name === 'string' && readCaptionFont(fontChoice('local', name))));
      setStatus('');
    }).catch(() => {
      if (controller.signal.aborted) return;
      setLocal([]);
      setStatus('unavailable');
    });
    return () => controller.abort();
  }, [source, local]);

  const selected = fontSource(value) === source ? fontName(value) : null;
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('hu');
    const list = source === 'google' ? googleFonts : local ?? [];
    const families = selected ? [...new Set([selected, ...list])] : list;
    return term ? families.filter((name) => name.toLocaleLowerCase('hu').includes(term)) : families;
  }, [query, source, selected, local]);
  const visible = useMemo(() => matches.slice(0, limit), [matches, limit]);
  const specimens = useFontSpecimens(results, visible, source);
  const activeName = fontSource(selectedValue) === source ? fontName(selectedValue) : null;

  function switchSource(next) {
    setSource(next);
    setQuery('');
    setLimit(pageSize);
  }

  async function browserFonts() {
    setStatus('Telepített betűtípusok beolvasása…');
    try {
      const faces = await window.queryLocalFonts();
      setLocal([...new Set(faces.map(({ family }) => family).filter((name) => readCaptionFont(fontChoice('local', name))))]
        .sort((a, b) => a.localeCompare(b)));
      setStatus('');
    } catch {
      setStatus('unavailable');
    }
  }

  function choose(name) {
    const next = name === selected ? value : fontChoice(source, name);
    onChoose(next);
  }

  return <>
    <div className="font-dialog-controls">
      <div className="font-source" role="group" aria-label="Betűkészlet forrása">
        <button type="button" className="button" aria-pressed={source === 'google'} onClick={() => switchSource('google')}>Google Fonts</button>
        <button type="button" className="button" aria-pressed={source === 'local'} disabled={!localAvailable}
          title={localAvailable ? undefined : 'A gépen telepített betűk helyben futtatott VideoNodes-ban érhetők el.'}
          onClick={() => switchSource('local')}>Gépen telepített</button>
      </div>
      <label className="font-search"><Search size={15} /><input ref={search} type="search" aria-label="Betűtípus keresése"
        placeholder="Keresés név szerint" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(pageSize); }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !matches.length) return;
          event.preventDefault();
          const exact = matches.find((name) => name.toLocaleLowerCase('hu') === query.trim().toLocaleLowerCase('hu'));
          choose(exact ?? matches[0]);
        }} /></label>
    </div>
    <div className="font-results" ref={results}>
      {source === 'local' && status && <div className="font-status" role="status">
        {status === 'unavailable' ? <><p>A telepített betűtípusok listája nem érhető el a helyi szerverről.</p>
          {typeof window.queryLocalFonts === 'function' && <button type="button" className="button" onClick={browserFonts}>Betűkészletek betöltése a böngészőből</button>}
        </> : status}
      </div>}
      {!matches.length && !(source === 'local' && status) && <p className="font-status">Nincs találat.</p>}
      <div className="font-list" role="group" aria-label="Választható betűtípusok">
        {visible.map((name) => <button type="button" key={fontChoice(source, name)} data-specimen={source === 'google' ? name : undefined}
          aria-pressed={name === activeName} title={name}
          style={{ fontFamily: source === 'local' || specimens.has(name) ? captionFontFamily(fontChoice(source, name)) : undefined }}
          onClick={() => choose(name)}><span>{name}</span></button>)}
      </div>
      {matches.length > limit && <button type="button" className="button font-more" onClick={() => setLimit(limit + pageSize)}>További betűtípusok</button>}
    </div>
  </>;
}

export function FontPanel({ value, selectedValue, onPreview, onApply, onCancel }) {
  return <>
    <FontOptions value={value} selectedValue={selectedValue} onChoose={onPreview} />
    <footer className="gradient-footer font-footer">
      <button type="button" className="button" onClick={onCancel}>Mégsem</button>
      <button type="button" className="button primary" onClick={() => onApply(selectedValue)}>
        <Check size={15} /> Betű alkalmazása
      </button>
    </footer>
  </>;
}

function FontDialog({ value, label, onChange, onClose }) {
  const dialog = useRef(null);
  const search = useRef(null);
  const title = useId();
  useEffect(() => { dialog.current.showModal(); search.current.focus(); }, []);

  return createPortal(<dialog ref={dialog} className="gradient-dialog font-dialog" aria-labelledby={title}
    onClose={(event) => { event.stopPropagation(); onClose(); }}
    onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header"><Type size={18} /><h2 id={title}>{label}</h2>
      <button type="button" className="icon-button" aria-label="Betűválasztó bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <FontOptions value={value} selectedValue={value} search={search} onChoose={(next) => { onChange(next); dialog.current.close(); }} />
  </dialog>, document.body);
}

export function FontPicker({ value, label = 'Betűtípus', onChange }) {
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(null);
  useEffect(() => {
    let alive = true;
    loadCaptionFont(value).then((loaded) => { if (alive) setUnavailable(loaded ? null : value); });
    return () => { alive = false; };
  }, [value]);
  return <>
    <button type="button" className="font-field" aria-haspopup="dialog" aria-expanded={open} aria-label={label}
      title={unavailable === value ? 'A webfont jelenleg nem tölthető be. A megjelenítéshez az Inter betűtípus használatos.' : fontName(value)}
      onClick={() => setOpen(true)}>
      <span>{fontName(value)}</span><ChevronDown size={13} />
    </button>
    {open && <FontDialog value={value} label={label} onChange={onChange} onClose={() => setOpen(false)} />}
  </>;
}
