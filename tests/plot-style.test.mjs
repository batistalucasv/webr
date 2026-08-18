import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  STYLE_BEGIN,
  STYLE_END,
  rString,
  rNamedVector,
  toPickerHex,
  stripStyleBlock,
  generateGgplotAddon,
  spliceGgplotStyle,
  detectPlotKind,
  extractEqualsCall,
  patchEqualsCall,
  patchLegendPosition,
  patchParCex,
  inspectBaseFromSource,
  applyPlotStyle,
  patchGgplotGeomArgs,
  patchOrInsertPlotArg,
  normalizeGgplotInspect
} from '../config/webr-plot-style.js';

test('rString quotes and escapes R strings', () => {
  assert.equal(rString('right'), '"right"');
  assert.equal(rString('say "hi"'), '"say \\"hi\\""');
});

test('rNamedVector builds c() with names', () => {
  assert.equal(
    rNamedVector({ setosa: '#276DC3', versicolor: '#2ea043' }),
    'c(setosa = "#276DC3", versicolor = "#2ea043")'
  );
  assert.equal(
    rNamedVector({ setosa: 16, versicolor: 17 }, { numeric: true }),
    'c(setosa = 16, versicolor = 17)'
  );
});

test('toPickerHex expands 3-digit hex and maps common R names', () => {
  assert.equal(toPickerHex('#276DC3'), '#276DC3');
  assert.equal(toPickerHex('#f00'), '#FF0000');
  assert.equal(toPickerHex('black'), '#000000');
});

test('generateGgplotAddon emits manual scales and theme', () => {
  const r = generateGgplotAddon({
    legendPosition: 'bottom',
    textSize: 14,
    scales: [
      { aes: 'colour', levels: ['setosa', 'versicolor'], values: ['#111111', '#222222'] },
      { aes: 'shape', levels: ['setosa', 'versicolor'], values: [16, 17] }
    ]
  });
  assert.match(r, /scale_colour_manual\(values = c\(setosa = "#111111", versicolor = "#222222"\)\)/);
  assert.match(r, /scale_shape_manual\(values = c\(setosa = 16, versicolor = 17\)\)/);
  assert.match(r, /theme\(legend\.position = "bottom", text = element_text\(size = 14\)\)/);
  assert.match(r, /\+\n/);
});

test('spliceGgplotStyle appends addon to the last ggplot chain', () => {
  const src = `library(ggplot2)
ggplot(iris, aes(x = Sepal.Length, y = Petal.Length, color = Species)) +
  geom_point(size = 3)
summary(iris)
`;
  const out = spliceGgplotStyle(src, 'theme(legend.position = "right")');
  assert.match(out, /geom_point\(size = 3\) \+\n/);
  assert.ok(out.includes(STYLE_BEGIN));
  assert.ok(out.includes(STYLE_END));
  assert.match(out, /theme\(legend\.position = "right"\)/);
  assert.ok(out.indexOf('summary(iris)') > out.indexOf(STYLE_END));
});

test('spliceGgplotStyle replaces an existing style block', () => {
  const once = spliceGgplotStyle(
    'ggplot(iris, aes(x, y)) + geom_point()\n',
    'theme(legend.position = "left")'
  );
  const twice = spliceGgplotStyle(once, 'theme(legend.position = "top")');
  assert.equal(twice.split(STYLE_BEGIN).length - 1, 1);
  assert.match(twice, /legend\.position = "top"/);
  assert.doesNotMatch(twice, /legend\.position = "left"/);
});

test('stripStyleBlock removes the managed markers', () => {
  const src = spliceGgplotStyle('ggplot(df, aes(x, y)) + geom_point()\n', 'theme()');
  const stripped = stripStyleBlock(src);
  assert.equal(stripped.includes(STYLE_BEGIN), false);
  assert.match(stripped, /geom_point\(\)/);
});

