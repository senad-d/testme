import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), 'mobey-gitleaks-probe-'));
try {
  const config = join(directory, '.gitleaks.toml');
  await writeFile(config, await readFile(new URL('../.gitleaks.toml', import.meta.url)));
  await mkdir(join(directory, 'packages/shared/src/generated'), { recursive: true });
  const generated = join(directory, 'packages/shared/src/generated/api.ts');
  const digest = createHash('sha256').update('synthetic OpenAPI digest').digest('hex');
  const scan = () =>
    spawnSync('gitleaks', [
      'dir',
      directory,
      '--config',
      config,
      '--redact=100',
      '--no-banner',
      '--exit-code=1',
    ]);
  await writeFile(generated, `// OpenAPI SHA-256: ${digest}\n`);
  assert.equal(scan().status, 0, 'Public schema integrity metadata must be accepted.');
  // Fabricated scanner fixture only; never a real GitHub credential, never logged.
  const fabricated =
    'ghp_' +
    createHash('sha256')
      .update('fabricated scanner probe, never a real credential')
      .digest('base64')
      .replace(/[^a-zA-Z0-9]/g, 'M')
      .slice(0, 36);
  await writeFile(
    generated,
    `// OpenAPI SHA-256: ${digest}\nexport const token = '${fabricated}';\n`,
  );
  assert.equal(
    scan().status,
    1,
    'A metadata allowlist must not hide other findings in generated source.',
  );
  console.log('Scanner control: public digest accepted; fabricated credential rejected.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
