const EARTH_RADIUS_METRES = 6_371_008.8;

/** Construct a square in projected map pixels, then return a closed WGS84 GeoJSON feature. */
export function createSquareGeoJSON(center, centerPoint, cornerPoint, unproject) {
  const halfSide = Math.max(Math.abs(cornerPoint.x - centerPoint.x), Math.abs(cornerPoint.y - centerPoint.y));
  if (halfSide < 8) return null;

  const projectedCorners = [
    { x: centerPoint.x - halfSide, y: centerPoint.y - halfSide },
    { x: centerPoint.x + halfSide, y: centerPoint.y - halfSide },
    { x: centerPoint.x + halfSide, y: centerPoint.y + halfSide },
    { x: centerPoint.x - halfSide, y: centerPoint.y + halfSide },
  ];
  let ring = projectedCorners.map((point) => {
    const latLng = unproject(point);
    return [Number(latLng.lng.toFixed(7)), Number(latLng.lat.toFixed(7))];
  });

  // GeoJSON exterior rings use counter-clockwise order. Normalize after projection
  // because Leaflet's screen y-axis points south.
  const signedArea = ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (signedArea < 0) ring = ring.reverse();
  ring.push([...ring[0]]);

  return {
    type: 'Feature',
    properties: { shape: 'square', coordinateReferenceSystem: 'WGS84' },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

/** Spherical WGS84 area approximation for a longitude/latitude ring. */
export function sphericalAreaSquareMetres(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    sum += deltaLon * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }
  return Math.abs(sum) * EARTH_RADIUS_METRES ** 2 / 2;
}
