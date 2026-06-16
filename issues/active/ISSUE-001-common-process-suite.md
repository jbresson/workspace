# ISSUE-001: Implementation of Common Process Subroutine Suite

## 🎯 Goal
Codify the `TASK_EXECUTION.md` and `memory_management.md` lifecycles into a set of Pi extension **subroutines** and event handlers to move from "manual process following" to "runtime enforcement".

## Subroutine Tier Model (Proposed)

### S1 — Atomic Subroutines
- Smallest reusable unit; one intent, one state mutation.
- Deterministic schema + minimal side effects.
- Example: `record_finding_strict`, `record_uncertainty`.
- Rule: should be independently testable in isolation.

### S2 — Composite Subroutines
- Orchestrates 2+ S1 subroutines under one checkpoint objective.
- Produces merged proof artifact and explicit partial-failure output.
- Example: `verify_ac` (aggregate AC checks + gap map).
- Rule: no hidden writes; every child call surfaced in `details.trace`.

### S3 — Workflow Subroutines
- Multi-phase process codification; can cross Orient/Do/Verify/Record.
- Coordinates sequencing + guardrail gates + escalation fallback.
- Example: `close_task_with_tax`.
- Rule: must emit resumable state (`workflowState`) for interruption/restart.

### S4 — Meta Subroutines (Future)
- Build, tune, or compose new subroutines from prior validated blocks.
- Purpose: codify increasingly complex tasks without freeform drift.
- Example (future): `synthesize_release_readiness_workflow`.
- Rule: generated composition must pass policy + schema validation before activation.

### Tier invariants
- Up-tier may call down-tier (`S3 -> S2 -> S1`), never inverse.
- Guardrail metadata mandatory at all tiers.
- Idempotency target increases by tier:
  - S1 strict idempotent where possible
  - S2 retry-safe
  - S3 resumable
  - S4 versioned + approval-gated

## 🛠️ Scope & Requirements

## Canonical Process Subroutine Spec Table

