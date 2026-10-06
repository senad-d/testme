import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  checkPublication,
  createGitRunner,
  main,
  parseArguments,
} from './publication-preflight.mjs';

const branch = 'feat/62';
const commit = 'a'.repeat(40);
const otherCommit = 'b'.repeat(40);
const destination = `HEAD:refs/heads/${branch}`;
const options = { mode: 'preflight', remote: 'origin', destination };
const url = 'https://example.invalid/synthetic-repository';
const upstream = [
  'for-each-ref',
  '--format=%(upstream:remotename)%00%(upstream:remoteref)',
  `refs/heads/${branch}`,
];
const branchRead = ['symbolic-ref', '--quiet', '--short', 'HEAD'];
const commitRead = ['rev-parse', '--verify', 'HEAD'];
const fetchRead = ['remote', 'get-url', '--all', 'origin'];
const pushRead = ['remote', 'get-url', '--push', '--all', 'origin'];
const mirrorRead = ['config', '--get', '--bool', 'remote.origin.mirror'];
const remoteRead = ['ls-remote', '--exit-code', '--refs', 'origin', `refs/heads/${branch}`];

function fixture(mode = 'preflight') {
  const entries = [
    [branchRead, branch],
    [commitRead, commit],
    [upstream, '\0'],
    [fetchRead, url],
    [pushRead, url],
    [mirrorRead, '', 1],
    ...(mode === 'verify' ? [[remoteRead, `${commit}\trefs/heads/${branch}`]] : []),
    [branchRead, branch],
    [commitRead, commit],
  ];
  const calls = [];
  const run = (args) => {
    calls.push(args);
    const entry = entries.shift();
    assert.ok(entry, 'Unexpected inspection command');
    assert.deepEqual(args, entry[0]);
    return { status: entry[2] ?? 0, stdout: `${entry[1]}\n` };
  };
  const replace = (args, stdout, status = 0, last = false) => {
    const matches = entries.filter((entry) => JSON.stringify(entry[0]) === JSON.stringify(args));
    const entry = last ? matches.at(-1) : matches[0];
    assert.ok(entry);
    entry[1] = stdout;
    entry[2] = status;
  };
  return { entries, calls, run, replace };
}

for (const mode of ['preflight', 'verify']) {
  test(`${mode} accepts first publication and inspects only bounded, explicit refs`, () => {
    const target = fixture(mode);
    const result = checkPublication({ ...options, mode }, target.run);
    assert.deepEqual(result, { mode, branch, commit, destination });
    assert.equal(target.entries.length, 0);
    assert.ok(target.calls.every((args) => !['push', 'fetch'].includes(args[0])));
  });
}

test('subprocess wiring captures both streams, bounds inspection and disables interactive prompts', () => {
  const target = fixture('verify');
  const run = createGitRunner((executable, args, settings) => {
    assert.equal(executable, 'git');
    assert.equal(settings.encoding, 'utf8');
    assert.equal(settings.timeout, 30_000);
    assert.equal(settings.maxBuffer, 1024 * 1024);
    assert.deepEqual(settings.stdio, ['ignore', 'pipe', 'pipe']);
    assert.equal(settings.env.GIT_TERMINAL_PROMPT, '0');
    return target.run(args);
  });
  const messages = [];
  assert.equal(
    main(['verify', 'origin', destination], run, {
      log: (text) => messages.push(text),
      error: (text) => messages.push(text),
    }),
    0,
  );
  assert.equal(target.entries.length, 0);
  assert.ok(!messages.join('\n').includes(url));
});

test('repeat publication accepts only the same-named origin upstream', () => {
  for (let iteration = 0; iteration < 2; iteration++) {
    const target = fixture();
    target.replace(upstream, `origin\0refs/heads/${branch}`);
    assert.equal(checkPublication(options, target.run).destination, destination);
  }
});

for (const value of [
  'origin\0refs/heads/main',
  'origin\0refs/heads/protected-release',
  'other\0refs/heads/feat/62',
  'origin\0refs/heads/feat/another',
  '.\0refs/heads/feat/62',
  'origin\0',
  '',
]) {
  test(`rejects mismatched or broken upstream ${JSON.stringify(value)}`, () => {
    const target = fixture();
    target.replace(upstream, value);
    assert.throws(() => checkPublication(options, target.run), /Upstream must be absent/);
    assert.ok(!target.calls.some((args) => args[0] === 'ls-remote'));
  });
}

