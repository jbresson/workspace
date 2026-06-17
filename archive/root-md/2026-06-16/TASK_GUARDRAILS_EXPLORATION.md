# Task Guardrails Exploration

**Purpose**: Brainstorm and design the integration of the Expectations Engine (.guardrails + .pi/registry) with the 7-phase task execution model. This is a living document tracking design iterations, trade-offs, and refinements.

**Status**: Brainstorm Phase. No implementation yet.

---

## 🎯 Objective

Enable the Expectations Engine to serve as phase gates in task execution, ensuring:
- AC are testable and False Win risks are mitigated *before* execution begins.
- Pressure checks are validated at mandatory intervals (P2e).
- [IRREVERSIBLE] decisions are audited with proof before proceeding.
- Convergence proof is validated before cool-down.
- Knowledge migration includes lineage + retrospective metrics.

**Desired Outcome**: Task execution becomes *proof-based* (not just compliance-based) while maintaining token efficiency.

---

## Current State Analysis

### Expectations Engine (.guardrails + .pi/registry)
- `IntentValidator`: Ensures expectations are S.M.A.R.T. (Specific, Measurable, Attainable, Relevant, Traceable).
- `Registry`: Persists expectations, tracks state (PENDING/RESOLVED), scopes (GLOBAL/SESSION).
- `Gatekeeper`: Intercepts actions, blocks if expectations violated or generates TODOs in AFK mode.
- **Philosophy**: Proof-based compliance (correctness ≠ compliance).

### Task Execution Model (wip-system.md)
- 7 phases with mandatory gates (P2e Pressure Check, P3 Decision Audit, P4 Convergence Proof).
- Registries (Uncertainty, Risk, Blocker) initialized in P0.
- Evidence-tagged findings, decision tagging ([REVERSIBLE]/[IRREVERSIBLE]), assumption validation.
- Convergence proof: AC Checklist, False Win Detection, Edge Case Sweep.

---

## 🎨 Expert Design: Expectations as Phase Gates

**Core Principle**: Each phase issues expectations; next phase blocked until expectations resolved.

### Phase 0: Crystallization → Issue Foundational Expectations

```
EXP-AC-VALID      [GLOBAL] AC are testable + binary. 
  Validator: IntentValidator checks each criterion.
  Proof Artifact: {ac: [...], testable: true, binary: true}

EXP-FW-MITIGATION [GLOBAL] Each False Win risk has mitigation check. 
  Validator: Checks (test, log, metric) exists.
  Proof Artifact: {false_win_risks: [...], mitigations: [...]}

EXP-REG-INIT      [SESSION] Uncertainty, Risk, Blocker registries initialized. 
  Validator: ctx_session(action="status").
  Proof Artifact: {registries: {uncertainty: [], risk: [], blocker: []}}
```

**Phase Output**: Crystallization contract (AC, False Wins, Registries).
**Gate**: Agent cannot enter Phase 1 until all 3 resolved.

---

### Phase 1: Ignition → Issue Planning Expectations

```
EXP-TG-VALID      [SESSION] Task Dependency Graph is acyclic + complete. 
  Validator: Topological sort succeeds.
  Proof Artifact: {task_graph: {...}, acyclic: true}

EXP-HIST-QUERY    [SESSION] Historical context documented (≥3 elements: similar problems, constraints, decisions). 
  Validator: Artifact length > 0 + all 3 categories present.
  Proof Artifact: {similar_problems: [...], constraints: [...], decisions: [...]}

EXP-CP-IDENTIFY   [SESSION] Critical path identified + sequenced. 
  Validator: Checkpoints declared in advance.
  Proof Artifact: {critical_path: [...], checkpoints: [...]}
```

**Phase Output**: Ignition contract (Task Graph, History, Critical Path).
**Gate**: Agent cannot enter Phase 2 until all 3 resolved.

---

### Phase 2e: Pressure Check → Dynamic Expectation Validation

Executed every N iterations or after major decision.

```
EXP-PC-CONV       [SESSION] Progress toward AC measurable. 
  Validator: (Current work % vs AC %) > threshold.
  Proof Artifact: {current_progress: X%, ac_total: Y%, convergent: bool}

EXP-PC-CONTRA     [SESSION] No unresolved contradictions. 
  Validator: Contradiction Registry empty or marked "resolved."
  Proof Artifact: {contradictions: [], all_resolved: true}

EXP-PC-LOAD       [SESSION] Cognitive load acceptable. 
  Validator: Model size (# of tracked items) < budget.
  Proof Artifact: {model_size: N, budget: M, acceptable: bool}

EXP-PC-DRIFT      [SESSION] Unknowns not drifting (new < resolved). 
  Validator: (Unknowns resolved this cycle) > (new unknowns).
  Proof Artifact: {resolved_this_cycle: N, new_unknowns: M, stable: bool}

EXP-PC-TRIM       [SESSION] Context trim viable. 
  Validator: List of evictable files > 0 (or all critical).
  Proof Artifact: {evictable_files: [...], critical_files: [...]}
```

