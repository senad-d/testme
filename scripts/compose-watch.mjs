import { spawn } from 'node:child_process';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Compose filters directory events, not their recursively copied descendants.
// Never expose raw source trees to Watch. Apply the .dockerignore/source Watch
// deny policy before reading files or publishing any directory to the mirror.
const deniedNames = new Set([
  '.pi',
  '.git',
  'node_modules',
  '.DS_Store',
  '.aws',
  '.azure',
  '.oci',
  '.ssh',
  '.config',
  '.npmrc',
  '.netrc',
  '.pgpass',
  '.git-credentials',
  'credentials',
  'dist',
  'coverage',
  'test-results',
]);
const deniedFile = /\.(?:pem|key|p12|pfx|log|tsbuildinfo)$|\.(?:test|spec)\./;
const sourceTrees = ['apps/api/src', 'apps/web/src'];
const sourceFiles = ['apps/web/vite.config.ts', 'apps/web/index.html'];

export function sourceNameAllowed(name) {
  return !name.startsWith('.env') && !deniedNames.has(name) && !deniedFile.test(name);
}

function regularEntry(path, kind) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !(kind === 'directory' ? info.isDirectory() : info.isFile())) {
    throw new Error('Source contains a symlink or unsupported filesystem entry.');
  }
  return info;
}

function snapshot(root) {
  const files = new Map();
  const directories = new Set();
  function visit(relative, directory) {
    const path = join(root, relative);
    const before = regularEntry(path, directory ? 'directory' : 'file');
    // Check every ancestor inside the checkout, not only the leaf.
    if (realpathSync(path) !== path) throw new Error('Source path traverses a symlink.');
    if (directory) {
      directories.add(relative);
      for (const name of readdirSync(path)) {
        if (!sourceNameAllowed(name)) continue;
        const child = join(relative, name);
        const info = lstatSync(join(root, child));
        visit(child, info.isDirectory());
      }
    } else {
      const descriptor = openSync(
        path,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      try {
        const opened = fstatSync(descriptor);
        if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev) {
          throw new Error('Source changed during filtering.');
        }
        files.set(relative, readFileSync(descriptor));
      } finally {
        closeSync(descriptor);
      }
    }
    const after = regularEntry(path, directory ? 'directory' : 'file');
    if (after.ino !== before.ino || after.dev !== before.dev || realpathSync(path) !== path) {
      throw new Error('Source changed during filtering.');
    }
  }
  for (const tree of sourceTrees) visit(tree, true);
  for (const file of sourceFiles) visit(file, false);
  return { files, directories };
}

export function createSourceMirror(checkout) {
  const root = realpathSync(checkout);
  const directory = mkdtempSync(join(tmpdir(), 'mobey-compose-watch-'));
  let previous = { files: new Map(), directories: new Set() };
  let closed = false;
  function sync() {
    if (closed) throw new Error('Source mirror is closed.');
    // Complete validation before changing the tree Compose can see.
    const next = snapshot(root);
    for (const path of previous.files.keys()) {
      if (!next.files.has(path)) rmSync(join(directory, path));
    }
    for (const path of [...previous.directories].sort((a, b) => b.length - a.length)) {
      if (!next.directories.has(path)) rmSync(join(directory, path), { recursive: true });
    }
    for (const path of next.directories) mkdirSync(join(directory, path), { recursive: true });
    for (const [path, contents] of next.files) {
      if (previous.files.get(path)?.equals(contents)) continue;
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      // Atomic file publication; temporary writes are outside all watched paths.
      const pending = join(directory, '.pending');
      writeFileSync(pending, contents, { mode: 0o644 });
      renameSync(pending, join(directory, path));
    }
    previous = next;
  }
  function close() {
    closed = true;
    rmSync(directory, { recursive: true, force: true });
  }
  try {
    sync();
    return { directory, sync, close };
  } catch (error) {
    close();
    throw error;
  }
}

export async function runComposeWatch(args, { root = process.cwd(), intervalMs = 250 } = {}) {
  // Toolchain enforcement also applies when invoked directly, outside pnpm.
  if (process.versions.node !== '24.20.0') throw new Error('Use pinned Node 24.20.0.');
  const command = args.length ? args : ['up', '--build', '--watch'];
  if (command.some((arg) => arg === '--env-file' || arg.startsWith('--env-file='))) {
    throw new Error('The wrapper owns --env-file /dev/null.');
  }
  if (!command.includes('watch') && !(command.includes('up') && command.includes('--watch'))) {
    throw new Error('Expected Compose up --watch or watch --no-up.');
  }
  const mirror = createSourceMirror(root);
  let child;
  let timer;
  let killTimer;
  let failed = false;
  let stopping = false;
  let stopSignal;
  const stop = (signal = 'SIGTERM') => {
    if (stopping) return;
    stopping = true;
    stopSignal = signal;
    clearInterval(timer);
    child?.kill(signal);
    killTimer = setTimeout(() => child?.kill('SIGKILL'), 5000);
    killTimer.unref();
  };
  const onInterrupt = () => stop('SIGINT');
  const onTerminate = () => stop('SIGTERM');
  try {
    child = spawn('docker', ['compose', '--env-file', '/dev/null', ...command], {
      cwd: root,
      env: { ...process.env, MOBEY_WATCH_SOURCE: mirror.directory },
      stdio: 'inherit',
    });
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    timer = setInterval(() => {
      try {
        mirror.sync();
      } catch {
        // Do not print filesystem error strings: they can contain private paths.
        console.error('Filtered source synchronization failed; stopping Compose Watch.');
        failed = true;
        stop();
      }
    }, intervalMs);
    const result = await new Promise((resolveResult, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolveResult({ code, signal }));
    });
    if (failed) return 1;
    if (stopping) return stopSignal === 'SIGINT' ? 130 : 143;
    return result.code ?? 1;
  } finally {
    clearInterval(timer);
    clearTimeout(killTimer);
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
    mirror.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runComposeWatch(process.argv.slice(2));
  } catch {
    console.error(
      'Compose Watch failed. Check the pinned toolchain and eligible source filesystem entries.',
    );
    process.exitCode = 1;
  }
}
