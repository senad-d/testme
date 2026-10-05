---
name: "worktree-fanout"
description: "Benchmark workflow: the git agent prepares a linked worktree at the absolute path given in the request, then two read-only lookups run in parallel, one inside that worktree and one in the primary checkout. Run only when the request names worktree-fanout."
slots:
  - id: "prepare"
    agent: "git"
    task: "Prepare an isolated linked worktree for this repository on a new branch named bench/fanout at exactly the absolute path given in this request: {{request}}. Report the prepared working directory."
  - id: "read-config"
    agent: "generic"
    depends_on: ["prepare"]
    cwd_from: "prepare"
    task: "Report the value of release.codename in config.json of the current working directory."
  - id: "read-notes"
    agent: "generic"
    depends_on: ["prepare"]
    read_only: true
    task: "Report which file under notes/ contains the marker NEEDLE-7731."
---

# Purpose

Benchmark workflow. Two steps fan out from one prepared worktree; one inherits its directory through cwd_from, the other stays in the primary checkout.