**Gate Behavior**:
- If ALL criteria GREEN → Continue cycling.
- If ANY criterion RED → Agent must either:
  1. Resolve the issue (e.g., trim context, document contradictions).
  2. Escalate via `ctx_session(action="finding", value="[PC-RED-CRITERION] reason")`.
- If escalated → Creates `BLOCK-*` issue in `issues/active/`.

**Proof Artifact**: Pressure Check audit log (each criterion + status + remediation if RED).

---

### Phase 3: Decision Audit → [IRREVERSIBLE] Gating

```
EXP-IRR-[hash]    [GLOBAL] Each [IRREVERSIBLE] decision passes 4-point audit.
  ├─ Necessity: "Absolutely required?" + reasoning
  ├─ Alternatives: "Options considered?" + rejection logic
  ├─ Communication: "Team informed?" + stakeholders
  └─ Mitigation: "Rollback path documented?" + procedure
  
  Validator: IntentValidator checks all 4 points present + non-empty.
  Proof Artifact: {necessity: {...}, alternatives: {...}, communication: {...}, mitigation: {...}}
```

**Phase Output**: Decision genealogy (decision log with all audit points + evidence links).
**Gate**: Agent cannot enter Phase 4 until all [IRREVERSIBLE] decisions resolved.

---

### Phase 3 (Continued): Assumption Validation

```
EXP-ASSUME-VALID  [SESSION] All foundational assumptions validated. 
  Validator: Scan decision reasoning for "unvalidated" or "assume"; if found, return to Phase 2c (Validate).
  Proof Artifact: {assumptions: [...], all_validated: true}
```

**Gate**: Agent cannot proceed to Phase 4 if any assumption unvalidated.

---

### Phase 4: Convergence Proof → Triple Validation

```
EXP-AC-PROOF      [SESSION] AC Checklist 100% green. 
  Validator: All AC testable + all passing (test results or evidence).
  Proof Artifact: {ac_checklist: [...], all_passing: true, evidence: [...]}

EXP-FW-PROOF      [SESSION] False Win mitigation checks all passing. 
  Validator: Artifact exists (test results, coverage, logs).
  Proof Artifact: {fw_checks: [...], all_passing: true, evidence: [...]}

EXP-EC-PROOF      [SESSION] Edge Case Sweep brainstorm ≥ N items (min 3 scenarios). 
  Validator: Count items + disposition (fixed/escalated).
  Proof Artifact: {edge_cases: [...], count: N, disposition: {...}}
```

**Phase Output**: Convergence report (AC matrix, FW evidence, EC sweep document).
**Gate**: Agent cannot enter Phase 5 until all 3 resolved.

---

### Phase 5/6: Cool-Down + Retrospective → Knowledge Validation

```
EXP-LINEAGE       [GLOBAL] Each archived finding/decision has (Why, When, Assumptions, Shelf-life). 
  Validator: All 4 fields present + non-empty + link to artifact.
  Proof Artifact: {findings_archived: [...], lineage_complete: true}

EXP-RETROSPEC     [SESSION] Procedure metrics recorded: Pressure Checks executed, Contradictions caught pre-cool-down, % unknowns resolved, token efficiency. 
  Validator: All metrics present + numeric values.
  Proof Artifact: {pressure_checks_executed: N, contradictions_caught: M, unknowns_resolved: X%, token_efficiency: Y%}

EXP-ARTIFACT      [SESSION] PR pack, ADR (if applicable), test coverage report generated. 
  Validator: Artifacts exist + non-empty.
  Proof Artifact: {artifacts: [...], all_present: bool}
```

**Phase Output**: Cool-Down audit log (lineage, metrics, artifacts).
**Gate**: Task cannot complete until all 3 resolved.

---

## 📊 Scope Hierarchy

| Scope | Lifespan | Implications |
|---|---|---|
| **GLOBAL** | Until manually resolved or revisited | AC, False Win, [IRREVERSIBLE], Lineage—affect all agents and future sessions |
| **SESSION** | Duration of current task | Pressure Checks, Convergence, Retrospective—specific to current execution |

---

## 🔄 Token Efficiency Strategy

1. **Lightweight Expectations**: Expectation records are minimal (ID, S.M.A.R.T. condition, scope, status).
2. **Artifacts Stored Separately**: Proof artifacts live in session (L2) or memory (L3), not in expectations registry.
3. **Lazy Validation**: Gatekeeper only queries expectations at phase boundaries, not continuously.
4. **Proof Reuse**: Once resolved, expectation marked RESOLVED; artifact reference persists for auditing.
5. **Registry Batching**: Query all expectations for a phase in one call (`getExpectations({phase: "P4", scope: "SESSION"})`).

---

## 🛡️ AFK Mode Integration

If agent blocked in AFK mode by expectation (e.g., `EXP-AC-VALID` unresolved):
1. Gatekeeper generates `EXP-TODO-*` (meta-expectation).
2. Agent's action is blocked, task context preserved.
3. Human reviews TODO + original expectation:
   - **Resolves expectation**: Agent continues from same phase.
   - **Escalates**: Creates issue in `issues/active/BLOCK-*` + human refines expectation.

