import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CaseUpper, ChevronDown, Eraser, Italic } from 'lucide-react';
import { baseKeymap, splitBlockKeepMarks } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Fragment, Schema, Slice } from 'prosemirror-model';
import { AllSelection, EditorState, Selection, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import 'prosemirror-view/style/prosemirror.css';
import { captionAlignments, captionSize, captionWeight, maxCaptionLength, readAlignment, readRunStyle, readTextRuns } from './caption-format';
import { captionFontFamily, fontName } from './caption-fonts';

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
    paragraph: {
      content: 'text*',
      attrs: { align: { default: null } },
      parseDOM: ['p', 'div'].map((tag) => ({ tag, getAttrs: (element) => ({ align: readAlignment(element.dataset.captionAlign ?? element.style.textAlign) }) })),
      toDOM: ({ attrs: { align } }) => ['p', align ? { 'data-caption-align': align, style: `text-align:${align}` } : {}, 0],
    },
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

function makeDocument(text, runs, alignments) {
  let start = 0;
  const marks = readTextRuns(runs, text.length);
  const paragraphs = text.split('\n').map((line, index) => {
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
    return schema.nodes.paragraph.create({ align: alignments?.[index] ?? null }, nodes);
  });
  return schema.nodes.doc.create(null, paragraphs);
}

function extractDocument(doc) {
  let text = '';
  const runs = [];
  const alignments = {};
  doc.forEach((paragraph, _offset, index) => {
    if (index) text += '\n';
    if (paragraph.attrs.align) alignments[index] = paragraph.attrs.align;
    paragraph.forEach((node) => {
      const start = text.length;
      text += node.text;
      const value = markValue(node.marks);
      if (Object.keys(value).length) runs.push({ start, end: text.length, ...value });
    });
  });
  return { text, runs: readTextRuns(runs, text.length), alignments };
}

function selectionFormat(state) {
  if (state.selection.empty) return markValue(state.storedMarks ?? state.selection.$head.marks());
  let first;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
    if (node.isText && !first) first = markValue(node.marks);
  });
  return first ?? {};
}

