# ISSUE-001: Common Process Subroutine Suite — Full Implementation Spec

## 1) Objective
Implement enforceable process subroutines for task execution + memory lifecycle so agent behavior is runtime-checkable, resumable, and auditable.

Primary outcome: replace "best-effort process following" with typed subroutines + deterministic event handlers + explicit guardrail hooks.

---

## 2) Scope
### In scope
- Subroutine registry (S1/S2/S3 tiers).
- Typed input/output contracts for all listed subroutines.
- Event bus + lifecycle handlers for checkpoint, finding, decision, blocker, close.
- Persistence for task packet, registries, traces, workflow state.
- Guardrail integration points (`expect`, `validate`, `resolve` semantics).
- MVP + phased rollout.

### Out of scope (phase-later)
- S4 meta-subroutines auto-synthesis.
- Cross-project federated memory writes.
- Autonomous backlog prioritization.

---

## 3) Tier Model (Normative)
- **S1 Atomic**: one intent, one mutation, deterministic output.
- **S2 Composite**: orchestrates 2+ S1; no hidden side effects; full child trace.
- **S3 Workflow**: multi-phase orchestration with resumable `workflowState`.
- **S4 Meta**: future, approval-gated composition.

### Tier invariants
- Call direction: `S3 -> S2 -> S1` only.
- Every tier emits guardrail metadata.
- Idempotency targets:
  - S1 strict idempotent where feasible.
  - S2 retry-safe (duplicate child calls deduped).
  - S3 resumable from checkpoint state.
  - S4 versioned + human approval.

---

## 4) Canonical Contract Matrix
| Subroutine | Tier | Trigger | Required Inputs | Output `details` (required) | Failure Modes |
|---|---|---|---|---|---|
| `start_task_packet` | S2 | Immediately after intake | `objective`, `constraints[]`, `owner`, `targetPhase` | `acceptanceCriteria[]`, `falseWinRisks[]`, `criticalPath[]`, `checkpoints[]`, `taskId` | `E_BAD_OBJECTIVE`, `E_EMPTY_AC`, `E_OWNER_MISSING` |
| `init_registries` | S1 | After task packet | `taskId`, `riskSeed[]?`, `uncertaintySeed[]?` | `riskRegisterId`, `uncertaintyRegistryId`, `blockerLogId` | `E_TASK_NOT_FOUND`, `E_DUP_REGISTRY` |
| `record_finding_strict` | S1 | Analyze step fact capture | `taskId`, `finding`, `evidenceRefs[]`, `confidence`, `category` | `findingId`, `conflicts[]`, `saved` | `E_NO_EVIDENCE`, `E_LOW_CONFIDENCE_WITHOUT_FLAG` |
| `record_decision_strict` | S1 | Decision commit | `taskId`, `decision`, `reasoning`, `reversibility`, `alternatives[]`, `rollbackPlan?` | `decisionId`, `riskLevel`, `validated` | `E_NO_ALTERNATIVES`, `E_IRREV_NO_ROLLBACK` |
| `record_uncertainty` | S1 | Unknown discovered | `taskId`, `question`, `owner`, `resolutionTrigger`, `dueHint?` | `uncertaintyId`, `status` | `E_OWNER_MISSING`, `E_BAD_TRIGGER` |
| `build_task_graph` | S2 | Post-map; scope changes | `taskId`, `tasks[]`, `dependencies[]`, `constraints[]` | `dag`, `criticalPath`, `blockedNodes[]`, `graphVersion` | `E_CYCLE_DETECTED`, `E_ORPHAN_NODE` |
| `next_best_action` | S2 | Each iteration start | `taskId`, `taskGraphId`, `completed[]`, `blocked[]` | `nextTask`, `why`, `requiresBlockerLog` | `E_NO_RUNNABLE_NODE`, `E_STALE_GRAPH` |
| `run_checkpoint` | S1 | Forcing gate | `taskId`, `checkpointId`, `phase`, `validatorRef` | `passed`, `evidenceRefs[]`, `delta`, `validationId` | `E_VALIDATOR_MISSING`, `E_VALIDATION_FAIL` |
| `verify_ac` | S2 | Pre-close convergence | `taskId`, `acceptanceCriteria[]` | `acResults[]`, `gaps[]`, `overallPass` | `E_AC_UNTESTABLE`, `E_GAPS_PRESENT` |
| `false_win_scan` | S2 | After AC verify | `taskId`, `falseWinRisks[]`, `executedMitigations[]` | `unmitigated[]`, `severityMap` | `E_UNMITIGATED_HIGH` |
| `pressure_check` | S2 | Every N loops or drift | `taskId`, `iteration`, `openUnknowns`, `openContradictions` | `convergenceScore`, `unknownsDrift`, `trimNeeded` | `E_DRIFT_RISING`, `E_CONTRADICTION_OPEN` |
| `open_blocker_issue` | S1 | Hard stop | `taskId`, `title`, `impact`, `blockedBy`, `neededFromHuman` | `issuePath`, `issueId`, `linkedTaskId` | `E_PATH_WRITE_FAIL` |
| `propose_followup_issue` | S1 | Non-blocking deferred gap | `taskId`, `gap`, `impact`, `owner?`, `references[]` | `backlogIssuePath`, `status` | `E_BAD_REFERENCE` |
| `context_trim_plan` | S2 | Load drift / long chain | `taskId`, `activeFiles[]`, `staleCandidates[]` | `evict[]`, `retain[]`, `rationale` | `E_EMPTY_RETAIN_SET` |
| `close_task_with_tax` | S3 | Final close gate | `taskId`, `acProof`, `findings[]`, `decisions[]`, `openUncertainties[]` | `closureReport`, `followups[]`, `memoryPromotionCandidates[]`, `workflowState` | `E_CLOSE_WITH_OPEN_BLOCKER`, `E_NO_TAX` |
| `promote_l2_to_l3` | S2 | Post-close cool-down | `taskId`, `entries[]`, `targetMemoryPath`, `lineage` | `promoted[]`, `rejected[]`, `reasons[]` | `E_CONTRADICTION_UNRESOLVED`, `E_LINEAGE_INCOMPLETE` |

