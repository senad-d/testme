import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { createSourceMirror, dockerExecutable, sourceNameAllowed } from './compose-watch.mjs';

const helper = fileURLToPath(new URL('./compose-watch.mjs', import.meta.url));
const denied = [
  '.env',
  '.env.canary',
  '.pi/canary',
  '.git/canary',
  'node_modules/canary',
  '.DS_Store',
  '.aws/credentials',
  '.azure/canary',
  '.oci/canary',
  '.ssh/canary',
  '.config/canary',
  '.npmrc',
  '.netrc',
  '.pgpass',
  '.git-credentials',
  'credentials',
  'private.pem',
  'private.key',
  'private.p12',
  'private.pfx',
  'canary.log',
  'canary.tsbuildinfo',
  'dist/canary',
  'coverage/canary',
  'test-results/canary',
  'canary.test.ts',
  'canary.spec.ts',
  'canary.test.tsx',
  'canary.spec.tsx',
];

function fixture(t) {
  // Match the filesystem paths used by the mirror so fault injection also runs
  // on hosts whose temporary directory has a symlinked ancestor (for example macOS).
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mobey-filter-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function put(path, value = 'synthetic') {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), value);
  }
  put('apps/api/src/main.ts', 'export {};');
  put('apps/web/src/app.tsx', 'export {};');
  put('apps/web/vite.config.ts', 'export {};');
  put('apps/web/index.html', '<html></html>');
  return { root, put };
}

function mirror(t, root) {
  const result = createSourceMirror(root);
  t.after(result.close);
  return result;
}

function inventory(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(prefix, entry.name);
      return entry.isDirectory() ? inventory(root, path) : [path];
    })
    .sort();
}

test('filters initial source without consuming root environment or agent state', (t) => {
  const { root, put } = fixture(t);
  put('.env', 'must-not-consume-root-environment');
  put('.pi/canary');
  for (const path of denied) put(`apps/api/src/${path}`);
  const staged = mirror(t, root);
  assert.deepEqual(inventory(staged.directory), [
    'apps/api/src/main.ts',
    'apps/web/index.html',
    'apps/web/src/app.tsx',
    'apps/web/vite.config.ts',
  ]);
});

test('filters atomic populated-directory arrivals for both services', (t) => {
  const { root, put } = fixture(t);
  const staged = mirror(t, root);
  for (const service of ['api', 'web']) {
    for (const path of denied) put(`arrival-${service}/nested/${path}`);
    put(`arrival-${service}/nested/index.ts`, `export const service = '${service}';`);
    assert.equal(existsSync(join(staged.directory, 'apps', service, 'src', 'new')), false);
    renameSync(join(root, `arrival-${service}`), join(root, 'apps', service, 'src', 'new'));
  }
  staged.sync();
  for (const service of ['api', 'web']) {
    assert.deepEqual(inventory(join(staged.directory, 'apps', service, 'src', 'new')), [
      'nested/index.ts',
    ]);
    assert.equal(
      readFileSync(join(staged.directory, 'apps', service, 'src', 'new/nested/index.ts'), 'utf8'),
      `export const service = '${service}';`,
    );
  }
});

test('rejects credential/artifact names at every depth, retaining legitimate filenames', () => {
  for (const path of denied) assert.equal(path.split('/').every(sourceNameAllowed), false, path);
  for (const name of [
    'index.ts',
    'contest.ts',
    'specification.ts',
    'app.css',
    'nested',
    'public.svg',
  ]) {
    assert.equal(sourceNameAllowed(name), true, name);
  }
});

