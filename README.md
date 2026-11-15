# TerraWatch

TerraWatch is an early-stage environmental monitoring workspace for registering geographic areas and preparing for future environmental monitoring workflows.

The current MVP lets officers draw square monitoring boundaries, register their metadata, view the corresponding GeoJSON, and review saved areas on a map. It does not process satellite data or provide authentication.

## Features

- Interactive Leaflet map with OpenStreetMap and CARTO light basemaps.
- Place search using the public Nominatim service.
- Square area drawing and closed WGS84 GeoJSON polygons.
- Approximate area estimates in hectares and square kilometres.
- Monitoring area registration, details, map navigation, and deletion.
- Browser `localStorage` persistence for this MVP.
- Daily Meteomatics `drought_index:idx` polygon-mean observations for a selected registered area.
- Historical drought-index reference baselines with saved daily observations and data-quality summaries.

## Requirements

- Node.js 20 or newer.
- npm for installing the server dependency.
- An internet connection for Leaflet, map tiles, and place search.

Leaflet, map tiles, and geocoding are loaded from public services and follow their respective usage policies. Keep the visible map attribution when modifying the interface.

## Meteomatics configuration

The backend reads Meteomatics credentials from a project-root `.env` file. Copy `.env.example` to `.env` and fill in the account credentials:

```bash
cp .env.example .env
```

Set these variables in `.env`:

```dotenv
METEOMATICS_USERNAME=your-meteomatics-username
METEOMATICS_PASSWORD=your-meteomatics-password
METEOMATICS_BASE_URL=https://api.meteomatics.com
```

The `.env` file is excluded by `.gitignore`. Keep it private and never place credentials in frontend code or commit them. The backend uses HTTP Basic Authentication over HTTPS and does not return provider response bodies from the health check.

After configuring `.env`, start the server and check connectivity:

```bash
curl http://localhost:4173/api/meteomatics/health
```

The response contains only a safe provider status. A successful check returns `{"provider":"Meteomatics","status":"ok"}`. Configuration, authentication, network, and provider-response failures return a safe error code and message without credential values.

### Retrieve drought-index observations

Each registered area offers a **Drought data** action. Select start and end dates to request daily (`P1D`) polygon mean (`mean`) observations. AOIs remain in browser storage; the browser sends the selected GeoJSON geometry to the backend for validation and coordinate conversion. Credentials and provider requests stay on the server.

The backend endpoint is `POST /api/meteomatics/observations` and accepts:

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[3, 6], [3.1, 6], [3.1, 6.1], [3, 6.1], [3, 6]]]
  },
  "startDate": "2020-01-01",
  "endDate": "2020-01-07"
}
```

The parameter, interval, and aggregation are fixed by the server (`drought_index:idx`, `P1D`, `mean`). Successful responses contain `provider`, `parameter`, `interval`, `aggregation`, and an `observations` array of provider dates and values. The API rejects invalid or unclosed polygons and invalid date ranges. Provider `null` observations are retained as missing values and are not replaced.

### Establish historical baselines

Each registered area offers a **Create baseline** action; no dates are entered by the user. The backend first probes the latest 90 completed UTC days (through yesterday) for non-null provider values. It then queries a trailing 365-day daily polygon-mean window ending on the latest valid observation date it found. Baseline creation requires at least 300 valid daily values in that window. If the provider returns no recent valid value, inconsistent dates, or fewer than 300 valid values, TerraWatch reports that it cannot establish a baseline and does not replace an existing one. This is a practical application threshold, not a provider guarantee or scientific validation.

Existing baselines can be viewed offline from browser storage or explicitly refreshed after confirmation. Refresh builds and validates a replacement before saving it, so a failed refresh preserves the previous record. Baselines are stored under `terrawatch.historical-baselines.v1`, separately from the AOI records. The existing `POST /api/meteomatics/observations` endpoint accepts `{ "geometry": ..., "mode": "latest-baseline" }` for this automatic workflow; normal date-specified observation requests remain supported.

The summary reports the actual 365-day window, provider rows, valid and missing observations, minimum, maximum, median, and frequency/percentage for each exact value returned. Zero is a valid observation; `null` values and dates without a provider row are missing. No values are interpolated or recoded. For an even number of values, the median uses the lower of the two middle observed categories, avoiding a synthetic in-between category. This is an environmental reference based on the Meteomatics drought index; it is not direct proof of vegetation loss or recovery, and the implementation does not claim scientific validation. Availability is account-, parameter-, and location-dependent; the application discovers recent non-null data at runtime and cannot guarantee that Meteomatics will return enough history for every AOI.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:4173>. To use a different port:

```bash
PORT=5000 npm start
```

## Run checks

```bash
npm test
```

The tests cover square GeoJSON construction, ring closure and orientation, area estimation, Meteomatics route validation, baseline statistics and data quality, and local baseline/AOI persistence.

## Data and privacy

Registered monitoring areas are stored in the current browser's `localStorage`. They are not sent to a TerraWatch backend and are not synchronized between browsers or devices. Clearing browser site data removes them. Map tile requests and place searches are handled by the configured third-party map and geocoding providers.

The persistence boundaries are in `src/areaRepository.js` and `src/baselineRepository.js`; a future backend can replace those adapters without moving storage details into the page UI. Baseline calculations are isolated in `src/baselineStatistics.js`. Geometry helpers are in `src/geometry.js`.

Meteomatics backend requests are isolated in `server/meteomaticsService.js`; provider credentials are loaded by the Node.js server and are not served to browsers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating and follow [SECURITY.md](SECURITY.md) for vulnerability reports.

## License

TerraWatch is licensed under the MIT License. See [LICENSE](LICENSE).
