import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export function forbiddenName(name) {
  if (name === '.env.example' || /^\.env\..+\.example$/.test(name)) return false;
  return (
    /^(?:\.env(?:\..*)?|\.pi|\.DS_Store|node_modules|\.pnpm-store|\.turbo|dist|build|coverage|test-results|playwright-report|blob-report|\.terraform|\.aws|\.azure|\.oci|\.ssh|\.netrc|\.pgpass|\.git-credentials|volumes|\.volumes|tfplan|crash\.log|crash\..*\.log)$/.test(
      name,
    ) ||
    /\.(?:pem|key|p12|pfx|tfstate(?:\..*)?|tfplan(?:\.json)?|tsbuildinfo)$/.test(name) ||
    /^terraform-output.*\.json$/.test(name)
  );
}

export async function checkHygiene(directory) {
  let violations = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    // Git internals are neither inspected nor scanned by this filesystem check.
    if (entry.name === '.git') continue;
    if (forbiddenName(entry.name)) {
      violations++;
      continue;
    }
    if (entry.isSymbolicLink()) {
      violations++;
      continue;
    }
    if (entry.isDirectory()) violations += await checkHygiene(join(directory, entry.name));
  }
  return violations;
}

if (process.argv[1]?.endsWith('/check-hygiene.mjs')) {
  const violations = await checkHygiene(process.cwd());
  if (violations) {
    console.error(
      `Clean-checkout hygiene rejected ${violations.toString()} private/generated paths or symlinks.`,
    );
    process.exitCode = 1;
  }
}
