import { spawnSync } from 'node:child_process';

const usage =
  'Usage: node scripts/publication-preflight.mjs <preflight|verify> origin HEAD:refs/heads/<feature-branch>';

class PreflightError extends Error {}

function reject(message) {
  throw new PreflightError(message);
}

export function parseArguments(args) {
  if (args.length !== 3) reject(usage);
  const [mode, remote, destination] = args;
  if (!['preflight', 'verify'].includes(mode) || remote !== 'origin') reject(usage);
  const branch = destination.replace(/^HEAD:refs\/heads\//, '');
  // Conservative shell-safe subset of Git refs and the repository's delivery namespaces.
  // Never accept a URL, ref expression, wildcard, force prefix or protected source branch.
  if (
    destination !== `HEAD:refs/heads/${branch}` ||
    !/^(feat|fix|infra|test|docs)\/[A-Za-z0-9][A-Za-z0-9/._-]*$/.test(branch) ||
    branch.includes('..') ||
    branch.includes('//') ||
    branch.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.lock')) ||
    branch.endsWith('.')
  )
    reject('An explicit same-named feature destination is required.');
  return { mode, remote, destination, branch };
}

// The command runner is injected so tests cannot accidentally access Git or a live remote.
export function checkPublication(options, run) {
  // Revalidate even when called as a library.
  const { mode, remote, destination, branch } = parseArguments([
    options.mode,
    options.remote,
    options.destination,
  ]);
  const read = (args, allowed = [0]) => {
    const result = run(args);
    if (!allowed.includes(result.status) || result.error || result.signal)
      reject('Git inspection failed; no publication or PR is authorized.');
    return { status: result.status, text: result.stdout.trim() };
  };
  const currentBranch = () => read(['symbolic-ref', '--quiet', '--short', 'HEAD']).text;
  const currentCommit = () => {
    const commit = read(['rev-parse', '--verify', 'HEAD']).text;
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) reject('Invalid HEAD object.');
    return commit;
  };
  if (currentBranch() !== branch) reject('Destination must match the current feature branch.');
  const commit = currentCommit();
  const upstream = read([
    'for-each-ref',
    '--format=%(upstream:remotename)%00%(upstream:remoteref)',
    `refs/heads/${branch}`,
  ]).text;
  // Missing upstream is valid for first publication; broken or differently named upstreams are not.
  if (upstream !== '\0' && upstream !== `${remote}\0refs/heads/${branch}`)
    reject('Upstream must be absent or the same-named origin feature branch, never main.');

  const fetchUrl = read(['remote', 'get-url', '--all', remote]).text;
  const pushUrl = read(['remote', 'get-url', '--push', '--all', remote]).text;
  // Inspect in memory only. Do not print remote URLs, even when inspection fails.
  if (!fetchUrl || fetchUrl.includes('\n') || fetchUrl !== pushUrl)
    reject(
      'Origin must have one identical fetch/push destination; review its configuration privately.',
    );
  const mirror = read(['config', '--get', '--bool', `remote.${remote}.mirror`], [0, 1]);
  if (mirror.status === 0 && mirror.text !== 'false') reject('Mirror publication is prohibited.');

  if (mode === 'verify') {
    const remoteRef = read([
      'ls-remote',
      '--exit-code',
      '--refs',
      remote,
      `refs/heads/${branch}`,
    ]).text;
    if (remoteRef !== `${commit}\trefs/heads/${branch}`)
      reject('Remote feature ref is missing, ambiguous or differs from HEAD; do not open a PR.');
  }
  // Detect local changes during inspection, including a branch switch during a network query.
  if (currentBranch() !== branch || currentCommit() !== commit)
    reject('HEAD changed during inspection; rerun the preflight.');
  return { mode, branch, commit, destination };
}

export function createGitRunner(spawn) {
  return (args) =>
    spawn('git', args, {
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      // Capture both streams; Git errors can contain credential-bearing URLs.
      stdio: ['ignore', 'pipe', 'pipe'],
    });
}

export function main(args, run, output) {
  try {
    const result = checkPublication(parseArguments(args), run);
    output.log(`${result.mode} passed: ${result.branch} at ${result.commit}`);
    if (result.mode === 'preflight') {
      output.log(
        `Explicit publication: git -c push.followTags=false push -- origin ${result.destination}`,
      );
      output.log('Run verify after publication and immediately before opening the PR.');
    } else {
      output.log(
        'Remote feature ref matches HEAD. This is not branch-protection or review evidence.',
      );
    }
    return 0;
  } catch (error) {
    output.error(
      error instanceof PreflightError ? error.message : 'Publication inspection failed.',
    );
    return 1;
  }
}

if (import.meta.main)
  process.exitCode = main(process.argv.slice(2), createGitRunner(spawnSync), console);
