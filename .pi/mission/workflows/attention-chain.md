---
name: "attention-chain"
description: "Benchmark workflow whose first step reads a note that does not exist and must hand off needs_attention; the second step depends on it. Run only when the request names attention-chain."
slots:
  - id: "probe"
    agent: "generic"
    task: "Report the value of secret_number in notes/incident-0999.md. If that file does not exist, hand off with status needs_attention naming the missing file; do not search for alternatives."
  - id: "read"
    agent: "generic"
    task: "Report the value of secret_number in notes/incident-0412.md. Context from the previous step: {{probe}}"
---

# Purpose

Benchmark workflow. Step one settles needs_attention on purpose so the dependent step stays queued until the user accepts or retries.
