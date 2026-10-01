import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {startService} from './server.mjs';
import {createOrder} from './sdk.mjs';

export async function runDemo() {
  const payload = {sku: 'demo-notebook', quantity: 1};
  const checks = [];
  const check = (label, fn) => {fn(); checks.push({label, passed: true});};
  const scenarios = {};
  for (const [name, key] of [['unsafe', undefined], ['safe', 'demo-order-001']]) {
    const service = await startService();
    try {
      let failed = false;
      let errorMessage;
      let errorType;
      try {await createOrder(service.url, payload, key);} catch (error) {
        failed = true;
        errorMessage = error.message;
        errorType = error.name;
      }
      check(`${name}: first response is lost`, () => assert.equal(failed, true));
      check(`${name}: first request committed`, () => assert.equal(service.orders.length, 1));
      const retry = await createOrder(service.url, payload, key);
      const body = await retry.json();
      check(`${name}: retry status`, () => assert.equal(retry.status, key ? 200 : 201));
      check(`${name}: retry identity`, () => assert.equal(body.id, key ? 'ord_001' : 'ord_002'));
      check(`${name}: stored count`, () => assert.equal(service.orders.length, key ? 1 : 2));
      scenarios[name] = {
        first: {error: errorMessage, type: errorType, id: service.orders[0].id, storedOrders: 1},
        retry: {status: retry.status, body},
        storedOrders: service.orders.length,
      };
      if (key) {
        const conflict = await createOrder(service.url, {...payload, quantity: 2}, key);
        check('safe: changed payload is rejected', () => assert.equal(conflict.status, 409));
        const conflictBody = await conflict.json();
        check('safe: conflict leaves one order', () => assert.equal(service.orders.length, 1));
        scenarios.safe.conflict = {status: conflict.status, body: conflictBody, storedOrders: service.orders.length};
      }
    } finally {await service.close();}
  }
  const sdkSource = await readFile(new URL('./sdk.mjs', import.meta.url), 'utf8');
  return {
    payload, key: 'demo-order-001', scenarios,
    snippet: sdkSource.split('// VIDEO_SNIPPET_START\n')[1].split('// VIDEO_SNIPPET_END')[0].trim(),
    checks, summary: `${checks.length}/${checks.length} checks passed`,
    scope: 'Real loopback HTTP; synthetic data; sequential retries; in-memory single-process service.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = await runDemo();
  const output = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), '../evidence');
  await mkdir(output, {recursive: true});
  await writeFile(resolve(output, 'execution.json'), JSON.stringify(evidence, null, 2) + '\n');
  const transcript = [
    'LOCAL HTTP DEMO / synthetic data',
    `First call: ${evidence.scenarios.unsafe.first.error}; stored orders = 1`,
    `No key retry: HTTP ${evidence.scenarios.unsafe.retry.status}; ${evidence.scenarios.unsafe.retry.body.id}; stored orders = 2`,
    `Same key retry: HTTP ${evidence.scenarios.safe.retry.status}; ${evidence.scenarios.safe.retry.body.id}; replayed = true; stored orders = 1`,
    `Changed payload, same key: HTTP ${evidence.scenarios.safe.conflict.status}; key_payload_conflict; stored orders = 1`,
    evidence.summary,
  ].join('\n') + '\n';
  await writeFile(resolve(output, 'transcript.txt'), transcript);
  console.log(transcript);
}
