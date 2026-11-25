// 独立 Express 应用：不安装采集钩子；诊断只判断密钥存在性与格式，不输出密钥。
// 控制台根目录：Console-express；构建命令、静态目录、入口留空。
// GET /__console/<场景>?marker=<本轮标记>；async 可另传 delayMs=0..1000。
const express = require('express');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { AsyncLocalStorage } = require('node:async_hooks');
const diagnostics = require('node:diagnostics_channel');
const { performance } = require('node:perf_hooks');

const reportContext = new AsyncLocalStorage();
const reportWaitMs = 5500;
const logEndpoint = 'http://127.0.0.1:44772/function-logs';

function runtimeStatus() {
  const hook = globalThis[Symbol.for('esa.runtime-log')];
  const key = process.env.ESA_EFC_FUNCTION_LOG_KEY || '';
  return {
    nodeVersion: process.version,
    pid: process.pid,
    hookLoaded: Boolean(hook),
    hookInstalled: hook?.installed === true,
    logKeyPresent: key.length > 0,
    logKeyValid: /^[\x21-\x7e]{1,4096}$/.test(key),
    observer: 'node:diagnostics_channel/http.client.request.start',
  };
}

// 观察原生 HTTP 事件，不替换 request；钩子安装时缓存的原始 request 也能被观察。
// 不读取认证头、上传正文或响应正文；上下文只绑定本轮 report，不收集其他业务请求。
diagnostics.subscribe('http.client.request.start', ({ request }) => {
  try {
    const probe = reportContext.getStore();
    if (!probe || probe.settled || probe.upload.attempts > 0
      || request.method !== 'POST' || request.path !== '/function-logs'
      || request.host !== '127.0.0.1' || request.getHeader('host') !== '127.0.0.1:44772') {
      return;
    }
    const upload = probe.upload;
    upload.attempts = 1;
    upload.requestStarted = true;
    upload.requestStartedAt = new Date().toISOString();
    const failed = (error) => {
      const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.code)
        ? error.code : 'UNKNOWN';
      probe.finish('request_error', `上报请求失败：${code}`, code);
    };
    const closed = () => probe.finish('request_closed', '上报请求未完成即关闭');
    request.once('error', failed);
    request.once('close', closed);
    request.once('response', (response) => {
      if (probe.settled) {
        return;
      }
      upload.responseReceived = true;
      upload.statusCode = response.statusCode;
      upload.responseReceivedAt = new Date().toISOString();
      response.once('error', failed);
      response.once('aborted', closed);
      response.once('close', closed);
      response.once('end', () => {
        if (probe.settled) {
          return;
        }
        upload.responseCompleted = response.complete;
        if (response.complete) {
          probe.finish('http_response', `上报接口返回 HTTP ${response.statusCode}`);
        } else {
          closed();
        }
      });
    });
  } catch {
    // 诊断异常不能影响实际上传；由本轮观察窗口返回未观察到或未完成状态。
  }
});

function reportUpload(marker) {
  const started = performance.now();
  const result = {
    ok: true,
    scenario: 'report',
    marker,
    runtime: runtimeStatus(),
    upload: {
      endpoint: logEndpoint,
      method: 'POST',
      consoleMethod: 'log',
      consoleTriggeredAt: new Date().toISOString(),
      status: 'pending',
      message: null,
      attempts: 0,
      requestStarted: false,
      requestStartedAt: null,
      responseReceived: false,
      responseReceivedAt: null,
      responseCompleted: false,
      statusCode: null,
      httpSucceeded: false,
      errorCode: null,
      elapsedMs: 0,
      maxWaitMs: reportWaitMs,
      observerTimedOut: false,
    },
  };
  return new Promise((resolve) => {
    let timer;
    const probe = {
      upload: result.upload,
      settled: false,
      finish(status, message, errorCode = null) {
        if (probe.settled) {
          return;
        }
        probe.settled = true;
        clearTimeout(timer);
        Object.assign(result.upload, {
          status, message, errorCode,
          elapsedMs: Math.round((performance.now() - started) * 100) / 100,
          completedAt: new Date().toISOString(),
          httpSucceeded: status === 'http_response' && result.upload.responseCompleted
            && result.upload.statusCode >= 200 && result.upload.statusCode < 300,
        });
        // 绕过 console，避免诊断再次上报；即使即时日志不可用，HTTP 响应仍包含结果。
        try {
          process.stdout.write(`[efc-console-report] ${JSON.stringify(result)}\n`);
        } catch {
          // 原生输出失败不影响诊断响应。
        }
        resolve(result);
      },
    };
    timer = setTimeout(() => {
      result.upload.observerTimedOut = true;
      if (result.upload.attempts === 0) {
        probe.finish('not_observed', '未观察到上报请求');
      } else {
        probe.finish('request_closed', '上报请求未完成即关闭');
      }
    }, reportWaitMs);
    reportContext.run(probe, () => console.log(tag(marker, 'report'), 'console.log'));
    if (!result.runtime.hookInstalled) {
      setImmediate(() => {
        if (result.upload.attempts === 0) {
          probe.finish('not_installed', '未观察到采集钩子安装');
        }
      });
    }
  });
}

