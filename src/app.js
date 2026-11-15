import { createSquareGeoJSON, sphericalAreaSquareMetres } from './geometry.js';
import { areaRepository } from './areaRepository.js';

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
  list.innerHTML = `<div class="registered-area-list">${areas.map((area) => `<article class="registered-area-row"><span class="registered-area-symbol">▱</span><span class="registered-area-info"><strong>${escapeHTML(area.name)}</strong><span>${escapeHTML(area.areaType)} · ${escapeHTML(new Date(area.registrationTimestamp).toLocaleDateString())}${area.description ? ` · ${escapeHTML(area.description)}` : ''}</span></span><span class="registered-area-size">${Number(area.areaHectares).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha</span><span class="registered-status">Registered</span><span class="registered-area-actions"><button type="button" data-action="map" data-area-id="${escapeHTML(area.id)}">View on Map</button><button type="button" data-action="details" data-area-id="${escapeHTML(area.id)}">View Details</button><button type="button" class="delete-area-action" data-action="delete" data-area-id="${escapeHTML(area.id)}">Delete</button></span></article>`).join('')}</div>`;
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
  list.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', () => deleteArea(button.dataset.areaId)));
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
    renderRegisteredAreas(await areaRepository.list());
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
});
document.querySelector('.mobile-menu').addEventListener('click', () => {
  const menu = document.querySelector('.mobile-nav');
  menu.hidden = !menu.hidden;
});
document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); navigate('Monitoring Areas'); });
navigate('Monitoring Areas');
