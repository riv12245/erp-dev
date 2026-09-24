import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

function check(files) {
  const root = mkdtempSync(join(tmpdir(), 'erp-architecture-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'services/api/src'), { recursive: true });
    copyFileSync(new URL('./check-architecture.mjs', import.meta.url), join(root, 'scripts/check-architecture.mjs'));
    for (const [path, source] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    }
    return spawnSync(process.execPath, [join(root, 'scripts/check-architecture.mjs')], { encoding: 'utf8', timeout: 10000 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('local imports pass without false deep-path warnings', () => {
  const result = check({ 'services/api/src/app.ts': "import { config } from './config/index.js';" });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /deep relative/);
});

for (const extension of ['ts', 'tsx']) {
  test(`rejects an app ${extension} import escaping into the API source`, () => {
    const result = check({ [`apps/web/src/App.${extension}`]: "import { secret } from '../../../services/api/src/config/index.js';" });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /escapes apps\/web src tree/);
  });
}

test('permits public module contracts and rejects private module imports', () => {
  assert.equal(check({ 'services/api/src/modules/sales/application/order.ts': "import { InventoryService } from '../../inventory/index.js';" }).status, 0);
  const result = check({ 'services/api/src/modules/sales/application/order.ts': "import { model } from '../../inventory/infrastructure/model.js';" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /private module/);
});

for (const extension of ['ts', 'tsx']) {
  test(`allows app-local parent imports in ${extension}`, () => {
    const result = check({ [`apps/web/src/features/Index.${extension}`]: "import { api } from '../services/api.js';" });
    assert.equal(result.status, 0, result.stderr);
  });
}
