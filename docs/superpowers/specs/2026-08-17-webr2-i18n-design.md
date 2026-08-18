# webr2 i18n — Portuguese + English with footer flag

**Date:** 2026-08-17  
**Scope:** webr2 sandbox only. Do not change webr production (`index.html`, `src/`, `styles.css`, `config/`, `dist/index.html`).  
**Status:** Approved design (ready for implementation plan)

## Goal

Keep the current webr2 in Brazilian Portuguese and add a full English translation. The visitor can switch language with a flag button in the footer. The choice persists. First visit follows the browser language.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Languages | `pt` (pt-BR copy) and `en` only |
| What is translated | Everything user-facing: chrome, titles, placeholders, toasts, status, dynamic UI, `document.title`, meta description, starter script, and the 6 R examples (comments and plot titles) |
| What is not translated | Package names (`ggplot2`, `dplyr`, …), R engine output, already-printed console lines, user-edited Monaco content that is not a known starter/example |
| Default on first visit | `navigator.language` (or `navigator.languages[0]`) lowercased starts with `pt` → `pt`; otherwise `en` |
| Persistence | `localStorage['webr2-lang']` = `'pt'` \| `'en'`. Saved value wins over the browser. |
| Switch UX | One footer button. Shows the **target** language flag (in `pt` show US flag; in `en` show Brazil flag). Click applies immediately, no reload. |
| Flags | Inline SVG (not emoji — Windows does not render emoji flags). |
| Editor on switch | Replace Monaco value only if it still equals the starter or a known example in **either** language. Otherwise leave the buffer. |
| Reset editor | Restores the starter of the **current** language. |
| Example menu | Loads the example in the current language. |
| Missing key | `t(key)` falls back to `pt`, then to the key string. UI must not throw. |
| localStorage blocked | Language still switches in memory for the session. Next visit falls back to browser detection. |

## Files

| File | Role |
|---|---|
| `dist/webr2-i18n.js` | **New.** Dictionaries + `detectLang`, `getLang`, `setLang`, `t`, `applyI18n`, starter/example helpers. ES module. |
| `dist/webr2.html` | **Modify.** `data-i18n*` on static copy; footer flag button; head anti-FOUC script; import i18n; JS toasts/status/examples use `t()`. |
| `dist/styles-webr2.css` | **Modify.** Compact flag button in `.app-footer`. Do not edit production `styles.css`. |
| `tests/webr2-i18n.test.mjs` | **New.** Node tests for detection, `t()` fallback, interpolation, and editor-swap matching. Gitignored with other webr2 artifacts (`webr2*`). |

webr2 files stay gitignored by project convention. This spec is the committed record of the design.

## Module API (`dist/webr2-i18n.js`)

```js
export const I18N = { pt: { /* key: string */ }, en: { /* same keys */ } };
export const STARTER = { pt: '...', en: '...' };
export const EXAMPLES = {
  pt: { eda: '...', plots: '...', ggplot: '...', regression: '...', simulation: '...', matrix: '...' },
  en: { /* same ids */ }
};

export function detectLang(storage = localStorage, navigatorLike = navigator) { /* ... */ }
export function getLang() { /* module memory; if unset, detectLang() */ }
export function setLang(lang, storage = localStorage) { /* 'pt'|'en' only; persist + memory */ }
export function t(key, vars) { /* interpolate {name} after lookup */ }
export function applyI18n(root = document) { /* paint DOM */ }
export function matchKnownSource(text) {
  // returns { kind: 'starter' } | { kind: 'example', id } | null
}
export function starterFor(lang) { return STARTER[lang] ?? STARTER.pt; }
export function exampleFor(id, lang) { return EXAMPLES[lang]?.[id] ?? EXAMPLES.pt[id]; }
```

### `detectLang`

1. Read `storage.getItem('webr2-lang')`. If `'pt'` or `'en'`, return it.
2. Else read `navigatorLike.language` or `navigatorLike.languages[0]`, default `'pt-BR'`.
3. If lowercased value starts with `'pt'`, return `'pt'`; else `'en'`.
4. If `storage` throws, skip step 1.

### `t(key, vars)`

1. Look up `I18N[getLang()][key]`, else `I18N.pt[key]`, else `key`.
2. If `vars` is an object, replace `{name}` with `String(vars[name])`. Unknown placeholders stay as `{name}`.

### `applyI18n(root)`

1. `document.documentElement.lang` = `pt` → `pt-BR`, `en` → `en`.
2. `document.documentElement.dataset.lang` = current lang.
3. `document.title` = `t('meta.title')`.
4. `meta[name="description"]` content = `t('meta.description')`.
5. For each `[data-i18n]` under `root`: `textContent = t(attr)`.
6. `[data-i18n-title]` → `title`; `[data-i18n-placeholder]` → `placeholder`; `[data-i18n-aria]` → `aria-label`.
7. `[data-i18n-html]` → `innerHTML = t(attr)` (values are owned dictionary strings that may include `<a>` / `<strong>` / `<code>` / `<em>`).
8. Update `#btn-lang-toggle`: swap SVG (US vs BR), `title` and `aria-label` (`t('lang.switchTo')`).
9. Does **not** touch Monaco. The page script decides whether to swap the editor after `applyI18n`.

## HTML wiring

Static visible strings in `dist/webr2.html` get `data-i18n` (or `data-i18n-html` when markup is required). Portuguese remains the HTML source text so the page is readable without JS.

