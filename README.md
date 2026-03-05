# JSON Maison

JSON Maison is a lightweight, client-side JSON viewer and formatter built with Vite + TypeScript + CodeMirror 6.

## Privacy

- Runs fully in the browser (no backend).
- JSON content is never uploaded or stored.
- No analytics, ads, or lead capture.
- Only theme preference is saved in `localStorage`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Features

- Paste JSON with button or global `Ctrl/Cmd + V`
- Upload `.json` file
- Drag and drop JSON file onto workspace
- Auto-format valid JSON on paste/load (2 spaces)
- Minify action
- Inline parse errors with line/column and editor highlighting
- JSON tree with recursive expand/collapse and selected path bar
- Desktop split pane with drag resize
- Mobile Editor/Tree tabs
- System theme by default, manual toggle persisted

## Cloudflare Pages Deploy

1. Push this project to a Git repository.
2. In Cloudflare Pages, create a new project and connect that repo.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Framework preset: `Vite`

## Error Position Notes

JSON error positions rely on runtime parser messages when available (for example, `position N`).
If not provided by the runtime, JSON Maison falls back to a best-effort syntax scan to estimate line/column.
