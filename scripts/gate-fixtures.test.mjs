import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('#137 gate-b fixture contains exactly one b line with LF', async () => {
  const actual = await readFile(new URL('../fixtures/gate-b.txt', import.meta.url));
  assert.deepEqual(actual, Buffer.from('b\n'));
});
