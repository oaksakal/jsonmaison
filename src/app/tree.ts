import type { PathSegment } from './types';

export interface TreeView {
  render: (value: unknown, selectedPath: string | null) => void;
  clear: () => void;
}

export function createTreeView(
  container: HTMLElement,
  onSelect: (path: string | null) => void
): TreeView {
  const expansionState = new Map<string, boolean>([['$', true]]);

  let currentValue: unknown = null;
  let currentSelectedPath: string | null = null;

  container.addEventListener('click', (event) => {
    if (event.target !== container) {
      return;
    }
    onSelect(null);
  });

  function render(value: unknown, selectedPath: string | null): void {
    currentValue = value;
    currentSelectedPath = selectedPath;
    container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'tree-root';
    container.appendChild(root);

    renderNode(root, value, [], 0);
  }

  function clear(): void {
    currentValue = null;
    currentSelectedPath = null;
    container.innerHTML = '<div class="tree-empty">Tree appears here after valid JSON.</div>';
  }

  function renderNode(parent: HTMLElement, value: unknown, path: PathSegment[], depth: number): void {
    const pathText = formatPath(path);
    const selected = currentSelectedPath !== null && pathText === currentSelectedPath;
    const keyLabel = nodeLabel(path);

    if (value !== null && typeof value === 'object') {
      const expanded = expansionState.get(pathText) ?? depth === 0;
      const row = createRow({
        depth,
        selected,
        keyLabel,
        valueLabel: summarizeContainer(value),
        expanded,
        container: true,
        pathText,
      });
      parent.appendChild(row);

      if (!expanded) {
        return;
      }

      const children = document.createElement('div');
      children.className = 'tree-children';
      parent.appendChild(children);

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          renderNode(children, item, [...path, index], depth + 1);
        });
      } else {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          renderNode(children, child, [...path, key], depth + 1);
        }
      }
      return;
    }

    const leafRow = createRow({
      depth,
      selected,
      keyLabel,
      valueLabel: formatPrimitive(value),
      expanded: false,
      container: false,
      pathText,
    });
    parent.appendChild(leafRow);
  }

  function createRow(args: {
    depth: number;
    selected: boolean;
    keyLabel: string;
    valueLabel: string;
    expanded: boolean;
    container: boolean;
    pathText: string;
  }): HTMLElement {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `tree-row ${args.selected ? 'is-selected' : ''}`;
    row.style.paddingLeft = `${args.depth * 14 + 10}px`;

    if (args.container) {
      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.textContent = args.expanded ? '▾' : '▸';
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'tree-toggle tree-toggle-spacer';
      spacer.textContent = '·';
      row.appendChild(spacer);
    }

    const key = document.createElement('span');
    key.className = 'tree-key';
    key.textContent = args.keyLabel;
    row.appendChild(key);

    const value = document.createElement('span');
    value.className = 'tree-value';
    value.textContent = args.valueLabel;
    row.appendChild(value);

    row.addEventListener('click', () => {
      onSelect(args.pathText);

      if (!args.container) {
        return;
      }

      expansionState.set(args.pathText, !args.expanded);
      render(currentValue, args.pathText);
    });

    return row;
  }

  return {
    render,
    clear,
  };
}

function nodeLabel(path: PathSegment[]): string {
  if (path.length === 0) {
    return '$';
  }

  const segment = path[path.length - 1];
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }

  return segment;
}

function summarizeContainer(value: object): string {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  return `Object(${Object.keys(value).length})`;
}

function formatPrimitive(value: unknown): string {
  if (typeof value === 'string') {
    return `\"${value}\"`;
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

export function formatPath(path: PathSegment[]): string {
  if (path.length === 0) {
    return '$';
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }

    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      return `${acc}.${segment}`;
    }

    const escaped = segment.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${acc}[\"${escaped}\"]`;
  }, '$');
}