---

## 5) Data Contracts (minimum JSON schema shape)
All subroutines return:
```json
{
  "ok": true,
  "subroutine": "record_finding_strict",
  "tier": "S1",
  "taskId": "TASK-123",
  "details": {},
  "guardrail": {
    "phase": "Do",
    "riskLevel": "medium",
    "checkpointId": "CP-2",
    "requiresOversight": false,
    "evidenceRefs": ["path:@[12-20]"]
  },
  "trace": {
    "callId": "uuid",
    "parentCallId": null,
    "timestamp": "ISO-8601",
    "idempotencyKey": "hash"
  }
}
```

Failure return:
```json
{
  "ok": false,
  "error": { "code": "E_NO_EVIDENCE", "message": "...", "retryable": false },
  "details": { "missing": ["evidenceRefs"] },
  "trace": { "callId": "uuid" }
}
```

---

## 6) Architecture
### Modules
- `process-suite/registry.ts` — declarative subroutine registry + tier policy checks.
- `process-suite/contracts.ts` — zod/json schemas for input/output.
- `process-suite/executor.ts` — dispatch, idempotency, retries, tracing.
- `process-suite/persistence.ts` — append-only log + state snapshots.
- `process-suite/guardrail-adapter.ts` — expectation + resolution bridge.
- `process-suite/subroutines/*.ts` — per-subroutine implementation.
- `process-suite/workflows/close-task-with-tax.ts` — S3 orchestrator.

### Persistence model
- `TaskPacket`
- `RiskRegister`
- `UncertaintyRegistry`
- `BlockerLog`
- `SubroutineTrace`
- `WorkflowSnapshot`

Storage requirement: append-only event log + latest materialized snapshot per `taskId`.

---

## 7) Execution Semantics
1. Validate input schema.
2. Compute idempotency key (`subroutine + normalizedInput + taskId`).
3. If prior success with same key -> return cached success + `details.replayed=true`.
4. Execute logic.
5. Persist event + snapshot delta.
6. Emit guardrail metadata/event.
7. Return structured result.

