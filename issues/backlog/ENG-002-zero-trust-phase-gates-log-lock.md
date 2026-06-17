# Issue ENG-002: Zero-Trust Phase Gates + Log-Lock (Structured Artifacts)

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

**Gate Naming Convention:** Descriptive functional names for clarity
- **SpecValidation** (formerly Gate A): Contract readiness for Do phase
- **RecordedEditTransaction** (formerly Gate B): Transactional ledger enforcement during Do
- **AuditIntegrity** (formerly Gate C): Synchronous modification audit during Verify/Audit

### SpecValidation: Spec Ready (Map -> Do transition)
Pass conditions:
- all required files exist,
- `spec.json` schema-valid,
- objective/invariants/scenarios non-empty,
- high-risk invariant classes (`security|data|compliance`) must include `authority`,
- invariant statements satisfy genericity rubric (not single-tech loophole wording).

Fail action:
- hard stop, create/update blocker issue entry, no source edits allowed.

### RecordedEditTransaction: Recorded Edit Enforcement (Do phase)
Rule:
- source file edits allowed only through recorded transaction operation.

Transaction sequence:
1. append pending entry in `logs.json`
2. apply edit
3. run scoped verification signal
4. finalize entry with hashes/status

Failure handling:
- incomplete transaction marks `failed` and requires explicit revert or repair before next edit.

### AuditIntegrity: Synchronous Audit (Verify & Audit phase)
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

## Agent-Assisted Testing Strategy

**Rationale:** ENG-002 implements a complex policy enforcement system. Agent testing excels at:
- Finding loopholes in invariant rubrics (adversarial thinking)
- Generating test fixtures at scale (parametric testing)
- Simulating realistic workflows with multiple transactions
- Validating edge cases and error handling paths
- Mutating log entries to verify audit resilience

### Test Suites for Agent Automation

1. **Invariant Adversarial Suite** → Agent generates high-risk invariants designed to bypass rubric ("No base64" / missing normative verb / no authority). Validates rejection rules.
   - Target: 50+ cases covering all bypass vectors
   - Success: 100% correct accept/reject decisions

2. **Ledger Mutation Suite** → Agent corrupts log entries (tampered hash, future timestamp, item_id mismatch, missing fields). Validates audit detection.
   - Target: All mutation categories covered
   - Success: Audit detects each mutation type with correct reason code

3. **Multi-Transaction Workflow Suite** → Agent orchestrates realistic flow (spec → 3 edits → unlogged modification → audit). Validates ledger consistency across full lifecycle.
   - Target: 20+ workflow patterns
   - Success: tool_calls.json ledger matches actual gate invocations

4. **Generative Spec Corpus** → Agent generates 100 valid + 100 invalid specs (all combinations of complete/incomplete invariants, type errors, mismatch scenarios).
   - Target: Comprehensive coverage matrix
   - Success: SpecValidation accuracy ≥99%

5. **Fuzz Testing (Edge Cases)** → Agent creates malformed JSON, boundary values (0-byte files, huge anti_patterns arrays, long item_ids, missing fields).
   - Target: All schema boundaries tested
   - Success: Validator gracefully rejects with meaningful error, no OOM/crash

6. **Bypass Attempt (Chaos)** → Agent tries permission escalation, path traversal, direct logs.json modification, race conditions.
   - Target: All attack vectors documented
   - Success: All blocked at gate boundary

### Integration with Testing Lifecycle

- **Pre-Gate Acceptance:** Agent adversarial suite runs before validator approval
- **Regression Prevention:** Mutation suite re-runs on any rubric/schema change
- **Performance Validation:** Workflow suite measures ledger I/O and gate latency
- **Error Completeness:** Agent scores validator output (exit codes, reason codes, evidence fields)

## Implementation Plan

### Phase 1: Contracts & Schemas ✅ **COMPLETE**
- [x] 1.1 Define JSON schemas for `spec.json`, `logs.json`, `verify.json`.
- [x] 1.2 Define invariant genericity rubric and rejection reasons.
- [x] 1.3 Define deterministic validator result format (pass/fail + reasons + gate id).
- [x] 1.4 Define canonical file path resolver from `<item-id>`.

