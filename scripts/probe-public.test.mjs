import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatProbe, probePublic } from './probe-public.mjs';
import { serveStatic } from './local-static.mjs';

test('探测页面、同域哈希资源和图片，错误类型与缺失文件分别失败', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'esa-probe-test-'));
  const output = path.join(root, 'out');
  await fs.mkdir(output);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'checks.json'), JSON.stringify({
    assertions: [
      { path: '/', expectedStatus: 200, bodyContains: 'fixture' },
      { path: '/details', expectedStatus: 200, bodyContains: 'details' },
      { path: '/bad', expectedStatus: 404, bodyContains: 'missing' }
    ]
  }));
  await fs.writeFile(path.join(root, 'local.json'), JSON.stringify({ htmlAssets: ['/'], htmlImages: ['/'] }));
  await fs.writeFile(path.join(output, 'index.html'), [
    '<h1>fixture</h1>',
    '<script type="module" src="./main-A12.js"></script>',
    '<script src="https://elsewhere.invalid/ignore.js"></script>',
    '<link href="/main-B12.css" rel="stylesheet">',
    '<img src="/logo.svg?width=1&amp;height=2">'
  ].join(''));
  await fs.writeFile(path.join(output, 'details.html'), '<h2>details</h2>');
  await fs.writeFile(path.join(output, '404.html'), '<h2>missing</h2>');
  await fs.writeFile(path.join(output, 'main-A12.js'), 'export const fixture = true;');
  await fs.writeFile(path.join(output, 'main-B12.css'), 'h1 { color: blue }');
  await fs.writeFile(path.join(output, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const server = await serveStatic(output);
  t.after(server.close);
  const passed = await probePublic(root, server.base);
  assert.equal(passed.length, 6);
  assert.match(formatProbe(passed), /✓6 ✗0/);
  await fs.rm(path.join(output, 'main-A12.js'));
  await fs.writeFile(path.join(output, 'index.html'), '<h1>fixture</h1><script src="logo.svg"></script><script src="/main-A12.js"></script>');
  const failed = (await probePublic(root, server.base)).filter((result) => !result.ok);
  assert.deepEqual(failed.map((result) => result.label), ['页面图片 /', 'GET /logo.svg', 'GET /main-A12.js']);
  assert.match(failed[1].errors.join(' '), /响应头 content-type/);
  assert.match(failed[2].errors.join(' '), /status 404/);
});
