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
// 可选：使用已有构建产物中的真实钩子，单独验证当前示例的诊断路由。
const hookFile = process.env.EFC_CONSOLE_HOOK_FILE
  || (runtimeDir ? path.resolve(runtimeDir, '__efc_runtime-hooks.cjs') : '');
const records = [];
let receiverReply = (_record, res) => res.writeHead(204).end();
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
  if (injected || hookFile) {
    receiver = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        assert.equal(req.method, 'POST');
        assert.equal(req.url, '/function-logs');
        assert.ok(['fixture-local-test', 'fixture-report-secret'].includes(req.headers['x-efc-function-log-key']));
        const record = JSON.parse(body);
        assert.deepEqual(Object.keys(record).sort(), ['host', 'level', 'log', 'path', 'request_id']);
        assert.ok(Buffer.byteLength(record.log) <= 32768);
        assert.ok(Buffer.byteLength(body) <= 65536);
        records.push(record);
        receiverReply(record, res);
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

async function reportApp(t, { loadHook = Boolean(hookFile), key = 'fixture-report-secret', disableLog = false } = {}) {
  const port = await freePort();
  let output = '';
  let errors = '';
  const script = [
    loadHook ? `require(${JSON.stringify(path.resolve(hookFile))});` : '',
    disableLog ? 'console.log = new (require("node:console").Console)(process.stdout, process.stderr).log;' : '',
    `require(${JSON.stringify(path.join(projectDir, 'server.js'))});`,
  ].join('\n');
  const app = spawn(process.execPath, ['-e', script], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(port), NODE_OPTIONS: '', ESA_EFC_FUNCTION_LOG_KEY: key },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  app.stderr.setEncoding('utf8').on('data', (chunk) => { errors += chunk; });
  t.after(async () => {
    receiverReply = (_record, res) => res.writeHead(204).end();
    if (app.exitCode === null) {
      const exited = once(app, 'exit');
      app.kill('SIGTERM');
      await exited;
    }
  });
  await waitFor(() => output.includes('listening on port') || app.exitCode !== null, '诊断应用未启动');
  assert.equal(app.exitCode, null, errors);
  return {
    output: () => output + errors,
    health: async () => {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(3000) });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    },
    request: async (marker) => {
      const res = await fetch(`http://127.0.0.1:${port}/__console/report?marker=${marker}`, {
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'no-store');
      return res.json();
    },
  };
}

// 下列断言保护真实上报的状态判定、失败路径、并发隔离及不递归，不以模拟 console 替代采集钩子。
test('未注入钩子时明确返回未安装，而非误报上报成功', async (t) => {
  const app = await reportApp(t, { loadHook: false });
  const result = await app.request('report-no-hook');
  assert.equal(result.runtime.hookLoaded, false);
  assert.equal(result.runtime.hookInstalled, false);
  assert.equal(result.runtime.logKeyPresent, true);
  assert.equal(result.runtime.logKeyValid, true);
  assert.equal(result.upload.status, 'not_installed');
  assert.equal(result.upload.attempts, 0);
  assert.equal(result.upload.httpSucceeded, false);
  assert.equal(result.upload.statusCode, null);
  assert.ok(!JSON.stringify(result).includes('fixture-report-secret'));
  await waitFor(() => app.output().includes('未观察到采集钩子安装'), '未输出诊断');
  assert.ok(!app.output().includes('fixture-report-secret'));
});

for (const [label, key, present] of [['缺失', '', false], ['非法', 'bad key', true]]) {
  test(`日志密钥${label}时只暴露安全布尔状态`, { skip: !hookFile }, async (t) => {
    const app = await reportApp(t, { key });
    const result = await app.request(`report-key-${present}`);
    assert.equal(result.runtime.hookLoaded, true);
    assert.equal(result.runtime.hookInstalled, false);
    assert.equal(result.runtime.logKeyPresent, present);
    assert.equal(result.runtime.logKeyValid, false);
    assert.equal(result.upload.status, 'not_installed');
    assert.equal(result.upload.attempts, 0);
    assert.equal(result.upload.httpSucceeded, false);
    if (key) {
      assert.ok(!JSON.stringify(result).includes(key));
      assert.ok(!app.output().includes(key));
    }
  });
}

