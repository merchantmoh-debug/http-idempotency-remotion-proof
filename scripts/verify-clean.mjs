import {mkdtemp, mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const clean = await mkdtemp(join(tmpdir(), 'retry-proof-clean-'));
await mkdir(join(clean, 'example'));
for (const file of ['server.mjs', 'sdk.mjs', 'run.mjs']) {
  await copyFile(new URL(`../example/${file}`, import.meta.url), join(clean, 'example', file));
}
for (let i = 1; i <= 2; i++) {
  const result = spawnSync(process.execPath, [join(clean, 'example/run.mjs'), join(clean, `run-${i}`)], {cwd: clean, encoding: 'utf8', timeout: 15000});
  assert.equal(result.status, 0, result.stderr);
}
const a = await readFile(join(clean, 'run-1/execution.json'), 'utf8');
const b = await readFile(join(clean, 'run-2/execution.json'), 'utf8');
const original = await readFile(new URL('../evidence/execution.json', import.meta.url), 'utf8');
assert.equal(a, b, 'Repeated executions differ');
assert.equal(a, original, 'Rendered evidence differs from clean execution');
const record = {passed: true, node: process.version, cleanDirectory: clean, dependencies: 'Node built-ins only; no node_modules, environment secrets or services', repeatedRunsIdentical: true, renderedEvidenceIdentical: true, checksPerRun: JSON.parse(a).checks.length};
await writeFile(new URL('../evidence/clean-setup.json', import.meta.url), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
