import { createJsonEditor } from './editor';
import {
  exceedsSizeCap,
  isFileTooLarge,
  minifyJson,
  parseAndFormatJson,
} from './parser';
import { AppStore } from './state';
import { applyTheme, getInitialThemePreference, resolveTheme, toggleTheme, watchSystemTheme } from './theme';
import { createToastManager } from './toasts';
import { createTreeView } from './tree';
import type { ParseErrorInfo, ParseMode } from './types';

const TOO_LARGE_MESSAGE = 'JSON exceeds 10MB limit. Please use a smaller file.';

export function initApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand" aria-label="JSON Maison">
          <span class="brand-icon" aria-hidden="true">{ }</span>
          <div class="brand-copy">
            <h1>JSON Maison</h1>
            <p>Clean JSON Viewer &amp; Formatter</p>
          </div>
        </div>

        <div class="toolbar" aria-label="Toolbar">
          <button id="theme-toggle" class="icon-btn" type="button" aria-label="Toggle theme"></button>
        </div>
      </header>

      <main id="workspace" class="workspace" data-active-tab="editor">
        <div class="mobile-tabs" role="tablist" aria-label="Workspace Views">
          <button
            id="tab-editor"
            class="mobile-tab is-active"
            data-tab="editor"
            type="button"
            role="tab"
            aria-controls="editor-pane"
            aria-selected="true"
          >
            Editor
          </button>
          <button
            id="tab-tree"
            class="mobile-tab"
            data-tab="tree"
            type="button"
            role="tab"
            aria-controls="tree-pane"
            aria-selected="false"
          >
            Tree
          </button>
        </div>

        <div id="panes" class="panes" style="--left-pane-width: 560px;">
          <section
            id="editor-pane"
            class="pane editor-pane"
            aria-label="JSON Editor"
            role="tabpanel"
            aria-labelledby="tab-editor"
          >
            <div id="error-banner" class="error-banner" aria-live="polite" hidden></div>
            <div id="editor-host" class="editor-host"></div>
            <div class="source-actions" aria-label="Source actions">
              <button
                id="parse-mode-btn"
                class="action-btn parse-mode-btn"
                type="button"
                aria-pressed="false"
              >
                Friendly JSON
              </button>
              <button id="paste-btn" class="action-btn" type="button">Paste</button>
              <button id="upload-btn" class="action-btn" type="button">Upload</button>
              <button id="minify-btn" class="action-btn" type="button">Minify</button>
              <button id="clear-btn" class="action-btn" type="button">Clear</button>
              <input id="upload-input" type="file" accept=".json,application/json,text/json" hidden />
            </div>
          </section>

          <div id="splitter" class="splitter" aria-hidden="true"></div>

          <section
            id="tree-pane"
            class="pane tree-pane"
            aria-label="JSON Tree"
            role="tabpanel"
            aria-labelledby="tab-tree"
          >
            <div class="path-bar">
              <span>Selected path</span>
              <code id="selected-path">$</code>
            </div>
            <div id="tree-host" class="tree-host"></div>
          </section>
        </div>
      </main>

      <footer class="site-footer">
        <span>
          Made by
          <a
            class="credit-link"
            href="https://radity.com/?utm_source=jsonmaison.com&utm_medium=referral&utm_campaign=json_maison_footer&utm_content=made_by"
            target="_blank"
            rel="noopener noreferrer"
          >
            Radity
          </a>
          .
        </span>
        <button id="privacy-link" class="link-btn" type="button">Privacy</button>
      </footer>
    </div>

    <dialog id="privacy-modal" class="privacy-modal" aria-label="Privacy">
      <div class="privacy-content">
        <h2>Privacy</h2>
        <p>Your JSON never leaves your browser. JSON Maison runs fully client-side.</p>
        <p>We do not use analytics, ads, or tracking. Only theme preference is stored locally.</p>
        <button id="privacy-close" class="action-btn" type="button">Close</button>
      </div>
    </dialog>

    <div id="toast-root" class="toast-root" aria-live="polite"></div>
  `;

  const workspace = byId<HTMLDivElement>('workspace');
  const panes = byId<HTMLDivElement>('panes');
  const splitter = byId<HTMLDivElement>('splitter');
  const editorHost = byId<HTMLDivElement>('editor-host');
  const treeHost = byId<HTMLDivElement>('tree-host');
  const selectedPath = byId<HTMLElement>('selected-path');
  const errorBanner = byId<HTMLDivElement>('error-banner');
  const parseModeBtn = byId<HTMLButtonElement>('parse-mode-btn');
  const pasteBtn = byId<HTMLButtonElement>('paste-btn');
  const uploadBtn = byId<HTMLButtonElement>('upload-btn');
  const uploadInput = byId<HTMLInputElement>('upload-input');
  const minifyBtn = byId<HTMLButtonElement>('minify-btn');
  const clearBtn = byId<HTMLButtonElement>('clear-btn');
  const themeToggleBtn = byId<HTMLButtonElement>('theme-toggle');
  const toastRoot = byId<HTMLDivElement>('toast-root');
  const privacyLink = byId<HTMLButtonElement>('privacy-link');
  const privacyModal = byId<HTMLDialogElement>('privacy-modal');
  const privacyClose = byId<HTMLButtonElement>('privacy-close');
  const mobileTabs = [...workspace.querySelectorAll<HTMLButtonElement>('.mobile-tab')];

  const toast = createToastManager(toastRoot);
  const initialTheme = getInitialThemePreference();
  const store = new AppStore(initialTheme);

  const editor = createJsonEditor(editorHost, (value) => {
    handleManualEditorChange(value);
  });

  const tree = createTreeView(treeHost, (path) => {
    const state = store.get();
    store.set({ selectedPath: path });
    if (state.parsedValue !== null) {
      tree.render(state.parsedValue, path);
    }
  });
  tree.clear();

  applyTheme(initialTheme);

  let parseDebounceHandle: number | null = null;

  store.subscribe((state) => {
    workspace.dataset.activeTab = state.activeMobileTab;
    panes.style.setProperty('--left-pane-width', `${state.splitPx}px`);
    selectedPath.textContent = state.selectedPath;
    syncMobileTabs(state.activeMobileTab);
    syncThemeButton(state.themePreference);
    syncParseModeButton(state.parseMode);
  });

  const stopWatchingSystemTheme = watchSystemTheme(() => {
    if (store.get().themePreference === 'system') {
      applyTheme('system');
      syncThemeButton('system');
    }
  });

  function syncThemeButton(preference = store.get().themePreference): void {
    const resolved = resolveTheme(preference);
    themeToggleBtn.textContent = resolved === 'dark' ? '☀' : '☾';
    themeToggleBtn.setAttribute(
      'aria-label',
      resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
    themeToggleBtn.title =
      resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  function syncMobileTabs(activeTab: 'editor' | 'tree'): void {
    for (const tabButton of mobileTabs) {
      const tab = tabButton.dataset.tab === 'tree' ? 'tree' : 'editor';
      const isActive = tab === activeTab;
      tabButton.classList.toggle('is-active', isActive);
      tabButton.setAttribute('aria-selected', String(isActive));
      tabButton.tabIndex = isActive ? 0 : -1;
    }
  }

  function syncParseModeButton(mode = store.get().parseMode): void {
    const isStrict = mode === 'strict';
    parseModeBtn.textContent = isStrict ? 'Strict JSON' : 'Friendly JSON';
    parseModeBtn.setAttribute('aria-pressed', String(isStrict));
    parseModeBtn.title = isStrict
      ? 'Strict mode: only valid JSON is accepted'
      : 'Friendly mode: accepts JSON-like syntax';
    parseModeBtn.classList.toggle('is-strict', isStrict);
  }

  function showParseWarnings(warnings: string[]): void {
    if (warnings.length === 0) {
      return;
    }
    for (const warning of warnings) {
      toast.show(warning);
    }
  }

  function showInlineError(message: string): void {
    errorBanner.hidden = false;
    errorBanner.textContent = message;
  }

  function clearInlineError(): void {
    errorBanner.hidden = true;
    errorBanner.textContent = '';
  }

  function commitValidState(rawText: string, parsedValue: unknown, path = '$'): void {
    store.set({
      rawText,
      parsedValue,
      parseError: null,
      selectedPath: path,
    });
    clearInlineError();
    editor.highlightError(null);
    tree.render(parsedValue, path);
  }

  function commitInvalidState(rawText: string, parseError: ParseErrorInfo): void {
    store.set({
      rawText,
      parsedValue: null,
      parseError,
      selectedPath: '$',
    });
    showInlineError(parseError.message);
    editor.highlightError(parseError);
    tree.clear();
  }

  function commitFriendlyError(rawText: string, message: string): void {
    store.set({
      rawText,
      parsedValue: null,
      parseError: null,
      selectedPath: '$',
    });
    showInlineError(message);
    editor.highlightError(null);
    tree.clear();
  }

  function clearWorkspace(): void {
    if (parseDebounceHandle !== null) {
      window.clearTimeout(parseDebounceHandle);
      parseDebounceHandle = null;
    }

    editor.setValue('');
    store.set({
      rawText: '',
      parsedValue: null,
      parseError: null,
      selectedPath: '$',
    });
    clearInlineError();
    editor.highlightError(null);
    tree.clear();
    editor.focus();
  }

  function reparseCurrentText(mode: ParseMode): void {
    const rawText = editor.getValue();
    store.set({ rawText, parseMode: mode });

    if (!rawText.trim()) {
      store.set({ parsedValue: null, parseError: null, selectedPath: '$' });
      clearInlineError();
      editor.highlightError(null);
      tree.clear();
      return;
    }

    if (exceedsSizeCap(rawText)) {
      commitFriendlyError(rawText, TOO_LARGE_MESSAGE);
      return;
    }

    const result = parseAndFormatJson(rawText, mode);
    if ('error' in result) {
      commitInvalidState(rawText, result.error);
      return;
    }

    commitValidState(rawText, result.value);
    showParseWarnings(result.warnings);
  }

  function handleManualEditorChange(rawText: string): void {
    store.set({ rawText });

    if (parseDebounceHandle !== null) {
      window.clearTimeout(parseDebounceHandle);
    }

    if (!rawText.trim()) {
      store.set({ parsedValue: null, parseError: null, selectedPath: '$' });
      clearInlineError();
      editor.highlightError(null);
      tree.clear();
      return;
    }

    parseDebounceHandle = window.setTimeout(() => {
      if (exceedsSizeCap(rawText)) {
        commitFriendlyError(rawText, TOO_LARGE_MESSAGE);
        return;
      }

      const result = parseAndFormatJson(rawText, store.get().parseMode);
      if ('error' in result) {
        commitInvalidState(rawText, result.error);
        return;
      }

      commitValidState(rawText, result.value);
    }, 220);
  }

  function loadFromText(text: string, showFormatToast: boolean): void {
    if (parseDebounceHandle !== null) {
      window.clearTimeout(parseDebounceHandle);
      parseDebounceHandle = null;
    }

    if (exceedsSizeCap(text)) {
      commitFriendlyError(store.get().rawText, TOO_LARGE_MESSAGE);
      return;
    }

    const parseMode = store.get().parseMode;
    const result = parseAndFormatJson(text, parseMode);
    if ('error' in result) {
      editor.setValue(text);
      commitInvalidState(text, result.error);
      return;
    }

    editor.setValue(result.formatted);
    commitValidState(result.formatted, result.value);
    showParseWarnings(result.warnings);
    if (showFormatToast) {
      toast.show('Formatted JSON');
    }
    editor.focus();
  }

  async function readFile(file: File): Promise<void> {
    if (isFileTooLarge(file.size)) {
      commitFriendlyError(store.get().rawText, TOO_LARGE_MESSAGE);
      return;
    }

    const text = await file.text();
    loadFromText(text, false);
  }

  window.addEventListener(
    'paste',
    (event) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return;
      }

      const text = clipboardData.getData('text');
      if (!text) {
        return;
      }

      event.preventDefault();
      loadFromText(text, true);
    },
    { capture: true }
  );

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.show('Clipboard is empty');
        return;
      }
      loadFromText(text, true);
    } catch {
      toast.show('Press Ctrl/Cmd + V to paste');
    }
  });

  uploadBtn.addEventListener('click', () => {
    uploadInput.click();
  });

  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = '';
    if (!file) {
      return;
    }

    await readFile(file);
  });

  workspace.addEventListener('dragover', (event) => {
    event.preventDefault();
    workspace.classList.add('is-dragging');
  });

  workspace.addEventListener('dragleave', (event) => {
    if (event.relatedTarget && workspace.contains(event.relatedTarget as Node)) {
      return;
    }
    workspace.classList.remove('is-dragging');
  });

  workspace.addEventListener('drop', async (event) => {
    event.preventDefault();
    workspace.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    await readFile(file);
  });

  minifyBtn.addEventListener('click', () => {
    const raw = editor.getValue();
    if (!raw.trim()) {
      return;
    }

    if (exceedsSizeCap(raw)) {
      commitFriendlyError(raw, TOO_LARGE_MESSAGE);
      return;
    }

    const result = minifyJson(raw, store.get().parseMode);
    if ('error' in result) {
      commitInvalidState(raw, result.error);
      return;
    }

    editor.setValue(result.minified);
    commitValidState(result.minified, result.value);
    showParseWarnings(result.warnings);
    toast.show('Minified JSON');
    editor.focus();
  });

  clearBtn.addEventListener('click', () => {
    clearWorkspace();
  });

  parseModeBtn.addEventListener('click', () => {
    const current = store.get().parseMode;
    const next: ParseMode = current === 'strict' ? 'friendly' : 'strict';
    reparseCurrentText(next);
  });

  themeToggleBtn.addEventListener('click', () => {
    const next = toggleTheme(store.get().themePreference);
    store.set({ themePreference: next });
    applyTheme(next);
    syncThemeButton(next);
  });

  for (const tabButton of mobileTabs) {
    tabButton.addEventListener('click', () => {
      const tab = tabButton.dataset.tab === 'tree' ? 'tree' : 'editor';
      store.set({ activeMobileTab: tab });
    });
  }

  initSplitter(workspace, panes, splitter, store);

  privacyLink.addEventListener('click', () => {
    privacyModal.showModal();
  });

  privacyClose.addEventListener('click', () => {
    privacyModal.close();
  });

  privacyModal.addEventListener('click', (event) => {
    if (event.target === privacyModal) {
      privacyModal.close();
    }
  });

  window.addEventListener('beforeunload', () => {
    stopWatchingSystemTheme();
    editor.destroy();
  });
}

function initSplitter(
  workspace: HTMLElement,
  panes: HTMLElement,
  splitter: HTMLElement,
  store: AppStore
): void {
  const media = window.matchMedia('(max-width: 900px)');

  function clampSplit(width: number): number {
    const paneRect = panes.getBoundingClientRect();
    const min = 260;
    const max = Math.max(min, paneRect.width - min - 8);
    return Math.max(min, Math.min(max, width));
  }

  function syncFromStore(): void {
    const width = clampSplit(store.get().splitPx);
    panes.style.setProperty('--left-pane-width', `${width}px`);
    store.set({ splitPx: width });
  }

  window.addEventListener('resize', syncFromStore);
  syncFromStore();

  splitter.addEventListener('pointerdown', (event) => {
    if (media.matches) {
      return;
    }

    event.preventDefault();
    workspace.classList.add('is-resizing');

    const paneRect = panes.getBoundingClientRect();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const width = clampSplit(moveEvent.clientX - paneRect.left);
      store.set({ splitPx: width });
      panes.style.setProperty('--left-pane-width', `${width}px`);
    };

    const onPointerUp = () => {
      workspace.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}
