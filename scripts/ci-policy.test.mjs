import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { parse } from 'yaml';

import { checkHygiene, forbiddenName } from './check-hygiene.mjs';
import { verifyArchive } from './install-ci-tool.mjs';

const workflow = parse(
  await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);
const root = new URL('..', import.meta.url);

function validatePolicy(ci) {
  assert.deepEqual(ci.permissions, { contents: 'read' });
  assert.ok(!Object.hasOwn(ci.on, 'pull_request_target'));
  assert.deepEqual(Object.keys(ci.jobs), ['quality', 'sonar', 'required']);
  for (const job of Object.values(ci.jobs)) {
    assert.ok(!job.permissions);
    assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) {
      assert.ok(!step['continue-on-error']);
      assert.ok(!step.if);
      if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
    }
  }
  const quality = ci.jobs.quality.steps.map((step) => step.run ?? '').join('\n');
  for (const command of [
    'node scripts/check-hygiene.mjs',
    'pnpm install --frozen-lockfile',
    'pnpm format:check',
    'pnpm lint --force',
    'pnpm type-check --force',
    'type-check:tests --force',
    'pnpm contract --force',
    'pnpm audit',
    'pnpm test:coverage',
    'node scripts/prepare-coverage.mjs',
    'pnpm --filter @mobey/e2e test',
    'gitleaks dir .',
    'trivy config --exit-code 1',
    'trivy image --scanners vuln --exit-code 1',
  ])
    assert.ok(quality.includes(command), `Required command: ${command}`);
  assert.ok(!quality.includes('--ignore-unfixed'));
  assert.ok(!quality.includes('secrets.'));
  assert.ok(quality.indexOf('node scripts/check-hygiene.mjs') < quality.indexOf('pnpm install'));
  const sonar = ci.jobs.sonar.steps.map((step) => step.run ?? '').join('\n');
  assert.ok(sonar.includes('test -n "$SONAR_TOKEN"'));
  assert.ok(sonar.includes('-Dsonar.qualitygate.wait=true'));
  assert.equal(ci.jobs.sonar.needs, 'quality');
  assert.equal(ci.jobs.required.if, 'always()');
  assert.deepEqual(ci.jobs.required.needs, ['quality', 'sonar']);
}

test('workflow pins actions, confines permissions and keeps every required gate', () =>
  validatePolicy(workflow));

test('policy detects intentional bypass, permission and missing-check mutations', () => {
  const mutations = [
    (ci) => {
      ci.permissions.contents = 'write';
    },
    (ci) => {
      ci.jobs.quality.steps[0]['continue-on-error'] = true;
    },
    (ci) => {
      ci.jobs.quality.steps[0].uses = 'actions/checkout@main';
    },
    (ci) => {
      ci.jobs.quality.steps = ci.jobs.quality.steps.filter((step) => step.name !== 'Format');
    },
    (ci) => {
      ci.jobs.sonar.steps.at(-1).run = 'sonar-scanner';
    },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(workflow);
    mutate(changed);
    assert.throws(() => validatePolicy(changed));
  }
});

test('actual aggregate shell blocks failed, cancelled, skipped and missing results', () => {
  const command = workflow.jobs.required.steps[0].run;
  for (const quality of ['success', 'failure', 'cancelled', 'skipped', '']) {
    for (const sonar of ['success', 'failure', 'cancelled', 'skipped', '']) {
      const result = spawnSync('bash', ['-e', '-c', command], {
        env: { QUALITY_RESULT: quality, SONAR_RESULT: sonar },
      });
      assert.equal(result.status === 0, quality === 'success' && sonar === 'success');
    }
  }
});

test('actual Sonar shell fails without a token before invoking any scanner', () => {
  const command = workflow.jobs.sonar.steps.at(-1).run;
  const result = spawnSync('bash', ['-e', '-c', command], { env: { SONAR_TOKEN: '' } });
  assert.equal(result.status, 1);
  assert.match(result.stderr.toString(), /SONAR_TOKEN is required/);
});