test('invalid inputs fail before any inspection, including implicit, forced and protected refs', () => {
  for (const args of [
    [],
    ['publish', 'origin', destination],
    ['preflight', 'other', destination],
    ['preflight', url, destination],
    ['preflight', 'origin'],
    ['preflight', 'origin', destination, '--force'],
    ...[
      'main',
      'HEAD',
      'HEAD:main',
      'HEAD:refs/heads/main',
      'HEAD:refs/heads/protected-release',
      '+HEAD:refs/heads/feat/62',
      'HEAD:refs/heads/feat/a..b',
      'HEAD:refs/heads/feat/a.lock',
      'HEAD:refs/heads/feat/a.lock/b',
      'HEAD:refs/heads/feat/.hidden',
      'HEAD:refs/heads/feat/a//b',
      'HEAD:refs/heads/feat/a/',
      'HEAD:refs/heads/feat/a.',
      'HEAD:refs/heads/feat/a;echo',
      'HEAD:refs/heads/feat/a\nb',
      'HEAD:refs/heads/feat/a*',
    ].map((ref) => ['preflight', 'origin', ref]),
  ]) {
    let inspected = false;
    const messages = [];
    const status = main(
      args,
      () => {
        inspected = true;
      },
      {
        log: (text) => messages.push(text),
        error: (text) => messages.push(text),
      },
    );
    assert.equal(status, 1);
    assert.equal(inspected, false);
    assert.ok(messages.length > 0);
    assert.ok(messages.every((text) => !text.includes(url)));
  }
});

test('all documented feature namespaces parse without broadening protected destinations', () => {
  for (const namespace of ['feat', 'fix', 'infra', 'test', 'docs']) {
    const ref = `HEAD:refs/heads/${namespace}/62-safe-name`;
    assert.equal(parseArguments(['preflight', 'origin', ref]).destination, ref);
  }
});

test('refuses a destination that does not match current branch, including main and detached HEAD', () => {
  for (const [value, status] of [
    ['main', 0],
    ['feat/another', 0],
    ['', 1],
  ]) {
    const target = fixture();
    target.replace(branchRead, value, status);
    assert.throws(() => checkPublication(options, target.run));
    assert.equal(target.calls.length, 1);
  }
});

for (const [name, args, value] of [
  ['different push target', pushRead, 'https://example.invalid/another-repository'],
  ['multiple push targets', pushRead, `${url}\nhttps://example.invalid/another-repository`],
  ['multiple fetch targets', fetchRead, `${url}\n${url}`],
  ['missing target', fetchRead, ''],
  ['mirror remote', mirrorRead, 'true'],
]) {
  test(`rejects ${name} without querying a remote`, () => {
    const target = fixture('verify');
    target.replace(args, value);
    assert.throws(() => checkPublication({ ...options, mode: 'verify' }, target.run));
    assert.ok(!target.calls.some((args) => args[0] === 'ls-remote'));
  });
}

test('non-mirror explicit configuration is accepted', () => {
  const target = fixture();
  target.replace(mirrorRead, 'false');
  assert.equal(checkPublication(options, target.run).commit, commit);
});

for (const [name, value, status] of [
  ['missing', '', 2],
  ['empty success', '', 0],
  ['stale', `${otherCommit}\trefs/heads/${branch}`, 0],
  ['different ref', `${commit}\trefs/heads/main`, 0],
  ['ambiguous', `${commit}\trefs/heads/${branch}\n${commit}\trefs/heads/${branch}`, 0],
  ['unreachable', '', 128],
]) {
  test(`remote verification rejects ${name} feature refs`, () => {
    const target = fixture('verify');
    target.replace(remoteRead, value, status);
    assert.throws(() => checkPublication({ ...options, mode: 'verify' }, target.run));
  });
}

test('local changes during inspection fail closed', () => {
  for (const [args, value] of [
    [branchRead, 'feat/another'],
    [commitRead, otherCommit],
  ]) {
    const target = fixture('verify');
    target.replace(args, value, 0, true);
    assert.throws(
      () => checkPublication({ ...options, mode: 'verify' }, target.run),
      /HEAD changed/,
    );
  }
});

test('every inspection fails closed on exit failure, signal or error despite valid stdout', () => {
  const inspections = fixture('verify').entries.length;
  const sensitive = 'synthetic private inspection detail';
  for (let failingIndex = 0; failingIndex < inspections; failingIndex++) {
    for (const failure of [
      { status: 128 },
      { signal: 'SIGTERM' },
      { error: new Error(sensitive) },
    ]) {
      const target = fixture('verify');
      const messages = [];
      let index = 0;
      const status = main(
        ['verify', 'origin', destination],
        (args) => {
          const result = target.run(args);
          return index++ === failingIndex ? { ...result, ...failure, stderr: sensitive } : result;
        },
        {
          log: (text) => messages.push(text),
          error: (text) => messages.push(text),
        },
      );
      assert.equal(status, 1, `Inspection ${failingIndex}: ${Object.keys(failure)[0]}`);
      assert.deepEqual(messages, ['Git inspection failed; no publication or PR is authorized.']);
    }
  }
});