### Retry policy
- Retry only `retryable=true` errors.
- Max retries configurable (default 2).
- No retry for policy violations (`E_IRREV_NO_ROLLBACK`, `E_NO_EVIDENCE`, etc).

---

## 8) Guardrail Integration
- `run_checkpoint`, `verify_ac`, `close_task_with_tax` are mandatory gates.
- Any `riskLevel=high` decision auto-sets `requiresOversight=true`.
- `record_decision_strict` with `reversibility=IRREVERSIBLE` must include:
  - alternatives (>=1)
  - rollback/mitigation plan
  - pre-merge communication note ref

If missing -> hard fail (`E_IRREV_NO_ROLLBACK`).

---

## 9) Workflow Spec: `close_task_with_tax` (S3)
Phases:
1. `VERIFY_AC` -> call `verify_ac`.
2. `FALSE_WIN_SCAN` -> call `false_win_scan`.
3. `DECISION_AUDIT` -> validate irreversible decisions.
4. `OPEN_ITEMS_CHECK` -> blockers/unknowns handling.
5. `EMIT_CLOSURE_REPORT` -> compile proof + followups.
6. `OPTIONAL_PROMOTION` -> call `promote_l2_to_l3` when allowed.

Resumability: persist `workflowState.phase`, `completedCalls[]`, `pending[]`, `lastError`.

---

## 10) Event Handlers
- `onFindingRecorded` -> contradiction detector.
- `onDecisionRecorded` -> irreversible decision policy validator.
- `onCheckpointFailed` -> open blocker or bounce to previous phase.
- `onTaskClosed` -> create promotion candidates + coverage report artifact.

Handler rules:
- Side effects explicit in trace.
- Handler failure cannot silently swallow parent failure.

---

## 11) MVP Plan (P0)
Implement first:
1. `start_task_packet`
2. `record_finding_strict`
3. `record_decision_strict`
4. `run_checkpoint`
5. `verify_ac`
6. `close_task_with_tax`

### MVP acceptance
- End-to-end run from intake -> close with structured traces.
- At least one hard fail proven for missing evidence + missing irreversible rollback.
- Resume interrupted `close_task_with_tax` from snapshot.

---

## 12) Test Strategy
### Unit
- Schema validation per subroutine.
- Idempotency replay.
- Error code correctness.

### Integration
- Full happy path for MVP chain.
- Failure path: checkpoint fail -> blocker issue path created.
- Failure path: AC gap -> close blocked.
- Resume path after simulated interruption.

### Policy tests
- Irreversible decision without rollback -> fail.
- Finding without evidence -> fail.
- Contradiction open at promotion -> fail.

Coverage target: 90% statements on `process-suite/*`, 100% on policy validators.

---

## 13) Rollout
- Phase A: shadow mode (evaluate outputs, no hard enforcement).
- Phase B: enforce on P0 subroutines.
- Phase C: enforce S2 periodic checks (`pressure_check`, `false_win_scan`).
- Phase D: add promotion gating + S4 design draft.

Rollback: feature flag `PROCESS_SUITE_ENFORCEMENT=false` reverts to non-blocking advisory mode.

---

## 14) Risks + Mitigations
- **Overhead risk**: too many mandatory calls -> mitigate with S2 batching.
- **False certainty risk**: weak evidence refs -> enforce ref shape + source existence checks.
- **State drift risk**: snapshot/event mismatch -> periodic reconcile job.
- **Orchestration opacity**: hidden child calls -> mandatory `details.trace[]`.

---

## 15) Done Definition
Done when:
- MVP subroutines implemented with contracts + tests.
- Guardrail gate behavior demonstrably blocks invalid close.
- `close_task_with_tax` resumability proven in integration test.
- Audit artifact emitted: AC proof + decision audit + followup list.

---

## 16) References
- `PROCESS_ANALYSIS.md`
- `memory/mindbase/processes/TASK_EXECUTION.md`
- `memory/mindbase/processes/memory_management.md`
