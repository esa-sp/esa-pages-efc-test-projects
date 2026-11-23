// npm test：验证真实 Express 应用；EFC_CONSOLE_RUNTIME_DIR=<解压后的 code.zip> npm test：另验构建注入。
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { after, before, test } from 'node:test';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = process.env.EFC_CONSOLE_RUNTIME_DIR;
const injected = Boolean(runtimeDir);
const records = [];
let receiver;
let child;
let base;
let stdout = '';
let stderr = '';

async function waitFor(predicate, message, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(message);
}

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

before(async () => {
  if (injected) {
    receiver = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        assert.equal(req.method, 'POST');
        assert.equal(req.url, '/function-logs');
        assert.equal(req.headers['x-efc-function-log-key'], 'fixture-local-test');
        const record = JSON.parse(body);
        assert.deepEqual(Object.keys(record).sort(), ['host', 'level', 'log', 'path', 'request_id']);
        assert.ok(Buffer.byteLength(record.log) <= 32768);
        assert.ok(Buffer.byteLength(body) <= 65536);
        records.push(record);
        res.writeHead(204).end();
      });
    });
    receiver.listen(44772, '127.0.0.1');
    await once(receiver, 'listening');
  }
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [injected ? '__efc_runtime-bootstrap.mjs' : 'server.js'], {
    cwd: injected ? path.resolve(runtimeDir) : projectDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_OPTIONS: '',
      ESA_EFC_FUNCTION_LOG_KEY: injected ? 'fixture-local-test' : '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  await waitFor(() => stdout.includes('listening on port') || child.exitCode !== null,
    '应用未启动');
  assert.equal(child.exitCode, null, `应用提前退出：${stderr}`);
}, { timeout: 15000 });

after(async () => {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  if (receiver?.listening) {
    receiver.closeAllConnections();
    await new Promise((resolve) => receiver.close(resolve));
  }
});

async function request(route, marker, trace = `trace-${marker}`, query = '') {
  const res = await fetch(`${base}/__console/${route}?marker=${marker}${query}`, {
    headers: { 'eagleeye-traceid': trace },
    signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, json: await res.json() };
}

async function captured(needle, count, route, trace) {
  await waitFor(() => records.filter((r) => r.log.includes(needle)).length >= count,
    `未收到 ${needle} 的 ${count} 条日志`);
  const found = records.filter((r) => r.log.includes(needle));
  assert.equal(found.length, count);
  for (const record of found) {
    assert.equal(record.request_id, trace);
    assert.equal(record.host, new URL(base).host);
    assert.equal(record.path, `/__console/${route}`);
  }
  return found;
}

test('健康检查与默认 marker 可直接使用', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const { json } = await request('levels', '');
  assert.match(json.marker, /^[a-f0-9]{32}$/);
});

test('启动日志在请求外生成', async () => {
  assert.match(stdout, /\[efc-console\]\[startup\]/);
  if (injected) {
    await waitFor(() => records.some((r) => r.log.includes('[startup]')), '未采集启动日志');
    const record = records.find((r) => r.log.includes('[startup]'));
    assert.match(record.request_id, /^startup-[a-f0-9]{32}$/);
    assert.equal(record.host, '');
    assert.equal(record.path, '');
  }
});

test('六种 console 方法保留原始输出并正确映射级别', async () => {
  const { status, json } = await request('levels', 'levels-test');
  assert.equal(status, 200);
  assert.deepEqual(json.methods, ['log', 'info', 'debug', 'warn', 'error', 'dir']);
  await waitFor(() => ['log', 'info', 'debug', 'dir'].every((method) => stdout.includes(`levels-test:${method}`))
    && ['warn', 'error'].every((method) => stderr.includes(`levels-test:${method}`)), '原生 console 输出缺失');
  if (injected) {
    const found = await captured('levels-test', 6, 'levels', 'trace-levels-test');
    for (const [method, level] of [['log', 'INFO'], ['info', 'INFO'], ['debug', 'DEBUG'],
      ['warn', 'WARNING'], ['error', 'ERROR'], ['dir', 'INFO']]) {
      assert.equal(found.find((r) => r.log.includes(`levels-test:${method}`))?.level, level);
    }
  }
});

test('对象、Error 与多行日志可观察', async () => {
  assert.equal((await request('format', 'format-test')).status, 200);
  await waitFor(() => stdout.includes('format-test:object') && stdout.includes('format-test:multiline')
    && stderr.includes('format-test:error'), '格式化输出缺失');
  if (injected) {
    const found = await captured('format-test', 3, 'format', 'trace-format-test');
    assert.ok(found.some((r) => r.log.includes('nested') && r.log.includes('中文')));
    assert.ok(found.some((r) => r.level === 'ERROR' && r.log.includes('Error:')));
    assert.ok(found.some((r) => r.log.includes('\n第二行\n第三行')));
  }
});

