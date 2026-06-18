# EXT-009 Follow-up: Strengthen `/graduate` branch preflight gates

## Context
Current graduation preflight checks enforce:
- source cache repo exists
- source + wip are git repos
- active branch is not detached
- working tree is clean

This does **not** yet enforce stricter branch policy.

## Gap
Branch policy remains permissive. We do not currently verify:
- branch allowlist/pattern
- upstream tracking present
- ahead/behind parity with upstream
- explicit operator confirmation for non-mainline branch

## Why low priority now
Current gates already prevent most unsafe local state failures (dirty tree, detached head, missing repos).
Given EXT-005 primary objective is user-command graduation + auditable SHA mapping + safe finalize semantics, this stricter policy lands as a dedicated follow-up.

## Proposed follow-up scope
1. Add optional config for allowed target branch patterns.
2. Fail preflight if no upstream tracking branch.
3. Fail (or warn) if branch is behind upstream.
4. Expose clear error contracts per policy failure.
5. Add tests for each branch-policy gate.

## Acceptance criteria
- Branch policy can be enabled without changing default behavior.
- Violations return deterministic error codes/messages.
- Tests cover allowed/disallowed branch, missing upstream, behind upstream.

## Priority
P3 (post EXT-005 graduation flow stabilization)