test('mirrors edits, deletes, directory removal, and file/directory transitions', (t) => {
  const { root, put } = fixture(t);
  put('apps/web/src/new/nested/source.ts');
  const staged = mirror(t, root);
  const originalContent = readFileSync(join(staged.directory, 'apps/web/src/app.tsx'));
  put('apps/api/src/main.ts', 'changed');
  rmSync(join(root, 'apps/web/src/new'), { recursive: true });
  put('apps/web/src/new', 'now a file');
  staged.sync();
  assert.equal(readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'), 'changed');
  assert.equal(readFileSync(join(staged.directory, 'apps/web/src/new'), 'utf8'), 'now a file');
  assert.deepEqual(readFileSync(join(staged.directory, 'apps/web/src/app.tsx')), originalContent);
  rmSync(join(root, 'apps/web/src/new'));
  put('apps/web/src/new/child.ts');
  staged.sync();
  assert.deepEqual(inventory(join(staged.directory, 'apps/web/src/new')), ['child.ts']);
  rmSync(join(root, 'apps/web/src/new'), { recursive: true });
  staged.sync();
  assert.equal(existsSync(join(staged.directory, 'apps/web/src/new')), false);
  staged.close();
  assert.equal(existsSync(staged.directory), false);
  assert.throws(staged.sync, /closed/);
});

test('missing initial source fails closed rather than starting an empty mirror', (t) => {
  const { root } = fixture(t);
  rmSync(join(root, 'apps/api/src'), { recursive: true });
  assert.throws(() => createSourceMirror(root), { code: 'ENOENT' });
});

test('a directory removed during a scan does not stop Watch or publish a partial snapshot', (t) => {
  const { root, put } = fixture(t);
  put('apps/api/src/offline/nested/source.ts');
  const staged = mirror(t, root);
  put('apps/api/src/main.ts', 'restored source');
  const originalReadDirectory = fs.readdirSync;
  // Deterministically interleave the same recursive deletion used by the
  // offline-sync E2E cleanup after enumeration, before lstat/open of its child.
  t.mock.method(fs, 'readdirSync', (path, ...args) => {
    const entries = originalReadDirectory(path, ...args);
    if (path === join(root, 'apps/api/src/offline')) {
      rmSync(path, { recursive: true });
    }
    return entries;
  });
  syncBuiltinESMExports();
  try {
    assert.doesNotThrow(staged.sync);
    assert.equal(
      readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
      'export {};',
    );
    assert.equal(existsSync(join(staged.directory, 'apps/api/src/offline/nested/source.ts')), true);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
  staged.sync();
  assert.equal(
    readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
    'restored source',
  );
  assert.equal(existsSync(join(staged.directory, 'apps/api/src/offline')), false);
});

test('a file removed before opening preserves the validated mirror until a complete retry', (t) => {
  const { root, put } = fixture(t);
  put('apps/web/src/transient.ts', 'last validated source');
  const staged = mirror(t, root);
  put('apps/api/src/main.ts', 'updated source');
  const originalOpen = fs.openSync;
  const disappearing = join(root, 'apps/web/src/transient.ts');
  // Model an editor unlinking an already validated file before it is opened.
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === disappearing) rmSync(path);
    return originalOpen(path, ...args);
  });
  syncBuiltinESMExports();
  try {
    assert.doesNotThrow(staged.sync);
    assert.equal(
      readFileSync(join(staged.directory, 'apps/web/src/transient.ts'), 'utf8'),
      'last validated source',
    );
    assert.equal(
      readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
      'export {};',
    );
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
  staged.sync();
  assert.equal(existsSync(join(staged.directory, 'apps/web/src/transient.ts')), false);
  assert.equal(
    readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
    'updated source',
  );
});

