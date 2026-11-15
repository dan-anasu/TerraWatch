import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { checkMeteomaticsHealth, getDroughtIndexObservations, getLatestDroughtIndexBaselineObservations, MeteomaticsServiceError } from './server/meteomaticsService.js';

const root = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const publicAssets = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/src/app.js', 'src/app.js'],
  ['/src/areaRepository.js', 'src/areaRepository.js'],
  ['/src/baselineRepository.js', 'src/baselineRepository.js'],
  ['/src/baselineStatistics.js', 'src/baselineStatistics.js'],
  ['/src/geometry.js', 'src/geometry.js'],
  ['/src/styles.css', 'src/styles.css'],
]);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function handleMeteomaticsHealth(response) {
  try {
    await checkMeteomaticsHealth();
    sendJson(response, 200, { provider: 'Meteomatics', status: 'ok' });
  } catch (error) {
    const serviceError = error instanceof MeteomaticsServiceError
      ? error
      : new MeteomaticsServiceError('health_check_failed', 'Meteomatics health check failed.', 503);
    sendJson(response, serviceError.httpStatus, {
      provider: 'Meteomatics',
      status: 'unavailable',
      code: serviceError.code,
      message: serviceError.publicMessage,
    });
  }
}

async function readJsonBody(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw new MeteomaticsServiceError('invalid_request', 'Send the request as JSON.', 400);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new MeteomaticsServiceError('request_too_large', 'The request body is too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
    throw new MeteomaticsServiceError('invalid_request', 'The request body must contain valid JSON.', 400);
  }
}

async function handleMeteomaticsObservations(request, response, observationsService) {
  try {
    const input = await readJsonBody(request);
    const result = await observationsService(input);
    sendJson(response, 200, result);
  } catch (error) {
    const serviceError = error instanceof MeteomaticsServiceError
      ? error
      : new MeteomaticsServiceError('observations_failed', 'Environmental observations could not be retrieved.', 503);
    sendJson(response, serviceError.httpStatus, { error: { code: serviceError.code, message: serviceError.publicMessage } });
  }
}

export async function dispatchRequest(request, response, {
  observationsService = getDroughtIndexObservations,
  baselineObservationsService = getLatestDroughtIndexBaselineObservations,
} = {}) {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/api/meteomatics/health') {
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use GET for the Meteomatics health check.' } }, { Allow: 'GET' });
      return;
    }
    await handleMeteomaticsHealth(response);
    return;
  }

  if (pathname === '/api/meteomatics/observations') {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use POST to retrieve observations.' } }, { Allow: 'POST' });
      return;
    }
    const observationsHandler = async (input) => input?.mode === 'latest-baseline'
      ? baselineObservationsService(input)
      : observationsService(input);
    await handleMeteomaticsObservations(request, response, observationsHandler);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'This resource only supports GET and HEAD.' } }, { Allow: 'GET, HEAD' });
    return;
  }

  const assetPath = publicAssets.get(pathname);
  if (!assetPath) {
    sendJson(response, 404, { error: { code: 'not_found', message: 'The requested resource was not found.' } });
    return;
  }

  try {
    const content = await readFile(join(root, assetPath));
    response.writeHead(200, {
      'Content-Type': types[extname(assetPath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    sendJson(response, 404, { error: { code: 'not_found', message: 'The requested resource was not found.' } });
  }
}

export function createTerraWatchServer(options) {
  return createServer((request, response) => {
    dispatchRequest(request, response, options).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { error: { code: 'internal_error', message: 'The request could not be completed.' } });
      else response.end();
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createTerraWatchServer();
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the existing TerraWatch server or set PORT to another port.`);
    } else {
      console.error(`TerraWatch could not start its server (${error.code || 'server_error'}).`);
    }
    process.exitCode = 1;
  });
  server.listen(port, '0.0.0.0', () => console.log(`TerraWatch is running on port ${port}`));
}
