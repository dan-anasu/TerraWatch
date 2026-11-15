import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineRepository } from '../src/baselineRepository.js';

function createStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

const baseline = (areaId, areaName) => ({
  areaId,
  areaName,
  startDate: '2025-07-01',
  endDate: '2025-07-31',
  parameterId: 'drought_index:idx',
  aggregation: 'mean',
  statistics: { totalObservations: 31, validObservations: 31, missingObservations: 0 },
  observations: [{ date: '2025-07-01T00:00:00Z', value: 0 }],
});

test('persists and retrieves a baseline associated with its AOI', async () => {
  globalThis.window = { localStorage: createStorage() };
  const saved = await baselineRepository.save(baseline('area-zamfara', 'Zamfara'));
  assert.ok(saved.id);
  assert.ok(Number.isFinite(Date.parse(saved.createdAt)));
  assert.equal(saved.areaId, 'area-zamfara');
  assert.deepEqual(await baselineRepository.getByAreaId('area-zamfara'), saved);
  assert.equal(await baselineRepository.getByAreaId('area-other'), null);
  assert.deepEqual(await baselineRepository.list(), [saved]);
});

test('prevents silent replacement and replaces only when explicitly authorized', async () => {
  globalThis.window = { localStorage: createStorage() };
  const original = await baselineRepository.save(baseline('area-zamfara', 'Zamfara'));
  await assert.rejects(baselineRepository.save(baseline('area-zamfara', 'Zamfara')), /already exists/);
  const replacementInput = { ...baseline('area-zamfara', 'Zamfara'), startDate: '2024-07-01', endDate: '2025-06-30' };
  const replacement = await baselineRepository.save(replacementInput, { replace: true });
  assert.notEqual(replacement.id, original.id);
  assert.equal(replacement.areaId, 'area-zamfara');
  assert.equal(replacement.startDate, '2024-07-01');
  assert.deepEqual(await baselineRepository.list(), [replacement]);
});

test('does not mix records across AOI identifiers', async () => {
  globalThis.window = { localStorage: createStorage() };
  await baselineRepository.save(baseline('area-zamfara', 'Zamfara'));
  await baselineRepository.save(baseline('area-kaduna', 'Kaduna'));
  assert.equal((await baselineRepository.getByAreaId('area-zamfara')).areaName, 'Zamfara');
  assert.equal((await baselineRepository.getByAreaId('area-kaduna')).areaName, 'Kaduna');
  assert.equal((await baselineRepository.list()).length, 2);
});

test('reports damaged baseline storage', async () => {
  globalThis.window = { localStorage: { getItem: () => 'not-json', setItem() {} } };
  await assert.rejects(baselineRepository.list(), /Saved baselines could not be read/);
});
