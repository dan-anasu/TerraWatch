import { createSquareGeoJSON, sphericalAreaSquareMetres } from './geometry.js';
import { areaRepository } from './areaRepository.js';
import { baselineRepository } from './baselineRepository.js';
import { calculateBaselineStatistics, getExpectedDailyDates } from './baselineStatistics.js';

const footer = `<footer class="page-footer"><span>TerraWatch <span class="footer-separator">·</span> Environmental monitoring workspace</span><span>Data insights for a changing planet <span class="footer-leaf">✳</span></span></footer>`;

function areasPage() {
  return `<div class="breadcrumbs"><span>Workspace</span><span>›</span><strong>Monitoring Areas</strong></div>
    <div class="page-heading map-page-heading"><div><div class="eyebrow">FIELD OPERATIONS</div><h1>Monitoring areas</h1><p class="page-subtitle">Explore locations and draw square boundaries for environmental monitoring.</p></div></div>
    <section class="map-panel" aria-label="Monitoring area map">
      <div class="map-toolbar"><div class="map-title"><span class="map-title-icon">◎</span><div><strong>Area workspace</strong><span>Explore and define a monitoring boundary</span></div></div>
        <form class="location-search" id="location-search"><span aria-hidden="true">⌕</span><input id="location-query" type="search" placeholder="Search a place or address" aria-label="Search a place or address"><button type="submit">Search</button></form>
      </div>
      <div class="map-wrap"><div id="monitoring-map" role="application" aria-label="Interactive map for selecting a monitoring area"></div><div class="draw-tip" id="draw-tip" hidden><span class="tip-step">1</span><span id="draw-instruction">Click the map to set the square's center.</span><button id="cancel-draw" type="button" aria-label="Cancel drawing">×</button></div><div class="map-attribution-note">Map data © OpenStreetMap contributors</div></div>
      <div class="map-actions"><div class="draw-status" id="draw-status"><span class="status-pulse"></span><span>Ready to explore</span></div><div class="map-action-buttons"><button class="secondary-button map-action" id="redraw-area" type="button" hidden>↻ Redraw</button><button class="secondary-button map-action cancel-selection" id="cancel-selection" type="button" hidden>Clear selection</button><button class="draw-button" id="draw-area" type="button"><span>⌗</span> Draw monitoring area</button></div></div>
      <section class="selection-panel" id="selection-panel" hidden aria-live="polite"><div class="selection-header"><div><div class="eyebrow">SELECTED BOUNDARY</div><h2>Square monitoring area</h2></div><button class="copy-geojson" id="copy-geojson" type="button">Copy GeoJSON</button></div><div class="area-metrics"><div class="metric"><span>Approximate area</span><strong id="area-hectares">—</strong></div><div class="metric"><span>Square kilometres</span><strong id="area-km2">—</strong></div><div class="metric metric-coordinates"><span>Center coordinates · WGS84</span><strong id="center-coordinates">—</strong></div></div><details class="geojson-details"><summary>View GeoJSON coordinates</summary><pre id="geojson-output"></pre></details><p class="selection-note">Area uses a spherical approximation from the WGS84 longitude and latitude boundary coordinates. GeoJSON coordinates are stored as longitude, latitude.</p><div class="selection-register-row"><span>Register this boundary to add it to your monitoring areas.</span><button class="draw-button" id="open-registration" type="button">Register Area</button></div></section>
    </section>
    <section class="registered-list" aria-labelledby="registered-title"><div class="registered-list-heading"><div><div class="eyebrow">YOUR WORKSPACE</div><h2 id="registered-title">Registered areas <span id="registered-count">0</span></h2></div><span class="registered-list-caption">Saved on this device</span></div><div id="registered-areas"><div class="registered-empty">No areas registered yet. Draw a square on the map to get started.</div></div></section>
    <div class="modal-backdrop" id="details-modal" hidden><section class="registration-modal details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title"><div class="modal-header"><div><div class="eyebrow">REGISTERED AREA</div><h2 id="details-title">Area details</h2></div><button class="modal-close" id="close-details" type="button" aria-label="Close details">×</button></div><div class="details-metadata"><div><span>Area type</span><strong id="details-type">—</strong></div><div><span>Monitoring status</span><strong><span class="registered-status">Registered</span></strong></div><div><span>Area size</span><strong id="details-size">—</strong></div><div><span>Registration date</span><strong id="details-date">—</strong></div><div class="details-description"><span>Description</span><p id="details-description">—</p></div><div class="details-geography"><span>Geographic area · WGS84</span><p id="details-geography">—</p></div></div><details class="geojson-details details-geojson"><summary>View GeoJSON geometry</summary><pre id="details-geojson"></pre></details><div class="modal-actions"><button class="secondary-button" id="done-details" type="button">Close</button></div></section></div>
    <div class="modal-backdrop" id="observations-modal" hidden><section class="registration-modal observations-modal" role="dialog" aria-modal="true" aria-labelledby="observations-title"><div class="modal-header"><div><div class="eyebrow">METEOMATICS · DAILY AREA MEAN</div><h2 id="observations-title">Drought index observations</h2><p class="observations-area-name" id="observations-area-name"></p></div><button class="modal-close" id="close-observations" type="button" aria-label="Close observations">×</button></div><form id="observations-form" class="observations-form"><label class="form-field">Start date<input id="observations-start" type="date" required></label><label class="form-field">End date<input id="observations-end" type="date" required></label><button type="submit" class="draw-button" id="fetch-observations">Retrieve observations</button></form><p class="observations-note">Parameter: drought_index:idx · Daily interval · Polygon mean. Values are shown as provided; no severity interpretation is applied.</p><p class="form-error" id="observations-error" role="alert" hidden></p><div id="observations-results" hidden><div id="observations-chart" class="observations-chart" role="img" aria-label="Drought index time series chart"></div><div class="observations-table-wrap"><table class="observations-table"><thead><tr><th>Date (UTC)</th><th>Value</th></tr></thead><tbody id="observations-table-body"></tbody></table></div></div><div class="modal-actions"><button class="secondary-button" id="done-observations" type="button">Close</button></div></section></div>
    <div class="modal-backdrop" id="baseline-modal" hidden><section class="registration-modal baseline-modal" role="dialog" aria-modal="true" aria-labelledby="baseline-title"><div class="modal-header"><div><div class="eyebrow">METEOMATICS · DROUGHT INDEX REFERENCE</div><h2 id="baseline-title">Historical baseline</h2><p class="observations-area-name" id="baseline-area-name"></p></div><button class="modal-close" id="close-baseline" type="button" aria-label="Close baseline">×</button></div><p class="baseline-context">Reference baseline based on Meteomatics <strong>drought_index:idx</strong> polygon mean. This is an environmental reference and is not direct proof of vegetation loss or recovery.</p><form id="baseline-form" class="baseline-generation"><p id="baseline-status" role="status">TerraWatch will find the latest available daily observation and request the trailing 365-day period.</p><button type="submit" class="draw-button" id="generate-baseline">Generate baseline</button></form><p class="form-error" id="baseline-error" role="alert" hidden></p><section id="baseline-result" class="baseline-result" hidden><div class="baseline-period-line"><strong id="baseline-period"></strong><span id="baseline-created"></span></div><div id="baseline-quality" class="baseline-quality" role="status"></div><div class="baseline-summary" id="baseline-summary"></div><section class="baseline-distribution"><h3>Category distribution</h3><p>Provider drought-index categories · percentages use valid observations only</p><div id="baseline-categories"></div></section><section class="baseline-observations"><h3>Daily observations</h3><div class="observations-table-wrap"><table class="observations-table"><thead><tr><th>Date (UTC)</th><th>Provider value</th></tr></thead><tbody id="baseline-table-body"></tbody></table></div></section></section><div class="modal-actions"><button class="secondary-button" id="done-baseline" type="button">Close</button></div></section></div>
    <div class="toast-message" id="page-message" role="status" hidden></div>
    <div class="modal-backdrop" id="registration-modal" hidden><section class="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div class="modal-header"><div><div class="eyebrow">NEW MONITORING AREA</div><h2 id="registration-title">Register area</h2></div><button class="modal-close" id="close-registration" type="button" aria-label="Close registration">×</button></div><form id="registration-form" novalidate><label class="form-field">Area name <span class="required-label">*</span><input id="area-name" name="name" type="text" maxlength="100" placeholder="e.g. Omo Forest Reserve" required autocomplete="off"></label><label class="form-field">Description <span class="optional-label">Optional</span><textarea id="area-description" name="description" rows="3" maxlength="500" placeholder="Add notes about this monitoring area"></textarea></label><label class="form-field">Area type <span class="required-label">*</span><select id="area-type" name="areaType" required><option value="">Select an area type</option><option value="Forest">Forest</option><option value="Grassland">Grassland</option><option value="Other">Other</option></select></label><div class="form-readonly-grid"><div class="form-field"><span>Geographic area</span><div class="readonly-value" id="registration-geographic">Draw a square on the map</div></div><div class="form-field"><span>Area size</span><div class="readonly-value" id="registration-size">—</div></div><div class="form-field"><label for="registration-date">Registration date</label><input id="registration-date" type="date" readonly></div></div><p class="form-error" id="registration-error" role="alert" hidden></p><div class="modal-actions"><button class="secondary-button" id="cancel-registration" type="button">Cancel</button><button class="draw-button" id="submit-registration" type="submit">Register Area</button></div></form></section></div>${footer}`;
}

