import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

test('web runtime package transaction builds unprivileged with no known vulnerabilities', async () => {
  const source = await readFile(new URL('../apps/web/Dockerfile', import.meta.url), 'utf8');
  const production = source.match(/^FROM \S+ AS production\n[\s\S]*$/m)?.[0];
  assert.ok(production, 'The web production stage must exist');
  // Isolate the actual runtime/package transaction from the expensive SPA build.
  // Only static assets are omitted; the full production image remains a CI gate.
  const assets = 'COPY --from=build /workspace/apps/web/dist/ /usr/share/nginx/html/\n';
  assert.ok(production.includes(assets), 'Review runtime isolation if the asset copy changes');
  const directory = await mkdtemp(join(tmpdir(), 'mobey-web-runtime-'));
  const image = `mobey-web-runtime-${randomUUID()}`;
  let built = false;
  let container;
  try {
    await writeFile(join(directory, 'Dockerfile'), production.replace(assets, ''));
    run('docker', ['build', '-t', image, directory]);
    built = true;
    assert.notEqual(run('docker', ['run', '--rm', '--entrypoint', 'id', image, '-u']), '0');
    // Exercise the default entrypoint, config and HEALTHCHECK, not the E2E proxy config.
    container = run('docker', [
      'run',
      '--detach',
      '--health-interval=1s',
      '--health-timeout=2s',
      '--health-retries=2',
      image,
    ]);
    let healthy = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const state = JSON.parse(
        run('docker', ['inspect', '--format', '{{json .State}}', container]),
      );
      assert.equal(state.Running, true, 'The default Nginx process must remain running');
      assert.notEqual(state.Health.Status, 'unhealthy', 'The production HEALTHCHECK must succeed');
      if (state.Health.Status === 'healthy') {
        healthy = true;
        break;
      }
      await setTimeout(1_000);
    }
    assert.ok(healthy, 'The default web runtime must become healthy within 30 seconds');
    // The caller provisions the vulnerability DB. No severity/unfixed exclusions.
    run('trivy', [
      'image',
      '--scanners',
      'vuln',
      '--exit-code',
      '1',
      '--quiet',
      '--skip-db-update',
      image,
    ]);
  } finally {
    try {
      if (container) run('docker', ['rm', '--force', container]);
    } finally {
      try {
        if (built) run('docker', ['image', 'rm', image]);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }
});
