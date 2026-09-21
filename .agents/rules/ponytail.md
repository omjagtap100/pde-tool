---
description: Ponytail development principles - minimal diffs, YAGNI, and clean incremental delivery
globs: **/*
---

# Ponytail Principles

## 1. YAGNI (You Aren't Gonna Need It)
- Implement only what is directly requested and required for the current milestone.
- Avoid preemptive abstraction, unused helper functions, or speculative infrastructure.
- Keep cloud providers (AWS, Azure) as clean stubs until explicitly requested.
- Do not build or restore a web portal UI this trimester (CLI + API only).

## 2. Minimal Diffs
- Keep code changes tight, focused, and minimal.
- Avoid mass-refactoring or altering working code unrelated to the task.
- Preserve existing working code paths and documentation.

## 3. Clear and Simple Communication
- Use Easy English.
- Use mostly full stops.
- Very few commas.
- Almost no other punctuation.
- State facts directly.

## 4. Verification Before Handoff
- Always verify tests pass after making changes.
- Ensure Node 24 compatibility.
- Ensure all endpoints handle errors gracefully with proper HTTP status codes.