| Subroutine | Tier | Exact When Used | Required Inputs | Required Output (`details`) | Guardrail Relation | MVP Priority |
|---|---|---|---|---|---|---|
| `start_task_packet` | S2 | First action after task intake, before any repo edits/tool execution | `objective`, `constraints[]`, `owner`, `targetPhase` | `acceptanceCriteria[]`, `falseWinRisks[]`, `criticalPath[]`, `checkpoints[]` | **Direct**: defines mandatory checkpoints later consumed by expectation/gate logic | P0 |
| `init_registries` | S1 | Immediately after `start_task_packet`, before entering Do/Cycling for medium+ risk | `taskId`, `riskSeed[]?`, `uncertaintySeed[]?` | `riskRegisterId`, `uncertaintyRegistryId`, `blockerLogId` | **Direct**: creates auditable structures guardrails can require as preconditions | P1 |
| `record_finding_strict` | S1 | Every Analyze step when new evidence-backed fact appears | `finding`, `evidenceRefs[]`, `confidence`, `category` | `findingId`, `conflicts[]`, `saved` | **Direct**: enforces evidence requirement + contradiction surfacing (anti-handwave gate) | P0 |
| `record_decision_strict` | S1 | Every Offload step when agent commits to a design/implementation choice | `decision`, `reasoning`, `reversibility`, `alternatives[]`, `rollbackPlan?` | `decisionId`, `riskLevel`, `validated:false` | **Direct**: blocks unsafe irreversible decisions lacking alternatives/rollback path | P0 |
| `record_uncertainty` | S1 | Any time assumption/open question discovered and not resolved in current step | `question`, `owner`, `resolutionTrigger`, `dueHint?` | `uncertaintyId`, `status:OPEN` | **Indirect**: supports guardrail audits by proving unknowns are explicit, not hidden | P1 |
| `build_task_graph` | S2 | Once per task after Map, refreshed when scope/dependencies change materially | `tasks[]`, `dependencies[]`, `constraints[]` | `dag`, `criticalPath`, `blockedNodes[]` | **Indirect**: identifies irreversible/high-impact nodes for stricter gating | P1 |
| `next_best_action` | S2 | Start of each Cycling iteration before selecting next implementation step | `taskGraphId`, `completed[]`, `blocked[]` | `nextTask`, `why`, `requiresBlockerLog` | **Indirect**: prevents silent bypass of blocked critical work | P1 |
| `run_checkpoint` | S1 | At each declared forcing function checkpoint (phase gates) and before risky transitions | `checkpointId`, `phase`, `validatorRef` | `passed`, `evidenceRefs[]`, `delta` | **Direct**: primary proof mechanism for resolving guardrail expectations | P0 |
| `verify_ac` | S2 | Convergence phase before task close claim | `taskId`, `acceptanceCriteria[]` | `acResults[]`, `gaps[]`, `overallPass` | **Direct**: prevents false completion; can be mandatory close gate | P0 |
| `false_win_scan` | S2 | After `verify_ac`, before final sign-off | `falseWinRisks[]`, `executedMitigations[]` | `unmitigated[]`, `severityMap` | **Direct**: explicit anti-false-win control tied to safety expectations | P1 |
| `pressure_check` | S2 | Periodic cadence (e.g., every N iterations) and whenever drift suspected | `iteration`, `openUnknowns`, `openContradictions` | `convergenceScore`, `unknownsDrift`, `trimNeeded` | **Direct**: policy-driven recurring compliance gate | P1 |
| `open_blocker_issue` | S1 | Immediate hard-stop when blocked by missing dependency/approval/info | `title`, `impact`, `blockedBy`, `neededFromHuman` | `issuePath`, `issueId`, `linkedTaskId` | **Direct**: AFK/oversight externalization requirement | P1 |
| `propose_followup_issue` | S1 | When non-blocking gap found that cannot be addressed in current scope | `gap`, `impact`, `owner?`, `references[]` | `backlogIssuePath`, `status:PROPOSED` | **Indirect**: ensures deferred risk is visible and auditable | P2 |
| `context_trim_plan` | S2 | When pressure_check signals load drift or before long multi-step execution | `activeFiles[]`, `staleCandidates[]` | `evict[]`, `retain[]`, `rationale` | **Indirect**: supports rigor by preventing context-overflow errors | P2 |
| `close_task_with_tax` | S3 | Final step before declaring done / handoff / merge-ready | `taskId`, `acProof`, `findings[]`, `decisions[]`, `openUncertainties[]` | `closureReport`, `followups[]`, `memoryPromotionCandidates[]`, `workflowState` | **Direct**: hard close gate; no completion without auditable knowledge tax | P0 |
| `promote_l2_to_l3` | S2 | Cool-down phase after closure report approved | `entries[]`, `targetMemoryPath`, `lineage` | `promoted[]`, `rejected[]`, `reasons[]` | **Direct**: blocks memory promotion while contradictions unresolved | P2 |

## Initial Implementation Slice (MVP)
- [ ] `start_task_packet`
- [ ] `record_finding_strict`
- [ ] `record_decision_strict`
- [ ] `run_checkpoint`
- [ ] `verify_ac`
- [ ] `close_task_with_tax`

## Non-Negotiable Contract (all subroutines)
- [ ] Structured output only (machine-checkable in `details`)
- [ ] Explicit fail states (no warning-only success)
- [ ] Idempotent behavior where feasible
- [ ] Emit guardrail metadata: `requiresOversight`, `riskLevel`, `phase`, `checkpointId`, `evidenceRefs`
- [ ] Compatible with issue-only pipeline (`issues/` lifecycle with direct status/owner/progress updates)

## 🚩 Success Criteria
- LLM no longer forgets to record findings/decisions because subroutines provide structured execution.
- Phase 3 "Decision Sign-off" is an automated check rather than a manual checklist.
- Task tracking and promotion follow strict issue lifecycle (`issues/backlog` -> `issues/active` -> `issues/archive` as appropriate).
- Composite/workflow behavior is traceable and resumable (no hidden orchestration state).

## 🔗 References
- Analysis: `PROCESS_ANALYSIS.md`
- Process: `memory/mindbase/processes/TASK_EXECUTION.md`
- Memory Law: `memory/mindbase/processes/memory_management.md`