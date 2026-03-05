declare module 'json-source-map' {
  export interface Position {
    line: number;
    column: number;
    pos: number;
  }

  export interface PointerMapping {
    key?: Position;
    keyEnd?: Position;
    value?: Position;
    valueEnd?: Position;
  }

  export interface ParseResult<T = unknown> {
    data: T;
    pointers: Record<string, PointerMapping>;
  }

  export function parse<T = unknown>(
    json: string,
    reviver?: unknown,
    options?: { bigint?: boolean }
  ): ParseResult<T>;
}
