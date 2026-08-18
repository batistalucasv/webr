import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { rScalar, unpackWebRJs } from '../config/webr-unpack.js';

function namedList(names, values) {
  return { type: 'list', names, values };
}

function logical(value) {
  return { type: 'logical', names: null, values: [value] };
}

function character(value) {
  return { type: 'character', names: null, values: [value] };
}

function integer(value) {
  return { type: 'integer', names: null, values: [value] };
}

function doubles(values) {
  return { type: 'double', names: null, values };
}

function samplePayload() {
  return namedList(
    ['ok', 'name', 'nrow', 'ncol', 'loaded_rows', 'columns', 'cols_data'],
    [
      logical(true),
      character('mtcars'),
      integer(32),
      integer(2),
      integer(2),
      {
        type: 'list',
        names: null,
        values: [
          namedList(
            ['name', 'type', 'nas'],
            [character('mpg'), character('numeric'), integer(0)]
          ),
          namedList(
            ['name', 'type', 'nas'],
            [character('cyl'), character('numeric'), integer(0)]
          )
        ]
      },
      namedList(
        ['mpg', 'cyl'],
        [doubles([21, 22.8]), doubles([6, 4])]
      )
    ]
  );
}

test('unpackWebRJs keeps names from webR toJs() trees so ok is readable', () => {
  const v = unpackWebRJs(samplePayload());
  assert.equal(typeof v, 'object');
  assert.ok(!Array.isArray(v), 'named lists must become objects, not value arrays');
  assert.equal(rScalar(v.ok), true);
  assert.equal(rScalar(v.name), 'mtcars');
  assert.equal(rScalar(v.nrow), 32);
});

test('unpackWebRJs preserves column vectors and column metadata', () => {
  const v = unpackWebRJs(samplePayload());
  assert.ok(Array.isArray(v.columns));
  assert.equal(rScalar(v.columns[0].name), 'mpg');
  assert.deepEqual(v.cols_data.mpg, [21, 22.8]);
  assert.deepEqual(v.cols_data.cyl, [6, 4]);
});

test('unpackWebRJs keeps a 1-row column as an array', () => {
  const v = unpackWebRJs(
    namedList(
      ['ok', 'cols_data'],
      [
        logical(true),
        namedList(['mpg'], [doubles([21])])
      ]
    )
  );
  assert.deepEqual(v.cols_data.mpg, [21]);
});

test('failed R payload exposes message via rScalar', () => {
  const v = unpackWebRJs(
    namedList(
      ['ok', 'message'],
      [logical(false), character('DataFrame nao encontrado')]
    )
  );
  assert.equal(rScalar(v.ok), false);
  assert.equal(rScalar(v.message), 'DataFrame nao encontrado');
});
