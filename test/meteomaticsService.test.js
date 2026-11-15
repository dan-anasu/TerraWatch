import test from 'node:test';
import assert from 'node:assert/strict';
import { getDroughtIndexObservations, getLatestDroughtIndexBaselineObservations, MeteomaticsServiceError, polygonToMeteomaticsLocation } from '../server/meteomaticsService.js';

const geometry = {
  type: 'Polygon',
  coordinates: [[[3, 6], [3.1, 6], [3.1, 6.1], [3, 6.1], [3, 6]]],
};
const env = {
  METEOMATICS_USERNAME: 'test-user',
  METEOMATICS_PASSWORD: 'test-password',
  METEOMATICS_BASE_URL: 'https://api.meteomatics.com',
};

test('converts closed GeoJSON longitude/latitude ring to Meteomatics latitude/longitude vertices', () => {
  assert.equal(polygonToMeteomaticsLocation(geometry), '6,3_6,3.1_6.1,3.1_6.1,3');
});

test('rejects unclosed and invalid WGS84 polygons before network calls', async () => {
  assert.throws(() => polygonToMeteomaticsLocation({ ...geometry, coordinates: [[[3, 6], [4, 6], [4, 7], [3, 7]]] }), MeteomaticsServiceError);
  assert.throws(() => polygonToMeteomaticsLocation({ ...geometry, coordinates: [[[181, 6], [3.1, 6], [3.1, 6.1], [181, 6]]] }), MeteomaticsServiceError);
  await assert.rejects(getDroughtIndexObservations({ geometry: { ...geometry, coordinates: [[[3, 6], [4, 6], [4, 7], [3, 7]]] }, startDate: '2020-01-01', endDate: '2020-01-02' }, { env, fetchImpl: () => assert.fail('should not fetch invalid geometry') }), { code: 'invalid_geometry' });
});

test('requests fixed daily polygon mean and returns provider observations unchanged', async () => {
  let requestedUrl; let authorization;
  const providerData = [
    { date: '2020-01-01T00:00:00Z', value: 0.37 },
    { date: '2020-01-02T00:00:00Z', value: null },
  ];
  const result = await getDroughtIndexObservations({ geometry, startDate: '2020-01-01', endDate: '2020-01-02' }, {
    env,
    fetchImpl: async (url, options) => {
      requestedUrl = url.href;
      authorization = options.headers.Authorization;
      return { ok: true, json: async () => ({ status: 'OK', data: [{ parameter: 'drought_index:idx', coordinates: [{ dates: providerData }] }] }) };
    },
  });
  assert.match(requestedUrl, /2020-01-01T00:00:00Z--2020-01-02T00:00:00Z:P1D\/drought_index:idx\/6,3_6,3.1_6.1,3.1_6.1,3:mean\/json$/);
  assert.equal(authorization, `Basic ${Buffer.from('test-user:test-password').toString('base64')}`);
  assert.deepEqual(result.observations, providerData);
  assert.equal(result.parameter, 'drought_index:idx');
});

test('validates calendar dates and rejects oversized ranges', async () => {
  const fetchImpl = () => assert.fail('should not fetch invalid dates');
  await assert.rejects(getDroughtIndexObservations({ geometry, startDate: '2023-02-30', endDate: '2023-03-01' }, { env, fetchImpl }), { code: 'invalid_dates' });
  await assert.rejects(getDroughtIndexObservations({ geometry, startDate: '2010-01-01', endDate: '2021-01-01' }, { env, fetchImpl }), { code: 'date_range_too_large' });
});

function providerResponse(observations) {
  return { ok: true, json: async () => ({ status: 'OK', data: [{ parameter: 'drought_index:idx', coordinates: [{ dates: observations }] }] }) };
}

test('discovers latest valid provider date and requests the trailing 365-day window', async () => {
  const requested = [];
  const latest = '2025-12-10';
  let call = 0;
  const result = await getLatestDroughtIndexBaselineObservations({ geometry }, {
    env,
    now: new Date('2025-12-31T18:00:00Z'),
    fetchImpl: async (url) => {
      requested.push(url.href);
      call += 1;
      if (call === 1) return providerResponse([
        { date: '2025-12-09T00:00:00Z', value: 0 },
        { date: `${latest}T00:00:00Z`, value: 1 },
        { date: '2025-12-11T00:00:00Z', value: null },
      ]);
      const dates = Array.from({ length: 365 }, (_, index) => {
        const date = new Date(Date.parse('2024-12-11T00:00:00Z') + index * 86_400_000).toISOString().slice(0, 10);
        return { date: `${date}T00:00:00Z`, value: index === 364 ? 0 : index % 2 ? 1 : -1 };
      });
      return providerResponse(dates);
    },
  });
  assert.equal(requested.length, 2);
  assert.match(requested[0], /2025-10-02T00:00:00Z--2025-12-30T00:00:00Z:P1D/);
  assert.match(requested[1], /2024-12-11T00:00:00Z--2025-12-10T00:00:00Z:P1D/);
  assert.equal(result.window.latestObservationDate, latest);
  assert.equal(result.window.days, 365);
  assert.equal(result.observations.at(-1).value, 0);
});

test('refuses baseline generation when the availability probe has no valid values', async () => {
  let calls = 0;
  await assert.rejects(getLatestDroughtIndexBaselineObservations({ geometry }, {
    env,
    now: new Date('2025-12-31T00:00:00Z'),
    fetchImpl: async () => { calls += 1; return providerResponse([{ date: '2025-12-30T00:00:00Z', value: null }]); },
  }), { code: 'insufficient_baseline_data', httpStatus: 422 });
  assert.equal(calls, 1);
});

test('preserves zero as valid but rejects an annual window below the 300-observation threshold', async () => {
  let calls = 0;
  await assert.rejects(getLatestDroughtIndexBaselineObservations({ geometry }, {
    env,
    now: new Date('2025-12-31T00:00:00Z'),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return providerResponse([{ date: '2025-12-30T00:00:00Z', value: 0 }]);
      return providerResponse(Array.from({ length: 299 }, (_, index) => ({
        date: new Date(Date.parse('2025-12-30T00:00:00Z') - (298 - index) * 86_400_000).toISOString(), value: index === 0 ? 0 : 1,
      })));
    },
  }), { code: 'insufficient_baseline_data', httpStatus: 422 });
  assert.equal(calls, 2);
});

test('rejects malformed provider observation dates with a structured service error', async () => {
  await assert.rejects(getDroughtIndexObservations({ geometry, startDate: '2025-01-01', endDate: '2025-01-01' }, {
    env,
    fetchImpl: async () => providerResponse([{ date: 'not-a-date', value: 0 }]),
  }), { code: 'invalid_provider_response', httpStatus: 502 });
});
