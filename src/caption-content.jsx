import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Bold, CaseUpper, Eraser, Italic } from 'lucide-react';
import { baseKeymap, splitBlockKeepMarks } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Fragment, Schema, Slice } from 'prosemirror-model';
import { EditorState, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import 'prosemirror-view/style/prosemirror.css';
import { captionFontFamily, captionFonts, captionSize, captionWeight, maxCaptionLength, readRunStyle, readTextRuns } from './caption-format';
import { Color, Select } from './fields';

function spanStyle(format) {
  return [
    format.font && `font-family:${captionFontFamily(format.font)}`,
    format.color && `color:${format.color}`,
    format.size && `font-size:${format.size / captionSize.default}em`,
    format.weight && `font-weight:${format.weight}`,
    format.italic && 'font-style:italic',
    format.uppercase && 'text-transform:uppercase',
  ].filter(Boolean).join(';');
}

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', parseDOM: [{ tag: 'p' }, { tag: 'div' }], toDOM: () => ['p', 0] },
    text: { inline: true },
  },
  marks: {
    format: {
      attrs: { value: { default: {} } },
      toDOM: ({ attrs: { value } }) => ['span', { 'data-caption-style': JSON.stringify(value), style: spanStyle(value) }, 0],
      parseDOM: [{ tag: 'span[data-caption-style]', getAttrs(element) {
        try { return { value: readRunStyle(JSON.parse(element.dataset.captionStyle)) }; }
        catch { return false; }
      } }],
    },
  },
});
const formatMark = schema.marks.format;
const markValue = (marks) => formatMark.isInSet(marks)?.attrs.value ?? {};
const marksFor = (value) => Object.keys(value).length ? [formatMark.create({ value })] : [];

function makeDocument(text, runs) {
  let start = 0;
  const marks = readTextRuns(runs, text.length);
  const paragraphs = text.split('\n').map((line) => {
    const end = start + line.length;
    const nodes = [];
    let cursor = start;
    for (const run of marks) {
      if (run.end <= start) continue;
      if (run.start >= end) break;
      const from = Math.max(start, run.start);
      const to = Math.min(end, run.end);
      if (from >= to) continue;
      if (from > cursor) nodes.push(schema.text(text.slice(cursor, from)));
      nodes.push(schema.text(text.slice(from, to), marksFor(readRunStyle(run))));
      cursor = to;
    }
    if (cursor < end) nodes.push(schema.text(text.slice(cursor, end)));
    start = end + 1;
    return schema.nodes.paragraph.create(null, nodes);
  });
  return schema.nodes.doc.create(null, paragraphs);
}

function extractDocument(doc) {
  let text = '';
  const runs = [];
  doc.forEach((paragraph, _offset, index) => {
    if (index) text += '\n';
    paragraph.forEach((node) => {
      const start = text.length;
      text += node.text;
      const value = markValue(node.marks);
      if (Object.keys(value).length) runs.push({ start, end: text.length, ...value });
    });
  });
  return { text, runs: readTextRuns(runs, text.length) };
}

function selectionFormat(state) {
  if (state.selection.empty) return markValue(state.storedMarks ?? state.selection.$head.marks());
  let first;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
    if (node.isText && !first) first = markValue(node.marks);
  });
  return first ?? {};
}

function applyFormat(view, patch, focus) {
  const { state } = view;
  const { from, to, empty } = state.selection;
  const transaction = state.tr;
  const next = (marks) => patch ? marksFor(readRunStyle({ ...markValue(marks), ...patch })) : [];
  if (empty) {
    transaction.setStoredMarks(next(state.storedMarks ?? state.selection.$head.marks()));
  } else {
    state.doc.nodesBetween(from, to, (node, position) => {
      if (!node.isText) return;
      const start = Math.max(from, position);
      const end = Math.min(to, position + node.nodeSize);
      const marks = next(node.marks);
      transaction.removeMark(start, end, formatMark);
      if (marks.length) transaction.addMark(start, end, marks[0]);
    });
  }
  view.dispatch(transaction);
  if (focus) view.focus();
}

function SizeField({ value, change }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const number = Number(draft);
    const next = draft.trim() && Number.isFinite(number)
      ? Math.max(captionSize.min, Math.min(captionSize.max, Math.round(number))) : value;
    setDraft(String(next));
    if (next !== value) change(next);
  }
  return <label className="field">Betűméret
    <span className="unit-field"><input type="number" min={captionSize.min} max={captionSize.max} step="1" value={draft}
      aria-label="Betűméret" title="A betűméret Full HD képmérethez viszonyítva" onChange={(event) => setDraft(event.target.value)} onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /><span>px</span></span>
  </label>;
}