function placeholderPage(page) {
  const description = page === 'Dashboard' ? 'A clear overview of your environmental monitoring work.' : 'Review and share environmental monitoring updates.';
  return `<div class="breadcrumbs"><span>Workspace</span><span>›</span><strong>${page}</strong></div><div class="page-heading"><div><div class="eyebrow">FIELD OPERATIONS</div><h1>${page}</h1><p class="page-subtitle">${description}</p></div></div><section class="coming-card"><span class="summary-icon green">${page === 'Dashboard' ? '▦' : '▤'}</span><h2>${page} workspace</h2><p>This workspace is ready for the next development step.</p></section>${footer}`;
}

let mapInstance;
let drawLayer;
let centerMarker;
let pendingCenter;
let selectedGeoJSON;
let selectedAreaSize;
let registeredAreaLayers;
let areaMapLayers = new Map();
let highlightedAreaLayer;
let isSaving = false;
let messageTimer;
let registeredBaselines = [];
let baselineArea;
let baselineReplaceApproved = false;
let baselineSaving = false;
const content = document.querySelector('#content');

function navigate(page) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = undefined;
    drawLayer = undefined;
    centerMarker = undefined;
    registeredAreaLayers = undefined;
    areaMapLayers = new Map();
    highlightedAreaLayer = undefined;
    pendingCenter = undefined;
    selectedGeoJSON = undefined;
    selectedAreaSize = undefined;
  }
  content.innerHTML = page === 'Monitoring Areas' ? areasPage() : placeholderPage(page);
  document.querySelectorAll('[data-page]').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  document.querySelector('.mobile-nav').hidden = true;
  document.title = `TerraWatch — ${page}`;
  if (page === 'Monitoring Areas') initializeMap();
}