---

## 💡 Integration Points with wip-system.md

### Phase 5 (Verify & Audit) - Convergence Proof

```markdown
- **Convergence Proof (P4)**: 
  - Query Expectations Engine: EXP-AC-PROOF, EXP-FW-PROOF, EXP-EC-PROOF.
  - All must be RESOLVED before Phase 5 entry.
  - Proof artifacts: AC checklist (test results), FW mitigation (evidence), EC sweep (brainstorm + disposition).
```

### Phase 6 (Record) - Knowledge Tax

```markdown
- **Retrospective (P6)**:
  - Query Expectations Engine: EXP-LINEAGE, EXP-RETROSPEC, EXP-ARTIFACT.
  - All must be RESOLVED before task completion.
  - Proof artifacts: Lineage log, retrospective metrics, generated artifacts (PR pack, ADR, coverage).
```

---

## 🎯 Design Principles (Summary)

1. **Validation-Centric**: Expectations enforce proof-based compliance, not just action logging.
2. **S.M.A.R.T. Enforcement**: IntentValidator ensures all expectations are measurable + testable.
3. **Phase Gating**: Each phase blocks on expectations; blocks prevent cognitive drift.
4. **Proof Artifacts**: Expectations reference artifacts (in session/memory), not embed them.
5. **Scope Isolation**: GLOBAL expectations persist across sessions; SESSION expectations are task-scoped.
6. **AFK-Safe**: Blocked agents generate TODOs; no silent failures.
7. **Token Budget**: Expectations are lightweight; artifacts are indexed, not bloated in context.

---

## ❓ Open Design Questions

### 1. Expectation Composition
Can session expectations generate child expectations? (nested validation?)
- **Example**: `EXP-PC-CONV` (parent) generates `EXP-PC-CONV-AC-01`, `EXP-PC-CONV-AC-02` (children) for each AC.
- **Trade-off**: More granular tracking vs context bloat.
- **Proposal**: Allow children only if parent explicitly declares them (opt-in nesting).

### 2. Inter-Agent Expectations
Can Manager register expectations for Worker? (deadline/quality contracts?)
- **Example**: Manager issues `EXP-DUE-[timestamp]` for Worker to complete task by deadline.
- **Trade-off**: Enables contract-based task dispatch vs introduces scheduling complexity.
- **Proposal**: Reserve GLOBAL scope for inter-agent contracts; SESSION scope for internal.

### 3. Escalation Mapping
How do unresolved expectations map to the 4-tier escalation (Blocker, Question, Token Overflow, Contradiction)?
- **Current**: Agent must manually map expectation failure to escalation type.
- **Proposal**: Expectation carries `escalation_type: "BLOCKER" | "QUESTION" | "TRIM" | "CONFLICT"` metadata.

### 4. Feedback Loop
Should retrospective metrics feed back into expectation engine for future task planning?
- **Example**: "Last task had 15% unknowns; allocate 20% buffer next time."
- **Trade-off**: Better estimation vs expectation engine becomes stateful/predictive.
- **Proposal**: Store metrics in knowledge base; allow future Managers to reference when issuing expectations.

### 5. Negotiation Strategy
Should Negotiator propose *alternative* validators if primary validator is costly?
- **Example**: "AC proof via integration test (expensive) vs unit tests (cheap)?"
- **Trade-off**: Flexibility vs complexity.
- **Proposal**: Negotiator accepts `validator_preferences` (cost threshold, speed vs precision trade-off).

### 6. Proof Artifact Storage
Where should proof artifacts live: session (L2), memory (L3), or expectations registry?
- **Current**: wip-system.md suggests L2 → L3 migration during Cool-Down.
- **Question**: Should expectations registry *reference* artifacts or *embed* evidence links?
- **Proposal**: Registry stores reference + artifact path; artifact content lives in L2/L3.

---

## 📋 Implementation Roadmap (Future)

### Phase 1: Plumbing
- [ ] Extend Registry schema to support phase gates + scope hierarchy.
- [ ] Define expectation ID format: `EXP-[PHASE]-[TYPE]-[HASH]`.
- [ ] Implement phase-boundary queries: `getExpectations({phase, scope})`.

### Phase 2: Validators
- [ ] Implement S.M.A.R.T. validator for each expectation type (AC, FW, Pressure Checks, etc.).
- [ ] Add proof artifact linking in validator logic.

### Phase 3: Integration
- [ ] Update wip-system.md with expectation queries at each phase boundary.
- [ ] Modify Gatekeeper to block phase transitions if expectations unresolved.

### Phase 4: AFK Mode
- [ ] Test expectation blocking + TODO generation in AFK mode.
- [ ] Verify task context preservation across blocks.

### Phase 5: Metrics
- [ ] Add retrospective metrics collection to Phase 6.
- [ ] Feed metrics back into knowledge base for future planning.

---

## 📝 Revision Log

| Date | Version | Changes | Author |
|---|---|---|---|
| 2026-06-13 | 0.1 | Initial brainstorm: Expectations as phase gates | Claude (Brainstorm Phase) |

