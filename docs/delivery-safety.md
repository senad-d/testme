# Protected-main delivery and feature publication (#62)

Trace: incident #62, follow-up to #15. This is a delivery safety correction, not a
new MVP product task or OQ decision. #23 owns CI/Sonar/security checks; #24 owns
CODEOWNERS and issue/PR templates. Neither file guidance nor the preflight creates
server-side protection. No cloud resources, application behavior or secrets change.

## Mandatory publication sequence

Use the pinned Node/pnpm toolchain and an authorized Git delivery agent. For branch
`feat/62` (substitute the **current** feature branch in every command):

```sh
pnpm publication:preflight origin HEAD:refs/heads/feat/62
# Only after the preflight succeeds, publish with this exact explicit destination:
git -c push.followTags=false push -- origin HEAD:refs/heads/feat/62
pnpm publication:verify origin HEAD:refs/heads/feat/62
# Only after verification succeeds, open the reviewed PR targeting main.
```

Do not use bare `git push`, force, mirror, `--all`, `--tags`, or an inherited push
refspec. Disabling automatic tag following confines this publication to the feature
ref. The preflight does not publish or modify Git configuration; the Git agent owns
publication and PR creation. It outputs only a feature ref, commit ID and explicit
command, never remote URLs or captured Git diagnostics. Do not enable shell tracing
or paste raw Git/credential-helper errors into evidence.

The preflight requires:

- A current branch in the repository's `feat/`, `fix/`, `infra/`, `test/`, or `docs/`
  delivery namespace and an exact `HEAD:refs/heads/<current-branch>` destination.
  Detached HEAD, protected source `main`, ref expressions and ambiguous destinations
  fail closed.
- No upstream (first publication), or exactly the same-named `origin` feature ref.
  An upstream to `origin/main`, any other protected/differently named branch, another
  remote or the local repository is rejected, even if the explicit ref is otherwise
  correct. The Git agent must correct it deliberately and rerun; the tool does not
  repair it silently.
- One identical effective fetch/push URL for `origin`, after Git URL rewrites, and
  no mirror configuration. Multiple destinations or different fetch/push targets
  fail closed, rather than verifying one repository after publishing to another.
  Review any URL configuration privately; never record credential-bearing URLs.

`verify` repeats these checks and queries the live remote with an exact feature ref.
It requires the remote feature commit to equal the inspected HEAD, not merely that
some branch exists. A missing, stale, ambiguous or unreachable ref blocks PR opening.
Inspection is bounded to 30 seconds per Git command, captures both output streams,
and detects a local branch/commit change during inspection. Repeat verification
immediately before PR creation after any new commit or publication. These checks
are point-in-time guards, not atomic locks against concurrent local/remote changes.
An untrusted Git configuration or credential helper is executable code: only run
against the intended trusted checkout/origin, not an unknown validation target.

## Server-side protection — authorized administrator required

Issue #62 cannot be accepted solely on this implementation. An administrator must
configure and inspect active protection/rulesets for `senad-d/testme`'s exact `main`
ref so normal delivery cannot update it outside a PR:

1. Require pull requests for updates to `main`. Ensure effective enforcement applies
   to normal delivery actors, not merely a disabled/evaluate-only rule. Inspect all
   applicable rules and bypasses; obtain owner direction for unspecified bypass or
   review-count policy rather than inventing it. Preserve stronger existing rules.
2. Require the existing #23 aggregate status **`CI required`**, from the CI workflow,
   once its live check identity is established. Do not duplicate its jobs, remove
   its Sonar dependency, or substitute a nonblocking check. Missing/failed/skipped
   CI must not permit merging. Resolve any GitHub plan/settings limitation explicitly.
3. Record sanitized effective rule evidence and a successful protected PR's check
   and review evidence. Protection API responses/settings are evidence of configured
   enforcement; local preflight tests are not evidence of live rejected direct pushes.
   Do not test an unknown main rule by attempting a commit-bearing direct push: if
   protection is absent, the probe could change shared main. Any behavioral rejection
   probe needs separate authorization and an isolated disposable repository with the
   same rules/actor permissions; state that scope honestly.

Evidence must identify repository, protected ref, rule/check names, enforcement and
bypass applicability, timestamp, tested commit and PR link without credentials,
tokens, raw remote URLs, or participant data. Live settings and GitHub checks remain
external acceptance evidence until an authorized step supplies them. No source
configuration here claims protection is active.

## Validation and exact manifest

`pnpm test:publication` exercises injected synthetic command transcripts and actual
Node CLI subprocesses using a temporary synthetic executable named `git`: no real
Git operation, Git metadata access, network, remote or settings mutation. It proves
safe/unsafe upstream and destination behavior, first/repeated publication, remote
commit verification (including SHA-256), target fan-out/mirror rejection, local
races, inspection failures and redacted CLI failure output. `pnpm test:ci-policy`
also runs these regressions through #23's existing workflow command; there is no
second workflow. Source lint includes both scripts. Real Git subprocess behavior
and live GitHub enforcement must be verified by the authorized Git/settings step,
not inferred from synthetic tests.

Exact changed-file manifest: `scripts/publication-preflight.mjs`,
`scripts/publication-preflight.test.mjs`, `package.json`, `docs/delivery-safety.md`,
`docs/testing.md`, `README.md`, `AGENTS.md`. Synchronize this manifest and external
acceptance evidence into issue #62 and its PR before publication. No migration,
deployment, dependency or lockfile changes are needed. Rollback removes the local
guard/scripts and companion documentation; server-side rule changes require the
administrator and must not be weakened to bypass failed checks.