function makeSquareGeoJSON(center, corner, map) {
  const zoom = map.getZoom();
  const centerPoint = map.project(center, zoom);
  const cornerPoint = map.project(corner, zoom);
  return createSquareGeoJSON(center, centerPoint, cornerPoint, (point) => map.unproject(point, zoom));
}

function showSelectedSquare(geoJSON, center) {
  selectedGeoJSON = geoJSON;
  if (drawLayer) drawLayer.remove();
  if (centerMarker) centerMarker.remove();
  centerMarker = undefined;
  drawLayer = L.geoJSON(geoJSON, { style: { color: '#287347', weight: 3, opacity: 0.95, fillColor: '#63a476', fillOpacity: 0.22 } }).addTo(mapInstance);
  mapInstance.fitBounds(drawLayer.getBounds(), { padding: [70, 70], maxZoom: Math.max(mapInstance.getZoom(), 13) });

  const ring = geoJSON.geometry.coordinates[0];
  const areaM2 = sphericalAreaSquareMetres(ring);
  selectedAreaSize = { hectares: areaM2 / 10_000, squareKilometres: areaM2 / 1_000_000 };
  document.querySelector('#area-hectares').textContent = `${selectedAreaSize.hectares.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
  document.querySelector('#area-km2').textContent = `${selectedAreaSize.squareKilometres.toLocaleString(undefined, { maximumFractionDigits: 4 })} km²`;
  document.querySelector('#center-coordinates').textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  document.querySelector('#geojson-output').textContent = JSON.stringify(geoJSON, null, 2);
  document.querySelector('#selection-panel').hidden = false;
  document.querySelector('#draw-tip').hidden = true;
  document.querySelector('#draw-area').hidden = true;
  document.querySelector('#redraw-area').hidden = false;
  document.querySelector('#cancel-selection').hidden = false;
  document.querySelector('#draw-status').innerHTML = '<span class="status-pulse selected"></span><span>Square boundary selected</span>';
  mapInstance.getContainer().classList.remove('drawing-map');
  pendingCenter = undefined;
  openRegistration();
}

function clearSelection() {
  if (drawLayer) drawLayer.remove();
  if (centerMarker) centerMarker.remove();
  drawLayer = undefined;
  centerMarker = undefined;
  selectedGeoJSON = undefined;
  selectedAreaSize = undefined;
  pendingCenter = undefined;
  document.querySelector('#selection-panel').hidden = true;
  document.querySelector('#draw-tip').hidden = true;
  document.querySelector('#draw-area').hidden = false;
  document.querySelector('#redraw-area').hidden = true;
  document.querySelector('#cancel-selection').hidden = true;
  document.querySelector('#draw-status').innerHTML = '<span class="status-pulse"></span><span>Ready to explore</span>';
  mapInstance.getContainer().classList.remove('drawing-map');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function showPageMessage(message, kind = 'success') {
  const node = document.querySelector('#page-message');
  if (!node) return;
  clearTimeout(messageTimer);
  node.textContent = message;
  node.className = `toast-message ${kind}`;
  node.hidden = false;
  messageTimer = setTimeout(() => { node.hidden = true; }, 5000);
}

function openRegistration() {
  if (!selectedGeoJSON || !selectedAreaSize) {
    showPageMessage('Draw a square boundary before registering an area.', 'error');
    return;
  }
  const ring = selectedGeoJSON.geometry.coordinates[0];
  const longitudes = ring.slice(0, -1).map(([longitude]) => longitude);
  const latitudes = ring.slice(0, -1).map(([, latitude]) => latitude);
  const bounds = [Math.min(...latitudes), Math.min(...longitudes), Math.max(...latitudes), Math.max(...longitudes)];
  document.querySelector('#registration-geographic').textContent = `Bounds: ${bounds[0].toFixed(5)}, ${bounds[1].toFixed(5)} to ${bounds[2].toFixed(5)}, ${bounds[3].toFixed(5)} (lat, lon)`;
  document.querySelector('#registration-size').textContent = `${selectedAreaSize.hectares.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha · ${selectedAreaSize.squareKilometres.toLocaleString(undefined, { maximumFractionDigits: 4 })} km²`;
  document.querySelector('#registration-date').value = new Date().toISOString().slice(0, 10);
  document.querySelector('#registration-error').hidden = true;
  document.querySelector('#registration-error').textContent = '';
  document.querySelector('#registration-modal').hidden = false;
  document.querySelector('#area-name').focus();
}

function closeRegistration() {
  if (isSaving) return;
  document.querySelector('#registration-modal').hidden = true;
}

function addRegisteredAreaLayer(area) {
  const feature = { type: 'Feature', properties: { id: area.id, name: area.name }, geometry: area.geometry };
  const layer = L.geoJSON(feature, { style: { color: '#315f8a', weight: 2, opacity: 0.9, fillColor: '#5a8fbe', fillOpacity: 0.14 } });
  layer.bindTooltip(escapeHTML(area.name), { sticky: true });
  layer.addTo(registeredAreaLayers);
  areaMapLayers.set(area.id, layer);
  return layer;
}

function renderRegisteredAreas(areas) {
  const countNode = document.querySelector('#registered-count');
  const list = document.querySelector('#registered-areas');
  if (!countNode || !list) return;
  countNode.textContent = areas.length;
  registeredAreaLayers.clearLayers();
  areaMapLayers = new Map();
  highlightedAreaLayer = undefined;
  if (!areas.length) {
    list.innerHTML = '<div class="registered-empty"><span class="registered-empty-icon">▱</span><strong>No monitoring areas registered yet</strong><span>Draw a square on the map and register it to start building your workspace.</span></div>';
    return;
  }
  list.innerHTML = `<div class="registered-area-list">${areas.map((area) => {
    const baseline = registeredBaselines.find((item) => item.areaId === area.id);
    const baselineLabel = baseline ? `Baseline saved · ${escapeHTML(baseline.startDate)} to ${escapeHTML(baseline.endDate)}` : 'No baseline saved';
    const baselineAction = baseline ? 'View baseline' : 'Create baseline';
    return `<article class="registered-area-row"><span class="registered-area-symbol">▱</span><span class="registered-area-info"><strong>${escapeHTML(area.name)}</strong><span>${escapeHTML(area.areaType)} · ${escapeHTML(new Date(area.registrationTimestamp).toLocaleDateString())}${area.description ? ` · ${escapeHTML(area.description)}` : ''}</span><span class="baseline-list-status ${baseline ? 'has-baseline' : ''}">${baselineLabel}</span></span><span class="registered-area-size">${Number(area.areaHectares).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha</span><span class="registered-status">Registered</span><span class="registered-area-actions"><button type="button" data-action="map" data-area-id="${escapeHTML(area.id)}">View on Map</button><button type="button" data-action="details" data-area-id="${escapeHTML(area.id)}">View Details</button><button type="button" data-action="observations" data-area-id="${escapeHTML(area.id)}">Drought data</button>${baseline ? `<button type="button" data-action="baseline-view" data-area-id="${escapeHTML(area.id)}">View baseline</button><button type="button" data-action="baseline-replace" data-area-id="${escapeHTML(area.id)}">Refresh baseline</button>` : `<button type="button" data-action="baseline-create" data-area-id="${escapeHTML(area.id)}">${baselineAction}</button>`}<button type="button" class="delete-area-action" data-action="delete" data-area-id="${escapeHTML(area.id)}">Delete</button></span></article>`;
  }).join('')}</div>`;
  for (const area of areas) addRegisteredAreaLayer(area);
  list.querySelectorAll('[data-action="map"]').forEach((button) => button.addEventListener('click', () => {
    const area = areas.find((item) => item.id === button.dataset.areaId);
    if (!area) return;
    const layer = areaMapLayers.get(area.id);
    if (!layer) return;
    if (highlightedAreaLayer) highlightedAreaLayer.setStyle({ color: '#315f8a', weight: 2, opacity: 0.9, fillColor: '#5a8fbe', fillOpacity: 0.14 });
    highlightedAreaLayer = layer;
    layer.setStyle({ color: '#df9634', weight: 4, opacity: 1, fillColor: '#edbc67', fillOpacity: 0.3 });
    layer.bringToFront();
    const bounds = layer.getBounds();
    mapInstance.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }));
  list.querySelectorAll('[data-action="details"]').forEach((button) => button.addEventListener('click', () => {
    const area = areas.find((item) => item.id === button.dataset.areaId);
    if (area) showAreaDetails(area);
  }));
  list.querySelectorAll('[data-action="observations"]').forEach((button) => button.addEventListener('click', () => {
    const area = areas.find((item) => item.id === button.dataset.areaId);
    if (area) openObservations(area);
  }));
  list.querySelectorAll('[data-action="baseline-create"], [data-action="baseline-replace"]').forEach((button) => button.addEventListener('click', () => {
    const area = areas.find((item) => item.id === button.dataset.areaId);
    if (area) beginBaselineCreation(area, button.dataset.action === 'baseline-replace');
  }));
  list.querySelectorAll('[data-action="baseline-view"]').forEach((button) => button.addEventListener('click', () => {
    const area = areas.find((item) => item.id === button.dataset.areaId);
    const baseline = registeredBaselines.find((item) => item.areaId === button.dataset.areaId);
    if (area && baseline) viewSavedBaseline(area, baseline);
  }));
  list.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', () => deleteArea(button.dataset.areaId)));
}

let observationsArea;
let observationsLoading = false;

function openObservations(area) {
  observationsArea = area;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const start = new Date(yesterday.getTime() - 29 * 86_400_000);
  document.querySelector('#observations-area-name').textContent = area.name;
  document.querySelector('#observations-start').value = start.toISOString().slice(0, 10);
  document.querySelector('#observations-end').value = yesterday.toISOString().slice(0, 10);
  document.querySelector('#observations-error').hidden = true;
  document.querySelector('#observations-results').hidden = true;
  document.querySelector('#observations-chart').replaceChildren();
  document.querySelector('#observations-table-body').replaceChildren();
  document.querySelector('#observations-modal').hidden = false;
}

function renderObservations(observations) {
  const valid = observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
  const chart = document.querySelector('#observations-chart');
  chart.replaceChildren();
  if (valid.length) {
    const values = valid.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 720; const height = 220; const pad = 32;
    const pointByIndex = new Map();
    observations.forEach((item, index) => {
      if (typeof item.value !== 'number' || !Number.isFinite(item.value)) return;
      const x = observations.length === 1 ? width / 2 : pad + index * (width - pad * 2) / (observations.length - 1);
      const y = height - pad - ((item.value - min) / range) * (height - pad * 2);
      pointByIndex.set(index, { x, y, item });
    });
    const segments = [];
    for (let index = 0; index < observations.length - 1; index += 1) {
      const start = pointByIndex.get(index); const end = pointByIndex.get(index + 1);
      if (start && end) segments.push(`<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#4c8058" stroke-width="3" stroke-linecap="round"/>`);
    }
    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily drought-index observations"><line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#dce5dc"/>${segments.join('')}${[...pointByIndex.values()].map(({ x, y, item }) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#36794c"><title>${escapeHTML(item.date)} · ${item.value}</title></circle>`).join('')}<text x="${pad}" y="${height - 8}" fill="#89958b" font-size="11">${escapeHTML(observations[0].date.slice(0, 10))}</text><text x="${width - pad}" y="${height - 8}" text-anchor="end" fill="#89958b" font-size="11">${escapeHTML(observations.at(-1).date.slice(0, 10))}</text></svg>`;
  } else {
    chart.textContent = 'No numeric observations were returned for this period.';
  }
  document.querySelector('#observations-table-body').innerHTML = observations.map((item) => `<tr><td>${escapeHTML(item.date)}</td><td>${item.value === null ? 'No value' : escapeHTML(String(item.value))}</td></tr>`).join('');
  document.querySelector('#observations-results').hidden = false;
}

async function requestObservations(event) {
  event.preventDefault();
  if (observationsLoading || !observationsArea) return;
  const error = document.querySelector('#observations-error');
  const button = document.querySelector('#fetch-observations');
  error.hidden = true;
  observationsLoading = true;
  button.disabled = true;
  button.textContent = 'Loading…';
  try {
    const response = await fetch('/api/meteomatics/observations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ geometry: observationsArea.geometry?.geometry || observationsArea.geometry, startDate: document.querySelector('#observations-start').value, endDate: document.querySelector('#observations-end').value }),
    });
    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    if (contentType.toLowerCase().includes('application/json')) {
      try { payload = await response.json(); } catch { /* Report a useful response error below. */ }
    } else {
      try { await response.text(); } catch { /* The status is sufficient for a useful error. */ }
    }
    if (!response.ok) {
      const message = payload?.error?.message || (response.status === 405
        ? 'The server at this address does not accept observation requests. Restart TerraWatch and open it from the server’s configured port.'
        : `The request failed with HTTP ${response.status}.`);
      throw new Error(message);
    }
    if (!payload || !Array.isArray(payload.observations)) {
      throw new Error('The server returned an invalid response. Confirm that TerraWatch is running on this page’s port and restart it if needed.');
    }
    renderObservations(payload.observations);
  } catch (cause) {
    error.textContent = cause.message || 'Observations could not be retrieved. Please try again.';
    error.hidden = false;
  } finally {
    observationsLoading = false;
    button.disabled = false;
    button.textContent = 'Retrieve observations';
  }
}

