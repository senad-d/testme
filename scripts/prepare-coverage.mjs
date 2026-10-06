import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const reports = [];
for (const workspace of ['apps/web', 'apps/api', 'packages/shared']) {
  const report = await readFile(`${workspace}/coverage/lcov.info`, 'utf8');
  if (!report.includes('SF:') || !report.includes('end_of_record')) {
    throw new Error(`Missing coverage records for ${workspace}.`);
  }
  const lines = [];
  for (const line of report.split('\n')) {
    if (!line.startsWith('SF:')) {
      lines.push(line);
      continue;
    }
    const source = line.slice(3);
    const absolute = isAbsolute(source) ? source : resolve(workspace, source);
    const withinWorkspace = relative(resolve(workspace), absolute);
    if (withinWorkspace.startsWith(`..${sep}`) || !/\.(ts|tsx)$/.test(absolute)) {
      throw new Error('Coverage must map to workspace TypeScript source.');
    }
    await access(absolute);
    lines.push(`SF:${relative(process.cwd(), absolute).split(sep).join('/')}`);
  }
  reports.push(lines.join('\n'));
}
await mkdir('coverage', { recursive: true });
await writeFile('coverage/lcov.info', reports.join('\n'));
