import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

export function verifyArchive(bytes, expectedDigest) {
  if (createHash('sha256').update(bytes).digest('hex') !== expectedDigest) {
    throw new Error('CI tool archive checksum mismatch.');
  }
}

async function install() {
  const tools = JSON.parse(await readFile(new URL('./ci-tools.json', import.meta.url), 'utf8'));
  const [name, directoryName] = process.argv.slice(2);
  const platform = `${process.platform}-${process.arch}`;
  const spec = Object.hasOwn(tools, name ?? '') ? tools[name][platform] : undefined;
  if (!spec || !directoryName || !/^[a-zA-Z0-9_-]+$/.test(directoryName)) {
    throw new Error('Unsupported CI tool/platform or invalid temporary directory name.');
  }
  const temporaryRoot = await realpath(process.env.RUNNER_TEMP ?? tmpdir());
  const destination = join(temporaryRoot, directoryName);
  await mkdir(destination, { recursive: true });
  const target = await realpath(destination);
  const location = relative(temporaryRoot, target);
  if (!location || location === '..' || location.startsWith(`..${sep}`)) {
    throw new Error(
      'CI tool installation must stay in a child of the system/runner temporary directory.',
    );
  }
  const staging = await mkdtemp(join(target, '.download-'));
  try {
    const response = await fetch(spec.url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok)
      throw new Error(`CI tool download failed: HTTP ${response.status.toString()}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyArchive(bytes, spec.sha256);
    const archive = join(staging, spec.url.endsWith('.zip') ? 'archive.zip' : 'archive.tar.gz');
    await writeFile(archive, bytes);
    const toolRoot = join(target, name);
    await mkdir(toolRoot, { recursive: true });
    if ((await realpath(toolRoot)) !== toolRoot)
      throw new Error('CI tool directory must not be a symlink.');
    if (archive.endsWith('.zip')) execFileSync('unzip', ['-oq', archive, '-d', toolRoot]);
    else execFileSync('tar', ['-xzf', archive, '-C', toolRoot]);
    console.log(join(toolRoot, spec.bin));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('/install-ci-tool.mjs')) await install();
