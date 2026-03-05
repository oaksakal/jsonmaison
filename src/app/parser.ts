import JSON5 from 'json5';
import type { ParseErrorInfo, ParseFailure, ParseMode, ParseSuccess } from './types';

export const MAX_JSON_SIZE_BYTES = 10 * 1024 * 1024;

const encoder = new TextEncoder();

export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

export function exceedsSizeCap(text: string): boolean {
  return byteLength(text) > MAX_JSON_SIZE_BYTES;
}

export function isFileTooLarge(size: number): boolean {
  return size > MAX_JSON_SIZE_BYTES;
}

export function parseAndFormatJson(
  text: string,
  mode: ParseMode = 'friendly'
): ParseSuccess | ParseFailure {
  try {
    const parsed = parseJsonByMode(text, mode);
    return {
      value: parsed.value,
      formatted: JSON.stringify(parsed.value, null, 2),
      warnings: parsed.warnings,
      modeUsed: parsed.modeUsed,
    };
  } catch (error) {
    return { error: buildParseErrorInfo(text, error) };
  }
}

export function minifyJson(
  text: string,
  mode: ParseMode = 'friendly'
): { minified: string; value: unknown; warnings: string[]; modeUsed: ParseMode } | ParseFailure {
  try {
    const parsed = parseJsonByMode(text, mode);
    return {
      minified: JSON.stringify(parsed.value),
      value: parsed.value,
      warnings: parsed.warnings,
      modeUsed: parsed.modeUsed,
    };
  } catch (error) {
    return { error: buildParseErrorInfo(text, error) };
  }
}

function parseJsonByMode(
  text: string,
  mode: ParseMode
): { value: unknown; warnings: string[]; modeUsed: ParseMode } {
  if (mode === 'strict') {
    return {
      value: JSON.parse(text) as unknown,
      warnings: [],
      modeUsed: 'strict',
    };
  }

  try {
    return {
      value: JSON.parse(text) as unknown,
      warnings: [],
      modeUsed: 'strict',
    };
  } catch {
    // Continue into friendly parsing path.
  }

  try {
    return {
      value: JSON5.parse(text) as unknown,
      warnings: ['Friendly mode accepted JavaScript-style syntax.'],
      modeUsed: 'friendly',
    };
  } catch {
    // Continue into normalization path for common inspector tokens.
  }

  const normalized = normalizeFriendlyText(text);
  if (!normalized.changed) {
    return {
      value: JSON5.parse(text) as unknown,
      warnings: [],
      modeUsed: 'friendly',
    };
  }

  const value = JSON5.parse(normalized.text) as unknown;
  return {
    value,
    warnings: normalized.warnings,
    modeUsed: 'friendly',
  };
}

function normalizeFriendlyText(text: string): {
  text: string;
  changed: boolean;
  warnings: string[];
} {
  let output = '';
  let changed = false;
  let inString: '"' | "'" | null = null;
  let escape = false;
  let replacedUndefined = false;
  let replacedPlaceholder = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      output += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      output += ch;
      continue;
    }

    const placeholder = matchPlaceholderToken(text, i);
    if (placeholder !== null) {
      output += 'null';
      i += placeholder.length - 1;
      changed = true;
      replacedPlaceholder = true;
      continue;
    }

    if (startsWithUndefinedToken(text, i)) {
      output += 'null';
      i += 'undefined'.length - 1;
      changed = true;
      replacedUndefined = true;
      continue;
    }

    output += ch;
  }

  const warnings: string[] = [];
  if (replacedUndefined) {
    warnings.push('Friendly mode replaced unsupported token "undefined" with null.');
  }
  if (replacedPlaceholder) {
    warnings.push('Friendly mode replaced inspector placeholders like [Object] with null.');
  }
  if (!replacedUndefined && !replacedPlaceholder && changed) {
    warnings.push('Friendly mode normalized unsupported tokens.');
  }

  return {
    text: output,
    changed,
    warnings,
  };
}