test('超长中文日志原生输出完整、采集记录截断', async () => {
  const { status, json } = await request('long', 'long-test');
  assert.equal(status, 200);
  assert.ok(json.bytes > 32768);
  await waitFor(() => stdout.includes('long-test:END'), '原生长日志不完整');
  if (injected) {
    const [record] = await captured('long-test:long', 1, 'long', 'trace-long-test');
    assert.ok(!record.log.includes('long-test:END'));
    assert.ok(!record.log.includes('\uFFFD'));
  }
});

test('并发异步请求不串 marker 或 request_id', async () => {
  const results = await Promise.all([
    request('async', 'async-slow', 'trace-async-slow', '&delayMs=100'),
    request('async', 'async-fast', 'trace-async-fast', '&delayMs=10'),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  await waitFor(() => stdout.includes('async-slow:after') && stdout.includes('async-fast:after'), '异步输出缺失');
  if (injected) {
    await captured('async-slow', 2, 'async', 'trace-async-slow');
    await captured('async-fast', 2, 'async', 'trace-async-fast');
  }
});

test('Node 子进程输出独立采集，不重复打印且不继承父请求上下文', async () => {
  assert.equal((await request('child', 'child-test')).status, 200);
  await waitFor(() => stdout.includes('child-test:child-log') && stderr.includes('child-test:child-error'), '子进程输出缺失');
  if (injected) {
    await waitFor(() => records.filter((r) => r.log.includes('child-test:child-')).length === 2, '子进程未采集');
    const found = records.filter((r) => r.log.includes('child-test:child-'));
    assert.deepEqual(found.map((r) => r.level).sort(), ['ERROR', 'INFO']);
    assert.equal(new Set(found.map((r) => r.request_id)).size, 1);
    for (const record of found) {
      assert.match(record.request_id, /^startup-[a-f0-9]{32}$/);
      assert.equal(record.host, '');
      assert.equal(record.path, '');
    }
    const parentStartup = records.find((r) => r.log.includes('[startup]')).request_id;
    assert.notEqual(found[0].request_id, parentStartup);
    await captured('child-test:parent', 1, 'child', 'trace-child-test');
  }
});

test('stdout/stderr 直写是 console 钩子的采集边界', async () => {
  assert.equal((await request('raw', 'raw-test')).status, 200);
  await waitFor(() => stdout.includes('raw-test:stdout-write') && stderr.includes('raw-test:stderr-write'), '直写输出缺失');
  if (injected) {
    await captured('raw-test:control', 1, 'raw', 'trace-raw-test');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(!records.some((r) => r.log.includes('raw-test:stdout-write') || r.log.includes('raw-test:stderr-write')));
  }
});

test('HTTP 错误通过错误中间件输出 console.error', async () => {
  assert.equal((await request('error', 'error-test')).status, 500);
  await waitFor(() => stderr.includes('error-test:http-error'), '错误中间件日志缺失');
  if (injected) {
    assert.equal((await captured('error-test', 1, 'error', 'trace-error-test'))[0].level, 'ERROR');
  }
});

test('marker 与延迟参数拒绝非法或无界输入', async () => {
  for (const marker of ['bad%0Amarker', 'x'.repeat(81), 'a%26b']) {
    assert.equal((await request('levels', marker)).status, 400);
  }
  for (const delay of ['-1', '1001', 'NaN', '1.5']) {
    assert.equal((await request('async', 'invalid-delay', undefined, `&delayMs=${delay}`)).status, 400);
  }
});

test('部署探针触发全部场景与并发请求，每轮提供唯一 marker', async () => {
  const { stdout: output } = await promisify(execFile)(process.execPath, ['probe.mjs', base], {
    cwd: projectDir,
    timeout: 30000,
  });
  assert.match(output, /✓12 ✗0/);
  const marker = output.match(/marker=(efc-[a-f0-9]{32})/)?.[1];
  assert.ok(marker, '探针未提供本轮唯一标记');
  if (injected) {
    await waitFor(() => records.filter((r) => r.log.includes(marker)).length === 21, '探针场景日志不完整');
    for (const suffix of ['async-slow', 'async-fast']) {
      await captured(`${marker}-${suffix}`, 2, 'async', `${marker}-${suffix}`);
    }
  }
});