test('a source permission failure is not swallowed as a deletion race or partially published', (t) => {
  const { root, put } = fixture(t);
  const staged = mirror(t, root);
  put('apps/api/src/main.ts', 'unpublished source');
  const originalOpen = fs.openSync;
  const deniedSource = join(root, 'apps/web/src/app.tsx');
  const deniedError = Object.assign(new Error('Synthetic source permission failure'), {
    code: 'EACCES',
  });
  // Inject the OS error rather than chmod: this suite may run as root in CI.
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === deniedSource) throw deniedError;
    return originalOpen(path, ...args);
  });
  syncBuiltinESMExports();
  try {
    assert.throws(staged.sync, (error) => error === deniedError);
    assert.equal(
      readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
      'export {};',
    );
    assert.equal(
      readFileSync(join(staged.directory, 'apps/web/src/app.tsx'), 'utf8'),
      'export {};',
    );
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

test('concurrent source mirrors isolate updates and cleanup between checkouts', (t) => {
  const first = fixture(t);
  const second = fixture(t);
  first.put('apps/api/src/main.ts', 'first checkout');
  second.put('apps/api/src/main.ts', 'second checkout');
  const firstMirror = mirror(t, first.root);
  const secondMirror = mirror(t, second.root);
  assert.notEqual(firstMirror.directory, secondMirror.directory);

  first.put('apps/api/src/main.ts', 'first updated');
  firstMirror.sync();
  assert.equal(
    readFileSync(join(secondMirror.directory, 'apps/api/src/main.ts'), 'utf8'),
    'second checkout',
  );
  second.put('apps/web/src/only-second.ts', 'second new source');
  secondMirror.sync();
  assert.equal(existsSync(join(firstMirror.directory, 'apps/web/src/only-second.ts')), false);
  assert.equal(
    readFileSync(join(firstMirror.directory, 'apps/api/src/main.ts'), 'utf8'),
    'first updated',
  );

  firstMirror.close();
  assert.equal(existsSync(firstMirror.directory), false);
  second.put('apps/api/src/main.ts', 'second still active');
  secondMirror.sync();
  assert.equal(
    readFileSync(join(secondMirror.directory, 'apps/api/src/main.ts'), 'utf8'),
    'second still active',
  );
  secondMirror.close();
  assert.equal(existsSync(secondMirror.directory), false);
});

for (const kind of ['file', 'directory', 'ancestor', 'fifo']) {
  test(`fails closed on an eligible ${kind} symlink/unsupported entry without publishing updates`, (t) => {
    const { root, put } = fixture(t);
    const staged = mirror(t, root);
    put('outside/secret', 'synthetic-private-target');
    put('apps/api/src/main.ts', 'unpublished');
    const destination = join(root, 'apps/web/src/link');
    if (kind === 'fifo') execFileSync('mkfifo', [destination]);
    else if (kind === 'ancestor') {
      renameSync(join(root, 'apps/web'), join(root, 'outside/web'));
      symlinkSync(join(root, 'outside/web'), join(root, 'apps/web'));
    } else symlinkSync(join(root, kind === 'file' ? 'outside/secret' : 'outside'), destination);
    assert.throws(staged.sync, /symlink|unsupported/);
    assert.equal(
      readFileSync(join(staged.directory, 'apps/api/src/main.ts'), 'utf8'),
      'export {};',
    );
    assert.equal(existsSync(join(staged.directory, 'apps/web/src/link')), false);
  });
}

test('never traverses rejected names, even when they are broken symlinks', (t) => {
  const { root } = fixture(t);
  for (const name of ['.env.canary', '.pi', 'private.pem', 'node_modules']) {
    symlinkSync(join(root, 'nonexistent-private-target'), join(root, 'apps/api/src', name));
  }
  const staged = mirror(t, root);
  assert.deepEqual(inventory(join(staged.directory, 'apps/api/src')), ['main.ts']);
});

test('Docker selection uses only the fixed system locations in priority order', (t) => {
  const trusted = ['/usr/bin/docker', '/usr/local/bin/docker', '/opt/homebrew/bin/docker'];
  const calls = [];
  let available;
  t.mock.method(fs, 'accessSync', (path, mode) => {
    calls.push(path);
    assert.equal(mode, fs.constants.X_OK);
    if (path !== available) throw Object.assign(new Error('Missing'), { code: 'ENOENT' });
  });
  syncBuiltinESMExports();
  try {
    for (const [index, path] of trusted.entries()) {
      available = path;
      calls.length = 0;
      assert.equal(dockerExecutable(), path);
      assert.deepEqual(calls, trusted.slice(0, index + 1));
    }
    available = undefined;
    calls.length = 0;
    assert.throws(dockerExecutable, /trusted system location/);
    assert.deepEqual(calls, trusted);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

test('Docker selection fails closed on installation permission errors', (t) => {
  const denied = Object.assign(new Error('Installation inaccessible'), { code: 'EACCES' });
  t.mock.method(fs, 'accessSync', () => {
    throw denied;
  });
  syncBuiltinESMExports();
  try {
    assert.throws(dockerExecutable, (error) => error === denied);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

async function until(predicate) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (predicate()) return;
    await delay(25);
  }
  throw new Error('Timed out waiting for synthetic wrapper subprocess.');
}

function dockerBoundary(root, script, missingDocker = false, launchTarget) {
  const executable = join(root, 'docker-fixture');
  writeFileSync(executable, `#!${process.execPath}\n${script}`, { mode: 0o755 });
  const preload = join(root, 'docker-boundary.mjs');
  // Replace only Docker's filesystem/process boundary, including in nested pnpm
  // launches. Production executable selection and the whole wrapper still run.
  writeFileSync(
    preload,
    `import fs from 'node:fs';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const trusted = ['/usr/bin/docker', '/usr/local/bin/docker', '/opt/homebrew/bin/docker'];
const access = fs.accessSync;
fs.accessSync = (path, mode) => {
  if (!trusted.includes(path)) return access(path, mode);
  if (${missingDocker}) throw Object.assign(new Error('Absent fixture installation'), { code: 'ENOENT' });
};
const spawn = cp.spawn;
cp.spawn = (command, args, options) => {
  if (command === 'docker') throw new Error('Docker must not be selected through PATH.');
  if (trusted.includes(command)) {
    if (command !== trusted[0]) throw new Error('Unexpected Docker selection order.');
    return spawn(${JSON.stringify(launchTarget ?? executable)}, args, options);
  }
  return spawn(command, args, options);
};
syncBuiltinESMExports();
`,
  );
  return `${process.env.NODE_OPTIONS ?? ''} --import=${pathToFileURL(preload).href}`;
}

function wrapper(
  t,
  root,
  script,
  args = ['--project-name', 'synthetic', 'watch', '--no-up'],
  entry = [process.execPath, helper],
) {
  const bin = join(root, 'bin');
  mkdirSync(bin);
  // Keep nested pnpm scripts on the test runner's Node, not an ambient version.
  symlinkSync(process.execPath, join(bin, 'node'));
  // A PATH impostor must never run, even when earlier than the real installation.
  writeFileSync(
    join(bin, 'docker'),
    `#!${process.execPath}\nrequire('node:fs').writeFileSync('path-docker-ran', 'unsafe'); process.exit(99);`,
    { mode: 0o755 },
  );
  const nodeOptions = dockerBoundary(root, script);
  const child = spawn(entry[0], [...entry.slice(1), ...args], {
    cwd: root,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NODE_OPTIONS: nodeOptions },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const exited = new Promise((resolveResult, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveResult({ code, signal }));
  }).then((result) => {
    assert.equal(existsSync(join(root, 'path-docker-ran')), false);
    return result;
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
  });
  return { child, exited, output: () => output };
}

const recordInvocation = `
const fs = require('node:fs');
fs.writeFileSync('invocation.json', JSON.stringify({args: process.argv.slice(2), stage: process.env.MOBEY_WATCH_SOURCE}));
`;

function developmentFixture(t) {
  const result = fixture(t);
  result.put('package.json', readFileSync(new URL('../package.json', import.meta.url)));
  result.put('scripts/compose-watch.mjs', readFileSync(helper));
  return result;
}

for (const [name, args, expected] of [
  ['default startup', [], ['up', '--build', '--watch']],
  [
    'explicit Watch options',
    ['--project-name', 'synthetic', 'watch', '--no-up'],
    ['--project-name', 'synthetic', 'watch', '--no-up'],
  ],
]) {
  test(`pnpm development entrypoint preserves ${name}, child failure and staging cleanup`, async (t) => {
    const { root } = developmentFixture(t);
    const run = wrapper(t, root, `${recordInvocation}\nprocess.exit(7);`, args, ['pnpm', 'dev']);
    assert.deepEqual(await run.exited, { code: 7, signal: null }, run.output());
    const invocation = JSON.parse(readFileSync(join(root, 'invocation.json')));
    assert.deepEqual(invocation.args, ['compose', '--env-file', '/dev/null', ...expected]);
    assert.equal(typeof invocation.stage, 'string');
    assert.equal(existsSync(invocation.stage), false);
  });
}

for (const [name, args] of [
  ['separate env-file option', ['--env-file', 'synthetic-private.env']],
  ['inline env-file option', ['--env-file=synthetic-private.env']],
]) {
  test(`pnpm development entrypoint with argument terminator rejects ${name} without consuming environment`, async (t) => {
    const { root, put } = developmentFixture(t);
    put('synthetic-private.env', 'NODE_OPTIONS=--synthetic-private-disallowed-option\n');
    const run = wrapper(
      t,
      root,
      `${recordInvocation}\nprocess.exit(0);`,
      ['--', 'watch', '--no-up', ...args],
      ['pnpm', '--silent', 'dev'],
    );
    assert.deepEqual(await run.exited, { code: 1, signal: null });
    assert.doesNotMatch(run.output(), /synthetic-private/, run.output());
    assert.match(run.output(), /Compose Watch failed/);
    assert.equal(existsSync(join(root, 'invocation.json')), false);
  });
}

for (const [name, args] of [
  ['separate env-file option', ['--env-file', 'synthetic-private.env', 'watch', '--no-up']],
  ['inline env-file option', ['watch', '--no-up', '--env-file=synthetic-private.env']],
  ['non-Watch command', ['up', '--build']],
]) {
  test(`development entrypoint rejects ${name} without consuming caller environment or launching Compose`, async (t) => {
    const { root, put } = developmentFixture(t);
    // An invalid synthetic Node option exposes env-file consumption before the
    // wrapper can reject it. Never load a real host environment file.
    put('synthetic-private.env', 'NODE_OPTIONS=--synthetic-private-disallowed-option\n');
    const { scripts } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    // Execute the actual package script with forwarded arguments in its shell,
    // without letting pnpm's own Node launcher consume the same flags first.
    const run = wrapper(t, root, `${recordInvocation}\nprocess.exit(0);`, args, [
      'sh',
      '-c',
      `${scripts.dev} "$@"`,
      'dev',
    ]);
    const result = await run.exited;
    assert.doesNotMatch(run.output(), /synthetic-private/, run.output());
    assert.deepEqual(result, { code: 1, signal: null });
    assert.equal(existsSync(join(root, 'invocation.json')), false);
    assert.match(run.output(), /Compose Watch failed/);
  });
}

test('supervises Compose, forces null env-file, forwards options and cleans staging on child failure', async (t) => {
  const { root } = fixture(t);
  const run = wrapper(t, root, `${recordInvocation}\nprocess.exit(7);`);
  assert.deepEqual(await run.exited, { code: 7, signal: null });
  const invocation = JSON.parse(readFileSync(join(root, 'invocation.json')));
  assert.deepEqual(invocation.args, [
    'compose',
    '--env-file',
    '/dev/null',
    '--project-name',
    'synthetic',
    'watch',
    '--no-up',
  ]);
  assert.equal(existsSync(invocation.stage), false);
});

test('polling propagates atomic arrivals and deletions, forwards shutdown and removes unique stage', async (t) => {
  const { root, put } = fixture(t);
  const run = wrapper(
    t,
    root,
    `${recordInvocation}\nsetInterval(() => {}, 1000);\nprocess.on('SIGINT', () => { fs.writeFileSync('stopped', 'SIGINT'); process.exit(0); });`,
  );
  await until(() => existsSync(join(root, 'invocation.json')));
  const { stage } = JSON.parse(readFileSync(join(root, 'invocation.json')));
  put('arriving/deep/index.ts', 'safe');
  put('arriving/deep/.env.canary', 'synthetic-denied');
  renameSync(join(root, 'arriving'), join(root, 'apps/web/src/arriving'));
  await until(() => existsSync(join(stage, 'apps/web/src/arriving/deep/index.ts')));
  assert.deepEqual(inventory(join(stage, 'apps/web/src/arriving')), ['deep/index.ts']);
  rmSync(join(root, 'apps/web/src/arriving'), { recursive: true });
  await until(() => !existsSync(join(stage, 'apps/web/src/arriving')));
  run.child.kill('SIGINT');
  assert.deepEqual(await run.exited, { code: 130, signal: null });
  assert.equal(readFileSync(join(root, 'stopped'), 'utf8'), 'SIGINT');
  assert.equal(existsSync(stage), false);
});

test('filtering failure stops Compose and emits no private path or contents', async (t) => {
  const { root, put } = fixture(t);
  const run = wrapper(
    t,
    root,
    `${recordInvocation}\nsetInterval(() => {}, 1000);\nprocess.on('SIGTERM', () => { fs.writeFileSync('stopped', 'SIGTERM'); process.exit(0); });`,
  );
  await until(() => existsSync(join(root, 'invocation.json')));
  const { stage } = JSON.parse(readFileSync(join(root, 'invocation.json')));
  put('synthetic-private-target', 'synthetic-private-content');
  symlinkSync(
    join(root, 'synthetic-private-target'),
    join(root, 'apps/api/src/synthetic-private-link'),
  );
  assert.deepEqual(await run.exited, { code: 1, signal: null });
  assert.equal(readFileSync(join(root, 'stopped'), 'utf8'), 'SIGTERM');
  assert.equal(existsSync(stage), false);
  assert.match(run.output(), /synchronization failed/);
  assert.doesNotMatch(run.output(), /synthetic-private/);
});

test('bounds shutdown when Compose ignores the forwarded signal', async (t) => {
  const { root } = fixture(t);
  // Publish readiness only after the fixture can receive the forwarded signal.
  const run = wrapper(
    t,
    root,
    `process.on('SIGTERM', () => { require('node:fs').writeFileSync('stopping', 'received'); });\nsetInterval(() => {}, 1000);\n${recordInvocation}`,
  );
  await until(() => existsSync(join(root, 'invocation.json')));
  const { stage } = JSON.parse(readFileSync(join(root, 'invocation.json')));
  run.child.kill('SIGTERM');
  await until(() => existsSync(join(root, 'stopping')));
  assert.deepEqual(await run.exited, { code: 143, signal: null });
  assert.equal(existsSync(stage), false);
});

for (const failure of ['missing installation', 'removed executable', 'non-executable file']) {
  test(`trusted Docker ${failure} fails without fallback, redacts errors and cleans staging`, async (t) => {
    const { root, put } = fixture(t);
    const scratch = join(root, 'scratch');
    mkdirSync(scratch);
    const bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(
      join(bin, 'docker'),
      `#!${process.execPath}\nrequire('node:fs').writeFileSync('path-docker-ran', 'unsafe');`,
      { mode: 0o755 },
    );
    // Selection succeeds for both launch-failure cases. The real OS spawn then
    // fails, modelling a removed installation or permissions changing after X_OK.
    const launchTarget =
      failure === 'missing installation' ? undefined : join(root, 'synthetic-private-docker');
    if (failure === 'non-executable file') put('synthetic-private-docker', 'not executable');
    const child = spawn(process.execPath, [helper, 'watch', '--no-up'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        NODE_OPTIONS: dockerBoundary(
          root,
          `${recordInvocation}\nprocess.exit(0);`,
          failure === 'missing installation',
          launchTarget,
        ),
        TMPDIR: scratch,
        TMP: scratch,
        TEMP: scratch,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let output = '';
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    const exited = new Promise((resolveResult, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolveResult({ code, signal }));
    });
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await exited;
    });
    assert.deepEqual(await exited, { code: 1, signal: null });
    assert.match(output, /Compose Watch failed/);
    assert.doesNotMatch(output, /synthetic-private|ENOENT|EACCES/);
    assert.equal(existsSync(join(root, 'path-docker-ran')), false);
    assert.equal(existsSync(join(root, 'invocation.json')), false);
    assert.deepEqual(readdirSync(scratch), []);
  });
}
