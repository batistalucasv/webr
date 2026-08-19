/**
 * webr — editor de estilo de gráfico (onda 1).
 * Gera / aplica alterações de cor, símbolo, legenda e fonte no script R.
 */

export const STYLE_BEGIN = '# --- webr-plot-style ---';
export const STYLE_END = '# --- /webr-plot-style ---';

export const LEGEND_POSITIONS_GGPLOT = ['none', 'top', 'bottom', 'left', 'right'];
export const LEGEND_POSITIONS_BASE = [
  'topleft', 'topright', 'bottomleft', 'bottomright', 'top', 'bottom', 'left', 'right', 'center'
];

export const PCH_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25];

export const LTY_CHOICES = [
  { value: 'solid', label: 'sólida' },
  { value: 'dashed', label: 'tracejada' },
  { value: 'dotted', label: 'pontilhada' },
  { value: 'dotdash', label: 'traço-ponto' },
  { value: 'longdash', label: 'traço longo' },
  { value: 'twodash', label: 'dois traços' }
];

const R_NAMED_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  gray: '#BEBEBE',
  grey: '#BEBEBE',
  orange: '#FFA500',
  purple: '#A020F0',
  brown: '#A52A2A',
  pink: '#FFC0CB',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  yellow: '#FFFF00',
  steelblue: '#4682B4',
  navy: '#000080',
  gold: '#FFD700'
};

const SCALE_FN = {
  colour: 'scale_colour_manual',
  color: 'scale_colour_manual',
  fill: 'scale_fill_manual',
  shape: 'scale_shape_manual',
  linetype: 'scale_linetype_manual'
};

