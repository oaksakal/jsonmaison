You are Codex. Build a lightweight, production-usable web tool called **JSON Maison** running at **jsonmaison.com**.

GOAL
A clean, fast JSON viewer/formatter with excellent usability. The UI must feel like a small developer product (ray.so-inspired): minimal controls, workspace-first, frictionless paste → inspect workflow.

ABSOLUTE CONSTRAINTS
1) 100% client-side. No backend. Never send JSON anywhere.
2) No analytics. No ads. No lead capture.
3) Desktop-first, but must still work on small screens.
4) Keep it SIMPLE. Do not invent extra features beyond the scope below.
5) Must work: no broken builds, no blank editor, no nonfunctional buttons.

STACK (DECIDED FOR RELIABILITY)
- Vite + TypeScript (no React/Vue/Svelte, no Astro, no SSR).
- CodeMirror 6 for the editor.
- Plain TS modules + minimal DOM rendering.
- Deployable to Cloudflare Pages as static assets.

SCOPE (STRICT MVP ONLY)
Implement ONLY these features:

INPUT
- Paste JSON (button + keyboard)
- Upload JSON file
- Drag & drop JSON file onto the workspace

EDITOR + TREE
- CodeMirror editor on the left
- JSON Tree view on the right
- Resizable split pane divider on desktop
- On small screens: tabs (Editor / Tree)

ACTIONS (TOP TOOLBAR)
Toolbar MUST contain only these actions (left-to-right), plus theme toggle on far right:
- Paste
- Upload
- Minify
- Clear
- (Theme toggle icon)

IMPORTANT: Formatting happens automatically on paste/load when JSON is valid, so there is NO “Format” button in the toolbar.

THEME
- Follow system preference by default
- Manual toggle (persist theme only; do NOT persist user JSON)

ERROR HANDLING (CRITICAL)
- If JSON is invalid:
  - show: “Invalid JSON — line X, column Y”
  - highlight the error position in the editor
  - scroll editor to the error
- If JSON exceeds size cap:
  - cap at 10MB
  - show friendly message and do not freeze the UI

TREE (SIMPLE, RELIABLE)
- Simple recursive expand/collapse per node (no virtualization, no expand-all)
- Click a node to select it and display its path in a small bar above the tree (read-only display only; no copy buttons)
- Keep tree minimal and performant for typical payloads

REMOVE / DO NOT IMPLEMENT
- No validate button (parsing = validation)
- No search
- No copy pretty/minified/value/path buttons
- No expand-all, collapse-all, collapse-to-level
- No indentation selector (use 2 spaces always)
- No example loader
- No web workers
- No SEO multi-page routing
- No extra pages except a minimal privacy modal or /privacy.html if trivial

STRICT UX GUIDANCE (DO NOT DEVIATE)
1) Workspace-first layout
- The editor is always visible. Never replace it with an empty card.
- Use a subtle in-editor placeholder when empty:
  “Paste JSON here or drop a file”

2) Global paste behavior (premium UX)
- If user presses Ctrl/Cmd+V anywhere on the page:
  - put the pasted text into the editor
  - attempt parse
  - if valid JSON: AUTO-FORMAT immediately (2 spaces), update tree, show toast “Formatted JSON”
  - if invalid: show error line/col + highlight

3) Paste button behavior (clipboard permissions)
- Only attempt navigator.clipboard.readText() AFTER the user clicks “Paste”.
- If clipboard read fails due to permissions:
  - show toast: “Press Ctrl/Cmd + V to paste”
- Never show persistent “clipboard blocked” text on the UI.
- Never attempt clipboard access on page load.

4) Visual design (ray.so-inspired, minimal)
- Header with logo + name at top-left:
  - small monochrome icon (simple braces or node icon) + “JSON Maison”
- Minimal chrome: neutral grays, subtle borders, rounded corners, soft shadows (light touch).
- Single accent color (default: tasteful blue).
- Toasts: small, bottom-center or bottom-left; auto-dismiss.

HEADER CONTENT (MUST)
Top-left: logo + “JSON Maison” + small subtitle text:
“Clean JSON Viewer & Formatter”
Top-right: theme toggle icon.
Footer: “Made by Radity” + “Privacy” link.

PRIVACY
- No user JSON storage.
- Theme preference may be stored in localStorage.
- Include a minimal Privacy modal or a tiny static privacy page.

IMPLEMENTATION REQUIREMENTS (RELIABILITY)
- Provide a complete working project with:
  - package.json scripts: dev, build, preview
  - clear README with Cloudflare Pages deploy notes
- Must run with:
  npm install
  npm run dev
  npm run build
  npm run preview
- Ensure CodeMirror mounts reliably and updates correctly.
- Ensure tree updates on:
  - paste
  - upload
  - drop
  - manual edits (debounced parse)

PARSING + ERROR LOCATION
- Use JSON.parse for validation/parse.
- For line/column on errors, implement a robust locator:
  - Strategy: when JSON.parse throws, derive approximate position by scanning the message if possible; if not possible, run a lightweight fallback to find the first syntax error location (must yield line/col for common cases).
  - If you cannot guarantee exact position for every case, still provide best-effort line/col and highlight nearest position; document limitations in code comments.
(Do NOT add heavy parser dependencies unless truly necessary.)

OUTPUT FORMAT
1) First output a concise implementation plan (bulleted) and file tree.
2) Then output the full codebase: each file with its path and contents.

Start now and build JSON Maison.
