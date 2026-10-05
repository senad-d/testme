---
name: "lookup-chain"
description: "Marker-to-secret_number lookup: find the note under notes/ that carries a NEEDLE tracking marker, then read the secret_number recorded in that note. Only for secret_number lookups by NEEDLE marker; not a general two-step lookup."
slots:
  - id: "find"
    agent: "generic"
    task: "Find which file under notes/ contains the marker {{request}} and report its path."
  - id: "read"
    agent: "generic"
    task: "Report the value of secret_number in the file found by the previous step: {{find}}"
---

# Purpose

Benchmark workflow. Two cheap read-only lookups where the second depends on the first step's handoff.
