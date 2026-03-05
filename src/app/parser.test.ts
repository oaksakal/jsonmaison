import { describe, expect, it } from 'vitest';
import { minifyJson, parseAndFormatJson } from './parser';

function expectParseSuccess<T extends { error?: unknown }>(result: T): Exclude<T, { error: unknown }> {
  if ('error' in result) {
    throw new Error((result as { error: { message: string } }).error.message);
  }
  return result as Exclude<T, { error: unknown }>;
}

describe('parser modes', () => {
  it('parses strict JSON in strict mode', () => {
    const result = parseAndFormatJson('{"ok":true}', 'strict');
    const success = expectParseSuccess(result);
    expect(success.value).toEqual({ ok: true });
    expect(success.warnings).toEqual([]);
    expect(success.modeUsed).toBe('strict');
  });

  it('accepts JSON-like syntax in friendly mode', () => {
    const input = `{
foo: 'bar',
items: [1, 2,],
}`;
    const result = parseAndFormatJson(input, 'friendly');
    const success = expectParseSuccess(result);
    expect(success.value).toEqual({ foo: 'bar', items: [1, 2] });
    expect(success.warnings).toContain('Friendly mode accepted JavaScript-style syntax.');
    expect(success.modeUsed).toBe('friendly');
  });

  it('normalizes undefined and inspector placeholders in friendly mode', () => {
    const input = `{
foo: [Object],
bar: undefined,
baz: [Function: demo]
}`;
    const result = parseAndFormatJson(input, 'friendly');
    const success = expectParseSuccess(result);
    expect(success.value).toEqual({ foo: null, bar: null, baz: null });
    expect(success.warnings).toContain(
      'Friendly mode replaced unsupported token "undefined" with null.'
    );
    expect(success.warnings).toContain(
      'Friendly mode replaced inspector placeholders like [Object] with null.'
    );
    expect(success.modeUsed).toBe('friendly');
  });

  it('rejects JSON-like syntax in strict mode', () => {
    const result = parseAndFormatJson("{\nfoo: 'bar'\n}", 'strict');
    if (!('error' in result)) {
      throw new Error('Expected strict parse to fail');
    }
    expect(result.error.line).toBe(2);
    expect(result.error.column).toBe(1);
  });

  it('minifies friendly input into strict JSON output', () => {
    const result = minifyJson("{ id: '123', status: undefined }", 'friendly');
    const success = expectParseSuccess(result);
    expect(success.minified).toBe('{"id":"123","status":null}');
    expect(success.warnings.length).toBeGreaterThan(0);
  });
});
