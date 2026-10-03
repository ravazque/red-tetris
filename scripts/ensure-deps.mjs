// Runs before `npm test` and `npm run coverage` (pretest / precoverage hooks):
// installs the dependencies of every package that is missing them, so a fresh clone needs no `npm install` first.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES = ['srcs/server', 'srcs/client'];

// On Windows npm is npm.cmd, which only runs through a shell.
const npm = (cwd, args) =>
  spawnSync('npm', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });

// `npm ls` exits non-zero when a dependency is missing or does not match package.json.
const installed = (cwd) => existsSync(join(cwd, 'node_modules')) && npm(cwd, ['ls', '--depth=0']).status === 0;

let failed = false;

for (const pkg of PACKAGES) {
  if (installed(pkg)) continue;

  console.log(`[deps] ${pkg}: dependencies missing or outdated, running npm install...`);
  const result = spawnSync('npm', ['install'], { cwd: pkg, stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.error) {
    console.error(`[deps] ${pkg}: could not run npm (${result.error.message})`);
    failed = true;
  } else if (result.status !== 0) {
    console.error(`[deps] ${pkg}: npm install failed (exit code ${result.status})`);
    failed = true;
  }
}

if (failed) {
  console.error('[deps] Fix the errors above (network, Node version, permissions) or run `npm install` by hand.');
  process.exit(1);
}
