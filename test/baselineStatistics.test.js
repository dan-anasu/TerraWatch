import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaselineStatistics, getExpectedDailyDates } from '../src/baselineStatistics.js';

test('calculates daily totals, valid and missing counts, extrema, median and category percentages', () => {
  const observations = [
    { date: '2025-07-01T00:00:00Z', value: -1 },
    { date: '2025-07-02T00:00:00Z', value: 0 },
    { date: '2025-07-03T00:00:00Z', value: null },
    { date: '2025-07-05T00:00:00Z', value: 1 },
  ];
  const original = structuredClone(observations);
  const statistics = calculateBaselineStatistics({ startDate: '2025-07-01', endDate: '2025-07-05', observations });

  assert.equal(statistics.totalObservations, 5);
  assert.equal(statistics.receivedObservations, 4);
  assert.equal(statistics.validObservations, 3);
  assert.equal(statistics.missingObservations, 2);
  assert.equal(statistics.minimum, -1);
  assert.equal(statistics.maximum, 1);
  assert.equal(statistics.median, 0);
  assert.equal(statistics.isComplete, false);
  assert.deepEqual(statistics.categoryDistribution.map(({ category, count }) => ({ category, count })), [
    { category: -1, count: 1 },
    { category: 0, count: 1 },
    { category: 1, count: 1 },
  ]);
  assert.ok(statistics.categoryDistribution.every(({ percentage }) => Math.abs(percentage - 100 / 3) < 1e-12));
  assert.deepEqual(observations, original, 'calculation must not mutate provider data');
});

test('counts an observed zero as valid and labels a short period provisional', () => {
  const statistics = calculateBaselineStatistics({
    startDate: '2025-07-01',
    endDate: '2025-07-01',
    observations: [{ date: '2025-07-01T00:00:00Z', value: 0 }],
  });
  assert.equal(statistics.validObservations, 1);
  assert.equal(statistics.missingObservations, 0);
  assert.deepEqual(statistics.categoryDistribution, [{ category: 0, count: 1, percentage: 100 }]);
  assert.equal(statistics.provisional, true);
});

test('reports an observed category as the median for an even number of categorical values', () => {
  const statistics = calculateBaselineStatistics({
    startDate: '2025-07-01',
    endDate: '2025-07-02',
    observations: [
      { date: '2025-07-01T00:00:00Z', value: -1 },
      { date: '2025-07-02T00:00:00Z', value: 0 },
    ],
  });
  assert.equal(statistics.median, -1);
});

test('rejects invalid date ranges, empty valid data, duplicate days and malformed values', () => {
  assert.throws(() => getExpectedDailyDates('2025-02-30', '2025-03-01'), /valid start and end dates/);
  assert.throws(() => getExpectedDailyDates('2025-07-02', '2025-07-01'), /start date on or before end date/);
  assert.throws(() => calculateBaselineStatistics({ startDate: '2025-07-01', endDate: '2025-07-02', observations: [] }), /No valid observations/);
  assert.throws(() => calculateBaselineStatistics({ startDate: '2025-07-01', endDate: '2025-07-01', observations: [{ date: '2025-07-01T00:00:00Z', value: null }] }), /No valid observations/);
  assert.throws(() => calculateBaselineStatistics({ startDate: '2025-07-01', endDate: '2025-07-01', observations: [{ date: '2025-07-01T00:00:00Z', value: 1 }, { date: '2025-07-01T12:00:00Z', value: 1 }] }), /more than one daily observation/);
  assert.throws(() => calculateBaselineStatistics({ startDate: '2025-07-01', endDate: '2025-07-01', observations: [{ date: '2025-07-01T00:00:00Z', value: '0' }] }), /invalid value/);
});

test('returns the expected inclusive daily dates and rejects ranges over the API limit', () => {
  assert.deepEqual(getExpectedDailyDates('2025-07-01', '2025-07-03'), ['2025-07-01', '2025-07-02', '2025-07-03']);
  assert.throws(() => getExpectedDailyDates('2010-01-01', '2021-01-01'), /10 years or less/);
});
