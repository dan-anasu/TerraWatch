import test from 'node:test';
import assert from 'node:assert/strict';
import { createSquareGeoJSON, sphericalAreaSquareMetres } from '../src/geometry.js';

function unproject(point) {
  return { lng: point.x, lat: point.y };
}

function signedArea(ring) {
  return ring.slice(0, -1).reduce((sum, point, index) => {
    const next = ring[index + 1];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

test('creates a closed GeoJSON square from a center and a corner', () => {
  const feature = createSquareGeoJSON({ lat: 0, lng: 0 }, { x: 0, y: 0 }, { x: 40, y: 25 }, unproject);
  assert.equal(feature.geometry.type, 'Polygon');
  const ring = feature.geometry.coordinates[0];
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.slice(0, -1).every(([longitude, latitude]) => Math.abs(longitude) <= 40 && Math.abs(latitude) <= 40));
  const edges = ring.slice(0, -1).map((point, index) => {
    const next = ring[index + 1];
    return Math.hypot(next[0] - point[0], next[1] - point[1]);
  });
  assert.ok(edges.every((edge) => Math.abs(edge - 80) < 1e-9));
  assert.ok(signedArea(ring) > 0, 'exterior ring should be counter-clockwise');
});

test('normalizes ring orientation when projected map y increases southward', () => {
  const southwardUnproject = (point) => ({ lng: point.x, lat: -point.y });
  const feature = createSquareGeoJSON({ lat: 0, lng: 0 }, { x: 0, y: 0 }, { x: 12, y: 16 }, southwardUnproject);
  const ring = feature.geometry.coordinates[0];
  assert.ok(signedArea(ring) > 0);
  assert.deepEqual(ring[0], ring.at(-1));
});

test('rejects a near-zero square and returns a positive spherical area estimate', () => {
  assert.equal(createSquareGeoJSON({ lat: 0, lng: 0 }, { x: 0, y: 0 }, { x: 5, y: 4 }, unproject), null);
  const metresToDegrees = (point) => ({ lng: point.x * 0.0001, lat: point.y * 0.0001 });
  const square = createSquareGeoJSON({ lat: 0, lng: 0 }, { x: 0, y: 0 }, { x: 10, y: 10 }, metresToDegrees);
  const area = sphericalAreaSquareMetres(square.geometry.coordinates[0]);
  assert.ok(area > 0);
  assert.ok(area < 1_000_000);
});
