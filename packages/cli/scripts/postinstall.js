#!/usr/bin/env node
/**
 * npm postinstall hook for vylth-annotator.
 *
 * If `pipx` is on PATH, opportunistically runs `pipx install vylth-annotator`
 * so a single `npm i -g vylth-annotator` is enough to get a working `annotator`
 * command. If pipx is missing (or we're in CI / sandbox / Cloudflare Workers /
 * any non-interactive context), we exit 0 with a friendly hint — never fail
 * the npm install.
 *
 * Skip conditions:
 *   - CI=true (GitHub Actions, GitLab CI, CircleCI, Vercel build, etc.)
 *   - npm_config_global is unset AND ignore-scripts isn't honored
 *   - VYLTH_ANNOTATOR_SKIP_POSTINSTALL=1 (manual escape hatch)
 *   - Running under sudo on Linux (could pollute root's pipx)
 *   - On Windows where pipx integration is shakier
 */
import { execSync, spawnSync } from 'node:child_process';
import process from 'node:process';

function note(msg) { process.stdout.write(msg + '\n'); }

function isCI() {
  return Boolean(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.BUILDKITE
  );
}

function has(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
}

function main() {
  if (process.env.VYLTH_ANNOTATOR_SKIP_POSTINSTALL === '1') return;
  if (isCI()) return;
  // sudo guard on Linux/macOS — don't pipx-install into root context
  if (process.platform !== 'win32' && process.getuid?.() === 0) return;

  // If `annotator` is already on PATH (from a previous install or a manual one),
  // nothing to do.
  if (has('annotator')) {
    note('  ✓ annotator already on PATH — skipping pipx install');
    return;
  }

  if (has('pipx')) {
    note('');
    note('  → vylth-annotator npm postinstall: running `pipx install vylth-annotator`');
    note('    (one-time, ~30 seconds — installs the Python service backing the CLI)');
    note('');
    const r = run('pipx', ['install', 'vylth-annotator', '--quiet']);
    if (r.status === 0) {
      note('  ✓ Installed. Run `annotator setup` in your project, or `annotator run` for the local server.');
    } else {
      note('  ✗ pipx install failed. The npm shim still works — running `annotator <cmd>` will retry via `pipx run`.');
    }
    return;
  }

  if (has('uv')) {
    note('');
    note('  → vylth-annotator npm postinstall: running `uv tool install vylth-annotator`');
    note('');
    const r = run('uv', ['tool', 'install', 'vylth-annotator']);
    if (r.status === 0) {
      note('  ✓ Installed. Run `annotator setup` in your project, or `annotator run` for the local server.');
    }
    return;
  }

  // No Python tooling found — print platform-specific hint and exit clean.
  const platform = process.platform;
  const hint =
    platform === 'darwin' ? 'brew install pipx' :
    platform === 'win32'  ? 'python -m pip install --user pipx   (then `pipx ensurepath`)' :
    'sudo apt install pipx   # or: sudo dnf install pipx / sudo pacman -S python-pipx';

  note('');
  note('  vylth-annotator: install pipx to finish setup, then re-run `npm i -g vylth-annotator`:');
  note('');
  note(`    ${hint}`);
  note('');
  note('  (Or use uv: `pip install uv && uv tool install vylth-annotator`)');
  note('  Skip this hook with: VYLTH_ANNOTATOR_SKIP_POSTINSTALL=1');
  note('');
}

try {
  main();
} catch (e) {
  // Never fail the npm install — print the error for transparency and move on.
  console.error('vylth-annotator postinstall warning:', e?.message || e);
  process.exit(0);
}