### Phase 2: Gate Specs (Descriptive Naming + Validation) ✅ **COMPLETE**
- [x] 2.1 Write SpecValidation (Spec Ready) decision table.
- [x] 2.2 Write RecordedEditTransaction (Recorded Edit) transaction state machine.
- [x] 2.3 Write AuditIntegrity (Synchronous Audit) mismatch taxonomy.
- [x] 2.4 Define escalation outputs to issue status transitions.
- [x] 2.5 Rename Gate A/B/C → SpecValidation/RecordedEditTransaction/AuditIntegrity.

### Phase 3: Testing Infrastructure & Agent Coordination 🚀 **ACTIVE**
- [ ] 3.1 Build Invariant Adversarial Test Suite (agent-generated, 50+ cases)
- [ ] 3.2 Build Ledger Mutation Suite (all corruption categories)
- [ ] 3.3 Build Multi-Transaction Workflow Suite (20+ patterns)
- [ ] 3.4 Build Generative Spec Corpus (200 valid+invalid specs)
- [ ] 3.5 Build Fuzz Testing suite (boundary + malformed inputs)
- [ ] 3.6 Document agent integration points + evaluation criteria

### Phase 4: Buddy Zero-Trust Flow
- [ ] 4.1 Define proposer buddy vs challenger buddy protocol.
- [ ] 4.2 Define acceptance threshold for challenge coverage.
- [ ] 4.3 Define tie-break escalation path for unresolved contradictions.

### Phase 5: Process Integration
- [ ] 5.1 Update `memory/mindbase/processes/TASK_EXECUTION.md` gate hooks:
  - Map->Do requires SpecValidation pass,
  - Do requires RecordedEditTransaction on each source edit,
  - Verify & Audit requires AuditIntegrity pass.
- [ ] 5.2 Update `memory/mindbase/processes/LEAN_CTX_STANDARD.md` with tool routing for phase gates.
- [ ] 5.3 Update `memory/mindbase/processes/TASK_MANAGEMENT.md` to require issue linkage in `spec.json`.

### Phase 6: Rollout & Migration
- [ ] 6.1 Run Pilot (eng-002-pilot-001): Full gated workflow + test results
- [ ] 6.2 Agent test suite validation: Verify robustness
- [ ] 6.3 Capture friction + refine rubric/fields
- [ ] 6.4 Document graduation policy from WIP to default workflow

### Pilot Results (eng-002-pilot-001)
**Status:** PASSED
- ✅ SpecValidation (Gate A): All 6 validation phases passed
  - Required files exist
  - JSON schema valid
  - Item ID consistency verified
  - Spec content complete (objective/invariants/scenarios)
  - Invariant statements pass genericity rubric
  - Verify mappings complete
- ✅ AuditIntegrity (Gate C) Challenge: Unlogged modification correctly detected
  - Challenge file created without transaction log
  - Audit correctly identified `unlogged_modification` reason code
  - Exit semantics deterministic

**Test Artifacts:**
- `wip/docs/pending/eng-002-pilot-001/test-gate-a.mjs` — SpecValidation validator (50-line comprehensive check)
- `wip/docs/pending/eng-002-pilot-001/test-gate-c.mjs` — AuditIntegrity challenge validator
- `wip/docs/pending/eng-002-pilot-001/challenge.md` — Intentional unlogged modification scenario

## Acceptance Criteria
- [x] Every gated work item has required files at canonical paths. (pilot: ✅)
- [x] SpecValidation correctly validates spec.json schema + invariants. (pilot: ✅)
- [x] AuditIntegrity detects unlogged modifications. (pilot: ✅)
- [x] High-risk invariants missing authority are rejected at SpecValidation. (pilot: ✅)
- [x] Narrow loophole-style invariant examples are rejected by genericity rubric. (pilot: ✅)
- [ ] Source edits cannot complete without `logs.json` transaction entries. (pending: RecordedEditTransaction integration)
- [ ] Verify/Audit phase fails when unlogged changes exist. (pending: end-to-end workflow)
- [ ] Workflow runs without requiring validator unit tests. (pending: Phase 3 agent test suites)
- [ ] Agent-assisted test suites provide coverage for all bypass vectors. (pending: Phase 3)
- [ ] At least one pilot item completes fully under the new gates. (pending: Phase 6)

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