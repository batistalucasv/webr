import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function check(rel) {
  const r = spawnSync(process.execPath, ['--check', join(root, rel)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
}

test('config/webr-session.js parses (webrSession must load)', () => {
  check('config/webr-session.js');
});

test('dist/config/webr-session.js parses', () => {
  check('dist/config/webr-session.js');
});

test('webr-session.js keeps one exportPdfReport closer and exposes the API', () => {
  const src = readFileSync(join(root, 'config/webr-session.js'), 'utf8');
  const duplicateCatch = (src.match(/Falha ao gerar PDF/g) || []).length;
  assert.equal(duplicateCatch, 1, 'duplicate catch/finally leftover from PDF merge would kill webrSession');
  assert.match(src, /initMultiTabs:\s*initMultiTabs/);
  assert.match(src, /exportPdfReport:\s*exportPdfReport/);
});