test('detectPlotKind prefers ggplot over base when both appear', () => {
  assert.equal(detectPlotKind('ggplot(iris, aes(x, y)) + geom_point()'), 'ggplot');
  assert.equal(detectPlotKind('plot(iris$Sepal.Length, iris$Petal.Length)'), 'base');
  assert.equal(detectPlotKind('hist(iris$Sepal.Length, col = "steelblue")'), 'base');
  assert.equal(detectPlotKind('mean(1:10)'), 'none');
});

test('extractEqualsCall reads last col = c(...) vector', () => {
  const src = `hist(x, col = "#111111")
boxplot(y ~ g, col = c("#388bfd", "#2ea043", "#8957e5"))
`;
  const got = extractEqualsCall(src, 'col');
  assert.equal(got.kind, 'vector');
  assert.deepEqual(got.values, ['#388bfd', '#2ea043', '#8957e5']);
});

test('patchEqualsCall replaces the last col = c(...)', () => {
  const src = 'boxplot(y ~ g, col = c("#aaa", "#bbb"))\n';
  const out = patchEqualsCall(src, 'col', { kind: 'vector', values: ['#111111', '#222222'] });
  assert.match(out, /col = c\("#111111", "#222222"\)/);
  assert.doesNotMatch(out, /#aaa/);
});

test('patchLegendPosition updates legend("topleft"', () => {
  const src = 'legend("topleft", legend = levels(iris$Species), pch = 19)\n';
  const out = patchLegendPosition(src, 'bottomright');
  assert.match(out, /legend\("bottomright"/);
});

test('patchParCex adds cex into existing par()', () => {
  const src = 'par(mfrow = c(2, 2))\nplot(1:10)\n';
  const out = patchParCex(src, 1.25);
  assert.match(out, /par\(mfrow = c\(2, 2\), cex = 1\.25/);
});

test('inspectBaseFromSource finds colors, pch and legend', () => {
  const src = `plot(x, y, col = c("#276DC3", "#2ea043"), pch = 19)
legend("topleft", legend = c("a", "b"), col = c("#276DC3", "#2ea043"), pch = 19)
`;
  const info = inspectBaseFromSource(src);
  assert.equal(info.kind, 'base');
  assert.deepEqual(info.colors, ['#276DC3', '#2ea043']);
  assert.equal(info.pch, 19);
  assert.equal(info.legendPosition, 'topleft');
});

test('applyPlotStyle writes ggplot scales into the script', () => {
  const src = `ggplot(iris, aes(x = Sepal.Length, y = Petal.Length, color = Species)) +
  geom_point()
`;
  const out = applyPlotStyle(src, {
    kind: 'ggplot',
    legendPosition: 'bottom',
    textSize: 12,
    scales: [
      { aes: 'colour', levels: ['setosa', 'versicolor', 'virginica'], values: ['#AA0000', '#00AA00', '#0000AA'] }
    ]
  });
  assert.match(out, /scale_colour_manual/);
  assert.match(out, /setosa = "#AA0000"/);
  assert.match(out, /legend\.position = "bottom"/);
});

test('applyPlotStyle patches base R col, pch and legend', () => {
  const src = `plot(x, y, col = c("#111", "#222"), pch = 1)
legend("topleft", legend = c("a", "b"), pch = 1)
`;
  const out = applyPlotStyle(src, {
    kind: 'base',
    colors: ['#FF0000', '#00FF00'],
    pch: 16,
    legendPosition: 'bottom',
    textSize: 15
  });
  assert.match(out, /col = c\("#FF0000", "#00FF00"\)/);
  assert.match(out, /pch = 16/);
  assert.match(out, /legend\("bottom"/);
  assert.match(out, /cex = 1\.25/);
});

test('generateGgplotAddon emits labs for title and axes', () => {
  const r = generateGgplotAddon({
    legendPosition: 'right',
    textSize: 12,
    title: 'Iris',
    xlab: 'Sepal',
    ylab: 'Petal'
  });
  assert.match(r, /labs\(title = "Iris", x = "Sepal", y = "Petal"\)/);
});

test('patchGgplotGeomArgs replaces size and alpha on geom_point', () => {
  const src = 'ggplot(iris, aes(x, y)) + geom_point(size = 3, alpha = 0.8)\n';
  const out = patchGgplotGeomArgs(src, { size: 5, alpha: 0.4 });
  assert.match(out, /size = 5/);
  assert.match(out, /alpha = 0\.4/);
  assert.doesNotMatch(out, /size = 3/);
});

test('patchGgplotGeomArgs inserts size into empty geom_point()', () => {
  const src = 'ggplot(iris, aes(x, y)) + geom_point()\n';
  const out = patchGgplotGeomArgs(src, { size: 4 });
  assert.match(out, /geom_point\(size = 4\)/);
});

test('patchGgplotGeomArgs sets linewidth and linetype on geom_line', () => {
  const src = 'ggplot(df, aes(x, y)) + geom_line()\n';
  const out = patchGgplotGeomArgs(src, { linewidth: 1.5, linetype: 'dashed' });
  assert.match(out, /linewidth = 1\.5/);
  assert.match(out, /linetype = "dashed"/);
});

test('inspectBaseFromSource finds titles, lwd, lty and point cex', () => {
  const src = 'plot(x, y, main = "Título", xlab = "X", ylab = "Y", lwd = 2, lty = 2, cex = 1.5)\n';
  const info = inspectBaseFromSource(src);
  assert.equal(info.title, 'Título');
  assert.equal(info.xlab, 'X');
  assert.equal(info.ylab, 'Y');
  assert.equal(info.lwd, 2);
  assert.equal(info.lty, '2');
  assert.equal(info.pointSize, 1.5);
});

test('patchOrInsertPlotArg inserts xlab when missing', () => {
  const src = 'plot(x, y, main = "A")\n';
  const out = patchOrInsertPlotArg(src, 'xlab', { kind: 'scalar', values: ['Eixo X'] });
  assert.match(out, /main = "A"/);
  assert.match(out, /xlab = "Eixo X"/);
});

test('applyPlotStyle ggplot writes labs and geom size/alpha', () => {
  const src = `ggplot(iris, aes(x, y, color = Species)) +
  geom_point(size = 3) +
  geom_smooth(method = "lm", se = FALSE)
`;
  const out = applyPlotStyle(src, {
    kind: 'ggplot',
    title: 'Novo',
    xlab: 'X',
    ylab: 'Y',
    pointSize: 5,
    alpha: 0.5,
    linewidth: 1.2,
    linetype: 'dashed',
    legendPosition: 'right',
    textSize: 12,
    scales: []
  });
  assert.match(out, /labs\(title = "Novo", x = "X", y = "Y"\)/);
  assert.match(out, /size = 5/);
  assert.match(out, /alpha = 0\.5/);
  assert.match(out, /linewidth = 1\.2/);
  assert.match(out, /linetype = "dashed"/);
});

test('applyPlotStyle base patches titles, lwd, lty and point size', () => {
  const src = 'plot(x, y, main = "A", lwd = 1)\n';
  const out = applyPlotStyle(src, {
    kind: 'base',
    title: 'B',
    xlab: 'Eixo X',
    ylab: 'Eixo Y',
    lwd: 3,
    lty: 2,
    pointSize: 2
  });
  assert.match(out, /main = "B"/);
  assert.match(out, /xlab = "Eixo X"/);
  assert.match(out, /ylab = "Eixo Y"/);
  assert.match(out, /lwd = 3/);
  assert.match(out, /lty = 2/);
  assert.match(out, /cex = 2/);
});

test('normalizeGgplotInspect copies labels and geom constants', () => {
  const n = normalizeGgplotInspect({
    kind: 'ggplot',
    scales: [],
    legendPosition: 'right',
    textSize: 11,
    labels: { title: 'T', x: 'X', y: 'Y' },
    constants: { size: 3, alpha: 0.8, linewidth: 1, linetype: 'solid' }
  });
  assert.equal(n.title, 'T');
  assert.equal(n.xlab, 'X');
  assert.equal(n.ylab, 'Y');
  assert.equal(n.pointSize, 3);
  assert.equal(n.alpha, 0.8);
  assert.equal(n.linewidth, 1);
  assert.equal(n.linetype, 'solid');
});
