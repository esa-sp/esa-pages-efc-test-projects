import { spawnSync } from 'node:child_process';

const env = { ...process.env };

// sqlite3's pinned node-gyp 8 falls back to a source build when no prebuild is available.
// Prefer an installed Python that still provides distutils, while honoring explicit user settings.
if (!env.NODE_GYP_FORCE_PYTHON && !env.npm_config_python && !env.PYTHON) {
  const candidates = ['python3', 'python3.11', 'python3.10', 'python3.9'];
  if (process.platform === 'darwin') candidates.push('/usr/bin/python3');
  for (const python of candidates) {
    const result = spawnSync(python, ['-c', 'import distutils'], { stdio: 'ignore' });
    if (result.status === 0) {
      env.PYTHON = python;
      break;
    }
  }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['ci', '--no-audit', '--no-fund'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