function beginBaselineCreation(area, requestReplacement = false) {
  const existing = registeredBaselines.find((item) => item.areaId === area.id);
  if (existing && !window.confirm(`Refresh the saved baseline for “${area.name}” using the latest available provider observations? The current baseline will remain unless the new one is retrieved and saved successfully.`)) return;
  if (!existing && requestReplacement) {
    showPageMessage('No saved baseline exists for this area. Create one first.', 'error');
    return;
  }
  baselineArea = area;
  baselineReplaceApproved = Boolean(existing);
  document.querySelector('#baseline-title').textContent = existing ? 'Refresh historical baseline' : 'Create historical baseline';
  document.querySelector('#baseline-area-name').textContent = area.name;
  document.querySelector('#baseline-form').hidden = false;
  document.querySelector('#baseline-form').reset();
  document.querySelector('#baseline-error').hidden = true;
  document.querySelector('#baseline-error').textContent = '';
  document.querySelector('#baseline-result').hidden = true;
  document.querySelector('#baseline-modal').hidden = false;
  document.querySelector('#baseline-status').textContent = 'TerraWatch will search recent provider data, then request the trailing 365 days ending on the latest valid observation date.';
  document.querySelector('#generate-baseline').textContent = existing ? 'Refresh baseline' : 'Generate baseline';
  document.querySelector('#generate-baseline').focus();
}

