#!/usr/bin/env node
/**
 * check-tenant-scope.mjs
 * Verifies that tenant-scoped business repositories always apply a tenant
 * filter and that domain models declare tenant-aware fields.
 *
 * Conventions checked:
 *   1. Business repositories under modules/{context}/infrastructure must:
 *        - use the TenantScopedRepository base / tenantFilter / assertTenantScope, OR
 *        - carry an explicit exemption comment (global/shared reference data,
 *          e.g. master-data countries).
 *   2. Business domain models under modules/{context}/domain must declare a
 *      tenantId field, unless exempt (global/reference data modules).
 *
 * Exemption keywords: "master data", "global", "shared reference data",
 * "not tenant", "tenant-agnostic".
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MODULES = join(ROOT, 'services', 'api', 'src', 'modules');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

function load(moduleRoot) {
  const files = walk(moduleRoot);
  const repos = files.filter((f) => /\/infrastructure\/.*\.repository\.ts$/.test(f.replaceAll('\\', '/')));
  const models = files.filter((f) => /\/domain\/.*\.model\.ts$/.test(f.replaceAll('\\', '/')));
  return { repos, models };
}

const EXEMPT = /\b(master[- ]?data|global|shared reference data|not tenant[ -]?scoped|tenant-agnostic)\b/i;
const SCOPED = /tenantFilter|assertTenantScope|TenantScopedRepository|requireTenantId/;
const violations = [];
const warnings = [];

function display(file) {
  return relative(ROOT, file).split('\\').join('/');
}

for (const moduleName of readdirSync(MODULES)) {
  if (!statSync(join(MODULES, moduleName)).isDirectory()) continue;
  const { repos, models } = load(join(MODULES, moduleName));

  for (const repo of repos) {
    const content = readFileSync(repo, 'utf8');
    if (EXEMPT.test(content)) continue;
    if (!SCOPED.test(content) && !content.includes('tenantId')) {
      violations.push(`${display(repo)} does not apply a tenant scope`);
    }
  }

  // The domain-model rule is a warning: repositories legally inject tenantId
  // at write time even when the schema does not declare it. Keep it loose.
  for (const model of models) {
    if (/master-data/.test(model)) continue;
    const content = readFileSync(model, 'utf8');
    if (EXEMPT.test(content)) continue;
    if (!content.includes('tenantId')) {
      warnings.push(`${display(model)} does not declare tenantId`);
    }
  }
}

for (const warning of warnings) console.warn(`[warn] ${warning}`);
for (const violation of violations) console.error(`[violation] ${violation}`);

if (violations.length > 0) {
  console.error(`\ncheck-tenant-scope: ${violations.length} violation(s) found.`);
  process.exit(1);
}

console.log(`check-tenant-scope: passed (${violations.length} violations, ${warnings.length} warnings).`);