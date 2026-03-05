export type ThemePreference = 'system' | 'light' | 'dark';
export type MobileTab = 'editor' | 'tree';
export type PathSegment = string | number;
export type ParseMode = 'friendly' | 'strict';

export interface ParseErrorInfo {
  message: string;
  line: number;
  column: number;
  offset: number;
}

export interface ParseSuccess {
  formatted: string;
  value: unknown;
  warnings: string[];
  modeUsed: ParseMode;
}

export interface ParseFailure {
  error: ParseErrorInfo;
}

export interface AppState {
  rawText: string;
  parsedValue: unknown | null;
  parseError: ParseErrorInfo | null;
  parseMode: ParseMode;
  selectedPath: string;
  activeMobileTab: MobileTab;
  splitPx: number;
  themePreference: ThemePreference;
}
