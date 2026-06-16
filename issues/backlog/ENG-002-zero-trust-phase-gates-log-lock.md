# Issue ENG-002: Zero-Trust Phase Gates + Log-Lock (Structured Artifacts)

**Status**: PENDING  
**Priority**: HIGH  
**Category**: Core / Process Integrity

## Context
Current rigor rules exist mainly as Markdown guidance and agent inference. This allows bypass risk:
- spec checks can be skipped or loosely interpreted,
- source edits can occur without durable, machine-auditable trace,
- narrow invariants can satisfy letter while violating intent.

Goal: codify phase-gated validation via deterministic artifact contracts and synchronous audit steps in task flow.

## Objective
Implement a zero-trust, file-contract-based execution model where phase entry/exit is validated by deterministic scripts, with synchronous audit in task process (not background jobs), and no reliance on grep heuristics.

## Non-Negotiable Constraints
- Required files must have fixed, tool-guaranteed locations.
- Validation must use structured schemas, not free-form text search.
- Source changes must be tied to an atomic log transaction.
- Audit must run during Verify/Audit phase in task lifecycle.
- Avoid validator-unit-test burden; validators are policy gates, validated through contract checks + live gate execution + buddy adversarial review.
- Terminology: external AI = `agent`; in-system AI = `buddy`.

## Required File Contract (per work item)
All required files reside in one deterministic folder:

`docs/pending/<item-id>/`

Required:
1. `plan.md` — human-readable spec
2. `spec.json` — machine-readable contract index (objective/invariants/scenarios metadata)
3. `logs.json` — authoritative atomic change ledger
4. `verify.json` — invariant → verification mapping

Optional (human narrative):
5. `code.md`

### Tool Contract
Tooling for each phase must compute paths directly from `<item-id>` and fail hard if missing. No directory scan/grep allowed for required artifacts.

## Structured Schemas

### spec.json (minimum)
- `item_id`
- `issue_id`
- `objective`
- `invariants[]`
  - `id`
  - `class` (`security|data|behavior|performance|compliance`)
  - `statement` (generic/fundamental, not narrow implementation wording)
  - `authority` (OWASP/RFC/internal mandate reference)
  - `anti_patterns[]`
  - `verification_mode` (`unit|integration|property|static|manual`)
- `scenarios[]`
- `updated_at`

### logs.json (minimum)
- `item_id`
- `entries[]`
  - `log_id`
  - `timestamp`
  - `actor_type` (`buddy`)
  - `files[]`
  - `reason`
  - `decision_ref` (optional)
  - `hash_before` / `hash_after`
  - `verification`
  - `status` (`pending|verified|failed|reverted`)

### verify.json (minimum)
- `item_id`
- `mappings[]`
  - `invariant_id`
  - `verification_mode`
  - `target` (command/check identifier)
  - `expected_signal`
  - `last_result`

## Phase Gate Design

### Gate A: Spec Ready (Map -> Do transition)
Pass conditions:
- all required files exist,
- `spec.json` schema-valid,
- objective/invariants/scenarios non-empty,
- high-risk invariant classes (`security|data|compliance`) must include `authority`,
- invariant statements satisfy genericity rubric (not single-tech loophole wording).

Fail action:
- hard stop, create/update blocker issue entry, no source edits allowed.

### Gate B: Recorded Edit Enforcement (Do phase)
Rule:
- source file edits allowed only through recorded transaction operation.

Transaction sequence:
1. append pending entry in `logs.json`
2. apply edit
3. run scoped verification signal
4. finalize entry with hashes/status

Failure handling:
- incomplete transaction marks `failed` and requires explicit revert or repair before next edit.

### Gate C: Synchronous Audit (Verify & Audit phase)
Runs as part of task process step, not daemon/background:
- compare actual modified files against `logs.json` entries,
- detect unlogged modifications,
- detect hash/timestamp inconsistencies,
- ensure invariant mappings in `verify.json` have current results.

Fail action:
- task cannot close; escalation in issue + blocker state.

## Anti-Gaming Hardening
Problem: narrow invariants can be technically satisfied while violating intent.