function startsWithUndefinedToken(text: string, offset: number): boolean {
  const token = 'undefined';
  if (!text.startsWith(token, offset)) {
    return false;
  }

  const prev = offset > 0 ? text[offset - 1] : '';
  const next = offset + token.length < text.length ? text[offset + token.length] : '';
  if (isIdentifierChar(prev) || isIdentifierChar(next)) {
    return false;
  }
  return true;
}

function matchPlaceholderToken(text: string, offset: number): string | null {
  if (text.startsWith('[Object]', offset)) {
    return '[Object]';
  }

  if (text.startsWith('[Array]', offset)) {
    return '[Array]';
  }

  if (text.startsWith('[Function', offset)) {
    const end = text.indexOf(']', offset);
    if (end !== -1) {
      return text.slice(offset, end + 1);
    }
  }

  return null;
}

function isIdentifierChar(value: string): boolean {
  return /[A-Za-z0-9_$]/.test(value);
}

function buildParseErrorInfo(text: string, error: unknown): ParseErrorInfo {
  const rawMessage = error instanceof Error ? error.message : 'Invalid JSON';
  const normalized = rawMessage.trim() || 'Invalid JSON';
  const located = locateError(text, normalized);

  return {
    message: `Invalid JSON \u2014 line ${located.line}, column ${located.column}`,
    line: located.line,
    column: located.column,
    offset: located.offset
  };
}

function locateError(text: string, message: string): {
  line: number;
  column: number;
  offset: number;
} {
  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const offset = clampOffset(Number(posMatch[1]), text.length);
    return offsetToLineColumn(text, offset);
  }

  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    const line = Math.max(1, Number(lineColumnMatch[1]));
    const column = Math.max(1, Number(lineColumnMatch[2]));
    return {
      line,
      column,
      offset: lineColumnToOffset(text, line, column)
    };
  }

  const atLineColumnMatch = message.match(/\bat\s+(\d+):(\d+)\b/i);
  if (atLineColumnMatch) {
    const line = Math.max(1, Number(atLineColumnMatch[1]));
    const column = Math.max(1, Number(atLineColumnMatch[2]));
    return {
      line,
      column,
      offset: lineColumnToOffset(text, line, column),
    };
  }

  if (/unexpected end/i.test(message)) {
    return offsetToLineColumn(text, text.length);
  }

  // Best-effort fallback for runtimes that omit exact parser offsets.
  const fallbackOffset = findLikelySyntaxOffset(text);
  return offsetToLineColumn(text, fallbackOffset);
}

function findLikelySyntaxOffset(text: string): number {
  const stack: Array<{ symbol: '{' | '['; offset: number }> = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push({ symbol: ch, offset: i });
      continue;
    }

    if (ch === '}' || ch === ']') {
      const top = stack[stack.length - 1];
      if (!top) {
        return i;
      }

      const expected = top.symbol === '{' ? '}' : ']';
      if (ch !== expected) {
        return i;
      }
      stack.pop();
    }
  }

  if (inString) {
    return Math.max(0, text.length - 1);
  }

  if (stack.length > 0) {
    return stack[stack.length - 1].offset;
  }

  return Math.max(0, firstNonWhitespaceOffset(text));
}

function firstNonWhitespaceOffset(text: string): number {
  for (let i = 0; i < text.length; i += 1) {
    if (!/\s/.test(text[i])) {
      return i;
    }
  }
  return 0;
}

function lineColumnToOffset(text: string, line: number, column: number): number {
  let currentLine = 1;
  let currentColumn = 1;

  for (let i = 0; i < text.length; i += 1) {
    if (currentLine === line && currentColumn === column) {
      return i;
    }

    if (text[i] === '\n') {
      currentLine += 1;
      currentColumn = 1;
    } else {
      currentColumn += 1;
    }
  }

  return text.length;
}

function offsetToLineColumn(text: string, offset: number): {
  line: number;
  column: number;
  offset: number;
} {
  const safeOffset = clampOffset(offset, text.length);
  let line = 1;
  let column = 1;

  for (let i = 0; i < safeOffset; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column, offset: safeOffset };
}

function clampOffset(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(max, Math.floor(value)));
}
