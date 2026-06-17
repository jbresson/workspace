# Expectations Registry (ENG-002 aligned)

## 1. SPEC_READY_GATE (Gate A)
**Phase**: Map -> Do transition  
**Requirement**:
- Deterministic required path contract from `item_id`: `docs/pending/<item-id>/`.
- Required files exist: `plan.md`, `spec.json`, `logs.json`, `verify.json`.
- `spec.json` has objective/invariants/scenarios; high-risk invariant classes (`security|data|compliance`) include authority; invariant genericity rubric passes.
- Every invariant has a mapping in `verify.json`.

**Failure Mode**: hard stop; no source edits.

## 2. RECORDED_MUTATION_GATE (Gate B)
**Phase**: Do  
**Requirement**:
- Source mutations must execute only through recorded transaction path (`safe_edit` or `safe_write`).
- `logs.json` entry required with `log_id`, hashes, verification signal, and final status (`verified|failed|reverted`).
- Incomplete/failed transaction must be repaired or reverted before next mutation on affected file(s).
- Open review lock: if review has started and remaining verified entries exist, `safe_edit`/`safe_write` are blocked.
- `safe_write` requires explicit size invariant `INV-DATA-LARGEWRITE-001` in `spec.invariants[]`.
- Invariant must pass: projected payload must be within agreed threshold (`spec.policy.safe_write_threshold_bytes`, bounded 10KB-500KB; default 50KB). If exceeded, write is blocked.

**Failure Mode**: change invalid; phase blocked.

## 3. SYNC_AUDIT_GATE (Gate C)
**Phase**: Verify/Audit  
**Requirement**:
- Synchronous audit (not background).
- Detect unlogged modifications against declared modified file list.
- Detect hash inconsistencies for verified entries.
- Ensure `verify.json` mappings have current pass results.
- Enforce tool-call provenance via `tool_calls.json` for policy-critical calls (`spec`, `safe_edit`, `safe_write`, `audit_change_ledger`, `graduate`).
- Require at least one successful `spec action=ready` call and safe mutation (`safe_edit|safe_write`) pass coverage for finalized verified log entries.
- Require per-entry provenance: each verified `logs.json` entry must have matching successful safe mutation call by `log_id`.

**Failure Mode**: task close blocked; escalation in issue status/progress notes.

## Validator Policy
Validators are policy gates, not product modules. No unit-test mandate for validator internals.
Confidence signals:
- deterministic contract output (`gate_id/status/exit_code/reasons/evidence`),
- schema/semantic checks,
- live gate execution,
- buddy adversarial review evidence in `challenge.json`.
