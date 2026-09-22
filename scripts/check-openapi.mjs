import fs from 'node:fs';
import yaml from 'js-yaml';

const document = yaml.load(fs.readFileSync(new URL('../openapi/erp-api.yaml', import.meta.url), 'utf8'));
const errors = [];
let refs = 0;
function resolve(ref) {
  if (!ref.startsWith('#/')) throw new Error('External refs are not supported by this check');
  return ref.slice(2).split('/').reduce((value, key) => value?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], document);
}
function visit(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) { refs++; if (!resolve(value.$ref)) errors.push(`Unresolved ref: ${value.$ref}`); }
  for (const child of Object.values(value)) visit(child);
}
visit(document);
const ids = new Set();
for (const [path, item] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    if (ids.has(operation.operationId)) errors.push(`Duplicate operationId: ${operation.operationId}`);
    ids.add(operation.operationId);
    if (!['implemented', 'roadmap'].includes(operation['x-implementation-status'])) errors.push(`Missing implementation status: ${method} ${path}`);
    for (const raw of operation.parameters ?? []) {
      const parameter = raw.$ref ? resolve(raw.$ref) : raw;
      if (!parameter?.name || !parameter.in || !parameter.schema) errors.push(`Invalid parameter: ${method} ${path}`);
      if (parameter?.in === 'path' && (!parameter.required || !path.includes(`{${parameter.name}}`))) errors.push(`Invalid path parameter: ${path}`);
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`check-openapi: passed (${ids.size} operations, ${refs} resolved refs; YAML + structural/contract checks, not full schema certification).`);
