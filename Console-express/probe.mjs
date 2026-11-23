#!/usr/bin/env node
// 部署后执行：npm run probe -- https://<部署域名>，再到控制台运行时日志中按输出的 marker 搜索。
// 此脚本只验证 HTTP，不访问日志密钥或日志接收端；HTTP 通过不等于云端日志验收通过。
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAssertions, runChecks } from '../scripts/check.mjs';

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error('用法：npm run probe -- https://<部署域名>');
    process.exitCode = 2;
    return;
  }
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请提供不含认证信息的 HTTP 或 HTTPS 域名');
  }
  const marker = `efc-${randomUUID().replace(/-/g, '')}`;
  console.log(`marker=${marker}`);
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const assertions = loadAssertions(dir).map((assertion) => {
    const target = new URL(assertion.path, url);
    // 保留非法 marker 的负例；其余请求采用本轮唯一标记和对应 trace。
    if (assertion.expectedStatus === 400 || !target.searchParams.has('marker')) return assertion;
    const scenario = target.pathname.split('/').at(-1);
    const requestMarker = `${marker}-${scenario}`;
    target.searchParams.set('marker', requestMarker);
    return {
      ...assertion,
      path: target.pathname + target.search,
      headers: { ...assertion.headers, 'eagleeye-traceid': requestMarker },
      bodyJsonSubset: { ...assertion.bodyJsonSubset, marker: requestMarker },
    };
  });
  const results = await runChecks(url, assertions);
  // 一慢一快同时发出，控制台应看到 before/after 交错，但每组 request_id 保持一致。
  const concurrent = await Promise.all([['slow', 100], ['fast', 10]].map(([name, delayMs]) => {
    const requestMarker = `${marker}-async-${name}`;
    return runChecks(url, [{
      path: `/__console/async?marker=${requestMarker}&delayMs=${delayMs}`,
      headers: { 'eagleeye-traceid': requestMarker },
      expectedStatus: 200,
      bodyJsonSubset: { ok: true, marker: requestMarker, delayMs },
    }]);
  }));
  results.push(...concurrent.flat());
  for (const result of results) {
    console.log(`${result.ok ? '✓' : '✗'} ${result.label} → ${result.status ?? '请求失败'}`);
    for (const error of result.errors) console.error(`  ${error}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n✓${results.length - failed} ✗${failed}`);
  console.log(`在控制台按 ${marker} 搜索：levels 六条（INFO/DEBUG/WARNING/ERROR），format 三条，long 一条（最多32KiB），async 三组各两条，child 子进程两条和父进程一条，raw 仅一条 console 对照，error 一条。`);
  console.log('子进程 request_id 独立；stdout/stderr 直写不要求出现在 console 采集记录中。若平台改写入站 trace，以实际 request_id 的组内一致性为准。');
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
