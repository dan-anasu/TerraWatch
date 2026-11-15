const HEALTH_PATH = 'user_stats_json';
const REQUEST_TIMEOUT_MS = 8_000;
const OBSERVATIONS_TIMEOUT_MS = 30_000;
const DROUGHT_PARAMETER = 'drought_index:idx';
export const BASELINE_WINDOW_DAYS = 365;
export const BASELINE_LOOKBACK_DAYS = 90;
export const BASELINE_MINIMUM_VALID_OBSERVATIONS = 300;
const DAY_MS = 86_400_000;

export class MeteomaticsServiceError extends Error {
  constructor(code, publicMessage, httpStatus = 503) {
    super(publicMessage);
    this.name = 'MeteomaticsServiceError';
    this.code = code;
    this.publicMessage = publicMessage;
    this.httpStatus = httpStatus;
  }
}

function getConfiguration(env) {
  const username = env.METEOMATICS_USERNAME;
  const password = env.METEOMATICS_PASSWORD;
  const configuredBaseUrl = env.METEOMATICS_BASE_URL?.trim();
  if (!username?.trim() || !password?.trim() || !configuredBaseUrl) {
    throw new MeteomaticsServiceError('not_configured', 'Meteomatics is not fully configured.', 503);
  }

  let baseUrl;
  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch {
    throw new MeteomaticsServiceError('invalid_configuration', 'Meteomatics configuration is invalid.', 503);
  }
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new MeteomaticsServiceError('invalid_configuration', 'Meteomatics must use a secure HTTPS base URL.', 503);
  }

  if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/';
  return { username, password, healthUrl: new URL(HEALTH_PATH, baseUrl), baseUrl };
}

/** Validate GeoJSON Polygon and convert its open exterior ring to Meteomatics lat,lon vertices. */
export function polygonToMeteomaticsLocation(geometry) {
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) {
    throw new MeteomaticsServiceError('invalid_geometry', 'A GeoJSON Polygon with one exterior ring is required.', 400);
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 501) {
    throw new MeteomaticsServiceError('invalid_geometry', 'The polygon ring must contain 3 to 500 vertices and a closing coordinate.', 400);
  }
  for (const position of ring) {
    if (!Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite)
      || position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) {
      throw new MeteomaticsServiceError('invalid_geometry', 'Polygon coordinates must be valid WGS84 [longitude, latitude] pairs.', 400);
    }
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new MeteomaticsServiceError('invalid_geometry', 'The polygon ring must be closed by repeating its first coordinate.', 400);
  }
  const vertices = ring.slice(0, -1);
  const unique = new Set(vertices.map(([lon, lat]) => `${lon},${lat}`));
  if (unique.size < 3) throw new MeteomaticsServiceError('invalid_geometry', 'The polygon must have at least three distinct vertices.', 400);
  const signedArea = vertices.reduce((sum, point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (Math.abs(signedArea) < Number.EPSILON) {
    throw new MeteomaticsServiceError('invalid_geometry', 'The polygon must enclose a non-zero area.', 400);
  }
  return vertices.map(([longitude, latitude]) => `${latitude},${longitude}`).join('_');
}

function validateObservationDates(startDate, endDate) {
  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    throw new MeteomaticsServiceError('invalid_dates', 'Enter valid start and end dates, with start date on or before end date.', 400);
  }
  // Bound response size and provider costs for this interactive MVP request.
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
  if (days > 3_650) throw new MeteomaticsServiceError('date_range_too_large', 'Choose a date range of 10 years or less.', 400);
}

function parseObservations(payload) {
  const series = payload?.data?.find((entry) => entry?.parameter === DROUGHT_PARAMETER)?.coordinates?.[0]?.dates;
  if (!Array.isArray(series)) {
    throw new MeteomaticsServiceError('invalid_provider_response', 'Meteomatics returned an unexpected observations response.', 502);
  }
  return series.map((item) => {
    const datePart = typeof item?.date === 'string' ? item.date.slice(0, 10) : '';
    const parsedDay = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? new Date(`${datePart}T00:00:00Z`) : null;
    const validDate = parsedDay && Number.isFinite(parsedDay.getTime()) && parsedDay.toISOString().slice(0, 10) === datePart
      && Number.isFinite(Date.parse(item.date));
    if (!validDate || !(typeof item.value === 'number' || item.value === null)) {
      throw new MeteomaticsServiceError('invalid_provider_response', 'Meteomatics returned an invalid observation.', 502);
    }
    return { date: item.date, value: item.value };
  });
}

