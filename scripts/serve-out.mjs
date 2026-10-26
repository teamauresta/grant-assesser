// Serves the static export in out/ the way GitHub Pages does, for e2e tests and local checks.
// Zero dependencies: `node scripts/serve-out.mjs` (or `pnpm serve`), then open
// http://localhost:4173/grant-assesser/.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BASE_PATH = '/grant-assesser';
const PORT = Number(process.env.PORT ?? 4173);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Maps a request URL to a file under `root`, or null when it is outside the base path, malformed
 * or tries to climb out of `root`. A path ending in `/` resolves to its `index.html`.
 * @param {string} url the request URL, e.g. `/grant-assesser/plan/?tab=goals`
 * @param {string} root absolute path of the directory to serve
 * @returns {string | null}
 */
export function resolveRequestPath(url, root) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname !== BASE_PATH && !pathname.startsWith(`${BASE_PATH}/`)) return null;
  let rel = pathname.slice(BASE_PATH.length) || '/';
  if (rel.includes('\0') || rel.split(/[\\/]/).includes('..')) return null;
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, `.${rel}`);
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

export function startServer({ port = PORT, root = ROOT } = {}) {
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    // GitHub Pages redirects the bare base path to its trailing-slash form.
    if (new URL(url, 'http://localhost').pathname === BASE_PATH) {
      res.writeHead(301, { Location: `${BASE_PATH}/` });
      res.end();
      return;
    }
    const file = resolveRequestPath(url, root);
    if (file && (await isFile(file))) {
      send(res, 200, file);
      return;
    }
    const notFound = path.join(root, '404.html');
    if (await isFile(notFound)) {
      send(res, 404, notFound);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
  server.listen(port, () => console.log(`Serving out/ at http://localhost:${port}${BASE_PATH}/`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
