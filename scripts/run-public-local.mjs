#!/usr/bin/env node

import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { formatProbe, probePublic } from './probe-public.mjs';
import { serveStatic } from './local-static.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(repository, 'public-projects');
const generated = new Set([
  '.git', 'node_modules', '.next', '.astro', '.nuxt', '.nitro', '.output', '.pcg',
  '.pnpm-store', '.turbo', '.ts-build', 'dist', 'out', 'index.zip', '.DS_Store'
]);
const running = new Set();
let interrupted = false;

function kill(task, signal) {
  try {
    if (process.platform === 'win32') task.child.kill(signal);
    else if (task.child.pid) process.kill(-task.child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

function interrupt() {
  interrupted = true;
  for (const task of running) kill(task, 'SIGTERM');
}

async function launch(command, cwd, env, log) {
  if (interrupted) throw new Error('已中断');
  if (!Array.isArray(command) || !(command[0]?.length) || !command.every((arg) => typeof arg === 'string')) {
    throw new Error('local.json 中的命令必须是非空字符串数组');
  }
  const [executable, ...args] = command;
  const file = await fs.open(log, 'w');
  try {
    await file.write(`${JSON.stringify(command)}\n`);
    const child = spawn(executable === 'node' ? process.execPath : executable, args, {
      cwd, env, stdio: ['ignore', file.fd, file.fd], detached: process.platform !== 'win32'
    });
    const task = { child, log };
    task.done = new Promise((resolve) => {
      function finish(status) {
        running.delete(task);
        task.status = status;
        resolve(status);
      }
      child.once('error', (error) => finish({ error }));
      child.once('exit', (code, signal) => finish({ code, signal }));
    });
    running.add(task);
    return task;
  } finally {
    await file.close();
  }
}

async function runCommand(command, cwd, env, logs, phase, maxWaitMs) {
  const task = await launch(command, cwd, env, path.join(logs, `${phase}.log`));
  const timer = setTimeout(() => kill(task, 'SIGKILL'), maxWaitMs);
  try {
    const status = await task.done;
    if (status.code !== 0) {
      throw new Error(`${phase} 失败（${status.error?.message ?? status.signal ?? status.code}），见 ${task.log}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHttp(task, base, readiness = '/') {
  const until = Date.now() + 60000;
  while (Date.now() < until) {
    if (interrupted) throw new Error('已中断');
    if (task.status) {
      throw new Error(`服务提前退出（${task.status.error?.message ?? task.status.signal ?? task.status.code}），见 ${task.log}`);
    }
    try {
      const response = await fetch(new URL(readiness, base), { signal: AbortSignal.timeout(1500) });
      await response.body?.cancel();
      return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`服务启动超时，见 ${task.log}`);
}

async function stop(task) {
  if (!task) return;
  kill(task, 'SIGTERM');
  const force = setTimeout(() => kill(task, 'SIGKILL'), 4000);
  try {
    await task.done;
  } finally {
    clearTimeout(force);
  }
}

function environment(config) {
  const env = {
    ...process.env,
    PATH: [path.dirname(process.execPath), process.env.PATH].filter(Boolean).join(path.delimiter),
    npm_config_registry: process.env.npm_config_registry || 'https://registry.npmjs.org',
    COREPACK_NPM_REGISTRY: process.env.COREPACK_NPM_REGISTRY || 'https://registry.npmjs.org',
    NEXT_TELEMETRY_DISABLED: '1',
    ASTRO_TELEMETRY_DISABLED: '1',
    NUXT_TELEMETRY_DISABLED: '1'
  };
  delete env.NODE_ENV;
  for (const [target, source] of Object.entries(config.envFrom ?? {})) {
    if (!process.env[source]) throw new Error(`本地测试需要环境变量 ${source}`);
    env[target] = process.env[source];
  }
  return { ...env, ...config.env };
}

async function runProject(name, logRoot) {
  const project = path.join(fixtures, name);
  const logs = path.join(logRoot, name);
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'esa-public-'));
  const work = path.join(scratch, name);
  let application;
  let staticServer;
  try {
    await fs.mkdir(logs, { recursive: true });
    await fs.cp(project, work, {
      recursive: true,
      filter(source) {
        const file = path.basename(source);
        return !generated.has(file) && !file.endsWith('.tsbuildinfo') &&
          !/^\.env(?:\.|$)/.test(file);
      }
    });
    const config = JSON.parse(await fs.readFile(path.join(work, 'local.json'), 'utf8'));
    if (Boolean(config.start) === Boolean(config.staticDir)) {
      throw new Error('local.json 应且仅应配置 start 或 staticDir');
    }
    const env = environment(config);
    await runCommand(config.install, work, env, logs, 'install', 15 * 60000);
    if (config.build) await runCommand(config.build, work, env, logs, 'build', 15 * 60000);
    if (config.prepare) await runCommand(config.prepare, work, env, logs, 'prepare', 3 * 60000);

    let base;
    if (config.staticDir) {
      staticServer = await serveStatic(path.join(work, config.staticDir));
      base = staticServer.base;
    } else {
      const port = String(await availablePort());
      const host = '127.0.0.1';
      base = `http://${host}:${port}`;
      application = await launch(config.start, work, {
        NODE_ENV: 'production', ...env,
        PORT: port, HOST: host, HOSTNAME: host, NITRO_PORT: port, NITRO_HOST: host
      }, path.join(logs, 'server.log'));
      await waitForHttp(application, base, config.readiness);
    }
    const results = await probePublic(work, base);
    await fs.writeFile(path.join(logs, 'probe.log'), formatProbe(results));
    const passed = results.filter((result) => result.ok).length;
    const failed = results.length - passed;
    return { project: name, status: failed ? 'failed' : 'passed', passed, failed, logs };
  } catch (error) {
    return { project: name, status: 'failed', error: error.message, logs };
  } finally {
    await stop(application);
    await staticServer?.close();
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jobsAt = args.indexOf('--jobs');
  const jobs = jobsAt >= 0 ? Number(args.splice(jobsAt, 2)[1]) : 1;
  if (!Number.isInteger(jobs) || jobs < 1) throw new Error('--jobs 需要正整数');
  const all = (await fs.readdir(fixtures, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name).sort();
  const selected = args.length === 1 && args[0] === '--all'
    ? all
    : [...new Set(args.map((arg) => arg.replace(/^public-projects\//, '')))];
  if (!selected.length || selected.some((name) => !all.includes(name))) {
    throw new Error(`用法：node scripts/run-public-local.mjs [--jobs N] --all | <项目名>...\n可选项目：${all.join(', ')}`);
  }
  const logBase = path.join(repository, '.local-test', 'public-projects');
  await fs.mkdir(logBase, { recursive: true });
  const logRoot = await fs.mkdtemp(path.join(logBase, 'run-'));
  const startedAt = new Date().toISOString();
  const results = new Array(selected.length);
  console.log(`Node ${process.version}，${selected.length} 个项目，日志 ${logRoot}`);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, selected.length) }, async () => {
    while (!interrupted && next < selected.length) {
      const index = next++;
      const name = selected[index];
      console.log(`开始 ${name}`);
      const result = await runProject(name, logRoot);
      results[index] = result;
      console.log(result.status === 'passed'
        ? `✓ ${name} (${result.passed} 条)`
        : `✗ ${name} (${result.error ?? `${result.failed} 条断言失败，见 ${result.logs}/probe.log`})`);
    }
  }));
  const finished = results.filter(Boolean);
  const passed = finished.filter((result) => result.status === 'passed').length;
  const failed = finished.length - passed;
  const skipped = selected.length - finished.length;
  await fs.writeFile(path.join(logRoot, 'summary.json'), JSON.stringify({
    startedAt, node: process.version, passed, failed, skipped, results: finished
  }, null, 2) + '\n');
  console.log(`项目通过 ${passed}，失败 ${failed}，未执行 ${skipped}，证据 ${logRoot}/summary.json`);
  process.exitCode = interrupted ? 130 : failed ? 1 : 0;
}

process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