export function CaptionContent({ value, onChange, controller }) {
  const surface = useRef(null);
  const editor = useRef(null);
  const initial = useRef(value);
  const notify = useRef(onChange);
  notify.current = onChange;
  const [format, setFormat] = useState({});
  const [limited, setLimited] = useState(false);

  useEffect(() => {
    const state = EditorState.create({
      doc: makeDocument(initial.current.text, initial.current.runs),
      plugins: [history(), keymap({ Enter: splitBlockKeepMarks, 'Shift-Enter': splitBlockKeepMarks, 'Mod-z': undo, 'Shift-Mod-z': redo, 'Mod-y': redo }), keymap(baseKeymap)],
    });
    const view = new EditorView(surface.current, {
      state,
      attributes: { role: 'textbox', 'aria-label': 'Felirat szövege', 'aria-multiline': 'true' },
      decorations(state) {
        const { from, to, empty } = state.selection;
        return empty ? null : DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: 'caption-selection' })]);
      },
      clipboardTextParser(text, context) {
        const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')
          .map((line) => schema.nodes.paragraph.create(null, line ? schema.text(line, context.marks()) : null));
        return Slice.maxOpen(Fragment.fromArray(paragraphs));
      },
      dispatchTransaction(transaction) {
        const length = transaction.doc.content.size - transaction.doc.childCount - 1;
        if (transaction.docChanged && length > maxCaptionLength) {
          setLimited(true);
          view.updateState(view.state);
          return;
        }
        const next = view.state.apply(transaction);
        view.updateState(next);
        setFormat(selectionFormat(next));
        if (transaction.docChanged) {
          setLimited(false);
          notify.current(extractDocument(next.doc));
        }
      },
    });
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
  }, []);

  useImperativeHandle(controller, () => ({
    replace(text, runs) {
      const view = editor.current;
      if (!view) return;
      const next = makeDocument(text, runs);
      const transaction = view.state.tr.replaceWith(0, view.state.doc.content.size, next.content);
      view.dispatch(transaction.setSelection(Selection.atStart(transaction.doc)));
    },
  }), []);

  const style = (patch, focus = true) => {
    if (editor.current) applyFormat(editor.current, patch, focus);
  };
  const bold = (format.weight ?? captionWeight) >= 750;
  return <div className="caption-compose">
    <div className="caption-formats" role="group" aria-label="Kijelölt szöveg formázása">
      <label className="field">Betűtípus<Select aria-label="Betűtípus" value={format.font ?? value.font} onChange={(event) => style({ font: event.target.value })}>
        {captionFonts.map((font) => <option key={font} value={font}>{font}</option>)}
      </Select></label>
      <SizeField value={format.size ?? captionSize.default} change={(size) => style({ size }, false)} />
      <label className="field">Szín<Color label="Betűszín" value={format.color ?? value.color} onChange={(color) => style({ color }, false)} /></label>
      <div className="caption-format-buttons">
        <button type="button" className="icon-button" aria-label="Félkövér" title="Félkövér" aria-pressed={bold}
          onMouseDown={(event) => event.preventDefault()} onClick={() => style({ weight: bold ? 400 : 800 })}><Bold size={17} /></button>
        <button type="button" className="icon-button" aria-label="Dőlt" title="Dőlt" aria-pressed={Boolean(format.italic)}
          onMouseDown={(event) => event.preventDefault()} onClick={() => style({ italic: !format.italic })}><Italic size={17} /></button>
        <button type="button" className="icon-button" aria-label="Nagybetűs" title="Nagybetűs" aria-pressed={Boolean(format.uppercase)}
          onMouseDown={(event) => event.preventDefault()} onClick={() => style({ uppercase: !format.uppercase })}><CaseUpper size={17} /></button>
        <button type="button" className="icon-button" aria-label="Formázás törlése" title="Formázás törlése"
          onMouseDown={(event) => event.preventDefault()} onClick={() => style(null)}><Eraser size={17} /></button>
      </div>
    </div>
    <div className="caption-content" ref={surface} style={{ fontFamily: captionFontFamily(value.font), color: value.color, fontWeight: captionWeight }} />
    <div className="caption-count" role={limited ? 'status' : undefined}>{limited ? `A felirat legfeljebb ${maxCaptionLength} karakterből állhat.` : `${value.text.length} / ${maxCaptionLength}`}</div>
  </div>;
}
