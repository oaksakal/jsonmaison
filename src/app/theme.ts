import type { ThemePreference } from './types';

const THEME_STORAGE_KEY = 'json-maison-theme';

export function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return 'system';
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return isSystemDark() ? 'dark' : 'light';
}

export function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
}

export function toggleTheme(preference: ThemePreference): ThemePreference {
  const resolved = resolveTheme(preference);
  const next = resolved === 'dark' ? 'light' : 'dark';
  window.localStorage.setItem(THEME_STORAGE_KEY, next);
  return next;
}

export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: dark)');

  const listener = () => {
    onChange();
  };

  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
}

function isSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
