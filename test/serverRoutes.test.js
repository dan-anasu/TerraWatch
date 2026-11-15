import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createTerraWatchServer } from '../server.js';
import { getDroughtIndexObservations } from '../server/meteomaticsService.js';

const geometry = { type: 'Polygon', coordinates: [[[3, 6], [3.1, 6], [3.1, 6.1], [3, 6.1], [3, 6]]] };
const env = { METEOMATICS_USERNAME: 'test-user', METEOMATICS_PASSWORD: 'test-password', METEOMATICS_BASE_URL: 'https://api.meteomatics.com' };
const validInput = { geometry, startDate: '2020-01-01', endDate: '2020-01-03' };

async function request(server, { method = 'POST', url = '/api/meteomatics/observations', body = validInput, contentType = 'application/json' } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))];
  const incoming = Readable.from(chunks);
  incoming.method = method;
  incoming.url = url;
  incoming.headers = contentType ? { 'content-type': contentType } : {};
  return new Promise((resolve) => {
    const outgoing = {
      headersSent: false,
      writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; this.headersSent = true; },
      end(bodyText = '') { resolve({ status: this.statusCode, headers: this.headers, body: String(bodyText) }); },
    };
    server.emit('request', incoming, outgoing);
  });
}

test('POST observations route parses JSON and reaches the Meteomatics service', async () => {
  let providerCalled = false;
  const server = createTerraWatchServer({
    observationsService: async (input) => {
      providerCalled = true;
      return getDroughtIndexObservations(input, {
        env,
        fetchImpl: async (url) => {
          assert.match(url.href, /drought_index:idx\/6,3_6,3.1_6.1,3.1_6.1,3:mean\/json$/);
          return { ok: true, json: async () => ({ status: 'OK', data: [{ parameter: 'drought_index:idx', coordinates: [{ dates: [{ date: '2020-01-01T00:00:00Z', value: 0.42 }] }] }] }) };
        },
      });
    },
  });
  const response = await request(server);
  assert.equal(providerCalled, true);
  assert.equal(response.status, 200);
  assert.match(response.headers['Content-Type'], /application\/json/);
  assert.deepEqual(JSON.parse(response.body).observations, [{ date: '2020-01-01T00:00:00Z', value: 0.42 }]);
});

test('latest-baseline mode uses the baseline observation service on the existing endpoint', async () => {
  let baselineServiceCalled = false;
  const server = createTerraWatchServer({
    observationsService: async () => assert.fail('regular observations service should not run'),
    baselineObservationsService: async (input) => {
      baselineServiceCalled = true;
      assert.deepEqual(input.geometry, geometry);
      return { provider: 'Meteomatics', parameter: 'drought_index:idx', interval: 'P1D', aggregation: 'mean', window: { startDate: '2024-01-01', endDate: '2024-12-30' }, observations: [{ date: '2024-01-01T00:00:00Z', value: 0 }] };
    },
  });
  const response = await request(server, { body: { geometry, mode: 'latest-baseline' } });
  assert.equal(response.status, 200);
  assert.equal(baselineServiceCalled, true);
  assert.equal(JSON.parse(response.body).window.endDate, '2024-12-30');
});

test('POST observations route returns JSON errors for invalid geometry and dates', async () => {
  let providerFetchCalled = false;
  const server = createTerraWatchServer({
    observationsService: (input) => getDroughtIndexObservations(input, {
      env,
      fetchImpl: async () => { providerFetchCalled = true; throw new Error('must not fetch invalid input'); },
    }),
  });
  const geometryResponse = await request(server, { body: { ...validInput, geometry: { ...geometry, coordinates: [[[3, 6], [3.1, 6], [3.1, 6.1], [3, 6.1]]] } } });
  const dateResponse = await request(server, { body: { ...validInput, startDate: '2024-02-30' } });
  assert.equal(geometryResponse.status, 400);
  assert.equal(JSON.parse(geometryResponse.body).error.code, 'invalid_geometry');
  assert.equal(dateResponse.status, 400);
  assert.equal(JSON.parse(dateResponse.body).error.code, 'invalid_dates');
  assert.equal(providerFetchCalled, false);
});

test('unsupported observation methods return a clear JSON 405 with Allow header', async () => {
  let serviceCalled = false;
  const server = createTerraWatchServer({ observationsService: async () => { serviceCalled = true; } });
  const response = await request(server, { method: 'GET', body: undefined });
  assert.equal(response.status, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.equal(JSON.parse(response.body).error.code, 'method_not_allowed');
  assert.equal(serviceCalled, false);
});

test('malformed or non-JSON POST bodies return JSON 400 errors', async () => {
  const server = createTerraWatchServer();
  const malformed = await request(server, { body: '{broken' });
  const wrongType = await request(server, { contentType: 'text/plain' });
  assert.equal(malformed.status, 400);
  assert.equal(JSON.parse(malformed.body).error.code, 'invalid_request');
  assert.equal(wrongType.status, 400);
  assert.equal(JSON.parse(wrongType.body).error.code, 'invalid_request');
});

test('baseline browser modules are served by the application allowlist', async () => {
  const server = createTerraWatchServer();
  for (const [url, expectedExport] of [
    ['/src/baselineStatistics.js', 'calculateBaselineStatistics'],
    ['/src/baselineRepository.js', 'baselineRepository'],
  ]) {
    const response = await request(server, { method: 'GET', url, body: undefined });
    assert.equal(response.status, 200);
    assert.match(response.headers['Content-Type'], /javascript/);
    assert.match(response.body, new RegExp(`export .*${expectedExport}`));
  }
});