function renderBaselineRecord(area, baseline) {
  const statistics = baseline?.statistics;
  if (!statistics || !Array.isArray(baseline.observations)) {
    throw new Error('This saved baseline is incomplete or damaged and cannot be displayed.');
  }
  const expectedDates = getExpectedDailyDates(baseline.startDate, baseline.endDate);
  document.querySelector('#baseline-title').textContent = 'Historical baseline';
  document.querySelector('#baseline-area-name').textContent = area.name;
  document.querySelector('#baseline-form').hidden = true;
  document.querySelector('#baseline-error').hidden = true;
  document.querySelector('#baseline-period').textContent = `Observation period: ${baseline.startDate} to ${baseline.endDate} · ${statistics.periodDays} daily dates`;
  document.querySelector('#baseline-created').textContent = `Created ${new Date(baseline.createdAt).toLocaleString()}`;

  const periodQuality = `Trailing ${statistics.periodDays}-day reference period selected automatically from latest available provider observations; not a validated climate normal.`;
  const completeness = statistics.missingObservations > 0
    ? `Incomplete observations: ${statistics.validObservations} valid of ${statistics.totalObservations} expected; ${statistics.missingObservations} missing.`
    : `Complete observations: ${statistics.validObservations} valid of ${statistics.totalObservations} expected.`;
  const quality = document.querySelector('#baseline-quality');
  quality.className = `baseline-quality ${statistics.missingObservations > 0 ? 'incomplete' : 'complete'}`;
  quality.textContent = `${periodQuality} ${completeness} Zero is counted as a valid provider observation.`;

  const formatValue = (value) => value === null || value === undefined ? '—' : escapeHTML(String(value));
  const summary = [
    ['Expected daily observations', statistics.totalObservations],
    ['Provider rows returned', statistics.receivedObservations],
    ['Valid observations', statistics.validObservations],
    ['Missing observations', statistics.missingObservations],
    ['Minimum category', formatValue(statistics.minimum)],
    ['Maximum category', formatValue(statistics.maximum)],
    ['Median category', formatValue(statistics.median)],
  ];
  document.querySelector('#baseline-summary').innerHTML = summary.map(([label, value]) => `<div class="baseline-metric"><span>${label}</span><strong>${escapeHTML(String(value))}</strong></div>`).join('');

  const distribution = Array.isArray(statistics.categoryDistribution) ? statistics.categoryDistribution : [];
  document.querySelector('#baseline-categories').innerHTML = distribution.map(({ category, count, percentage }) => {
    const safePercentage = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;
    return `<div class="baseline-category-row"><span class="baseline-category-label">${escapeHTML(String(category))}</span><div class="baseline-bar"><span style="width:${safePercentage}%"></span></div><strong>${Number(count)} · ${safePercentage.toFixed(2)}%</strong></div>`;
  }).join('') || '<p class="baseline-no-categories">No category values are available.</p>';

  const observationsByDate = new Map(baseline.observations.map((item) => [item.date.slice(0, 10), item.value]));
  document.querySelector('#baseline-table-body').innerHTML = expectedDates.map((date) => {
    if (!observationsByDate.has(date)) return `<tr><td>${date}</td><td class="missing-observation">Missing observation</td></tr>`;
    const value = observationsByDate.get(date);
    return `<tr><td>${date}</td><td>${value === null ? '<span class="missing-observation">Missing value</span>' : escapeHTML(String(value))}</td></tr>`;
  }).join('');
  document.querySelector('#baseline-result').hidden = false;
  document.querySelector('#baseline-modal').hidden = false;
}

