import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function contains(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

async function findFile(root, pathname) {
  const target = path.resolve(root, `.${pathname}`);
  if (!contains(root, target)) return null;
  for (const candidate of [target, path.join(target, 'index.html'), `${target}.html`]) {
    try {
      const resolved = await fs.realpath(candidate);
      if (contains(root, resolved) && (await fs.stat(resolved)).isFile()) return resolved;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  return null;
}

export async function serveStatic(directory) {
  const root = await fs.realpath(directory);
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { allow: 'GET, HEAD' }).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const match = await findFile(root, pathname);
      const file = match ?? await findFile(root, '/404.html');
      const status = match ? 200 : 404;
      if (!file) {
        response.writeHead(status, { 'content-type': 'text/plain' }).end('Not Found');
        return;
      }
      const contentType = contentTypes[path.extname(file)] ?? 'application/octet-stream';
      response.writeHead(status, { 'content-type': contentType });
      response.end(request.method === 'HEAD' ? undefined : await fs.readFile(file));
    } catch (error) {
      if (!response.headersSent) response.writeHead(error instanceof URIError ? 400 : 500);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    })
  };
}