test('verification supports SHA-256 object IDs without treating them as malformed HEAD', () => {
  const target = fixture('verify');
  const sha256 = 'c'.repeat(64);
  target.replace(commitRead, sha256);
  target.replace(commitRead, sha256, 0, true);
  target.replace(remoteRead, `${sha256}\trefs/heads/${branch}`);
  assert.equal(checkPublication({ ...options, mode: 'verify' }, target.run).commit, sha256);
});

// This executable is a synthetic protocol peer, not Git. The child receives only
// this temporary PATH, so these CLI tests cannot read checkout metadata or a remote.
async function isolatedCli(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mobey-publication-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, 'git'),
    `#!${process.execPath}
const args = process.argv.slice(2);
const command = args[0];
const branch = ${JSON.stringify(branch)};
const commit = ${JSON.stringify(commit)};
const url = ${JSON.stringify(url)};
let text;
switch (command) {
  case 'symbolic-ref': text = branch; break;
  case 'rev-parse': text = commit; break;
  case 'for-each-ref': text = '\\0'; break;
  case 'remote': text = url; break;
  case 'config': process.exit(1); break;
  case 'ls-remote':
    text = (process.env.FAKE_RESULT === 'stale' ? ${JSON.stringify(otherCommit)} : commit)
      + '\\trefs/heads/' + branch;
    if (process.env.FAKE_RESULT === 'unreachable') {
      console.error(url);
      console.log(text);
      process.exit(128);
    }
    break;
  default: console.error(url); process.exit(128);
}
console.log(text);
`,
    { mode: 0o700 },
  );
  return (mode, result = 'match') =>
    spawnSync(
      process.execPath,
      [
        new URL('./publication-preflight.mjs', import.meta.url).pathname,
        mode,
        'origin',
        destination,
      ],
      {
        cwd: directory,
        env: {
          PATH: result === 'missing-executable' ? join(directory, 'unavailable') : directory,
          FAKE_RESULT: result,
        },
        encoding: 'utf8',
        timeout: 10_000,
      },
    );
}

test('actual CLI emits explicit publication and verification evidence with a synthetic executable', async (t) => {
  const run = await isolatedCli(t);
  for (const mode of ['preflight', 'verify']) {
    const result = run(mode);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.ok(result.stdout.includes(`${mode} passed: ${branch} at ${commit}`));
    assert.ok(!result.stdout.includes(url));
    if (mode === 'preflight')
      assert.ok(
        result.stdout.includes(`git -c push.followTags=false push -- origin ${destination}`),
      );
    else assert.match(result.stdout, /Remote feature ref matches HEAD/);
  }
});

test('actual CLI returns failure without success evidence or diagnostics for stale, unreachable or unavailable inspection', async (t) => {
  const run = await isolatedCli(t);
  for (const failure of ['stale', 'unreachable', 'missing-executable']) {
    const result = run('verify', failure);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(
      result.stderr,
      failure === 'stale' ? /differs from HEAD/ : /Git inspection failed/,
    );
    assert.ok(!result.stderr.includes(url));
    assert.ok(!result.stderr.includes(commit));
  }
});

test('malformed commit output is rejected', () => {
  const target = fixture();
  target.replace(commitRead, 'not-an-object');
  assert.throws(() => checkPublication(options, target.run), /Invalid HEAD/);
});

test('CLI captures success evidence without exposing inspected remote details', () => {
  for (const mode of ['preflight', 'verify']) {
    const target = fixture(mode);
    const messages = [];
    const status = main([mode, 'origin', destination], target.run, {
      log: (text) => messages.push(text),
      error: (text) => messages.push(text),
    });
    assert.equal(status, 0);
    assert.ok(messages[0].includes(`${branch} at ${commit}`));
    assert.ok(!messages.join('\n').includes(url));
    if (mode === 'preflight') {
      assert.ok(messages.some((text) => text.includes(`push -- origin ${destination}`)));
      assert.ok(messages.some((text) => text.includes('push.followTags=false')));
    }
  }
});

test('CLI failures redact stdout, stderr, runner errors and exceptions', () => {
  const sensitive = 'private remote inspection detail';
  for (const result of [
    { status: 128, stdout: sensitive, stderr: sensitive },
    { status: null, stdout: sensitive, error: new Error(sensitive) },
    { status: 0, stdout: sensitive, signal: 'SIGTERM' },
    { status: 0, stdout: sensitive },
  ]) {
    const messages = [];
    const status = main(['verify', 'origin', destination], () => result, {
      log: (text) => messages.push(text),
      error: (text) => messages.push(text),
    });
    assert.equal(status, 1);
    assert.ok(!messages.join('\n').includes(sensitive));
  }
  const messages = [];
  assert.equal(
    main(
      ['preflight', 'origin', destination],
      () => {
        throw new Error(sensitive);
      },
      {
        log: (text) => messages.push(text),
        error: (text) => messages.push(text),
      },
    ),
    1,
  );
  assert.deepEqual(messages, ['Publication inspection failed.']);
});
