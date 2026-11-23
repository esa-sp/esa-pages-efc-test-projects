// 独立 Express 应用：只调用原生 console，不安装钩子、不读取或输出平台日志密钥。
// 控制台根目录：Console-express；构建命令、静态目录、入口留空。
// GET /__console/<场景>?marker=<本轮标记>；async 可另传 delayMs=0..1000。
const express = require('express');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');

const app = express();
const methods = ['log', 'info', 'debug', 'warn', 'error', 'dir'];
const scenarios = ['levels', 'format', 'long', 'async', 'child', 'raw', 'error'];
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const tag = (marker, event) => `[efc-console] ${marker}:${event}`;

app.disable('x-powered-by');
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.json({
  project: 'Console-express',
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
