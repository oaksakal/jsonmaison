import { json } from '@codemirror/lang-json';
import {
  EditorSelection,
  EditorState,
  StateEffect,
  StateField
} from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate,
  placeholder
} from '@codemirror/view';
import { basicSetup } from 'codemirror';

import type { ParseErrorInfo } from './types';

const setErrorOffset = StateEffect.define<number | null>();

const errorDecorationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (!effect.is(setErrorOffset)) {
        continue;
      }

      const value = effect.value;
      if (value === null || transaction.state.doc.length === 0) {
        next = Decoration.none;
        continue;
      }

      const clamped = Math.max(0, Math.min(value, transaction.state.doc.length));
      const start = clamped === transaction.state.doc.length ? clamped - 1 : clamped;
      const end = Math.min(transaction.state.doc.length, start + 1);

      next = Decoration.set([
        Decoration.mark({ class: 'cm-error-char' }).range(start, Math.max(start + 1, end))
      ]);
    }

    return next;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  }
});

export interface JsonEditor {
  getValue: () => string;
  setValue: (value: string) => void;
  highlightError: (error: ParseErrorInfo | null) => void;
  focus: () => void;
  destroy: () => void;
}

export function createJsonEditor(
  container: HTMLElement,
  onChange: (value: string) => void
): JsonEditor {
  let isProgrammaticChange = false;

  const onUpdate = EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged || isProgrammaticChange) {
      return;
    }
    onChange(update.state.doc.toString());
  });

  const extensions = [
    basicSetup,
    json(),
    placeholder('Paste JSON here or drop a file'),
    errorDecorationField,
    onUpdate,
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px'
      },
      '.cm-scroller': {
        fontFamily:
          'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, Liberation Mono, monospace'
      },
      '.cm-content': {
        padding: '12px 14px'
      },
      '.cm-placeholder': {
        color: 'var(--muted)',
        fontStyle: 'italic'
      },
      '.cm-error-char': {
        backgroundColor: 'var(--error-bg)',
        borderBottom: '1px solid var(--error)'
      }
    })
  ];

  const view = new EditorView({
    state: EditorState.create({
      doc: '',
      extensions
    }),
    parent: container
  });

  return {
    getValue() {
      return view.state.doc.toString();
    },
    setValue(value) {
      const current = view.state.doc.toString();
      if (current === value) {
        return;
      }

      isProgrammaticChange = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value
        }
      });
      isProgrammaticChange = false;
    },
    highlightError(error) {
      if (!error) {
        view.dispatch({ effects: setErrorOffset.of(null) });
        return;
      }

      const docLength = view.state.doc.length;
      const clamped = Math.max(0, Math.min(error.offset, docLength));
      const cursor = clamped === docLength && docLength > 0 ? clamped - 1 : clamped;

      view.dispatch({
        effects: setErrorOffset.of(cursor),
        selection: EditorSelection.cursor(cursor),
        scrollIntoView: true
      });
      view.focus();
    },
    focus() {
      view.focus();
    },
    destroy() {
      view.destroy();
    }
  };
}
