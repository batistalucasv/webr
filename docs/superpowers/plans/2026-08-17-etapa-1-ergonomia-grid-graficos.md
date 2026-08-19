# Etapa 1 — Ergonomia, Data Grid & Gráficos Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Etapa 1 from ROADMAP_WEBR2.md — resizable split pane, interactive DataFrame viewer, and professional plot gallery with export options.

**Architecture:** Extract new UI modules into `config/` (IIFE pattern like `webr-workstation.js`), wire from `index.html`. Keep `styles.css` as single stylesheet. Sync changes to `dist/` only if those files mirror root (primary source: root `index.html`, `styles.css`, `config/`).

**Tech Stack:** Vanilla JS (ES modules in index.html), webR v0.6.0, Monaco Editor, CSS custom properties, localStorage, SheetJS (xlsx export via CDN) optional.

## Global Constraints

- UI copy in Brazilian Portuguese (pt-BR).
- Match existing dark/light theme via `data-theme` and CSS variables (`--bg-primary`, `--accent-blue-hover`, etc.).
- Do not break existing: Monaco editor, console REPL, plot capture (`capture: true`), env inspector, file upload, package install.
- New modules use IIFE `(function () { ... })();` in `config/` unless ES module is already established for that feature.
- localStorage keys prefixed with `webr-`.
- Mobile breakpoint: `@media (max-width: 768px)` — stack panes vertically when narrow.
- No new npm dependencies in package.json; CDN allowed for xlsx (SheetJS) if needed.
- Verify manually: `npm run dev` then test in browser at http://localhost:3000

## Current State (partial work already done)

- Fixed 50/50 split layout exists (`.workspace-container`, `.pane-editor`, `.pane-tools`) — **no drag resizer yet**.
- Plot history with prev/next navigation and basic PNG download exists inline in `index.html`.
- CSS stub `.plot-gallery-nav` exists in `styles.css` but filmstrip not wired.
- Environment tab lists objects but rows are not clickable; no Data Grid viewer.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `config/split-pane.js` | Drag resizer, layout direction, localStorage persistence |
| `config/data-grid.js` | DataFrame fetch from webR, grid UI, sort/filter/paginate, export |
| `config/plot-gallery.js` | Filmstrip thumbnails, export modal (DPI, format, dimensions) |
| `index.html` | HTML hooks, script tags, thin integration calls |
| `styles.css` | Resizer, data grid, filmstrip, export modal styles |

---

### Task 1: Split Pane Resizer

**Files:**
- Create: `config/split-pane.js`
- Modify: `index.html`, `styles.css`

**Requirements:**
- Add draggable divider between `.pane-editor` and `.pane-tools` in `.workspace-container`.
- Persist editor width ratio in `localStorage` key `webr-split-ratio` (0.2–0.8 range).
- Desktop: horizontal split (editor left, tools right). Mobile (≤768px): vertical stack with resizer between top/bottom if both visible, or auto-stack without resizer.
- Double-click resizer resets to 50/50.
- Resizer handle: 4px hit area, cursor `col-resize` / `row-resize`, visible on hover.
- Monaco editor must call `layout()` after resize ends.

**HTML changes:**
- Insert `<div id="workspace-resizer" class="workspace-resizer" role="separator" aria-orientation="vertical" aria-label="Redimensionar painéis"></div>` between editor and tools panes.

**Integration:**
- Load `<script src="./config/split-pane.js"></script>` before main module in `index.html`.
- Export init: `window.webrSplitPane = { init: function() {...} };` called on DOMContentLoaded.

**Verification:**
- Drag resizer, reload page — ratio persists.
- Resize window to mobile width — layout adapts.
- Run code in editor after resize — Monaco still works.

---

### Task 2: Interactive Data Grid Viewer

**Files:**
- Create: `config/data-grid.js`
- Modify: `index.html`, `styles.css`

**Requirements:**
- Click data.frame row in Environment tab opens modal overlay with interactive grid.
- Also intercept `View(df)` pattern: when console output suggests View() or user runs `View(name)`, open grid for that object.
- Fetch data from webR via JSON:
  ```r
  jsonlite::toJSON(get(objname), dataframe = "rows")
  ```
  Install `jsonlite` on first use if missing (`webr::install("jsonlite")`).
- Grid features:
  - Pagination: 50 rows per page with prev/next.
  - Column sort: click header toggles asc/desc.
  - Per-column text filter + numeric min/max filter row below headers.
  - Global search box filtering all columns.
  - Column header mini-stats: type, NA count, unique count (computed client-side from loaded page or full data if ≤5000 rows).
- Export filtered view: CSV (always) and XLSX via SheetJS CDN `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`.
- Modal: close on Escape, backdrop click, × button.
- Env table: add "Ver" button/icon for data.frame rows; cursor pointer on data.frame name.

**HTML:**
- Add modal skeleton `#data-grid-modal` with toolbar (search, export buttons, close) and `#data-grid-table-host`.

**Integration:**
- Script tag for data-grid.js; call `webrDataGrid.init({ webR, showToast, switchTab })` after webR ready.
- Hook `refreshEnvironment()` to attach click handlers.

**Verification:**
- `data(iris); View(iris)` or click iris in Ambiente → grid opens with 150 rows, sort/filter works, CSV export downloads.

---

### Task 3: Enhanced Plot Gallery & Professional Export

**Files:**
- Create: `config/plot-gallery.js`
- Modify: `index.html`, `styles.css`

**Requirements:**
- Refactor plot history logic from inline index.html into `config/plot-gallery.js`.
- **Filmstrip:** horizontal scrollable thumbnail strip below plot actions; click thumbnail to select; active thumb highlighted.
- Store plots as `{ canvas, thumbnail, timestamp, width, height }`.
- **Export modal** (replace simple PNG button flow):
  - Formats: PNG (default), SVG (serialize canvas or re-export — PNG-only acceptable if SVG not feasible from canvas, but attempt SVG via canvas→dataURL or document wrapper).
  - DPI presets: 72, 150, 300, 600 — scale export dimensions accordingly.
  - Custom width × height in px OR cm (convert cm at 96 CSS px/in for screen, use selected DPI for export).
  - Transparent PNG checkbox (if canvas has white bg, offer option).
- Keep prev/next nav and clear history.
- Button "Exportar..." opens modal; "PNG" quick button can remain as 72 DPI shortcut.

**Integration:**
- Replace inline `plotHistory`, `renderPlot`, `downloadPlot` with module API:
  `webrPlotGallery.init({ showToast, switchTab })` and `webrPlotGallery.addPlot(canvas)`.
- Load script before main module; wire capture callback to module.

**Verification:**
- Generate 3+ plots → filmstrip shows thumbnails, navigation works.
- Export at 300 DPI produces larger file than 72 DPI.
- Clear history empties filmstrip.

---

### Task 4: Sync dist & Roadmap Status

**Files:**
- Modify: `dist/index.html`, `dist/styles.css`, `dist/config/*.js` (mirror root changes)
- Modify: `ROADMAP_WEBR2.md` status table — Etapa 1 → ✅ Concluída

**Requirements:**
- Copy updated assets to `dist/` to keep deploy folder in sync.
- Update roadmap execution table.

**Verification:**
- `dist/index.html` contains resizer, data grid modal, plot gallery script refs.
