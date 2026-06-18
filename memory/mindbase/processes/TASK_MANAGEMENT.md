# Task & Issue Management Workflow

## 📌 `issues/` (Single Source of Truth)
- **Purpose**: Source of truth for proposed, active, blocked, and completed work.
- **Status Model**: Use issue status fields (e.g., BACKLOG, ACTIVE, BLOCKED, DONE, ARCHIVED).
- **Rule**: All meaningful work must be represented and maintained in an issue.
- **ENG-002 Rule**: every `docs/pending/<item-id>/spec.json` must include `issue_id` linking back to issue file.

## 🚀 Flow
`Discovery` -> `issues/backlog` (or `issues/active` if urgent blocker) -> `Human triage` -> `docs/pending/<item-id>/` artifact contract created -> `Gate A pass` -> `Do via Gate B` -> `Verify/Audit via Gate C` -> `Execution updates in same issue` -> `Archive when complete`

## WIP vs Active State (Knowledge Hygiene)
- Paths under `wip/` are staged proposals only.
- Do not report `wip/` artifacts as active repository state.
- Issue progress notes must label staged evidence as `[WIP-STAGED]`.
- Active-state claims require graduated non-`wip/` paths.

## Required Work Item Contract
Path is deterministic from item id: `docs/pending/<item-id>/`
Required files: `plan.md`, `spec.json`, `logs.json`, `verify.json`
Operational audit artifact (required for graduation/audit): `tool_calls.json`
Optional: `challenge.json` (buddy adversarial review evidence with FK links), `code.md`.

Large write policy:
- `spec.json.policy.safe_write_threshold_bytes` may tune threshold (bounded 10KB-500KB, default 50KB).
- `safe_write` requires explicit size invariant id `INV-DATA-LARGEWRITE-001` in `spec.invariants[]`.
- Invariant pass condition: projected file payload must be <= agreed threshold; otherwise mutation is blocked.

## Graduation Commands (EXT-005)
User-only graduation command surface:
- `/graduate <issue> [<repo>]` -> review payload generation only (no destination mutation)
- `/graduate-force <issue> [<repo>]` -> execute graduation into destination source cache
- `/graduate-status <issue> [<repo>]` -> status/timestamps/pending-vs-done/outcome view

Traversal mode (repo omitted):
- enumerate active repos under `wip/<issue>/`
- alphabetical order
- select first not-done repo

Review lock rule:
- operational safety lock unchanged: once review has started and pending verified entries remain, new `safe_edit`/`safe_write` mutations are blocked until queue completion.