const app = express();
const methods = ['log', 'info', 'debug', 'warn', 'error', 'dir'];
const scenarios = ['levels', 'format', 'long', 'async', 'child', 'raw', 'error', 'report'];
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const tag = (marker, event) => `[efc-console] ${marker}:${event}`;

app.disable('x-powered-by');
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.json({
  project: 'Console-express',
  reportUrl: '/__console/report?marker=test1',
  usage: '/__console/<场景>?marker=<字母、数字、下划线或连字符，最多80位>',
  scenarios,
  notes: [
    'HTTP 成功只证明日志已触发；是否采集请在运行时日志中按 marker 查找。',
    '子进程会独立生成 request_id，不自动继承父请求上下文。',
    'stdout/stderr 直写不属于 console 钩子的采集范围。',
  ],
}));

app.use('/__console', (req, res, next) => {
  const marker = req.query.marker || randomUUID().replace(/-/g, '');
  if (typeof marker !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(marker)) {
    return res.status(400).json({ ok: false, error: 'marker 必须为1至80位字母、数字、下划线或连字符' });
  }
  res.locals.marker = marker;
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/__console/report', asyncHandler(async (_req, res) => {
  res.json(await reportUpload(res.locals.marker));
}));

app.get('/__console/levels', (_req, res) => {
  const marker = res.locals.marker;
  console.log(tag(marker, 'log'), 'console.log');
  console.info(tag(marker, 'info'), 'console.info');
  console.debug(tag(marker, 'debug'), 'console.debug');
  console.warn(tag(marker, 'warn'), 'console.warn');
  console.error(tag(marker, 'error'), 'console.error');
  console.dir({ marker: tag(marker, 'dir'), nested: { message: '中文对象' } });
  res.json({ ok: true, scenario: 'levels', marker, methods });
});

app.get('/__console/format', (_req, res) => {
  const marker = res.locals.marker;
  console.log(tag(marker, 'object'), { nested: { message: '中文', list: [1, true, null] } });
  console.error(tag(marker, 'error'), new Error('测试 Error 与堆栈'));
  console.info(`${tag(marker, 'multiline')} 第一行\n第二行\n第三行`);
  res.json({ ok: true, scenario: 'format', marker, logs: 3 });
});

app.get('/__console/long', (_req, res) => {
  const marker = res.locals.marker;
  const text = `${tag(marker, 'long')} ${'中文'.repeat(8192)} ${marker}:END`;
  console.log(text);
  res.json({ ok: true, scenario: 'long', marker, bytes: Buffer.byteLength(text) });
});

app.get('/__console/async', asyncHandler(async (req, res) => {
  const rawDelay = req.query.delayMs ?? '50';
  if (typeof rawDelay !== 'string' || !/^\d{1,4}$/.test(rawDelay) || Number(rawDelay) > 1000) {
    return res.status(400).json({ ok: false, error: 'delayMs 必须为0至1000的整数' });
  }
  const marker = res.locals.marker;
  const delayMs = Number(rawDelay);
  console.info(tag(marker, 'before'), { delayMs });
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  console.info(tag(marker, 'after'), { delayMs });
  res.json({ ok: true, scenario: 'async', marker, delayMs });
}));

app.get('/__console/child', asyncHandler(async (_req, res) => {
  const marker = res.locals.marker;
  // 静态脚本 + argv，不经过 shell；继承 NODE_OPTIONS，但不传递父请求的 trace。
  // 不把子进程输出再 console.log 一遍，避免重复采集。
  const script = "const marker = process.argv[1]; console.log('[efc-console] ' + marker + ':child-log'); console.error('[efc-console] ' + marker + ':child-error');";
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', script, marker], { stdio: ['ignore', 'inherit', 'inherit'] });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('测试子进程超过5秒未退出'));
    }, 5000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`测试子进程退出码：${code}`));
    });
  });
  console.info(tag(marker, 'parent'), '子进程已退出');
  res.json({ ok: true, scenario: 'child', marker });
}));

app.get('/__console/raw', (_req, res) => {
  const marker = res.locals.marker;
  process.stdout.write(`${tag(marker, 'stdout-write')}\n`);
  process.stderr.write(`${tag(marker, 'stderr-write')}\n`);
  console.info(tag(marker, 'control'), '用于对照的 console 日志');
  res.json({ ok: true, scenario: 'raw', marker, consoleLogs: 1, directWrites: 2 });
});

app.get('/__console/error', (_req, _res, next) => next(new Error('主动触发 HTTP 500 测试')));
app.use((error, _req, res, _next) => {
  const marker = res.locals.marker || 'unmarked';
  console.error(tag(marker, 'http-error'), error);
  res.status(500).json({ ok: false, scenario: 'error', marker, error: error.message });
});

// EFC 的 backend-runtime 会接管 app.listen 并丢弃回调，启动日志在模块加载时输出。
console.log('[efc-console][startup] app module loaded');
app.listen(process.env.PORT || 3000, () => {
  console.log(`listening on port ${process.env.PORT || 3000}`);
});