for (const [code, succeeded] of [[204, true], [401, false], [500, false]]) {
  test(`真实上报 HTTP ${code} 的结果准确，诊断不产生额外上报`, { skip: !hookFile }, async (t) => {
    receiverReply = (_record, res) => res.writeHead(code, { 'x-test-secret': 'fixture-report-secret' }).end('fixture-report-secret');
    const app = await reportApp(t);
    const marker = `report-http-${code}`;
    const result = await app.request(marker);
    assert.equal(result.marker, marker);
    assert.equal(result.runtime.hookInstalled, true);
    assert.match(result.runtime.nodeVersion, /^v\d+/);
    assert.ok(result.runtime.pid > 0);
    assert.equal(result.upload.endpoint, 'http://127.0.0.1:44772/function-logs');
    assert.equal(result.upload.status, 'http_response');
    assert.equal(result.upload.statusCode, code);
    assert.equal(result.upload.responseReceived, true);
    assert.equal(result.upload.responseCompleted, true);
    assert.equal(result.upload.httpSucceeded, succeeded);
    assert.equal(result.upload.errorCode, null);
    assert.equal(result.upload.attempts, 1);
    assert.ok(result.upload.elapsedMs >= 0 && result.upload.elapsedMs < 5500);
    assert.ok(!JSON.stringify(result).includes('fixture-report-secret'));
    await waitFor(() => app.output().includes(`上报接口返回 HTTP ${code}`), 'HTTP 结果未输出');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(records.filter((r) => r.log.includes(marker)).length, 1);
    assert.ok(!records.some((r) => r.log.includes('[efc-console-report]')));
    assert.ok(!app.output().includes('fixture-report-secret'));
  });
}

test('端口不通时返回实际 ECONNREFUSED，健康检查仍可用', { skip: !hookFile }, async (t) => {
  receiver.closeAllConnections();
  await new Promise((resolve) => receiver.close(resolve));
  t.after(async () => {
    receiver.listen(44772, '127.0.0.1');
    await once(receiver, 'listening');
  });
  const app = await reportApp(t);
  const result = await app.request('report-refused');
  assert.equal(result.upload.status, 'request_error');
  assert.equal(result.upload.errorCode, 'ECONNREFUSED');
  assert.equal(result.upload.httpSucceeded, false);
  assert.equal(result.upload.responseReceived, false);
  assert.equal(result.upload.attempts, 1);
  await waitFor(() => app.output().includes('上报请求失败：ECONNREFUSED'), '连接失败未输出');
  await app.health();
});

test('HTTP 200 响应未结束时不能误报成功，钩子 deadline 后返回关闭状态', { skip: !hookFile, timeout: 15000 }, async (t) => {
  receiverReply = (_record, res) => { res.writeHead(200); res.flushHeaders(); };
  const app = await reportApp(t);
  const result = await app.request('report-incomplete');
  assert.equal(result.upload.status, 'request_closed');
  assert.equal(result.upload.statusCode, 200);
  assert.equal(result.upload.responseReceived, true);
  assert.equal(result.upload.responseCompleted, false);
  assert.equal(result.upload.httpSucceeded, false);
  assert.ok(result.upload.elapsedMs >= 4500 && result.upload.elapsedMs < 5500);
  await waitFor(() => app.output().includes('上报请求未完成即关闭'), '未完成状态未输出');
});

test('钩子存在但本轮未上报时不把其他 console 的请求当作成功', { skip: !hookFile, timeout: 15000 }, async (t) => {
  const app = await reportApp(t, { disableLog: true });
  const result = await app.request('report-unobserved');
  assert.equal(result.runtime.hookInstalled, true);
  assert.equal(result.upload.status, 'not_observed');
  assert.equal(result.upload.attempts, 0);
  assert.equal(result.upload.httpSucceeded, false);
  await waitFor(() => app.output().includes('未观察到上报请求'), '无上报状态未输出');
});

test('并发诊断的成功与失败结果按 marker 隔离', { skip: !hookFile }, async (t) => {
  receiverReply = (record, res) => {
    const denied = record.log.includes('report-concurrent-denied');
    setTimeout(() => res.writeHead(denied ? 401 : 204).end(), denied ? 40 : 5);
  };
  const app = await reportApp(t);
  const [denied, accepted] = await Promise.all([
    app.request('report-concurrent-denied'), app.request('report-concurrent-accepted'),
  ]);
  assert.equal(denied.marker, 'report-concurrent-denied');
  assert.equal(denied.upload.statusCode, 401);
  assert.equal(denied.upload.httpSucceeded, false);
  assert.equal(accepted.marker, 'report-concurrent-accepted');
  assert.equal(accepted.upload.statusCode, 204);
  assert.equal(accepted.upload.httpSucceeded, true);
  assert.equal(denied.upload.attempts, 1);
  assert.equal(accepted.upload.attempts, 1);
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