function formatTransaction(state, patch, selection = state.selection) {
  const { from, to, empty } = selection;
  const transaction = state.tr;
  if (!state.selection.eq(selection)) transaction.setSelection(selection);
  const next = (marks) => patch ? marksFor(readRunStyle({ ...markValue(marks), ...patch })) : [];
  if (empty) {
    transaction.setStoredMarks(next(state.storedMarks ?? selection.$head.marks()));
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
  return transaction;
}

function paragraphAlignment({ doc, selection }) {
  const values = new Set();
  const { from, to } = selection.empty ? new AllSelection(doc) : selection;
  doc.nodesBetween(from, to, (node) => { if (node.type === schema.nodes.paragraph) values.add(node.attrs.align); });
  return values.size === 1 ? values.values().next().value : null;
}

function visibleSelection(view) {
  const native = view.dom.ownerDocument.getSelection();
  const { doc, selection } = view.state;
  if (!native?.anchorNode || !native.focusNode || !view.dom.contains(native.anchorNode) || !view.dom.contains(native.focusNode)) {
    return selection;
  }
  const anchor = view.posAtDOM(native.anchorNode, native.anchorOffset);
  const head = view.posAtDOM(native.focusNode, native.focusOffset);
  return TextSelection.between(doc.resolve(anchor), doc.resolve(head));
}

function alignParagraphs(view, align) {
  const { state } = view;
  const selection = visibleSelection(view);
  const { from, to } = selection.empty ? new AllSelection(state.doc) : selection;
  const transaction = state.tr;
  if (!state.selection.eq(selection)) transaction.setSelection(selection);
  state.doc.nodesBetween(from, to, (node, offset) => {
    if (node.type === schema.nodes.paragraph && node.attrs.align !== align) transaction.setNodeMarkup(offset, undefined, { align });
  });
  if (transaction.docChanged) view.dispatch(transaction);
  view.focus();
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

const alignmentIcons = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };

export function CaptionContent({ value, onChange, controller, formatEdit, pickerId, onFormatOpen }) {
  const surface = useRef(null);
  const editor = useRef(null);
  const initial = useRef(value);
  const notify = useRef(onChange);
  notify.current = onChange;
  const [format, setFormat] = useState({});
  const [alignment, setAlignment] = useState(null);
  const [limited, setLimited] = useState(false);
  const trial = useRef(null);
  const fontButton = useRef(null);
  const colorButton = useRef(null);
  const returnFocus = useRef(null);

  useLayoutEffect(() => {
    if (!formatEdit && returnFocus.current) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [formatEdit]);

  useEffect(() => {
    const state = EditorState.create({
      doc: makeDocument(initial.current.text, initial.current.runs, initial.current.alignments),
      plugins: [history(), keymap({ Enter: splitBlockKeepMarks, 'Shift-Enter': splitBlockKeepMarks, 'Mod-z': undo, 'Shift-Mod-z': redo, 'Mod-y': redo }), keymap(baseKeymap)],
    });
    const view = new EditorView(surface.current, {
      state,
      editable: () => !trial.current,
      attributes: { role: 'textbox', 'aria-label': 'Felirat szövege', 'aria-multiline': 'true' },
      decorations(state) {
        const { from, to, empty } = state.selection;
        const decorations = empty ? [] : [Decoration.inline(from, to, { class: 'caption-selection' })];
        if (trial.current?.value) {
          const { property, value, selection: { from, to } } = trial.current;
          const cssValue = property === 'font' ? captionFontFamily(value) : value;
          if (from < to) decorations.push(Decoration.inline(from, to, {
            class: `caption-live-${property}`, style: `--caption-live-${property}:${cssValue}`,
          }));
        }
        return DecorationSet.create(state.doc, decorations);
      },
      clipboardTextParser(text, context) {
        const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')
          .map((line) => schema.nodes.paragraph.create({ align: context.parent.attrs.align ?? null }, line ? schema.text(line, context.marks()) : null));
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
        setAlignment(paragraphAlignment(next));
        if (transaction.docChanged) {
          setLimited(false);
          notify.current(extractDocument(next.doc));
        }
      },
    });
    setAlignment(paragraphAlignment(state));
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
  }, []);

  useImperativeHandle(controller, () => ({
    replace(text, runs, alignments) {
      const view = editor.current;
      if (!view) return;
      const next = makeDocument(text, runs, alignments);
      const transaction = view.state.tr.replaceWith(0, view.state.doc.content.size, next.content);
      view.dispatch(transaction.setSelection(Selection.atStart(transaction.doc)));
    },
    previewFormat(value) {
      const view = editor.current;
      const pending = trial.current;
      if (!view || !pending) return null;
      pending.value = value;
      view.updateState(view.state);
      return extractDocument(formatTransaction(view.state, { [pending.property]: value }, pending.selection).doc).runs;
    },
    finishFormat(value, restoreFocus = true) {
      const view = editor.current;
      if (!view || !trial.current) return;
      const { property, selection } = trial.current;
      trial.current = null;
      if (value) {
        const transaction = formatTransaction(view.state, { [property]: value }, selection);
        if (selection instanceof AllSelection) transaction.setSelection(view.state.selection.map(transaction.doc, transaction.mapping));
        view.dispatch(transaction);
        if (!view.state.doc.textContent) notify.current({ [property]: value });
      } else if (!(selection instanceof AllSelection) && !view.state.selection.eq(selection)) {
        view.dispatch(view.state.tr.setSelection(selection).setMeta('addToHistory', false));
      } else view.updateState(view.state);
      if (restoreFocus) returnFocus.current = property === 'font' ? fontButton.current : colorButton.current;
    },
  }), []);

  const style = (patch, focus = true) => {
    const view = editor.current;
    if (!view) return;
    view.dispatch(formatTransaction(view.state, patch));
    if (focus) view.focus();
  };
  const bold = (format.weight ?? captionWeight) >= 750;
  const fontOpen = formatEdit?.property === 'font';
  const colorOpen = formatEdit?.property === 'color';
  const color = (colorOpen ? formatEdit.candidate : null) ?? format.color ?? value.color;
  const font = (fontOpen ? formatEdit.candidate : null) ?? format.font ?? value.font;
  function startTrial(property, initial) {
    const view = editor.current;
    if (!view) return;
    const selection = visibleSelection(view);
    trial.current = { property, selection: selection.empty && view.state.doc.textContent ? new AllSelection(view.state.doc) : selection };
    view.updateState(view.state);
    onFormatOpen(property, initial);
  }
  return <div className="caption-compose">
    <div className="caption-formats" role="group" aria-label="Kijelölt szöveg formázása" inert={formatEdit ? true : undefined}>
      <label className="field">Betűtípus<button type="button" className="font-field" aria-label="Betűtípus" aria-expanded={fontOpen}
        aria-controls={fontOpen ? pickerId : undefined} ref={fontButton} onMouseDown={(event) => event.preventDefault()}
        onClick={() => startTrial('font', font)}>
        <span>{fontName(font)}</span><ChevronDown size={13} />
      </button></label>
      <SizeField value={format.size ?? captionSize.default} change={(size) => style({ size }, false)} />
      <label className="field">Szín<button type="button" className="color-field" aria-label="Betűszín"
        aria-expanded={colorOpen} aria-controls={colorOpen ? pickerId : undefined} ref={colorButton} onMouseDown={(event) => event.preventDefault()}
        onClick={() => startTrial('color', color)}>
        <span className="color-field-swatch" style={{ background: color }} /><span aria-hidden="true">{color.toUpperCase()}</span>
      </button></label>
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
      <div className="caption-format-buttons caption-align-buttons" role="group" aria-label="Szövegigazítás">
        {Object.entries(captionAlignments).map(([key, label]) => {
          const Icon = alignmentIcons[key];
          return <button key={key} type="button" className="icon-button" aria-label={label} title={label}
            aria-pressed={alignment === key} onMouseDown={(event) => event.preventDefault()}
            onClick={() => { if (editor.current) alignParagraphs(editor.current, key); }}><Icon size={17} /></button>;
        })}
      </div>
    </div>
    <div className="caption-content" ref={surface} style={{ fontFamily: captionFontFamily(value.font), color: value.color, fontWeight: captionWeight }} />
    <div className="caption-count" role={limited ? 'status' : undefined}>{limited ? `A felirat legfeljebb ${maxCaptionLength} karakterből állhat.` : `${value.text.length} / ${maxCaptionLength}`}</div>
  </div>;
}