/** Retrieve daily mean drought-index observations for a WGS84 GeoJSON Polygon. */
export async function getDroughtIndexObservations(input, { env = process.env, fetchImpl = fetch } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new MeteomaticsServiceError('invalid_request', 'Provide a GeoJSON geometry and start and end dates.', 400);
  }
  const { geometry, startDate, endDate } = input;
  const location = polygonToMeteomaticsLocation(geometry);
  validateObservationDates(startDate, endDate);
  const { username, password, baseUrl } = getConfiguration(env);
  const authorization = `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
  const validDates = `${startDate}T00:00:00Z--${endDate}T00:00:00Z:P1D`;
  const requestPath = `${validDates}/${DROUGHT_PARAMETER}/${location}:mean/json`;
  const url = new URL(requestPath, baseUrl);
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET', headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(OBSERVATIONS_TIMEOUT_MS),
    });
  } catch {
    throw new MeteomaticsServiceError('connection_failed', 'Could not connect to Meteomatics.', 503);
  }
  if (!response.ok) throw classifyHttpFailure(response.status);
  let payload;
  try { payload = await response.json(); } catch {
    throw new MeteomaticsServiceError('invalid_provider_response', 'Meteomatics returned an invalid observations response.', 502);
  }
  if (payload?.status && payload.status !== 'OK') {
    throw new MeteomaticsServiceError('provider_request_failed', 'Meteomatics could not provide observations for this request.', 502);
  }
  return { provider: 'Meteomatics', parameter: DROUGHT_PARAMETER, interval: 'P1D', aggregation: 'mean', observations: parseObservations(payload) };
}

function utcDateDaysAgo(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Discover recent actual availability, then retrieve a trailing 365-day AOI
 * series ending on its latest non-null provider observation. Probe ends
 * yesterday UTC so current-day forecast values cannot be mistaken for history.
 */
export async function getLatestDroughtIndexBaselineObservations(input, { env = process.env, fetchImpl = fetch, now = new Date() } = {}) {
  const geometry = input?.geometry;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
  const probeEnd = utcDateDaysAgo(today, 1);
  const probeStart = utcDateDaysAgo(probeEnd, BASELINE_LOOKBACK_DAYS - 1);
  const probe = await getDroughtIndexObservations({ geometry, startDate: probeStart, endDate: probeEnd }, { env, fetchImpl });
  const recentValid = probe.observations.filter((item) => item.value !== null);
  if (!recentValid.length) {
    throw new MeteomaticsServiceError('insufficient_baseline_data', `No non-missing drought-index observations were returned in the ${BASELINE_LOOKBACK_DAYS}-day availability search. A baseline could not be established.`, 422);
  }
  const latestObservationDate = recentValid.reduce((latest, item) => item.date.slice(0, 10) > latest ? item.date.slice(0, 10) : latest, '0000-00-00');
  const startDate = utcDateDaysAgo(latestObservationDate, BASELINE_WINDOW_DAYS - 1);
  const endDate = latestObservationDate;
  const result = await getDroughtIndexObservations({ geometry, startDate, endDate }, { env, fetchImpl });
  const validObservations = result.observations.filter((item) => item.value !== null);
  const latestInWindow = validObservations.reduce((latest, item) => item.date.slice(0, 10) > latest ? item.date.slice(0, 10) : latest, '0000-00-00');
  if (latestInWindow !== latestObservationDate) {
    throw new MeteomaticsServiceError('provider_data_changed', 'Meteomatics returned inconsistent latest dates while preparing the baseline. Refresh and try again.', 503);
  }
  if (validObservations.length < BASELINE_MINIMUM_VALID_OBSERVATIONS) {
    throw new MeteomaticsServiceError('insufficient_baseline_data', `Only ${validObservations.length} valid daily observations were returned for the ${BASELINE_WINDOW_DAYS}-day baseline window; at least ${BASELINE_MINIMUM_VALID_OBSERVATIONS} are required. The existing baseline was not changed.`, 422);
  }
  return {
    ...result,
    window: {
      startDate,
      endDate,
      days: BASELINE_WINDOW_DAYS,
      latestObservationDate,
      minimumValidObservations: BASELINE_MINIMUM_VALID_OBSERVATIONS,
      availabilitySearchDays: BASELINE_LOOKBACK_DAYS,
    },
  };
}

function classifyHttpFailure(status) {
  if (status === 401 || status === 403) {
    return new MeteomaticsServiceError('authentication_failed', 'Meteomatics rejected the configured credentials.', 502);
  }
  if (status === 429) {
    return new MeteomaticsServiceError('rate_limited', 'Meteomatics is rate-limiting requests. Try again later.', 503);
  }
  if (status >= 500) {
    return new MeteomaticsServiceError('provider_unavailable', 'Meteomatics is temporarily unavailable.', 503);
  }
  return new MeteomaticsServiceError('unexpected_provider_response', 'Meteomatics returned an unexpected response.', 502);
}

/** Check Meteomatics using its documented machine-readable account statistics endpoint. */
export async function checkMeteomaticsHealth({ env = process.env, fetchImpl = fetch } = {}) {
  const { username, password, healthUrl } = getConfiguration(env);
  const authorization = `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;

  let response;
  try {
    response = await fetchImpl(healthUrl, {
      method: 'GET',
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new MeteomaticsServiceError('connection_failed', 'Could not connect to Meteomatics.', 503);
  }

  if (!response.ok) throw classifyHttpFailure(response.status);
  try {
    const payload = await response.json();
    if (payload === null || typeof payload !== 'object') throw new Error('Expected a JSON object.');
  } catch {
    throw new MeteomaticsServiceError('invalid_provider_response', 'Meteomatics returned an invalid health response.', 502);
  }
}
