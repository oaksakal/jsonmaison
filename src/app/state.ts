import type { AppState, ThemePreference } from './types';

type StateListener = (state: AppState) => void;

export class AppStore {
  private state: AppState;

  private listeners = new Set<StateListener>();

  constructor(themePreference: ThemePreference) {
    this.state = {
      rawText: '',
      parsedValue: null,
      parseError: null,
      parseMode: 'friendly',
      selectedPath: '$',
      activeMobileTab: 'editor',
      splitPx: 560,
      themePreference,
    };
  }

  get(): AppState {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