const BASE_PLOT_RE = /\b(plot|hist|boxplot|barplot|curve|pairs|image|heatmap|matplot)\s*\(/i;

const POINT_GEOMS = {
  geom_point: true,
  geom_jitter: true,
  geom_count: true,
  geom_dotplot: true
};

const LINE_GEOMS = {
  geom_line: true,
  geom_path: true,
  geom_smooth: true,
  geom_density: true,
  geom_function: true,
  geom_hline: true,
  geom_vline: true,
  geom_abline: true,
  geom_step: true,
  geom_contour: true,
  geom_qq_line: true,
  geom_errorbar: true,
  geom_linerange: true,
  geom_pointrange: true,
  geom_ribbon: true
};

const FILL_GEOMS = {
  geom_bar: true,
  geom_col: true,
  geom_histogram: true,
  geom_boxplot: true,
  geom_violin: true,
  geom_area: true,
  geom_rect: true,
  geom_tile: true,
  geom_raster: true,
  geom_polygon: true,
  geom_ribbon: true,
  geom_smooth: true,
  geom_density: true
};

export function rString(value) {
  return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

export function rName(name) {
  const s = String(name);
  if (/^[A-Za-z.][A-Za-z0-9._]*$/.test(s)) return s;
  return '`' + s.replace(/`/g, '.') + '`';
}

export function rNamedVector(map, { numeric = false } = {}) {
  const parts = Object.keys(map).map((k) => {
    const v = map[k];
    const rhs = numeric || typeof v === 'number' ? String(v) : rString(v);
    return `${rName(k)} = ${rhs}`;
  });
  return 'c(' + parts.join(', ') + ')';
}

export function rVector(values, { numeric = false } = {}) {
  return 'c(' + values.map((v) => (numeric ? String(v) : rString(v))).join(', ') + ')';
}

export function toPickerHex(value) {
  if (value == null) return '#888888';
  const v = String(value).trim();
  const named = R_NAMED_COLORS[v.toLowerCase()];
  if (named) return named;
  const m3 = v.match(/^#([0-9A-Fa-f]{3})$/);
  if (m3) {
    const [a, b, c] = m3[1].split('');
    return ('#' + a + a + b + b + c + c).toUpperCase();
  }
  const m6 = v.match(/^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/);
  if (m6) return ('#' + m6[1]).toUpperCase();
  return '#888888';
}

export function textSizeToCex(size) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round((n / 12) * 100) / 100;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchingParen(source, openIdx) {
  const openCh = source[openIdx];
  const closeCh = openCh === '(' ? ')' : openCh === '[' ? ']' : '}';
  let depth = 0;
  let inStr = null;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    const prev = i > 0 ? source[i - 1] : '';
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function skipSpaceAndComments(source, i) {
  while (i < source.length) {
    const c = source[i];
    if (c === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    break;
  }
  return i;
}

function unquoteToken(raw) {
  const s = String(raw).trim();
  const m = s.match(/^(['"`])([\s\S]*)\1$/);
  if (m) return m[2];
  return s;
}

function splitTopArgs(inner) {
  const parts = [];
  let buf = '';
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    const prev = i > 0 ? inner[i - 1] : '';
    if (inStr) {
      buf += c;
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      buf += c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (c === ',' && depth === 0) {
      parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function findLastEquals(source, name) {
  const re = new RegExp('\\b' + escapeRe(name) + '\\s*=\\s*', 'gi');
  let match;
  let last = null;
  while ((match = re.exec(source))) last = match;
  return last;
}

export function extractEqualsCall(source, name) {
  const last = findLastEquals(source, name);
  if (!last) return null;
  const start = last.index + last[0].length;
  const rest = source.slice(start);
  const cMatch = rest.match(/^c\s*\(/);
  if (cMatch) {
    const open = start + rest.indexOf('(');
    const close = matchingParen(source, open);
    if (close < 0) return null;
    const inner = source.slice(open + 1, close);
    const values = splitTopArgs(inner).map(unquoteToken).filter((v) => v !== '');
    return { kind: 'vector', values, start: last.index, end: close + 1 };
  }
  const str = rest.match(/^(['"])([^'"]*)\1/);
  if (str) {
    return {
      kind: 'scalar',
      values: [str[2]],
      start: last.index,
      end: start + str[0].length
    };
  }
  const num = rest.match(/^[-+]?\d+(\.\d+)?/);
  if (num) {
    return {
      kind: 'scalar',
      values: [num[0]],
      start: last.index,
      end: start + num[0].length
    };
  }
  return null;
}

export function patchEqualsCall(source, name, spec) {
  const found = extractEqualsCall(source, name);
  if (!found || !spec) return source;
  let rhs;
  if (spec.kind === 'vector') {
    const numeric = (spec.values || []).every((v) => /^-?\d+(\.\d+)?$/.test(String(v)));
    rhs = rVector(spec.values, { numeric });
  } else {
    const v = spec.values ? spec.values[0] : spec.value;
    rhs = /^-?\d+(\.\d+)?$/.test(String(v)) ? String(v) : rString(v);
  }
  return source.slice(0, found.start) + name + ' = ' + rhs + source.slice(found.end);
}

export function patchLegendPosition(source, pos) {
  if (!pos) return source;
  return source.replace(
    /legend\s*\(\s*(['"])(topleft|topright|bottomleft|bottomright|top|bottom|left|right|center)\1/gi,
    'legend("' + pos + '"'
  );
}

function findLastCall(source, re) {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const globalRe = new RegExp(re.source, flags);
  let match;
  let last = null;
  while ((match = globalRe.exec(source))) last = match;
  if (!last) return null;
  const open = source.indexOf('(', last.index);
  if (open < 0) return null;
  const close = matchingParen(source, open);
  if (close < 0) return null;
  return { index: last.index, open, close };
}

function rhsFromSpec(spec) {
  if (!spec) return '';
  if (spec.kind === 'vector') {
    const numeric = (spec.values || []).every((v) => /^-?\d+(\.\d+)?$/.test(String(v)));
    return rVector(spec.values, { numeric });
  }
  const v = spec.values ? spec.values[0] : spec.value;
  if (v == null) return rString('');
  return /^-?\d+(\.\d+)?$/.test(String(v)) ? String(v) : rString(v);
}

function patchArgInCallRange(source, openParen, closeParen, name, rhs) {
  const inner = source.slice(openParen + 1, closeParen);
  const found = extractEqualsCall(inner, name);
  if (found) {
    const newInner = inner.slice(0, found.start) + name + ' = ' + rhs + inner.slice(found.end);
    return source.slice(0, openParen + 1) + newInner + source.slice(closeParen);
  }
  const insert = (inner.trim() ? ', ' : '') + name + ' = ' + rhs;
  return source.slice(0, closeParen) + insert + source.slice(closeParen);
}

export function patchOrInsertPlotArg(source, name, spec) {
  const call = findLastCall(source, BASE_PLOT_RE);
  if (!call) return source;
  return patchArgInCallRange(source, call.open, call.close, name, rhsFromSpec(spec));
}

function findGeomCalls(source) {
  const re = /\b(geom_[A-Za-z0-9]+)\s*\(/g;
  const out = [];
  let match;
  while ((match = re.exec(source))) {
    out.push({ name: match[1], open: match.index + match[0].length - 1 });
  }
  return out;
}

function geomTakesAlpha(name) {
  return !!(POINT_GEOMS[name] || LINE_GEOMS[name] || FILL_GEOMS[name]);
}

export function patchGgplotGeomArgs(source, args) {
  if (!args) return source;
  let out = source;
  const geoms = findGeomCalls(out);
  for (let i = geoms.length - 1; i >= 0; i--) {
    const g = geoms[i];
    let close = matchingParen(out, g.open);
    if (close < 0) continue;
    if (args.alpha != null && args.alpha !== '' && geomTakesAlpha(g.name)) {
      out = patchArgInCallRange(out, g.open, close, 'alpha', String(args.alpha));
      close = matchingParen(out, g.open);
    }
    if (args.size != null && args.size !== '' && POINT_GEOMS[g.name]) {
      out = patchArgInCallRange(out, g.open, close, 'size', String(args.size));
      close = matchingParen(out, g.open);
    }
    if (args.linewidth != null && args.linewidth !== '' && LINE_GEOMS[g.name]) {
      out = patchArgInCallRange(out, g.open, close, 'linewidth', String(args.linewidth));
      close = matchingParen(out, g.open);
    }
    if (args.linetype != null && args.linetype !== '' && LINE_GEOMS[g.name]) {
      const lty = args.linetype;
      const rhs = /^-?\d+$/.test(String(lty)) ? String(lty) : rString(lty);
      out = patchArgInCallRange(out, g.open, close, 'linetype', rhs);
    }
  }
  return out;
}

export function patchParCex(source, cex) {
  const n = Number(cex);
  if (!Number.isFinite(n)) return source;
  const re = /\bpar\s*\(/gi;
  let match;
  let last = null;
  while ((match = re.exec(source))) last = match;
  if (!last) {
    const plot = source.search(BASE_PLOT_RE);
    const line = 'par(cex = ' + n + ')\n';
    if (plot < 0) return line + source;
    return source.slice(0, plot) + line + source.slice(plot);
  }
  const open = source.indexOf('(', last.index);
  const close = matchingParen(source, open);
  if (close < 0) return source;
  let inner = source.slice(open + 1, close);
  if (/\bcex\s*=/.test(inner)) {
    inner = inner.replace(/\bcex\s*=\s*[-+]?\d+(\.\d+)?/, 'cex = ' + n);
  } else {
    inner = inner.replace(/\s*$/, '') + ', cex = ' + n;
  }
  return source.slice(0, open + 1) + inner + source.slice(close);
}

export function patchParBg(source, bg) {
  if (bg == null) return source;
  const re = /\bpar\s*\(/gi;
  let match;
  let last = null;
  while ((match = re.exec(source))) last = match;
  const rhs = bg === 'transparent' ? '"transparent"' : rString(bg);
  if (!last) {
    if (bg === 'transparent' || !bg) return source;
    const plot = source.search(BASE_PLOT_RE);
    const line = 'par(bg = ' + rhs + ')\n';
    if (plot < 0) return line + source;
    return source.slice(0, plot) + line + source.slice(plot);
  }
  const open = source.indexOf('(', last.index);
  const close = matchingParen(source, open);
  if (close < 0) return source;
  let inner = source.slice(open + 1, close);
  if (/\bbg\s*=/.test(inner)) {
    inner = inner.replace(/\bbg\s*=\s*(['"][^'"]*['"]|[A-Za-z0-9._]+)/, 'bg = ' + rhs);
  } else {
    if (bg === 'transparent' || !bg) return source;
    inner = inner.replace(/\s*$/, '') + ', bg = ' + rhs;
  }
  return source.slice(0, open + 1) + inner + source.slice(close);
}

export function inspectBaseFromSource(source) {
  const col = extractEqualsCall(source, 'col');
  const pch = extractEqualsCall(source, 'pch');
  const legend = source.match(
    /legend\s*\(\s*['"](topleft|topright|bottomleft|bottomright|top|bottom|left|right|center)['"]/i
  );
  const parCall = findLastCall(source, /\bpar\s*\(/);
  const parInner = parCall ? source.slice(parCall.open + 1, parCall.close) : '';
  const parCex = parInner ? extractEqualsCall(parInner, 'cex') : null;
  const parBg = parInner ? extractEqualsCall(parInner, 'bg') : null;
  const plotCall = findLastCall(source, BASE_PLOT_RE);
  const plotInner = plotCall ? source.slice(plotCall.open + 1, plotCall.close) : source;
  const main = extractEqualsCall(plotInner, 'main');
  const xlab = extractEqualsCall(plotInner, 'xlab');
  const ylab = extractEqualsCall(plotInner, 'ylab');
  const lwd = extractEqualsCall(plotInner, 'lwd');
  const lty = extractEqualsCall(plotInner, 'lty');
  const plotCex = extractEqualsCall(plotInner, 'cex');
  const colors = col ? col.values.slice() : [];
  return {
    kind: 'base',
    colors,
    pch: pch ? Number(pch.values[0]) : undefined,
    lty: lty ? lty.values[0] : undefined,
    lwd: lwd ? Number(lwd.values[0]) : undefined,
    pointSize: plotCex ? Number(plotCex.values[0]) : undefined,
    title: main ? main.values[0] : '',
    xlab: xlab ? xlab.values[0] : '',
    ylab: ylab ? ylab.values[0] : '',
    legendPosition: legend ? legend[1] : undefined,
    textSize: parCex ? Number(parCex.values[0]) * 12 : undefined,
    bg: parBg && parBg.values ? parBg.values[0] : undefined
  };
}

export function detectPlotKind(source) {
  const s = stripStyleBlock(source || '');
  if (/\bggplot\s*\(/.test(s)) return 'ggplot';
  if (BASE_PLOT_RE.test(s)) return 'base';
  return 'none';
}

export function stripStyleBlock(source) {
  const re = new RegExp(
    '(?:\\s*\\+)?\\s*' + escapeRe(STYLE_BEGIN) + '[\\s\\S]*?' + escapeRe(STYLE_END) + '\\s*',
    'g'
  );
  return String(source || '').replace(re, '\n');
}

function findLastGgplotStart(source) {
  const re = /\bggplot\s*\(/g;
  let match;
  let last = null;
  while ((match = re.exec(source))) last = match;
  return last ? last.index : -1;
}

function findGgplotChainEnd(source, start) {
  let i = start;
  let depth = 0;
  let inStr = null;
  let seenOpen = false;
  while (i < source.length) {
    const c = source[i];
    const prev = i > 0 ? source[i - 1] : '';
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      i++;
      continue;
    }
    if (c === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      depth++;
      seenOpen = true;
      i++;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      depth = Math.max(0, depth - 1);
      i++;
      if (seenOpen && depth === 0) {
        const j = skipSpaceAndComments(source, i);
        if (source[j] === '+') {
          i = j + 1;
          continue;
        }
        return i;
      }
      continue;
    }
    i++;
  }
  return source.length;
}

export function generateGgplotAddon(style) {
  const parts = [];
  const scales = style && style.scales ? style.scales : [];
  for (let i = 0; i < scales.length; i++) {
    const sc = scales[i];
    const fn = SCALE_FN[sc.aes];
    if (!fn || !sc.levels || !sc.levels.length) continue;
    const map = {};
    for (let k = 0; k < sc.levels.length; k++) {
      map[sc.levels[k]] = sc.values[k];
    }
    const numeric =
      sc.aes === 'shape' ||
      (sc.aes === 'linetype' && (sc.values || []).every((v) => /^-?\d+$/.test(String(v))));
    parts.push(fn + '(values = ' + rNamedVector(map, { numeric }) + ')');
  }
  const themeArgs = [];
  if (style && style.legendPosition) {
    themeArgs.push('legend.position = ' + rString(style.legendPosition));
  }
  if (style && style.textSize != null && style.textSize !== '') {
    themeArgs.push('text = element_text(size = ' + Number(style.textSize) + ')');
  }
  if (style && style.bg != null) {
    if (style.bg === 'transparent') {
      themeArgs.push('plot.background = element_rect(fill = "transparent", colour = NA)');
      themeArgs.push('panel.background = element_rect(fill = "transparent", colour = NA)');
      themeArgs.push('legend.background = element_rect(fill = "transparent", colour = NA)');
    } else if (style.bg !== '') {
      themeArgs.push('plot.background = element_rect(fill = ' + rString(style.bg) + ')');
      themeArgs.push('panel.background = element_rect(fill = ' + rString(style.bg) + ')');
      themeArgs.push('legend.background = element_rect(fill = ' + rString(style.bg) + ')');
    }
  }
  if (themeArgs.length) {
    parts.push('theme(' + themeArgs.join(', ') + ')');
  }
  const labArgs = [];
  if (style && style.title != null && style.title !== '') {
    labArgs.push('title = ' + rString(style.title));
  }
  if (style && style.xlab != null && style.xlab !== '') {
    labArgs.push('x = ' + rString(style.xlab));
  }
  if (style && style.ylab != null && style.ylab !== '') {
    labArgs.push('y = ' + rString(style.ylab));
  }
  if (labArgs.length) {
    parts.push('labs(' + labArgs.join(', ') + ')');
  }
  return parts.join(' +\n  ');
}

export function spliceGgplotStyle(source, addon) {
  const stripped = stripStyleBlock(source);
  const start = findLastGgplotStart(stripped);
  if (start < 0 || !addon) return stripped;
  const end = findGgplotChainEnd(stripped, start);
  const block = ' +\n  ' + STYLE_BEGIN + '\n  ' + addon + '\n  ' + STYLE_END;
  return stripped.slice(0, end) + block + stripped.slice(end);
}

export function applyPlotStyle(source, style) {
  if (!style || !style.kind || style.kind === 'none') return source;
  if (style.kind === 'ggplot') {
    let out = stripStyleBlock(source);
    out = patchGgplotGeomArgs(out, {
      size: style.pointSize,
      alpha: style.alpha,
      linewidth: style.linewidth,
      linetype: style.linetype
    });
    return spliceGgplotStyle(out, generateGgplotAddon(style));
  }
  let out = stripStyleBlock(source);
  if (style.colors && style.colors.length) {
    out = patchEqualsCall(out, 'col', { kind: 'vector', values: style.colors });
    const again = extractEqualsCall(out, 'col');
    if (again && again.kind === 'scalar' && style.colors.length === 1) {
      out = patchEqualsCall(out, 'col', { kind: 'scalar', values: style.colors });
    }
  }
  if (style.pch != null && style.pch !== '') {
    out = out.replace(/\bpch\s*=\s*[-+]?\d+(\.\d+)?/g, 'pch = ' + Number(style.pch));
  }
  if (style.legendPosition) {
    out = patchLegendPosition(out, style.legendPosition);
  }
  if (style.textSize != null && style.textSize !== '') {
    out = patchParCex(out, textSizeToCex(style.textSize));
  }
  if (style.bg != null) {
    out = patchParBg(out, style.bg);
  }
  if (style.title != null) {
    out = patchOrInsertPlotArg(out, 'main', { kind: 'scalar', values: [style.title] });
  }
  if (style.xlab != null) {
    out = patchOrInsertPlotArg(out, 'xlab', { kind: 'scalar', values: [style.xlab] });
  }
  if (style.ylab != null) {
    out = patchOrInsertPlotArg(out, 'ylab', { kind: 'scalar', values: [style.ylab] });
  }
  if (style.lwd != null && style.lwd !== '') {
    out = patchOrInsertPlotArg(out, 'lwd', { kind: 'scalar', values: [style.lwd] });
  }
  if (style.lty != null && style.lty !== '') {
    out = patchOrInsertPlotArg(out, 'lty', { kind: 'scalar', values: [style.lty] });
  }
  if (style.pointSize != null && style.pointSize !== '') {
    out = patchOrInsertPlotArg(out, 'cex', { kind: 'scalar', values: [style.pointSize] });
  }
  return out;
}

function first(value) {
  if (Array.isArray(value)) return value.length ? value[0] : undefined;
  return value;
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function numOrUndef(value) {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function labelText(rawLabels, key) {
  if (!rawLabels || typeof rawLabels !== 'object') return '';
  const v = first(rawLabels[key]);
  return v == null ? '' : String(v);
}

export function normalizeGgplotInspect(raw) {
  if (!raw || typeof raw !== 'object') return { kind: 'none' };
  const kind = String(first(raw.kind) || 'none');
  if (kind !== 'ggplot') return { kind };
  let scales = raw.scales;
  if (!Array.isArray(scales)) {
    scales = scales && typeof scales === 'object' ? Object.values(scales) : [];
  }
  const mapped = scales
    .map((sc) => ({
      aes: String(first(sc && sc.aes) || ''),
      levels: asArray(sc && sc.levels).map(String),
      values: asArray(sc && sc.values).map(String)
    }))
    .filter((sc) => sc.aes && sc.levels.length);
  const constants = {};
  const cRaw = raw.constants && typeof raw.constants === 'object' ? raw.constants : {};
  Object.keys(cRaw).forEach((k) => {
    constants[k] = first(cRaw[k]);
  });
  const labels = raw.labels && typeof raw.labels === 'object' ? raw.labels : {};
  return {
    kind: 'ggplot',
    scales: mapped,
    legendPosition: first(raw.legendPosition) != null ? String(first(raw.legendPosition)) : 'right',
    textSize: first(raw.textSize) != null ? Number(first(raw.textSize)) : 11,
    title: labelText(labels, 'title'),
    xlab: labelText(labels, 'x'),
    ylab: labelText(labels, 'y'),
    pointSize: numOrUndef(constants.size),
    alpha: numOrUndef(constants.alpha),
    linewidth: numOrUndef(constants.linewidth),
    linetype: constants.linetype != null ? String(constants.linetype) : '',
    constants,
    bg: raw.bg != null ? String(first(raw.bg)) : undefined
  };
}

export const INSPECT_GGPLOT_R = `
tryCatch({
  if (!requireNamespace("ggplot2", quietly = TRUE)) {
    list(ok = TRUE, kind = "none")
  } else {
    p <- ggplot2::last_plot()
    if (is.null(p)) {
      list(ok = TRUE, kind = "none")
    } else {
      b <- ggplot2::ggplot_build(p)
      collect <- function(aes) {
        sc <- b$plot$scales$get_scales(aes)
        if (is.null(sc)) return(NULL)
        disc <- inherits(sc, "ScaleDiscrete")
        if (!isTRUE(disc)) return(NULL)
        levels <- sc$range$range
        if (is.null(levels) || length(levels) == 0) return(NULL)
        pal <- tryCatch(sc$palette(length(levels)), error = function(e) NULL)
        if (is.null(pal)) return(NULL)
        list(aes = aes, levels = as.character(levels), values = as.character(pal))
      }
      scales <- Filter(Negate(is.null), list(
        collect("colour"),
        collect("fill"),
        collect("shape"),
        collect("linetype")
      ))
      th <- b$plot$theme
      lp <- th$legend.position
      if (is.null(lp)) lp <- ggplot2::theme_get()$legend.position
      if (is.null(lp) || !is.character(lp)) lp <- "right"
      tsz <- th$text$size
      if (inherits(tsz, "rel")) tsz <- 11 * as.numeric(tsz)
      if (is.null(tsz) || !is.numeric(tsz)) {
        gt <- ggplot2::theme_get()$text$size
        tsz <- if (is.null(gt) || !is.numeric(gt)) 11 else gt
      }
      plot_bg <- th$plot.background$fill
      if (is.null(plot_bg)) plot_bg <- th$panel.background$fill
      consts <- list()
      if (length(p$layers) > 0) {
        for (i in seq_along(p$layers)) {
          ap <- p$layers[[i]]$aes_params
          if (is.null(consts$colour) && !is.null(ap$colour)) consts$colour <- as.character(ap$colour)[1]
          if (is.null(consts$fill) && !is.null(ap$fill)) consts$fill <- as.character(ap$fill)[1]
          if (is.null(consts$shape) && !is.null(ap$shape)) consts$shape <- as.character(ap$shape)[1]
          if (is.null(consts$size) && !is.null(ap$size)) consts$size <- as.numeric(ap$size)[1]
          if (is.null(consts$alpha) && !is.null(ap$alpha)) consts$alpha <- as.numeric(ap$alpha)[1]
          if (is.null(consts$linewidth) && !is.null(ap$linewidth)) consts$linewidth <- as.numeric(ap$linewidth)[1]
          if (is.null(consts$linetype) && !is.null(ap$linetype)) consts$linetype <- as.character(ap$linetype)[1]
        }
      }
      lab_title <- b$plot$labels$title
      lab_x <- b$plot$labels$x
      lab_y <- b$plot$labels$y
      list(
        ok = TRUE,
        kind = "ggplot",
        scales = scales,
        legendPosition = as.character(lp)[1],
        textSize = as.numeric(tsz)[1],
        bg = if (is.null(plot_bg) || is.na(plot_bg)) "" else as.character(plot_bg)[1],
        constants = consts,
        labels = list(
          title = if (is.null(lab_title)) "" else paste(as.character(lab_title), collapse = " "),
          x = if (is.null(lab_x)) "" else paste(as.character(lab_x), collapse = " "),
          y = if (is.null(lab_y)) "" else paste(as.character(lab_y), collapse = " ")
        )
      )
    }
  }
}, error = function(e) list(ok = FALSE, kind = "none", message = e$message))
`;