Hardening rules:
1. Invariant Genericity Rubric
   - reject invariant text that encodes only one bypass class (e.g., “no base64”).
   - require fundamental property language (e.g., one-way salted hashing with accepted algorithm class).
2. Authority Requirement
   - high-risk invariants require normative source reference.
3. Anti-Pattern Enumeration
   - each high-risk invariant must include explicit anti-pattern list in `spec.json`.
4. Buddy Adversarial Check
   - second buddy challenges proposed invariant set for loopholes before gate approval.
5. No “spirit-only” enforcement
   - intent must be encoded as machine-checkable fields/rules.

## Validator Philosophy (Important)
Validators are policy enforcement gates, not product modules.

Therefore:
- Do **not** require unit-test suites for validator internals.
- Required quality signals are:
  - deterministic contract behavior (stable exit semantics),
  - schema validation,
  - execution during real phase gates,
  - buddy adversarial review with challenge cases,
  - explicit failure outputs for triage.

## Implementation Plan

### Phase 1: Contracts & Schemas
- [ ] 1.1 Define JSON schemas for `spec.json`, `logs.json`, `verify.json`.
- [ ] 1.2 Define invariant genericity rubric and rejection reasons.
- [ ] 1.3 Define deterministic validator result format (pass/fail + reasons + gate id).
- [ ] 1.4 Define canonical file path resolver from `<item-id>`.

### Phase 2: Gate Specs (No code yet)
- [ ] 2.1 Write Gate A (Spec Ready) decision table.
- [ ] 2.2 Write Gate B (Recorded Edit) transaction state machine.
- [ ] 2.3 Write Gate C (Synchronous Audit) mismatch taxonomy.
- [ ] 2.4 Define escalation outputs to issue status transitions.

### Phase 3: Buddy Zero-Trust Flow
- [ ] 3.1 Define proposer buddy vs challenger buddy protocol.
- [ ] 3.2 Define acceptance threshold for challenge coverage.
- [ ] 3.3 Define tie-break escalation path for unresolved contradictions.

### Phase 4: Process Integration
- [ ] 4.1 Update `memory/mindbase/processes/TASK_EXECUTION.md` gate hooks:
  - Map->Do requires Gate A pass,
  - Do requires Gate B on each source edit,
  - Verify & Audit requires Gate C pass.
- [ ] 4.2 Update `memory/mindbase/processes/LEAN_CTX_STANDARD.md` with tool routing for phase gates.
- [ ] 4.3 Update `memory/mindbase/processes/TASK_MANAGEMENT.md` to require issue linkage in `spec.json`.

### Phase 5: Rollout & Migration
- [ ] 5.1 Backfill one pilot work item with full contract files.
- [ ] 5.2 Run one end-to-end task using gated flow and record deltas.
- [ ] 5.3 Capture friction + refine rubric/fields.
- [ ] 5.4 Document graduation policy from WIP to default workflow.

## Acceptance Criteria
- [ ] Every gated work item has required files at canonical paths.
- [ ] Source edits cannot complete without `logs.json` transaction entries.
- [ ] Verify/Audit phase fails when unlogged changes exist.
- [ ] High-risk invariants missing authority are rejected at Spec Gate.
- [ ] Narrow loophole-style invariant examples are rejected by genericity rubric.
- [ ] Workflow runs without requiring validator unit tests.
- [ ] At least one pilot item completes fully under the new gates.

## Risks
- Schema overreach can slow early adoption.
- Legacy work items may lack required artifacts (migration needed).
- Poor genericity rubric can block valid invariants.

## Mitigations
- Start with strict minimum schema; expand only on proven need.
- Pilot on one item before broad enforcement.
- Maintain clear rejection reasons and allow controlled overrides via issue notes.

## Dependencies / Related
- ENG-001-task-phase-expectations-engine.md
- GUARDRAIL-002_validation_manager.md
- GUARDRAIL-003_skeptic_auditor.md
- memory/mindbase/processes/EXPECTATIONS.md

## Notes
This issue formalizes zero-trust codification while preserving low operational overhead by avoiding validator-unit-test mandates. Enforcement confidence comes from deterministic contracts + synchronous gate execution + buddy adversarial challenge.