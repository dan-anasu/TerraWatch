import test from 'node:test';
import assert from 'node:assert/strict';
import { areaRepository } from '../src/areaRepository.js';

function createStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

const sampleArea = {
  name: 'Test forest',
  description: 'North ridge',
  areaType: 'Forest',
  geometry: { type: 'Polygon', coordinates: [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]] },
  areaHectares: 12.5,
  areaSquareKilometres: 0.125,
};

test('creates required metadata and keeps areas readable from persistent storage', async () => {
  globalThis.window = { localStorage: createStorage() };
  const created = await areaRepository.create(sampleArea);
  const afterReload = await areaRepository.list();

  assert.ok(created.id);
  assert.equal(created.name, sampleArea.name);
  assert.equal(created.description, sampleArea.description);
  assert.equal(created.areaType, 'Forest');
  assert.deepEqual(created.geometry, sampleArea.geometry);
  assert.equal(created.areaHectares, 12.5);
  assert.equal(created.areaSquareKilometres, 0.125);
  assert.ok(Number.isFinite(Date.parse(created.registrationTimestamp)));
  assert.deepEqual(afterReload, [created]);
});

test('deletes a persisted area and reports when an area no longer exists', async () => {
  globalThis.window = { localStorage: createStorage() };
  const created = await areaRepository.create(sampleArea);
  assert.deepEqual(await areaRepository.delete(created.id), []);
  await assert.rejects(areaRepository.delete(created.id), /no longer in the registered areas list/);
});

test('reports browser storage errors instead of silently dropping area records', async () => {
  globalThis.window = { localStorage: { getItem() { throw new Error('blocked'); } } };
  await assert.rejects(areaRepository.list(), /Browser storage is unavailable/);
});