function viewSavedBaseline(area, baseline) {
  baselineArea = area;
  try {
    renderBaselineRecord(area, baseline);
  } catch (error) {
    document.querySelector('#baseline-area-name').textContent = area.name;
    document.querySelector('#baseline-form').hidden = true;
    document.querySelector('#baseline-result').hidden = true;
    const errorNode = document.querySelector('#baseline-error');
    errorNode.textContent = error.message || 'The saved baseline could not be displayed.';
    errorNode.hidden = false;
    document.querySelector('#baseline-modal').hidden = false;
  }
}

async function generateBaseline(event) {
  event.preventDefault();
  if (baselineSaving || !baselineArea) return;
  const errorNode = document.querySelector('#baseline-error');
  const button = document.querySelector('#generate-baseline');
  const statusNode = document.querySelector('#baseline-status');
  errorNode.hidden = true;
  try {
    baselineSaving = true;
    button.disabled = true;
    button.textContent = 'Finding latest data…';
    statusNode.textContent = 'Checking recent provider observations to identify the latest available historical date…';
    const response = await fetch('/api/meteomatics/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        geometry: baselineArea.geometry?.geometry || baselineArea.geometry,
        mode: 'latest-baseline',
      }),
    });
    const responseText = await response.text();
    let payload;
    try { payload = JSON.parse(responseText); } catch { payload = null; }
    if (!response.ok) throw new Error(payload?.error?.message || `Baseline request failed with HTTP ${response.status}.`);
    if (!Array.isArray(payload?.observations)) throw new Error('The provider response did not contain a valid observations list.');
    if (!payload.window || typeof payload.window.startDate !== 'string' || typeof payload.window.endDate !== 'string') {
      throw new Error('The server did not return the actual baseline observation period. The baseline was not saved.');
    }

    const { startDate, endDate } = payload.window;
    statusNode.textContent = `Retrieved ${payload.observations.length} provider rows for ${startDate} to ${endDate}; calculating the baseline…`;
    button.textContent = 'Saving baseline…';
    const statistics = calculateBaselineStatistics({ startDate, endDate, observations: payload.observations });
    const saved = await baselineRepository.save({
      areaId: baselineArea.id,
      areaName: baselineArea.name,
      startDate,
      endDate,
      parameterId: 'drought_index:idx',
      aggregation: 'mean',
      window: payload.window,
      statistics,
      observations: payload.observations,
    }, { replace: baselineReplaceApproved });
    baselineReplaceApproved = false;
    registeredBaselines = await baselineRepository.list();
    try { renderRegisteredAreas(await areaRepository.list()); } catch { /* Keep the saved baseline visible even if AOI list refresh fails. */ }
    renderBaselineRecord(baselineArea, saved);
    showPageMessage(`Historical baseline saved for “${baselineArea.name}”.`, 'success');
  } catch (error) {
    errorNode.textContent = error.message || 'The baseline could not be generated. Please try again.';
    errorNode.hidden = false;
    statusNode.textContent = 'Baseline generation did not complete. Any previously saved baseline is preserved.';
    if (baselineReplaceApproved) {
      const previous = registeredBaselines.find((item) => item.areaId === baselineArea.id);
      if (previous) {
        viewSavedBaseline(baselineArea, previous);
        document.querySelector('#baseline-form').hidden = false;
        errorNode.textContent = `${error.message || 'The baseline could not be generated.'} The previously saved baseline is still shown below.`;
        errorNode.hidden = false;
      }
    }
  } finally {
    baselineSaving = false;
    button.disabled = false;
    button.textContent = baselineReplaceApproved ? 'Refresh baseline' : 'Generate baseline';
  }
}

