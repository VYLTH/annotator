#!/usr/bin/env node
/**
 * Thin Node shim around the Python `annotator` CLI.
 *
 * Resolution order:
 *   1. `annotator` already on PATH      → exec it
 *   2. `pipx run vylth-annotator …`      → if pipx is available
 *   3. `uvx vylth-annotator …`           → if uv is available
 *   4. Print a clear install hint and exit non-zero.
 *
 * The Node package never installs Python packages automatically — invasive
 * cross-language postinstalls are a recipe for breakage on CI / Windows / WSL.
 * The user runs one of the suggested commands once and everything works.
 */
import { spawnSync, execSync } from 'node:child_process';
import process from 'node:process';

function has(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function exec(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  process.exit(r.status ?? 1);
}

const args = process.argv.slice(2);

if (has('annotator')) {
  exec('annotator', args);
} else if (has('pipx')) {
  exec('pipx', ['run', 'vylth-annotator', ...args]);
} else if (has('uvx')) {
  exec('uvx', ['vylth-annotator', ...args]);
} else {
  console.error([
    '',
    '  vylth-annotator needs a Python runtime to run the local server.',
    '  Pick whichever you have:',
    '',
    '    pipx install vylth-annotator     # recommended — isolated install',
    '    uv tool install vylth-annotator  # if you use uv',
    '    pip install --user vylth-annotator',
    '',
    '  Then re-run this command. The npm package is a thin shim — the actual',
    '  service is the Python package on PyPI: https://pypi.org/project/vylth-annotator/',
    '',
  ].join('\n'));
  process.exit(127);
}