test('hygiene rejects private/generated paths and permits reviewed templates/contracts', async () => {
  for (const path of [
    '.env',
    '.env.prod',
    'state.tfstate',
    'state.tfstate.backup',
    'plan.tfplan',
    'plan.tfplan.json',
    'terraform-output.json',
    'private.pem',
    '.pi',
    'volumes',
    'node_modules',
  ]) {
    assert.equal(forbiddenName(path), true, path);
  }
  for (const path of [
    '.env.example',
    '.env.prod.example',
    '.terraform.lock.hcl',
    'api.ts',
    '0001.sql',
  ]) {
    assert.equal(forbiddenName(path), false, path);
  }
  const directory = await mkdtemp(join(tmpdir(), 'mobey-hygiene-'));
  try {
    await writeFile(join(directory, '.env.example'), 'SYNTHETIC_ONLY=template\n');
    assert.equal(await checkHygiene(directory), 0);
    await mkdir(join(directory, '.pi'));
    await writeFile(join(directory, 'plan.tfplan'), 'synthetic plan');
    assert.equal(await checkHygiene(directory), 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function withCoverageFixture(check) {
  // Match cwd's canonical path on hosts where /var is an alias of /private/var.
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'mobey-coverage-')));
  try {
    for (const workspace of ['apps/web', 'apps/api', 'packages/shared']) {
      await mkdir(join(directory, workspace, 'src'), { recursive: true });
      await mkdir(join(directory, workspace, 'coverage'));
      await writeFile(
        join(directory, workspace, 'src/example.ts'),
        'export const synthetic = true;\n',
      );
      await writeFile(
        join(directory, workspace, 'coverage/lcov.info'),
        'SF:src/example.ts\nDA:1,1\nend_of_record\n',
      );
    }
    const script = new URL('./prepare-coverage.mjs', import.meta.url);
    const run = () => spawnSync(process.execPath, [script.pathname], { cwd: directory });
    await check(directory, run);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

for (const [name, source, error] of [
  ['empty report', '', /Missing coverage records/],
  ['unterminated record', 'SF:src/example.ts\nDA:1,1\n', /Missing coverage records/],
  [
    'relative workspace escape',
    'SF:../../packages/shared/src/example.ts\nend_of_record\n',
    /workspace TypeScript source/,
  ],
  ['non-TypeScript file', 'SF:src/example.js\nend_of_record\n', /workspace TypeScript source/],
  ['missing source file', 'SF:src/missing.ts\nend_of_record\n', /ENOENT/],
]) {
  test(`coverage preparation rejects ${name} without publishing a report`, async () => {
    await withCoverageFixture(async (directory, run) => {
      await writeFile(join(directory, 'apps/web/coverage/lcov.info'), source);
      const result = run();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr.toString(), error);
      await assert.rejects(readFile(join(directory, 'coverage/lcov.info')), { code: 'ENOENT' });
    });
  });
}

test('coverage preparation accepts absolute TSX sources but rejects absolute workspace escapes', async () => {
  await withCoverageFixture(async (directory, run) => {
    const source = join(directory, 'apps/web/src/view.tsx');
    await writeFile(source, 'export const view = "synthetic";\n');
    await writeFile(
      join(directory, 'apps/web/coverage/lcov.info'),
      `SF:${source}\nDA:1,1\nend_of_record\n`,
    );
    const success = run();
    assert.equal(success.status, 0, success.stderr.toString());
    assert.match(
      await readFile(join(directory, 'coverage/lcov.info'), 'utf8'),
      /SF:apps\/web\/src\/view\.tsx/,
    );
    await rm(join(directory, 'coverage/lcov.info'));
    await writeFile(
      join(directory, 'apps/web/coverage/lcov.info'),
      `SF:${join(directory, 'packages/shared/src/example.ts')}\nend_of_record\n`,
    );
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr.toString(), /workspace TypeScript source/);
    await assert.rejects(readFile(join(directory, 'coverage/lcov.info')), { code: 'ENOENT' });
  });
});

test('coverage preparation requires all reports and maps real TS paths', async () => {
  await withCoverageFixture(async (directory, run) => {
    assert.equal(run().status, 0);
    const combined = await readFile(join(directory, 'coverage/lcov.info'), 'utf8');
    assert.ok(combined.includes('SF:apps/web/src/example.ts'));
    assert.ok(combined.includes('SF:apps/api/src/example.ts'));
    assert.ok(combined.includes('SF:packages/shared/src/example.ts'));
    await rm(join(directory, 'apps/api/coverage/lcov.info'));
    assert.notEqual(run().status, 0);
  });
});

test('tool archive integrity rejects modified or unpinned bytes', () => {
  const bytes = Buffer.from('synthetic verified archive');
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.doesNotThrow(() => verifyArchive(bytes, digest));
  assert.throws(
    () => verifyArchive(Buffer.from('modified synthetic archive'), digest),
    /checksum mismatch/,
  );
  assert.throws(() => verifyArchive(bytes, 'missing-pin'), /checksum mismatch/);
});

test('tool installation rejects an escaping destination without a download', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/install-ci-tool.mjs', 'gitleaks', '../escape'],
    { cwd: root },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr.toString(), /invalid temporary directory name/);
});

test('tool installation rejects a symlink destination escaping the runner temporary root before downloading', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mobey-tool-confinement-'));
  try {
    const runnerRoot = join(directory, 'runner');
    const outside = join(directory, 'outside');
    await mkdir(runnerRoot);
    await mkdir(outside);
    await symlink(outside, join(runnerRoot, 'ci-tools'));
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'data:text/javascript,globalThis.fetch=()=>{throw new Error("download must not run")}',
        'scripts/install-ci-tool.mjs',
        'gitleaks',
        'ci-tools',
      ],
      { cwd: root, env: { ...process.env, RUNNER_TEMP: runnerRoot }, timeout: 5_000 },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr.toString(), /must stay in a child/);
    assert.doesNotMatch(result.stderr.toString(), /download must not run/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('actual Terraform guard rejects HCL and JSON infrastructure but permits documentation', async () => {
  const command = workflow.jobs.quality.steps.find(
    (step) => step.name === 'Terraform surface guard',
  ).run;
  const directory = await mkdtemp(join(tmpdir(), 'mobey-terraform-guard-'));
  const run = () => spawnSync('bash', ['-e', '-c', command], { cwd: directory });
  try {
    assert.equal(run().status, 0);
    const terraform = join(directory, 'infra/terraform');
    await mkdir(terraform, { recursive: true });
    await writeFile(join(terraform, 'README.md'), 'Future surface only.\n');
    assert.equal(run().status, 0);
    for (const name of ['main.tf', 'main.tf.json']) {
      const path = join(terraform, name);
      await writeFile(path, '{}\n');
      const result = run();
      assert.equal(result.status, 1);
      assert.match(result.stderr.toString(), /add approved isolated/);
      await rm(path);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Sonar includes TS tests and coverage without nonexistent roots or CDK exclusions', async () => {
  const properties = await readFile(
    new URL('../sonar-project.properties', import.meta.url),
    'utf8',
  );
  assert.ok(properties.includes('sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts'));
  assert.ok(properties.includes('sonar.javascript.lcov.reportPaths=coverage/lcov.info'));
  assert.ok(properties.includes('packages/shared/src/generated/**'));
  assert.ok(properties.includes('**/*.tfstate'));
  assert.ok(!properties.includes('infra/cdk'));
});