Head script (inline, before CSS paint of localized chrome is not guaranteed, but lang is set early):

```html
<script>
(function () {
  try {
    var s = localStorage.getItem('webr2-lang');
    var lang = (s === 'pt' || s === 'en')
      ? s
      : (((navigator.language || (navigator.languages && navigator.languages[0]) || 'pt-BR') + '')
          .toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en');
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.documentElement.setAttribute('data-lang', lang);
  } catch (e) {}
})();
</script>
```

The ES module calls `detectLang()` then `applyI18n()` as its first UI work, **before** Monaco init, so the starter is created in the detected language.

## Footer flag

Footer layout, left to right: (1) project credit, (2) “Powered by…” line, (3) `#btn-lang-toggle` on the far right. Button type `button`, ~22×22px, transparent background, pointer cursor, focus ring using existing accent color.

- Current `pt` → US flag SVG, `aria-label` / `title` = English “Switch to English”.
- Current `en` → Brazil flag SVG, `aria-label` / `title` = Portuguese “Mudar para português”.

Click handler:

1. `next = getLang() === 'pt' ? 'en' : 'pt'`.
2. `setLang(next)`.
3. `applyI18n()`.
4. If `editor` exists and `matchKnownSource(editor.getValue())` is not null, `editor.setValue` to `starterFor(next)` or `exampleFor(id, next)`.
5. Do not reset webR, plots, grid, files, or console history.

## Editor rules (explicit)

`matchKnownSource(text)` trims trailing whitespace and compares to:

- `STARTER.pt`, `STARTER.en`
- every `EXAMPLES.pt[id]` and `EXAMPLES.en[id]`

If the buffer matches a starter in either language → treat as starter.  
If it matches an example id in either language → treat as that id (so switching language translates the loaded example).  
Otherwise → do not change the buffer.

`initMonaco` initial `value` is `starterFor(detectLang())`, not a hardcoded Portuguese string.

The existing “restore initial code” button uses `starterFor(getLang())`.

## String catalog (minimum)

Every key must exist in both `pt` and `en`. Groups:

- **meta:** `title`, `description`
- **header:** run, run all, clear, examples, save, theme, github, status loading/ready/error, brand tooltip
- **examples menu:** eda, plots, ggplot, regression, simulation, matrix (labels)
- **editor:** copy, reset, cursor `Ln {line}, Col {col}`, footer hint with shortcuts
- **tabs:** console, data, plots, files, environment, packages
- **console:** placeholder, system start line, cleared line
- **data grid:** dataset label, select placeholder, search, export, empty state, pagination (`{n} linhas`, `Pág {current} de {total}`), meta (`{rows} linhas × {cols} colunas`), filter summary
- **plots:** gallery, export pro, prev/next, empty placeholder, filmstrip toggle
- **files:** headings, dropzone, empty list, sample dataset button labels
- **environment:** heading, clear, table headers, empty row
- **packages:** install heading, placeholder, install button, popular heading, each `pkg-desc`
- **footer:** two credit lines (`data-i18n-html`), lang switch label
- **toasts / runtime** used from JS (copy success, install, upload, errors, etc.)
- **STARTER** and **EXAMPLES** as separate exports, not `data-i18n` nodes

R comments and `main`/`xlab`/`labs()` strings inside STARTER and EXAMPLES are translated. Dataset object names (`iris`, `mtcars`) stay as in R.

## CSS

Add to `dist/styles-webr2.css` only:

- `.app-footer` may use `gap` so the flag does not collide with credits; keep height at `--footer-height` (30px) unless the flag clips, in which case raise to 32px in webr2 styles only.
- `.lang-toggle` / `#btn-lang-toggle` icon button, SVG `display:block; width:16px; height:12px`.
- On `max-width: 768px`, flag stays visible; credits may truncate with ellipsis.

## Error handling

- Unknown `setLang('fr')` is ignored; lang stays as-is.
- `applyI18n` skips missing nodes.
- Dictionary HTML is trusted (author-owned). Do not pass user input through `data-i18n-html`.
- Brief Portuguese flash before `applyI18n` is acceptable. Do not hide `body`.

## Testing

Run: `node --test tests/webr2-i18n.test.mjs`  
Import: `from '../dist/webr2-i18n.js'`. Tests inject fake `storage` / `navigatorLike` into `detectLang` (do not read the real browser).

Cover:

1. No storage + `navigator.language = 'pt-BR'` → `pt`
2. No storage + `navigator.language = 'en-US'` → `en`
3. No storage + `navigator.language = 'es-ES'` → `en`
4. Storage `'en'` + browser `pt-BR` → `en`
5. `t` missing key falls back to pt then to key
6. `t('data.page', { current: 2, total: 5 })` interpolates in both langs
7. `matchKnownSource(STARTER.pt)` → starter; dirty unique string → `null`
8. `matchKnownSource(EXAMPLES.en.eda)` → `{ kind: 'example', id: 'eda' }`

Manual: `npm run dev` → `http://localhost:3000/dist/webr2.html`

- Click flag: chrome, title, examples, starter (if unmodified) switch; session (webR) stays up.
- Reload: language remembered.
- Edit the script, switch language: buffer unchanged.
- Load example “ggplot”, switch language: example translates.
- Restore initial code: current-language starter.

## Out of scope

- webr production
- Languages other than pt/en
- URL `?lang=` (can be added later; not in this pass)
- Translating historical console output
- Translating R runtime / package messages
