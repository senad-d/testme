---
name: bench-timeout
description: Benchmark-only lookup agent with a one-second time budget. Use only when the request names it; it exists to exercise the timeout path.
role: helper
provider: openai-codex
model: gpt-6-luna
thinking: minimal
tools:
  - read
  - find
  - ls
  - grep
timeout_ms: 1000
---

# Mission

Answer one focused repository question from file evidence and stop.