function showAreaDetails(area) {
  const ring = area.geometry?.coordinates?.[0] || [];
  const points = ring.slice(0, -1);
  const latitudes = points.map((point) => point[1]);
  const longitudes = points.map((point) => point[0]);
  const geographic = points.length ? `Bounds: ${Math.min(...latitudes).toFixed(5)}, ${Math.min(...longitudes).toFixed(5)} to ${Math.max(...latitudes).toFixed(5)}, ${Math.max(...longitudes).toFixed(5)} (lat, lon)` : 'Geographic boundary unavailable';
  document.querySelector('#details-title').textContent = area.name;
  document.querySelector('#details-type').textContent = area.areaType;
  document.querySelector('#details-size').textContent = `${Number(area.areaHectares).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha · ${Number(area.areaSquareKilometres).toLocaleString(undefined, { maximumFractionDigits: 4 })} km²`;
  document.querySelector('#details-date').textContent = new Date(area.registrationTimestamp).toLocaleString();
  document.querySelector('#details-description').textContent = area.description || 'No description provided.';
  document.querySelector('#details-geography').textContent = geographic;
  document.querySelector('#details-geojson').textContent = JSON.stringify(area.geometry, null, 2);
  document.querySelector('#details-modal').hidden = false;
}

async function deleteArea(id) {
  try {
    const area = (await areaRepository.list()).find((item) => item.id === id);
    if (!area) {
      showPageMessage('This area is no longer registered. Refresh the list and try again.', 'error');
      return;
    }
    if (!window.confirm(`Delete “${area.name}”? This will remove it from this device and the map.`)) return;
    const remaining = await areaRepository.delete(id);
    renderRegisteredAreas(remaining);
    showPageMessage(`“${area.name}” was deleted.`, 'success');
  } catch (error) {
    showPageMessage(error.message || 'The area could not be deleted. Please try again.', 'error');
  }
}

async function loadRegisteredAreas() {
  try {
    const areas = await areaRepository.list();
    try {
      registeredBaselines = await baselineRepository.list();
    } catch (error) {
      registeredBaselines = [];
      showPageMessage(error.message || 'Saved baselines could not be loaded.', 'error');
    }
    renderRegisteredAreas(areas);
  } catch (error) {
    showPageMessage(error.message, 'error');
  }
}

async function submitRegistration(event) {
  event.preventDefault();
  if (isSaving) return;
  const errorNode = document.querySelector('#registration-error');
  const name = document.querySelector('#area-name').value.trim();
  const description = document.querySelector('#area-description').value.trim();
  const areaType = document.querySelector('#area-type').value;
  if (!selectedGeoJSON || !selectedAreaSize) {
    errorNode.textContent = 'Draw a square on the map before registering an area.';
    errorNode.hidden = false;
    return;
  }
  if (!name) {
    errorNode.textContent = 'Enter an area name to continue.';
    errorNode.hidden = false;
    document.querySelector('#area-name').focus();
    return;
  }
  if (!areaType) {
    errorNode.textContent = 'Choose an area type to continue.';
    errorNode.hidden = false;
    document.querySelector('#area-type').focus();
    return;
  }

  isSaving = true;
  document.querySelector('#registration-date').value = new Date().toISOString().slice(0, 10);
  const submitButton = document.querySelector('#submit-registration');
  const cancelButton = document.querySelector('#cancel-registration');
  submitButton.disabled = true;
  cancelButton.disabled = true;
  submitButton.textContent = 'Registering…';
  errorNode.hidden = true;
  try {
    const area = await areaRepository.create({
      name,
      description,
      areaType,
      geometry: selectedGeoJSON.geometry,
      areaHectares: selectedAreaSize.hectares,
      areaSquareKilometres: selectedAreaSize.squareKilometres,
    });
    const existing = await areaRepository.list();
    addRegisteredAreaLayer(area);
    renderRegisteredAreas(existing);
    document.querySelector('#registration-modal').hidden = true;
    document.querySelector('#registration-form').reset();
    clearSelection();
    showPageMessage(`“${area.name}” was registered successfully.`, 'success');
  } catch (error) {
    errorNode.textContent = error.message || 'The area could not be registered. Please try again.';
    errorNode.hidden = false;
  } finally {
    isSaving = false;
    submitButton.disabled = false;
    cancelButton.disabled = false;
    submitButton.textContent = 'Register Area';
  }
}

function beginDrawing() {
  clearSelection();
  document.querySelector('#draw-tip').hidden = false;
  document.querySelector('#draw-instruction').textContent = 'Click the map to set the square’s center.';
  document.querySelector('.tip-step').textContent = '1';
  document.querySelector('#draw-status').innerHTML = '<span class="status-pulse drawing"></span><span>Drawing · choose a center point</span>';
  mapInstance.getContainer().classList.add('drawing-map');
}

