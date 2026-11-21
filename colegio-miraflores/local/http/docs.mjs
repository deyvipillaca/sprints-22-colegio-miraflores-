import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const swaggerFiles = new Map([
  ['/swagger-ui.css', 'text/css'],
  ['/swagger-ui-bundle.js', 'text/javascript'],
]);
const page = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API del Colegio Miraflores</title><link rel="stylesheet" href="./swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="./swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'./openapi.json',dom_id:'#swagger-ui',validatorUrl:null});</script></body></html>`;

export async function openApiResponse(path, response) {
  let body;
  let type;
  if (path === '/docs') {
    body = page;
    type = 'text/html';
  } else if (path === '/openapi.json') {
    body = await readFile(new URL('../../docs/openapi.json', import.meta.url));
    type = 'application/json';
  } else if (swaggerFiles.has(path)) {
    body = await readFile(join(require('swagger-ui-dist').getAbsoluteFSPath(), path.slice(1)));
    type = swaggerFiles.get(path);
  } else {
    return false;
  }
  response.writeHead(200, {
    'Content-Type': type + '; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
  return true;
}
