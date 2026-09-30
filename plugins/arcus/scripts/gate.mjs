#!/usr/bin/env node
// gate.mjs — deterministic review gate for the lean profile.
//
//   node gate.mjs run   --story <ID> [--skip-checks]   diff + risk + run repo checks → <DIR>/gate.json
//   node gate.mjs drift --story <ID>                   does this branch need a .context/ sync?
//
// Everything here has an objective answer, so none of it is left to a model. Commands come from
// `.arcus/config.json` → `gate.commands` first (authoritative), then from the repo's own manifests.
// A check with no resolvable command is reported `unresolved` — never assumed to pass.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HARD_CHECKS = ['typecheck', 'test', 'build'];
const CHECK_ORDER = ['typecheck', 'lint', 'test', 'build'];
const DEFAULT_TIMEOUT_S = 900;
const TAIL_LINES = 40;

const NOISE = [/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|go\.sum|Cargo\.lock|poetry\.lock|composer\.lock|Gemfile\.lock)$/, /\.lock$/, /\.min\.[a-z]+$/, /\.map$/, /(^|\/)(vendor|node_modules|dist|build)\//];
const DOC = /\.(md|mdx|txt|rst|adoc)$/i;

const SECRET_PATTERNS = [
  /-----BEGIN[ A-Z]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /(api|access|secret)[_-]?(key|token)['"]?\s*[:=]\s*['"]?[A-Za-z0-9_-]{16,}/i,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
];

const SECURITY_PATH = /(auth|login|session|token|jwt|oauth|saml|crypt|password|secret|permission|acl|rbac|policy|sanitiz|csrf|cors|cookie|webhook|payment)/i;
const SECURITY_CODE = /\b(exec|spawn|eval|innerHTML|dangerouslySetInnerHTML|deserializ|pickle\.loads|yaml\.load|subprocess|Runtime\.getRuntime|raw\s*sql|\$\{[^}]*\}\s*(FROM|WHERE)|createHash|bcrypt|verify|sign|decrypt|encrypt)\b/i;
const PERF_PATH = /(migrations?\/|repositor(y|ies)|dao|quer(y|ies)|cache|worker|queue|batch|stream|pool)/i;
const PERF_CODE = /\b(SELECT|JOIN|findAll|forEach\s*\(\s*async|Promise\.all|for\s*\(.*\)\s*\{[^}]*await|N\+1|setInterval|while\s*\(true\)|CREATE\s+INDEX|ALTER\s+TABLE|readFileSync|lock|mutex|synchronized)\b/i;

const DRIFT_RULES = [
  { re: /(^|\/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|Cargo\.toml|pom\.xml|build\.gradle(\.kts)?|Gemfile|composer\.json)$/, why: 'dependency/build manifest changed' },
  { re: /^\.github\/workflows\/|^\.gitlab-ci\.yml$|^Jenkinsfile$|^\.circleci\//, why: 'CI workflow changed' },
  { re: /\.(proto|graphql|avsc)$|openapi|swagger|(^|\/)schemas?\//i, why: 'contract/schema changed' },
  { re: /(^|\/)migrations?\//i, why: 'database migration added' },
  { re: /(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|Makefile)$/, why: 'build/run tooling changed' },
];

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}

function git(args) {
  const r = sh('git', args);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`);
  return r.stdout;
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function storyDir(story) {
  return join('.arcus', 'specs', story);
}

function loadCheckpoint(story) {
  const cp = readJson(join(storyDir(story), 'session-checkpoint.json'));
  if (!cp) throw new Error(`no checkpoint for ${story}`);
  return cp;
}

export function filterNoise(files) {
  return files.filter((f) => !NOISE.some((re) => re.test(f)) || /(^|\/)migrations?\//i.test(f));
}

function addedLines(diff) {
  return diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
}

export function classifyRisk(files, diff) {
  const added = addedLines(diff);
  const reasons = [];
  const secretHit = SECRET_PATTERNS.some((re) => re.test(added));
  const docsOnly = files.length > 0 && files.every((f) => DOC.test(f)) && !secretHit;
  const code = files.filter((f) => !DOC.test(f));
  if (secretHit) reasons.push('secret-shaped content in added lines');

  let security = secretHit;
  let performance = false;
  if (!docsOnly) {
    const secPath = code.find((f) => SECURITY_PATH.test(f));
    if (secPath) { security = true; reasons.push(`security-sensitive path: ${secPath}`); }
    if (SECURITY_CODE.test(added)) { security = true; reasons.push('security-sensitive API in added code'); }
    const perfPath = code.find((f) => PERF_PATH.test(f));
    if (perfPath) { performance = true; reasons.push(`performance-sensitive path: ${perfPath}`); }
    if (PERF_CODE.test(added)) { performance = true; reasons.push('performance-sensitive construct in added code'); }
  }
  return { docsOnly, security, performance, secretHit, reasons };
}

export function detectDrift(files, { hasContext = true, baseFiles = null } = {}) {
  if (!hasContext) return { drift: false, reasons: ['no .context/ directory — nothing to sync'] };
  const reasons = [];
  for (const f of files) {
    if (f.startsWith('.context/')) continue;
    const rule = DRIFT_RULES.find((r) => r.re.test(f));
    if (rule) reasons.push(`${rule.why}: ${f}`);
  }
  if (baseFiles) {
    const topBase = new Set(baseFiles.map((f) => f.split('/')[0]));
    for (const f of files) {
      const top = f.split('/')[0];
      if (f.includes('/') && !topBase.has(top)) { reasons.push(`new top-level directory: ${top}/`); topBase.add(top); }
    }
  }
  return { drift: reasons.length > 0, reasons };
}

// Resolve check commands: config wins; otherwise infer from manifests at the repo root.
export function resolveCommands(root = '.', config = readJson(join(root, '.arcus', 'config.json'))) {
  const configured = config?.gate?.commands || {};
  const skip = new Set(config?.gate?.skip || []);
  const out = {};
  const pkg = readJson(join(root, 'package.json'));
  const has = (f) => existsSync(join(root, f));
  const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : 'npm';
  const run = (s) => (pm === 'npm' ? `npm run -s ${s}` : `${pm} -s ${s}`);

  if (pkg?.scripts) {
    const s = pkg.scripts;
    if (s.typecheck) out.typecheck = run('typecheck');
    else if (s['type-check']) out.typecheck = run('type-check');
    else if (has('tsconfig.json')) out.typecheck = 'npx --no-install tsc --noEmit';
    if (s.lint) out.lint = run('lint');
    if (s.test && !/no test specified/.test(s.test)) out.test = pm === 'npm' ? 'npm test --silent' : `${pm} -s test`;
    if (s.build) out.build = run('build');
  } else if (has('go.mod')) {
    out.typecheck = 'go vet ./...';
    out.test = 'go test ./...';
    out.build = 'go build ./...';
  } else if (has('Cargo.toml')) {
    out.typecheck = 'cargo check -q';
    out.lint = 'cargo clippy -q -- -D warnings';
    out.test = 'cargo test -q';
  } else if (has('pyproject.toml') || has('setup.py') || has('requirements.txt')) {
    const py = readFileSync(join(root, has('pyproject.toml') ? 'pyproject.toml' : has('setup.py') ? 'setup.py' : 'requirements.txt'), 'utf8');
    if (/ruff/.test(py)) out.lint = 'ruff check .';
    if (/mypy/.test(py)) out.typecheck = 'mypy .';
    out.test = 'python -m pytest -q';
  } else if (has('gradlew')) {
    out.test = './gradlew test -q';
    out.build = './gradlew assemble -q';
  } else if (has('pom.xml')) {
    out.test = 'mvn -q test';
  } else if (has('Makefile')) {
    const mk = readFileSync(join(root, 'Makefile'), 'utf8');
    for (const t of ['lint', 'test', 'build']) if (new RegExp(`^${t}:`, 'm').test(mk)) out[t] = `make ${t}`;
  }

  Object.assign(out, configured);
  for (const k of skip) delete out[k];
  return out;
}

function tail(text, n = TAIL_LINES) {
  const lines = (text || '').trimEnd().split('\n');
  return lines.slice(-n).join('\n');
}

function runChecks(commands, timeoutS) {
  const results = [];
  let blocked = false;
  for (const name of [...CHECK_ORDER, ...Object.keys(commands).filter((k) => !CHECK_ORDER.includes(k))]) {
    const cmd = commands[name];
    if (!cmd) {
      results.push({ name, status: 'unresolved', hard: HARD_CHECKS.includes(name) });
      continue;
    }
    if (blocked) {
      results.push({ name, cmd, status: 'not_run', hard: HARD_CHECKS.includes(name) });
      continue;
    }
    const started = Date.now();
    const r = sh('bash', ['-lc', cmd], { timeout: timeoutS * 1000 });
    const status = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM' ? 'timeout' : r.status === 0 ? 'pass' : 'fail';
    const hard = HARD_CHECKS.includes(name);
    results.push({ name, cmd, status, hard, seconds: Math.round((Date.now() - started) / 1000), output: status === 'pass' ? undefined : tail(`${r.stdout}\n${r.stderr}`) });
    if (hard && status !== 'pass') blocked = true;
  }
  return { results, blocked };
}

function branchDiff(cp) {
  const base = cp.base_branch || 'main';
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const files = filterNoise(git(['diff', '--name-only', `${mergeBase}...HEAD`]).split('\n').filter(Boolean));
  const diff = files.length ? git(['diff', `${mergeBase}...HEAD`, '--', ...files]) : '';
  return { base, mergeBase, files, diff };
}

function parseArgs(argv) {
  const args = { _: argv[0] };
  for (let i = 1; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return args;
}

function cli(argv) {
  const args = parseArgs(argv);
  if (!args.story) throw new Error('--story <ID> is required');
  const cp = loadCheckpoint(args.story);
  const dir = storyDir(args.story);
  const { base, mergeBase, files, diff } = branchDiff(cp);

  if (args._ === 'drift') {
    const baseFiles = git(['ls-tree', '-r', '--name-only', mergeBase]).split('\n').filter(Boolean);
    console.log(JSON.stringify(detectDrift(files, { hasContext: existsSync('.context'), baseFiles }), null, 2));
    return;
  }
  if (args._ !== 'run') throw new Error(`unknown command: ${args._ || '(none)'} — use run | drift`);

  writeFileSync(join(dir, 'change.diff'), diff);
  const risk = classifyRisk(files, diff);
  const config = readJson(join('.arcus', 'config.json'));
  const commands = resolveCommands('.', config);
  const timeoutS = Number(config?.gate?.timeout_seconds) || DEFAULT_TIMEOUT_S;
  const { results, blocked } = args.skipChecks ? { results: [], blocked: false } : runChecks(commands, timeoutS);
  const secretBlock = risk.secretHit;
  const report = {
    story: args.story,
    base,
    files,
    diffPath: join(dir, 'change.diff'),
    diffLines: diff ? diff.split('\n').length : 0,
    risk,
    checks: results,
    blocked: blocked || secretBlock,
    blockReasons: [
      ...results.filter((r) => r.hard && ['fail', 'timeout'].includes(r.status)).map((r) => `${r.name} ${r.status}: ${r.cmd}`),
      ...(secretBlock ? ['secret-shaped content in added lines'] : []),
    ],
    reviewers: [
      'change-reviewer',
      ...(risk.security ? ['security-reviewer'] : []),
      ...(risk.performance ? ['performance-reviewer'] : []),
    ],
  };
  writeFileSync(join(dir, 'gate.json'), `${JSON.stringify(report, null, 2)}\n`);
  // Compact stdout: the caller needs the decision, not the logs (those are in gate.json).
  console.log(JSON.stringify({
    blocked: report.blocked,
    blockReasons: report.blockReasons,
    checks: results.map(({ name, status, cmd }) => ({ name, status, cmd })),
    files: files.length,
    diffLines: report.diffLines,
    risk: { docsOnly: risk.docsOnly, security: risk.security, performance: risk.performance },
    reviewers: report.reviewers,
    gateReport: join(dir, 'gate.json'),
  }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    cli(process.argv.slice(2));
  } catch (error) {
    console.error(`[ERROR] gate.mjs: ${error.message}`);
    process.exit(1);
  }
}

