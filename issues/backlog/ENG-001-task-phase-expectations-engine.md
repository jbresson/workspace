# Issue ENG-001: Task Phase Execution via Expectations Engine

## Context
Current task execution relies on sequential action without predictive validation. Leveraging an expectations engine during task phase execution can validate assumptions, predict failure modes, and ensure correctness before critical operations complete.

## Goal
Integrate an expectations engine into the task execution pipeline to validate state transitions, dependencies, and success criteria pre-emptively.

## Requirements
- [ ] Engine validates that task preconditions are met before execution.
- [ ] Engine predicts outcome correctness by cross-referencing dependencies.
- [ ] Engine detects contradictions in task assumptions against historical KB.
- [ ] Engine provides early warning on high-risk operations.
- [ ] Integration does not add >5% token overhead per task execution.

## Success Criteria
- Expectations engine catches ≥80% of preventable failures before task execution.
- Task phase execution explicitly invokes expectations validation as first step.
- High-risk operations require explicit expectation clearance before proceeding.
- Documentation demonstrates real-world failure case prevented by engine.

## Implementation Plan

### Phase 1: Requirements & Specification
- [ ] **1.1** Define "expectation" ontology: type, precondition, postcondition, risk level.
- [ ] **1.2** Identify high-frequency task patterns across historical task runs.
- [ ] **1.3** Map critical dependencies: file state, KB state, external service state.
- [ ] **1.4** Define validation rule syntax (e.g., JSON schema, DSL, or logic rules).
- [ ] **1.5** Document failure modes the engine should catch (deadlocks, contradictions, missing artifacts).

### Phase 2: Engine Core Design
- [ ] **2.1** Design expectation registry: store, query, update expectations.
- [ ] **2.2** Implement precondition validator: check task can legally start.
- [ ] **2.3** Implement dependency analyzer: trace task inputs → stored state → current state.
- [ ] **2.4** Implement contradiction detector: cross-check assumptions vs. KB findings.
- [ ] **2.5** Implement risk scorer: rank operations by failure probability.
- [ ] **2.6** Design decision audit hook: capture expectations before/after task execution.

### Phase 3: Integration Points
- [ ] **3.1** Hook expectations engine into `ctx_session(action="task")` workflow.
- [ ] **3.2** Create expectations checkpoint in 7-phase loop (Phase 3: Foresee & Plan).
- [ ] **3.3** Define pass/fail criteria for task phase entry gate.
- [ ] **3.4** Design escalation path: if expectations fail, halt and create blocker issue.
- [ ] **3.5** Create "expectations clear" decision type in session memory.

### Phase 4: Implementation (Core)
- [ ] **4.1** Implement `ExpectationRegistry` class (L2 memory backed).
- [ ] **4.2** Implement `PreconditionValidator` (file existence, KB state, tool availability).
- [ ] **4.3** Implement `DependencyAnalyzer` (traverse dependency graph).
- [ ] **4.4** Implement `ContradictionDetector` (compare findings against KB).
- [ ] **4.5** Implement `RiskScorer` (heuristic-based probability estimation).
- [ ] **4.6** Wire into task entry gate (memory_management.md Phase 2c).

### Phase 5: Validation & Testing
- [ ] **5.1** Unit test each validator component with mock KB state.
- [ ] **5.2** Integration test: run 5 complex historical tasks with engine enabled.
- [ ] **5.3** Benchmark: measure token overhead per validation cycle.
- [ ] **5.4** Verify no false positives (>5% false alarm rate is unacceptable).
- [ ] **5.5** Test edge case: expectations engine failure → graceful fallback.

### Phase 6: Documentation & Rollout
- [ ] **6.1** Create `docs/expectations-engine.md` with architectural overview.
- [ ] **6.2** Document expectation rule syntax by example.
- [ ] **6.3** Add expectations engine checkpoint to `LEAN_CTX_STANDARD.md`.
- [ ] **6.4** Update system prompt (wip-system.md) Phase 3 to reference engine.
- [ ] **6.5** Create troubleshooting guide for when expectations fail.

### Phase 7: Audit & Iteration
- [ ] **7.1** Run full regression suite with expectations engine enabled.
- [ ] **7.2** Identify and log failure modes the engine did NOT catch.
- [ ] **7.3** Adjust risk scoring rules based on empirical data.
- [ ] **7.4** Document any human overrides to expectations (with reasoning).

## Acceptance Criteria
- [ ] Engine is invoked on every task phase execution.
- [ ] System prompt Phase 3 explicitly mentions expectations validation.
- [ ] At least 3 real-world failure scenarios prevented by engine (logged with evidence).
- [ ] Token overhead measured and documented (must be <5%).
- [ ] Team trained on interpreting expectations failure messages.

## Related Issues
- EXT-001-turn-completion-validator (validates individual turn outputs; this validates task preconditions)
- GUARDRAIL-002_validation_manager (orchestration; may coordinate with expectations engine)

## Notes
- Expectations engine is a KEY component of the 7-phase loop's "Foresee" phase.
- Must integrate with existing session memory (ctx_session findings/decisions).
- High risk of scope creep: start narrow (file existence + KB contradiction checks only).

Compressed 1043 → 1043 tokens (0%)
