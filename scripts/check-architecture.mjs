#!/usr/bin/env node
/**
 * check-architecture.mjs
 * Verifies bounded-context layering and module independence across the API.
 *
 * Rules enforced (violations exit 1):
 *   1. domain dirs under modules must NOT import the module's infrastructure (domain stays pure).
 *   2. infrastructure dirs under modules must NOT import the module's application (layer inversion).
 *   3. modules/A may only import modules/B through B's public index (application contracts).
 *   4. platform/ must NOT import modules/ (platform is the stable base layer).
 *   5. shared/ must NOT import modules/ or @erp/* packages (shared stays glue-free).
 *   6. No God Store / God Service / God Repository classes.
 *   7. apps/ and services/ src trees must not escape into a sibling source tree.
 *
 * Warnings (do not fail): deep relative import chains (>= 3 `../`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const API_SRC = join(ROOT, 'services', 'api', 'src');

const warnings = [];
const violations = [];

function exists(p) {
  try {
    return statSync(p).isDirectory() || statSync(p).isFile();
  } catch {
    return false;
  }
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) out.push(full);
  }
}

function importsOf(file) {
  const source = readFileSync(file, 'utf8');
  const result = [];
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) result.push(match[1]);
  for (const match of source.matchAll(/^import\s+['"]([^'"]+)['"]/gm)) result.push(match[1]);
  return result;
}

function classify(file) {
  const rel = relative(API_SRC, file).split('\\').join('/');
  const parts = rel.split('/');
  return {
    layer: parts[0],
    moduleName: parts[1],
    area: parts.includes('domain') ? 'domain' : parts.includes('infrastructure') ? 'infrastructure' : parts.includes('application') ? 'application' : 'other',
  };
}

function esc(p) {
  return p.split('\\').join('/');
}

function collectFiles(root, out) {
  if (!exists(root)) return;
  walk(root, out);
}

const apiFiles = [];
collectFiles(API_SRC, apiFiles);

for (const file of apiFiles) {
  const info = classify(file);
  const fromDir = esc(dirname(file));

  const importDepth = (fromDir, spec) => {
    const joined = normalize(join(fromDir.split('/').join('\\'), spec.split('/').join('\\')));
    const relPath = relative(API_SRC, joined).split('\\').join('/');
    return relPath.split('/').filter((part) => part === '..').length;
  };

  for (const spec of importsOf(file)) {
    const isRel = spec.startsWith('./') || spec.startsWith('../');
    const isErpPkg = spec.startsWith('@erp/');
    if (!isRel && !isErpPkg) continue;

    // deep relative imports (warning)
    if (isRel && importDepth(fromDir, spec) >= 3) {
      warnings.push(`${esc(relative(ROOT, file))} has deep relative imports`);
    }

    // Resolve the actual destination: ../../crm/index.js is a public contract,
    // ../../crm/infrastructure/model.js is a forbidden private dependency.
    if (info.layer === 'modules' && isRel) {
      const target = classify(normalize(join(dirname(file), spec)));
      const resolved = esc(relative(API_SRC, normalize(join(dirname(file), spec))));
      if (target.layer === 'modules' && target.moduleName !== info.moduleName
        && !/^modules\/[^/]+\/index\.(?:js|ts)$/.test(resolved)) {
        violations.push(`${esc(relative(ROOT, file))} imports private module infrastructure: ${spec}`);
      }
    }

    // platform -> modules
    if (info.layer === 'platform' && isRel && /modules\//.test(spec)) {
      violations.push(`${esc(relative(ROOT, file))} (platform) imports modules: ${spec}`);
    }

    // shared -> modules or packages
    if (info.layer === 'shared') {
      if (isRel && /modules\//.test(spec)) {
        violations.push(`${esc(relative(ROOT, file))} (shared) imports modules: ${spec}`);
      }
      if (isErpPkg) {
        violations.push(`${esc(relative(ROOT, file))} (shared) imports package: ${spec}`);
      }
    }

    // domain purity + inversions
    if (info.area === 'domain') {
      if (isRel && /infrastructure\//.test(spec)) {
        violations.push(`${esc(relative(ROOT, file))} (domain) imports infrastructure: ${spec}`);
      }
      if (isRel && /\/application\//.test(spec)) {
        violations.push(`${esc(relative(ROOT, file))} (domain) imports application: ${spec}`);
      }
    }
    if (info.area === 'infrastructure' && isRel && /\/application\//.test(spec)) {
      violations.push(`${esc(relative(ROOT, file))} (infrastructure) imports application: ${spec}`);
    }
  }

  // God modules
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const god = /class\s+(?:(?:God|Universal|Master)(?:Store|Service|Repository))\b/.exec(line);
    if (god) violations.push(`${esc(relative(ROOT, file))} declares God module: ${god[0]}`);
  }
}

// 7. apps/services must not escape their own src tree
for (const [group, name] of [
  ['apps', 'web'],
  ['apps', 'mobile'],
  ['services', 'worker'],
]) {
  const base = join(ROOT, group, name, 'src');
  if (!exists(base)) continue;
  const appFiles = [];
  collectFiles(base, appFiles);
  for (const file of appFiles) {
    if (file === base) continue;
    for (const spec of importsOf(file)) {
      if (!(spec.startsWith('./') || spec.startsWith('../'))) continue;
      const resolved = normalize(join(dirname(file), spec.split('/').join('\\')));
      const inTree = relative(base, resolved).split('\\'); // relative from base; if it starts with '..' we escaped
      if (inTree[0] === '..') {
        violations.push(`${esc(relative(ROOT, file))} escapes ${group}/${name} src tree: ${spec}`);
      }
    }
  }
}

for (const warning of warnings) console.warn(`[warn] ${warning}`);
for (const violation of violations) console.error(`[violation] ${violation}`);

if (violations.length > 0) {
  console.error(`\ncheck-architecture: ${violations.length} violation(s) found.`);
  process.exit(1);
}

console.log(`check-architecture: passed (${apiFiles.length} api files, ${warnings.length} warning(s)).`);
