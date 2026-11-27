#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAssertions, runChecks } from './check.mjs';

// 取本轮页面真正引用的打包文件，避免把含动态 hash 的文件名写进断言。
function htmlAssetChecks(html, page, images) {
  const assets = new Map();
  for (const [, tag, rawAttributes] of html.matchAll(/<(script|link|img)\b([^>]+)>/gi)) {
    const attrs = new Map(
      [...rawAttributes.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g)]
        .map(([, name, double, single, unquoted]) => [name.toLowerCase(), double ?? single ?? unquoted])
    );
    const type = tag.toLowerCase();
    if (images !== (type === 'img')) continue;
    if (type === 'link' && !attrs.get('rel')?.toLowerCase().split(/\s+/).includes('stylesheet')) continue;
    const ref = attrs.get(type === 'link' ? 'href' : 'src');
    if (!ref) continue;

    let url;
    try {
      url = new URL(ref.replaceAll('&amp;', '&'), page);
    } catch {
      continue;
    }
    if (url.origin !== page.origin || !['http:', 'https:'].includes(url.protocol)) continue;
    const assetPath = url.pathname + url.search;
    assets.set(assetPath, {
      path: assetPath,
      expectedStatus: 200,
      headersContain: { 'content-type': type === 'script' ? 'javascript' : type === 'img' ? 'image/' : 'text/css' }
    });
  }
  return [...assets.values()];
}

export async function probePublic(project, base) {
  const config = JSON.parse(await fs.readFile(path.join(project, 'local.json'), 'utf8'));
  const assertions = loadAssertions(project);
  if (!assertions.length) throw new Error(`${project} 的 checks.json 没有断言`);
  const results = await runChecks(base, assertions);
  const assets = new Map();
  for (const [pages, images] of [[config.htmlAssets, false], [config.htmlImages, true]]) {
    for (const pagePath of pages ?? []) {
      const label = `${images ? '页面图片' : '页面资产'} ${pagePath}`;
      try {
        const page = new URL(pagePath, base);
        const response = await fetch(page, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
        if (response.status !== 200) throw new Error(`页面 HTTP ${response.status}`);
        const checks = htmlAssetChecks(await response.text(), page, images);
        if (!checks.length) throw new Error(`页面未引用同域${images ? '图片' : '脚本或样式'}`);
        for (const check of checks) assets.set(check.path, check);
      } catch (error) {
        results.push({ label, ok: false, errors: [error.message] });
      }
    }
  }
  return [...results, ...await runChecks(base, [...assets.values()])];
}

export function formatProbe(results) {
  const lines = [];
  for (const result of results) {
    const status = result.status === undefined ? '' : ` → ${result.status}`;
    lines.push(`${result.ok ? '✓' : '✗'} ${result.label}${status}`);
    for (const error of result.errors ?? []) lines.push(`    ${error}`);
  }
  const passed = results.filter((result) => result.ok).length;
  lines.push('', `✓${passed} ✗${results.length - passed}`);
  return lines.join('\n') + '\n';
}

async function main() {
  const [project, base] = process.argv.slice(2);
  if (!project || !base) throw new Error('用法：node scripts/probe-public.mjs <项目目录> <部署域名>');
  const results = await probePublic(project, base);
  process.stdout.write(formatProbe(results));
  process.exitCode = results.some((result) => !result.ok) ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