async function searchLocation(event) {
  event.preventDefault();
  const query = document.querySelector('#location-query').value.trim();
  if (!query) return;
  const button = document.querySelector('#location-search button');
  button.disabled = true;
  button.textContent = 'Searching…';
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' });
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Location search is temporarily unavailable.');
    const results = await response.json();
    if (!results.length) throw new Error('No matching place found. Try another search.');
    mapInstance.flyTo([Number(results[0].lat), Number(results[0].lon)], 12, { duration: 0.8 });
    document.querySelector('#location-query').setCustomValidity('');
  } catch (error) {
    document.querySelector('#location-query').setCustomValidity(error.message || 'Unable to search for this place.');
    document.querySelector('#location-query').reportValidity();
  } finally {
    button.disabled = false;
    button.textContent = 'Search';
  }
}

function initializeMap() {
  if (!window.L) {
    document.querySelector('.map-wrap').innerHTML = '<div class="map-unavailable">The map library could not load. Check your internet connection and refresh the page.</div>';
    return;
  }
  mapInstance = L.map('monitoring-map', { center: [9.082, 8.6753], zoom: 6, zoomControl: true, preferCanvas: true });
  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
  const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' });
  streets.addTo(mapInstance);
  L.control.layers({ 'OpenStreetMap': streets, 'Light map': light }, null, { position: 'topright' }).addTo(mapInstance);
  registeredAreaLayers = L.featureGroup().addTo(mapInstance);

  mapInstance.on('click', (event) => {
    if (!document.querySelector('#draw-tip') || document.querySelector('#draw-tip').hidden) return;
    if (!pendingCenter) {
      pendingCenter = event.latlng;
      document.querySelector('#draw-instruction').textContent = 'Click again to set the square size.';
      document.querySelector('.tip-step').textContent = '2';
      document.querySelector('#draw-status').innerHTML = '<span class="status-pulse drawing"></span><span>Drawing · choose a corner</span>';
      centerMarker = L.circleMarker(pendingCenter, { radius: 5, color: '#fff', weight: 2, fillColor: '#287347', fillOpacity: 1 }).addTo(mapInstance).bindTooltip('Square center', { permanent: false }).openTooltip();
      return;
    }
    const geoJSON = makeSquareGeoJSON(pendingCenter, event.latlng, mapInstance);
    if (!geoJSON) {
      document.querySelector('#draw-instruction').textContent = 'Choose a point farther from the center to create a larger square.';
      return;
    }
    showSelectedSquare(geoJSON, pendingCenter);
  });

  document.querySelector('#draw-area').addEventListener('click', beginDrawing);
  document.querySelector('#redraw-area').addEventListener('click', beginDrawing);
  document.querySelector('#cancel-selection').addEventListener('click', clearSelection);
  document.querySelector('#cancel-draw').addEventListener('click', clearSelection);
  document.querySelector('#location-search').addEventListener('submit', searchLocation);
  document.querySelector('#open-registration').addEventListener('click', openRegistration);
  document.querySelector('#registration-form').addEventListener('submit', submitRegistration);
  document.querySelector('#cancel-registration').addEventListener('click', closeRegistration);
  document.querySelector('#close-registration').addEventListener('click', closeRegistration);
  document.querySelector('#registration-modal').addEventListener('click', (event) => {
    if (event.target.id === 'registration-modal') closeRegistration();
  });
  const closeDetails = () => { document.querySelector('#details-modal').hidden = true; };
  document.querySelector('#close-details').addEventListener('click', closeDetails);
  document.querySelector('#done-details').addEventListener('click', closeDetails);
  document.querySelector('#details-modal').addEventListener('click', (event) => {
    if (event.target.id === 'details-modal') closeDetails();
  });
  const closeObservations = () => { if (!observationsLoading) document.querySelector('#observations-modal').hidden = true; };
  document.querySelector('#close-observations').addEventListener('click', closeObservations);
  document.querySelector('#done-observations').addEventListener('click', closeObservations);
  document.querySelector('#observations-modal').addEventListener('click', (event) => {
    if (event.target.id === 'observations-modal') closeObservations();
  });
  document.querySelector('#observations-form').addEventListener('submit', requestObservations);
  const closeBaseline = () => { if (!baselineSaving) document.querySelector('#baseline-modal').hidden = true; };
  document.querySelector('#close-baseline').addEventListener('click', closeBaseline);
  document.querySelector('#done-baseline').addEventListener('click', closeBaseline);
  document.querySelector('#baseline-modal').addEventListener('click', (event) => {
    if (event.target.id === 'baseline-modal') closeBaseline();
  });
  document.querySelector('#baseline-form').addEventListener('submit', generateBaseline);
  document.querySelector('#copy-geojson').addEventListener('click', async (event) => {
    if (!selectedGeoJSON) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedGeoJSON, null, 2));
      event.currentTarget.textContent = 'Copied';
      setTimeout(() => { event.currentTarget.textContent = 'Copy GeoJSON'; }, 1600);
    } catch {
      document.querySelector('.geojson-details').open = true;
    }
  });
  loadRegisteredAreas();
  setTimeout(() => mapInstance?.invalidateSize(), 0);
}

document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const details = document.querySelector('#details-modal');
  if (details) details.hidden = true;
  const registration = document.querySelector('#registration-modal');
  if (registration && !isSaving) registration.hidden = true;
  const observations = document.querySelector('#observations-modal');
  if (observations && !observationsLoading) observations.hidden = true;
  const baseline = document.querySelector('#baseline-modal');
  if (baseline && !baselineSaving) baseline.hidden = true;
});
document.querySelector('.mobile-menu').addEventListener('click', () => {
  const menu = document.querySelector('.mobile-nav');
  menu.hidden = !menu.hidden;
});
document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); navigate('Monitoring Areas'); });
navigate('Monitoring Areas');
