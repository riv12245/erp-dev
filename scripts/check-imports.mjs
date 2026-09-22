#!/usr/bin/env node
/**
 * check-imports.mjs
 * Builds a real dependency graph for the API and shared packages, then:
 *   - detects circular imports (violation, exits 1)
 *   - warns about God modules (files importing from > 18 files)
 *
 * Resolution: relative `./x.js` -> `./x.ts`, bare `x` -> `x.ts` / `x/index.ts`,
 * and `@erp/<pkg>` -> packages/<pkg>/src/index.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const roots = [join(ROOT, 'services', 'api', 'src'), ...listPackages()];

function listPackages() {
  const dir = join(ROOT, 'packages');
  const out = [];
  for (const name of readdirSync(dir)) {
    const pkgSrc = join(dir, name, 'src');
    if (statSync(pkgSrc).isDirectory()) out.push(pkgSrc);
  }
  return out;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

function exists(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveCandidates(fromDir, spec) {
  const cand = [];
  const base = normalize(join(fromDir, spec));
  const candidates = [base, `${base}.ts`, `${base}.js`, join(base, 'index.ts'), join(base, 'index.js')];
  for (const c of candidates) {
    const normalized = normalize(c);
    if (!cand.includes(normalized)) cand.push(normalized);
  }
  return cand;
}

const packages = new Map();
for (const pkgSrc of roots) {
  if (pkgSrc.startsWith(join(ROOT, 'packages'))) {
    const name = relative(join(ROOT, 'packages'), pkgSrc).split('\\').join('/');
    packages.set(name, pkgSrc);
  }
}

function resolveImport(fromFile, spec) {
  const fromDir = dirname(fromFile);
  if (spec.startsWith('./') || spec.startsWith('../')) {
    for (const cand of resolveCandidates(fromDir, spec)) if (exists(cand)) return cand;
    return null; // unresolvable relative (node_modules or dynamic) -> treat as leaf
  }
  if (spec.startsWith('@erp/')) {
    const rest = spec.replace(/^@erp\//, ''); // e.g. "utils" or "utils/src/date.js"
    const [pkg, ...sub] = rest.split('/');
    if (!packages.has(pkg)) return null;
    if (sub.length === 0) return join(packages.get(pkg), 'index.ts');
    const subPath = join(packages.get(pkg), ...sub);
    for (const cand of resolveCandidates(packages.get(pkg), sub.join('/'))) if (exists(cand)) return cand;
    if (exists(subPath)) return subPath;
    return null;
  }
  return null; // external npm import
}

const vertices = new Map(); // absolute path -> display path
const edges = new Map(); // index -> [dep indices]
const indexOf = new Map(); // abs path -> index
const files = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (!indexOf.has(file)) {
      indexOf.set(file, files.length);
      files.push(file);
    }
  }
}

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const deps = new Set();
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) deps.add(match[1]);
  const resolved = [];
  for (const spec of deps) {
    const target = resolveImport(file, spec);
    if (target && indexOf.has(target)) resolved.push(target);
  }
  vertices.set(file, relative(ROOT, file).split('\\').join('/'));
  edges.set(indexOf.get(file), resolved.map((t) => indexOf.get(t)));
}

// three-color DFS cycle detection
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Array(files.length).fill(WHITE);
const stack = [];
const cycles = [];
const seenCycles = new Set();
const onStack = new Set();

function dfs(node) {
  color[node] = GRAY;
  onStack.add(node);
  stack.push(node);
  for (const dep of edges.get(node) ?? []) {
    if (color[dep] === GRAY) {
      const cycleStart = stack.indexOf(dep);
      const cycle = [...stack.slice(cycleStart), dep].map((i) => vertices.get(files[i]));
      const key = cycle.join('\u0000');
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(cycle);
      }
    } else if (color[dep] === WHITE) {
      dfs(dep);
    }
  }
  stack.pop();
  onStack.delete(node);
  color[node] = BLACK;
}

for (let i = 0; i < files.length; i++) {
  if (color[i] === WHITE) dfs(i);
}

// God modules (out-degree)
const godModules = [];
for (let i = 0; i < files.length; i++) {
  const degree = (edges.get(i) ?? []).length;
  if (degree > 18) godModules.push(`${vertices.get(files[i])} (${degree} imports)`);
}

for (const cycle of cycles) {
  console.error(`[violation] circular import: ${cycle.map((f) => f.split('/').slice(-1)[0]).join(' -> ')}`);
  console.error(`           ${cycle.join('\n           ')}`);
}
for (const gm of godModules) console.warn(`[warn] God module candidate: ${gm}`);

if (cycles.length > 0) {
  console.error(`\ncheck-imports: ${cycles.length} circular import cycle(s) found.`);
  process.exit(1);
}

console.log(`check-imports: passed (${files.length} files, ${cycles.length} cycles, ${godModules.length} god-module warnings).`);