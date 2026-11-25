import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { addEdge, Background, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from '@xyflow/react';
import { Activity, ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, ChevronRight, CircleHelp, Command, FileVideo, Focus, Folder, Grid3X3, Layers3, LayoutGrid, Minus, PanelLeft, PanelRight, Play, Plus, Save, Search, Settings2, Terminal, Trash2, X } from 'lucide-react';
import '@fontsource-variable/inter';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { descriptions, edgeTypes, GraphContext, NodeIcon, nodeTypes } from './nodes';
import { backgroundPort, canConnect, defaults, edgeType, effects, formats, imageDataSize, label, makeNode, readProject, resolutions, serialize, upstream, videoSize } from './project';
import { maxProjectImageData, usableBackground } from './background';
import { getInitialProject, saveProject } from './project-storage';

const time = () => new Intl.DateTimeFormat('hu', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Budapest' }).format(new Date());
const fileStem = (title) => title.trim().replace(/[^\p{L}\p{N} _-]+/gu, '-').replace(/\s+/g, '-') || 'present-fflow';
const log = (message, kind = 'info', area = 'Projekt') => ({ id: crypto.randomUUID(), at: time(), message, kind, area });
const nodeKinds = Object.keys(label);
const cardHeights = { text: 410, background: 335, render: 490, video: 309 };
const sceneSignature = (id, nodes, edges) => {
  const render = nodes.find((node) => node.id === id && node.type === 'render');
  const text = upstream(id, nodes, edges);
  const background = upstream(id, nodes, edges, backgroundPort);
  return render ? [render.data, text?.id, text?.data, background?.id, background?.data] : null;
};
const sameScene = (left, right) => left && right && left.every((value, index) => value === right[index]);

function saveFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

function IconButton({ icon: Icon, title, size = 16, ...props }) {
  return <button type="button" className="icon-button" aria-label={title} title={title} {...props}><Icon size={size} /></button>;
}

function App({ project }) {
  const [nodes, setNodes, changeNodes] = useNodesState(project.nodes.map((node, index) => ({ ...node, selected: index === 0 })));
  const [edges, setEdges, changeEdges] = useEdgesState(project.edges);
  const [name, setName] = useState(project.name);
  const [dirty, setDirty] = useState(!project.saved);
  const [sidebar, setSidebar] = useState(() => !matchMedia('(max-width: 760px)').matches);
  const [inspector, setInspector] = useState(() => !matchMedia('(max-width: 1100px)').matches);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState('Konzol');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [zoom, setZoom] = useState(project.viewport?.zoom ?? 1);
  const [logs, setLogs] = useState(() => [log(project.saved ? 'A mentett projekt betöltve.' : 'A mintaprojekt megnyitva.'), log('A munkatér használatra kész.', 'success', 'Rendszer')]);
  const [rendering, setRendering] = useState(null);
  const [outputs, setOutputs] = useState({});
  const [toast, setToast] = useState('');
  const flow = useReactFlow();
  const canvas = useRef(null);
  const searchInput = useRef(null);
  const importInput = useRef(null);
  const help = useRef(null);
  const busy = useRef(false);
  const saving = useRef(false);
  const current = useRef({});
  current.current = { nodes, edges, name };

  const selected = nodes.find((node) => node.selected);
  const selectedEdge = edges.find((edge) => edge.selected);
  const result = Object.values(outputs).at(-1);
  const availableRenderer = nodes.find((node) => node.type === 'render' && (upstream(node.id, nodes, edges) || upstream(node.id, nodes, edges, backgroundPort)));
  const renderFormat = formats[(selected?.type === 'render' ? selected.data.format : result?.format ?? availableRenderer?.data.format) ?? defaults.render.format];
  const searchResults = nodes.filter((node) => `${label[node.type]} ${node.data.text ?? ''}`.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu').trim()));
  const shownLogs = consoleTab === 'Renderelés' ? logs.filter((entry) => entry.area === 'FFmpeg') : logs;
  const announce = useCallback((message, kind, area) => setLogs((old) => [...old, log(message, kind, area)].slice(-100)), []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const invalid = Object.entries(outputs).filter(([id, output]) => !sameScene(output.signature, sceneSignature(id, nodes, edges)));
    if (invalid.length === 0) return;
    for (const [, output] of invalid) URL.revokeObjectURL(output.url);
    setOutputs((old) => Object.fromEntries(Object.entries(old).filter(([id]) => !invalid.some(([removed]) => removed === id))));
  }, [nodes, edges, outputs]);

  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    const state = current.current;
    try {
      await saveProject(serialize(state.name.trim() || project.name, state.nodes, state.edges, flow.getViewport()));
      const latest = current.current;
      if (latest.name === state.name && latest.nodes === state.nodes && latest.edges === state.edges) setDirty(false);
      setToast('Projekt mentve ebben a böngészőben.');
      announce('A projekt mentése sikerült.', 'success');
    } catch {
      setToast('A helyi mentés sikertelen. Használd az exportálást.');
      announce('A böngésző nem engedélyezte a helyi mentést.', 'error');
    } finally {
      saving.current = false;
    }
  }, [announce, flow, project.name]);

  useEffect(() => {
    function keydown(event) {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
      if (event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.current.focus(); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [save]);

  function updateNode(id, key, value) {
    const existing = current.current.nodes.find((node) => node.id === id);
    if (!existing || existing.data[key] === value) return;
    setNodes((old) => old.map((node) => node.id === id ? { ...node, data: { ...node.data, [key]: value } } : node));
    setDirty(true);
  }

  function updateImage(id, image) {
    if (image && imageDataSize(current.current.nodes, id) + image.src.length > maxProjectImageData) {
      throw new Error('A projekt háttérképei elérték a méretkorlátot. Távolíts el egy képet.');
    }
    updateNode(id, 'image', image);
  }

  function resizeVideo(id, width) {
    const nextWidth = Math.min(videoSize.max, Math.max(videoSize.min, width));
    if (current.current.nodes.find((node) => node.id === id)?.width === nextWidth) return;
    setNodes((old) => old.map((node) => node.id === id ? { ...node, width: nextWidth } : node));
    setDirty(true);
  }

  function deleteNode(id) {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    setNodes((old) => old.filter((item) => item.id !== id));
    setEdges((old) => old.filter(({ source, target }) => source !== id && target !== id));
    setDirty(true);
    announce(`Kártya törölve · ${label[node.type]}`);
  }

  function addNode(type, dropPosition) {
    if (!Object.hasOwn(label, type)) return;
    if (nodes.length >= 100) { setToast('Egy projektbe legfeljebb 100 kártya kerülhet.'); return; }
    const box = canvas.current.getBoundingClientRect();
    const center = flow.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
    const position = dropPosition ?? { x: Math.round(center.x - 122), y: Math.round(center.y - 80) };
    if (!dropPosition) {
      const gap = 32;
      const width = type === 'video' ? videoSize.min : 246;
      const nearby = nodes.filter((node) => position.x < node.position.x + (node.measured?.width ?? 246) + gap && position.x + width + gap > node.position.x)
        .sort((a, b) => a.position.y - b.position.y);
      for (const node of nearby) {
        const bottom = node.position.y + (node.measured?.height ?? cardHeights[node.type]) + gap;
        if (position.y < bottom && position.y + cardHeights[type] + gap > node.position.y) position.y = bottom;
      }
    }
    const node = { ...makeNode(type, position), selected: true };
    setNodes((old) => [...old.map((item) => ({ ...item, selected: false })), node]);
    setEdges((old) => old.map((edge) => ({ ...edge, selected: false })));
    if (!dropPosition) flow.setCenter(position.x + 123, position.y + cardHeights[type] / 2, { zoom: Math.max(0.68, flow.getZoom()), duration: 320 });
    setDirty(true);
    announce(`Kártya hozzáadva · ${label[type]}`);
  }

  function selectNode(node) {
    setNodes((old) => old.map((item) => ({ ...item, selected: item.id === node.id })));
    setEdges((old) => old.map((edge) => ({ ...edge, selected: false })));
    flow.setCenter(node.position.x + (node.measured?.width ?? 246) / 2, node.position.y + (node.measured?.height ?? 320) / 2,
      { zoom: flow.getZoom(), duration: 300 });
    setSearching(false);
    searchInput.current.blur();
  }

  function exportProject() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(serialize(name, nodes, edges, flow.getViewport()), null, 2)], { type: 'application/json' }));
    saveFile(url, `${fileStem(name)}.present-fflow.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('A konfiguráció exportálva.', 'success');
  }

  async function importProject(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > maxProjectImageData + 1_000_000) throw new Error('A projektfájl túl nagy.');
      const next = readProject(JSON.parse(await file.text()));
      if (dirty && !window.confirm('A betöltés lecseréli a jelenlegi vásznat. Betöltöd a projektet?')) return;
      setNodes(next.nodes.map((node, index) => ({ ...node, selected: index === 0 })));
      setEdges(next.edges);
      for (const output of Object.values(outputs)) URL.revokeObjectURL(output.url);
      setOutputs({});
      setName(next.name);
      setDirty(true);
      requestAnimationFrame(() => {
        if (next.viewport) flow.setViewport(next.viewport);
        else flow.fitView({ padding: 0.14, maxZoom: 1 });
      });
      announce(`Projekt betöltve · ${next.name}`, 'success');
      setToast('Projekt betöltve.');
    } catch (error) {
      const message = error instanceof SyntaxError ? 'A fájl nem olvasható JSON-ként.' : error.message;
      setToast(message);
      announce(message, 'error');
    }
  }

  async function runRender(id = availableRenderer?.id) {
    if (busy.current) return;
    const state = current.current;
    const renderer = state.nodes.find((node) => node.id === id && node.type === 'render');
    const text = upstream(id, state.nodes, state.edges);
    const background = upstream(id, state.nodes, state.edges, backgroundPort)?.data;
    const textSettings = text?.data.text.trim() ? text.data : undefined;
    const problem = !renderer || (!text && !background) ? 'Köss szöveg- vagy háttérkártyát az FFmpeg renderkártyához.'
      : background && !usableBackground(background) ? 'Tölts fel egy képet a csatlakoztatott Háttér kártyára.'
      : !textSettings && !background ? 'Adj meg egy szöveget a jelenethez.'
      : textSettings?.seconds > renderer.data.duration ? 'A szöveg animációja hosszabb a videónál.' : '';
    if (problem) { announce(problem, 'error', 'FFmpeg'); setToast(problem); return; }
    busy.current = true;
    const signature = sceneSignature(id, state.nodes, state.edges);
    const settings = renderer.data;
    const { container, codec } = formats[settings.format];
    setRendering({ id, progress: 2, phase: 'FFmpeg betöltése' });
    announce(`Renderelés elindult · ${container} / ${codec} · ${settings.resolution.replace('x', ' × ')} · ${settings.fps} fps · CRF ${settings.crf}`, 'info', 'FFmpeg');
    try {
      const { renderVideo } = await import('./render');
      const blob = await renderVideo(textSettings, settings, (progress, phase) => setRendering({ id, progress, phase }), background);
      if (!sameScene(signature, sceneSignature(id, current.current.nodes, current.current.edges))) {
        announce('A jelenet megváltozott a renderelés alatt. Indíts új renderelést.', 'info', 'FFmpeg');
        setToast('A jelenet megváltozott. Indíts új renderelést.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const output = { url, signature, format: settings.format, name: `${fileStem(state.name)}.${settings.format}`, duration: Math.ceil(settings.duration * settings.fps) / settings.fps };
      const previous = outputs[id];
      setOutputs((old) => ({ ...old, [id]: output }));
      if (previous) URL.revokeObjectURL(previous.url);
      announce(`A videó elkészült · ${container} · ${(blob.size / 1024 / 1024).toFixed(2).replace('.', ',')} MB`, 'success', 'FFmpeg');
      setToast('A videó elkészült.');
    } catch (error) {
      announce(`Renderelési hiba · ${error?.message ?? String(error)}`, 'error', 'FFmpeg');
      setToast('A renderelés sikertelen. A részletek a konzolban láthatók.');
    } finally {
      busy.current = false;
      setRendering(null);
    }
  }

  const download = (output) => saveFile(output.url, output.name);
  return <div className="studio">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Layers3 size={21} strokeWidth={1.65} /></span><div><strong>Present Fflow</strong><span>Videóműhely</span></div></div>
      <div className="header-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearching(false); }}>
        <Search size={16} /><input ref={searchInput} aria-label="Kártyák keresése" placeholder="Keresés a vásznon…" value={query} onFocus={() => setSearching(true)} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') searchInput.current.blur(); if (event.key === 'Enter' && searchResults[0]) selectNode(searchResults[0]); }} /><kbd>Ctrl K</kbd>
        {searching && <div className="search-results">{searchResults.length ? searchResults.map((node) => <button type="button" key={node.id} onClick={() => selectNode(node)}><NodeIcon type={node.type} /><span>{label[node.type]}{node.type === 'text' && <small>{node.data.text.split('\n')[0]}</small>}</span><ChevronRight size={15} /></button>) : <p>Nincs találat.</p>}</div>}
      </div>
      <div className="top-actions">
        <IconButton icon={Settings2} title="Tulajdonságok megjelenítése" aria-pressed={inspector} onClick={() => setInspector(!inspector)} />
        <button type="button" className="button save-button" onClick={save}><Save size={15} /><span>Mentés</span></button>
        <button type="button" className="button primary" disabled={Boolean(rendering)} onClick={() => runRender(selected?.type === 'render' ? selected.id : undefined)}>
          <Play size={14} fill="currentColor" /><span>{rendering ? `${Math.round(rendering.progress)}%` : 'Renderelés'}</span>
        </button>
      </div>
    </header>

    <div className={`workbench${sidebar ? ' show-sidebar' : ''}${inspector ? ' show-inspector' : ''}`}>
      {sidebar && <aside className="sidebar">
        <div className="sidebar-top"><LayoutGrid size={16} /><strong>Munkaterület</strong><IconButton icon={PanelLeft} title="Oldalsáv elrejtése" onClick={() => setSidebar(false)} /></div>
        <div className="project-nav"><Folder size={16} /><span>{name || project.name}</span><span className={`status-dot ${dirty ? 'dirty' : ''}`} title={dirty ? 'Módosítások várnak mentésre' : 'Mentve'} /></div>
        <div className="sidebar-title"><span>KÁRTYATÁR</span><Grid3X3 size={13} /></div>
        <div className="palette">{nodeKinds.map((type) => <button type="button" className="palette-item" key={type} draggable onDragStart={(event) => { event.dataTransfer.setData('application/present-fflow', type); event.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addNode(type)} title={`${label[type]} hozzáadása`}>
          <NodeIcon type={type} /><span className="palette-text"><strong>{label[type]}</strong><small>{descriptions[type]}</small></span><Plus className="palette-plus" size={15} />
        </button>)}</div>
        <div className="sidebar-bottom">
          <button type="button" onClick={() => importInput.current.click()}><ArrowUpFromLine size={16} /> Projekt importálása</button>
          <button type="button" onClick={exportProject}><ArrowDownToLine size={16} /> Projekt exportálása</button>
          <button type="button" onClick={() => help.current.showModal()}><CircleHelp size={16} /> Súgó</button>
        </div>
      </aside>}

      <main className="editor" aria-label="Videófolyamat szerkesztője">
        <div className="editor-bar">
          <div className="editor-title">{!sidebar && <IconButton icon={PanelLeft} title="Oldalsáv megjelenítése" onClick={() => setSidebar(true)} />}<span className="editor-icon"><Layers3 size={15} /></span><h1>Folyamat</h1><span className="editor-breadcrumb"><ChevronRight size={14} />{name || project.name}</span></div>
          <span className="graph-count">{nodes.length} kártya <span>·</span> {edges.length} kapcsolat</span>
          <IconButton icon={PanelRight} title="Tulajdonságpanel" aria-pressed={inspector} onClick={() => setInspector(!inspector)} />
        </div>

        <div className="flow-canvas" ref={canvas} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/present-fflow')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
          onDrop={(event) => { event.preventDefault(); addNode(event.dataTransfer.getData('application/present-fflow'), flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })); }}>
          <GraphContext.Provider value={{ nodes, edges, updateNode, updateImage, resizeVideo, deleteNode, runRender, rendering, outputs, download }}>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} colorMode="dark"
              fitView={!project.viewport} fitViewOptions={{ padding: 0.12, maxZoom: 1 }} defaultViewport={project.viewport}
              minZoom={0.22} maxZoom={2} nodesDraggable edgesReconnectable={false} deleteKeyCode={['Backspace', 'Delete']}
              zoomOnDoubleClick={false} onMove={(_, viewport) => setZoom(viewport.zoom)} onInit={(instance) => setZoom(instance.getZoom())}
              onNodesChange={(changes) => { if (changes.some(({ type, dragging, resizing }) => type === 'remove' || (type === 'position' && dragging === false) || (type === 'dimensions' && resizing === false))) setDirty(true); changeNodes(changes); }}
              onEdgesChange={(changes) => { if (changes.some(({ type }) => type === 'remove')) setDirty(true); changeEdges(changes); }}
              isValidConnection={(connection) => canConnect(connection, nodes, edges)}
              onConnect={(connection) => { setEdges((old) => canConnect(connection, nodes, old) ? addEdge({ ...connection, type: edgeType }, old) : old); setDirty(true); announce('Kapcsolat létrehozva.'); }}
              ariaLabelConfig={{ 'node.a11yDescription.default': 'Enter a kártya kijelöléséhez. Delete a törléséhez.', 'edge.a11yDescription.default': 'Enter a kapcsolat kijelöléséhez. Delete a törléséhez.' }}>
              <Background gap={22} size={1.6} color="#f0f2f9b3" />
              {nodes.length > 0 && <MiniMap position="bottom-right" ariaLabel="Vászon térképe" nodeColor={(node) => node.type === 'video' ? '#829cc2' : '#929aa4'} nodeBorderRadius={6} maskColor="rgba(18,20,23,.53)" pannable zoomable />}
            </ReactFlow>
          </GraphContext.Provider>
          {nodes.length === 0 && <div className="empty-graph"><Layers3 size={23} /><strong>A vászon üres</strong><span>Adj hozzá egy kártyát a kártyatárból.</span><button className="button" type="button" onClick={() => addNode('text')}><Plus size={15} /> Szövegkártya</button></div>}
          <div className="viewport-controls">
            <IconButton icon={Minus} title="Kicsinyítés" onClick={() => flow.zoomOut({ duration: 160 })} />
            <button type="button" className="zoom-value" title="Nagyítás visszaállítása" onClick={() => flow.zoomTo(1, { duration: 160 })}>{Math.round(zoom * 100)}%</button>
            <IconButton icon={Plus} title="Nagyítás" onClick={() => flow.zoomIn({ duration: 160 })} />
            <IconButton icon={Focus} title="Minden kártya a nézetbe" onClick={() => flow.fitView({ padding: 0.13, maxZoom: 1, duration: 260 })} />
          </div>
          {toast && <div className="toast" role="status">{toast}<IconButton icon={X} title="Értesítés bezárása" onClick={() => setToast('')} /></div>}
        </div>

        <section className={`console${consoleOpen ? '' : ' collapsed'}`} aria-label="Konzol">
          <div className="console-bar">
            <IconButton icon={consoleOpen ? ChevronDown : ChevronRight} title={consoleOpen ? 'Konzol összecsukása' : 'Konzol megnyitása'} aria-expanded={consoleOpen} onClick={() => setConsoleOpen(!consoleOpen)} />
            <button type="button" className={consoleTab === 'Konzol' ? 'active' : ''} onClick={() => { setConsoleTab('Konzol'); setConsoleOpen(true); }}><Terminal size={15} /> Konzol <span className="log-count">{logs.length}</span></button>
            <button type="button" className={consoleTab === 'Renderelés' ? 'active' : ''} onClick={() => { setConsoleTab('Renderelés'); setConsoleOpen(true); }}><Activity size={15} /> Renderelés</button>
            <span className="console-spacer" />
            <IconButton icon={Trash2} size={14} title="Napló ürítése" onClick={() => setLogs([])} />
          </div>
          {consoleOpen && <div className="console-content" role="log" aria-label="Eseménynapló">
            {[...shownLogs].reverse().map((entry) => <div className={`log-row ${entry.kind}`} key={entry.id}><span className="log-indicator" /><time>{entry.at}</time><span className="log-area">{entry.area}</span><span>{entry.message}</span></div>)}
            {shownLogs.length === 0 && <div className="console-empty">Még nincs bejegyzés.</div>}
          </div>}
          {rendering && <div className="render-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rendering.progress)} aria-label={rendering.phase}><span style={{ width: `${rendering.progress}%` }} /></div>}
        </section>
      </main>

      {inspector && <aside className="inspector">
        <header className="inspector-header"><Settings2 size={17} /><h2>Tulajdonságok</h2><IconButton icon={X} title="Tulajdonságpanel bezárása" onClick={() => setInspector(false)} /></header>
        <details open><summary><Folder size={15} /> Projekt <ChevronDown size={14} /></summary><div className="detail-body">
          <label className="field">Projekt neve<input className="name-input" value={name} maxLength={64} onChange={(event) => { setName(event.target.value); setDirty(true); }} onBlur={() => setName((old) => old.trim() || project.name)} /></label>
          <div className="detail-row"><span>Állapot</span><span><span className={`status-dot ${dirty ? 'dirty' : ''}`} />{dirty ? 'Mentésre vár' : 'Mentve'}</span></div>
        </div></details>
        <details open><summary><Layers3 size={15} /> Kijelölés <ChevronDown size={14} /></summary><div className="detail-body">
          {selected ? <><div className="selected-node"><NodeIcon type={selected.type} /><strong>{label[selected.type]}</strong></div>
            {selected.type === 'text' && <div className="detail-row"><span>Animáció</span><span>{effects[selected.data.effect]}</span></div>}
            {selected.type === 'render' && <div className="detail-row"><span>Felbontás</span><span>{resolutions[selected.data.resolution].label}</span></div>}
            <button className="detail-delete" type="button" onClick={() => deleteNode(selected.id)}><Trash2 size={14} /> Kártya törlése</button></>
            : selectedEdge ? <><div className="detail-row">Kijelölt kapcsolat</div><button className="detail-delete" type="button" onClick={() => { setEdges((old) => old.filter((edge) => edge.id !== selectedEdge.id)); setDirty(true); announce('Kapcsolat törölve.'); }}><Trash2 size={14} /> Kapcsolat törlése</button></>
              : <p className="detail-empty">Jelölj ki egy kártyát vagy kapcsolatot a vásznon.</p>}
        </div></details>
        <details open><summary><FileVideo size={15} /> Renderelés <ChevronDown size={14} /></summary><div className="detail-body">
          <div className="detail-row"><span>Motor</span><span>FFmpeg</span></div>
          <div className="detail-row"><span>Kimenet</span><span>{renderFormat.container} · {renderFormat.codec}</span></div>
          <div className="detail-row"><span>Állapot</span><span>{rendering?.phase ?? (result ? 'Elkészült' : 'Készen áll')}</span></div>
          {result && <button className="detail-delete" type="button" onClick={() => download(result)}><ArrowDownToLine size={14} /> {formats[result.format].container} letöltése</button>}
        </div></details>
        <div className="inspector-bottom"><button type="button" onClick={() => help.current.showModal()}><Command size={14} /> Billentyűparancsok</button></div>
      </aside>}
    </div>

    <footer className="statusbar"><span><span className={`status-dot ${rendering ? 'working' : ''}`} />{rendering ? rendering.phase : 'Munkatér kész'}</span><span><Activity size={13} /> FFmpeg <span className="status-sep" /> {dirty ? 'Nincs mentve' : <><Check size={13} /> Projekt mentve</>}</span></footer>
    <input hidden ref={importInput} type="file" accept=".json,application/json" onChange={importProject} />
    <dialog ref={help} className="help-dialog"><header><h2>A munkatér használata</h2><IconButton icon={X} title="Súgó bezárása" onClick={() => help.current.close()} /></header>
      <p>Adj kártyákat a vászonhoz, majd húzd a kimeneti csatlakozót a következő kártya bemenetére. A kártya fejlécével mozgathatod.</p>
      <p>A Szöveg és a Háttér kártya az FFmpeg render külön bemenetére csatlakozik. Válassz MP4- vagy WebM-kimenetet, majd indítsd a renderelést. A lejátszó jobb alsó sarkát húzva átméretezheted a kártyát.</p>
      <dl><dt>Projekt mentése</dt><dd><kbd>Ctrl</kbd> + <kbd>S</kbd></dd><dt>Keresés</dt><dd><kbd>Ctrl</kbd> + <kbd>K</kbd></dd><dt>Kijelölés törlése</dt><dd><kbd>Delete</kbd></dd><dt>Nagyítás</dt><dd>Egérgörgő</dd></dl>
    </dialog>
  </div>;
}

const root = createRoot(document.getElementById('root'));
getInitialProject().then((project) => root.render(<ReactFlowProvider><App project={project} /></ReactFlowProvider>));
