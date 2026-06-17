# GUARDRAIL-007: Dependency Analysis Engine

## Description
Logic to distinguish between "Isolated Blocks" (continue possible) and "Cascading Blocks" (halt required).

## Requirement
The `SkepticAuditor` must validate the agent's claim that a block is isolated before allowing progress on other tasks.

## Implementation Plan

### Phase 1: Concept & Taxonomy
- [ ] **1.1** Define block types:
  - **Isolated Block**: Failure affects only current task, other work can proceed independently.
    - Example: Test fails in `src/foo.test.ts`, but unrelated `src/bar.ts` work can continue.
  - **Cascading Block**: Failure affects multiple downstream tasks or shared infrastructure.
    - Example: Core utility function broken -> all dependent modules fail.
- [ ] **1.2** Define cascade detection criteria:
  - Shared dependencies: does failure block other modules/tests?
  - Build artifacts: does failure prevent compilation/packaging?
  - Shared state: does failure corrupt KB, session data, or configs?
  - Critical path: is failed task on critical path to main goal?
- [ ] **1.3** Design decision matrix:
  - Isolation claim + evidence = continue allowed.
  - Isolation claim + no evidence = escalate to SkepticAuditor.
  - Cascade detected = halt, escalate to human.
- [ ] **1.4** Document examples of each block type (decision tree).

### Phase 2: Dependency Graph & Analysis
- [ ] **2.1** Build task dependency graph at start (or cache from last run):
  - Nodes: task IDs (from `issues/active` and current execution context).
  - Edges: task X depends on task Y (blocking relationship).
- [ ] **2.2** Implement reverse-dependency lookup: given failed task, find all downstream tasks.
- [ ] **2.3** Implement module dependency graph (code-level):
  - Parse imports to build module DAG.
  - Cache as JSON for performance.
- [ ] **2.4** Add change impact analysis: which modules affected by current block?
- [ ] **2.5** Implement cycle detection: ensure DAG is acyclic (fail-safe).

### Phase 3: Block Context & Classification
- [ ] **3.1** When block occurs, capture context:
  - Task ID and description.
  - Failure type (proof audit fail, command reject, code reject, resource limit).
  - Affected file/module/test.
  - Severity (critical, high, medium, low).
- [ ] **3.2** Implement classifier: analyze block context against dependency graph.
  - Query: does affected module have downstream dependents?
  - If yes: cascade detected.
  - If no: candidate for isolated classification.
- [ ] **3.3** Implement severity scorer:
  - Critical path task = high severity.
  - Shared utility = high severity (high downstream count).
  - Leaf node task = low severity (no downstream).
- [ ] **3.4** Emit block classification with confidence score (0-100).

### Phase 4: Isolation Claim Validation
- [ ] **4.1** When agent claims block is isolated, capture evidence:
  - Which dependencies were checked?
  - How many downstream tasks verified?
  - What's the alternative path (if any)?
- [ ] **4.2** Implement claim validator (logic checks):
  - Does agent's evidence match actual dependency graph?
  - Are there downstream dependents not mentioned?
  - Is severity score consistent with claim?
- [ ] **4.3** Implement evidence requirement rules:
  - Low severity block: minimal evidence required.
  - Medium severity: detailed dependency analysis required.
  - High severity: extensive impact study required.
- [ ] **4.4** Reject vague claims: require specific task/module refs, not fuzzy language.

### Phase 5: Integration with SkepticAuditor
- [ ] **5.1** Hook `DependencyAnalysisEngine` into `SkepticAuditor` workflow.
- [ ] **5.2** When audit encounters block in proof:
  - Run dependency analysis automatically.
  - Classify as isolated or cascading.
  - If cascading, reject proof + escalate immediately.
  - If isolated, allow agent to continue with caveat.
- [ ] **5.3** If agent claims isolated but classifier disagrees:
  - Escalate to SkepticAuditor for deeper review.
  - Don't auto-allow (high-rigor default).
- [ ] **5.4** Log all classification decisions with evidence and confidence.

### Phase 6: False Positive & False Negative Mitigation
- [ ] **6.1** False positive prevention (incorrectly detecting cascade):
  - Validate dependency graph against actual code structure.
  - Test with known isolated tasks (should classify as isolated).
  - Use conservative sensitivity: only classify cascade if high confidence (>85%).
- [ ] **6.2** False negative prevention (missing actual cascade):
  - Manual audit: spot-check classification decisions.
  - Trigger post-hoc validation: if "isolated" block causes later failures, re-analyze.
  - Use conservative specificity: if uncertain, escalate rather than proceed.
- [ ] **6.3** Tuning: gather feedback from human reviewers, adjust thresholds.

### Phase 7: Testing & Validation
- [ ] **7.1** Unit test: dependency graph construction (nodes, edges, cycles).
- [ ] **7.2** Unit test: classifier on known isolated blocks (should classify correctly).
- [ ] **7.3** Unit test: classifier on known cascading blocks (should classify correctly).
- [ ] **7.4** Unit test: reverse-dependency lookup (find all downstream of given task).
- [ ] **7.5** Unit test: claim validator (accept good evidence, reject vague claims).
- [ ] **7.6** Integration test: block occurrence -> classification -> auditor routing.
- [ ] **7.7** Adversarial test: agent claims isolation on obvious cascade (should reject).
- [ ] **7.8** Performance test: dependency analysis < 200ms per block.

### Phase 8: Observability & Monitoring
- [ ] **8.1** Add structured logging: block ID, classification, confidence, downstream count.
- [ ] **8.2** Emit metrics:
  - Classified as isolated vs. cascading.
  - Accuracy of classification (post-hoc validation).
  - False positive / false negative rates.
  - Escalation decisions.
- [ ] **8.3** Create dashboard: block classification trends.
- [ ] **8.4** Alert on misclassifications: if isolated block causes later failures, trigger audit.

### Phase 9: Documentation & Deployment
- [ ] **9.1** Document block taxonomy (isolated vs. cascading) in safety spec.
- [ ] **9.2** Document dependency analysis algorithm in architecture docs.
- [ ] **9.3** Create decision tree: how to tell if block is isolated.
- [ ] **9.4** Create runbook: "My task is blocked. Is it isolated?".
- [ ] **9.5** Publish dependency graph schema (for external tools).
- [ ] **9.6** Deploy with monitoring: track classification accuracy.

### Phase 10: Maintenance & Evolution
- [ ] **10.1** Periodic audit: review misclassifications (monthly).
- [ ] **10.2** Dependency graph refresh: rebuild on major architectural changes.
- [ ] **10.3** Threshold tuning: adjust confidence scores based on accuracy feedback.
- [ ] **10.4** Handle edge cases: document new block types as they emerge.

### Acceptance Criteria
- [ ] Dependency graph constructed correctly (no cycles, all edges verified).
- [ ] Isolated blocks classified correctly (>90% accuracy on test set).
- [ ] Cascading blocks never escape detection (specificity >95%).
- [ ] Cascading blocks always escalated (no fallthrough).
- [ ] Isolation claims validated against actual dependencies.
- [ ] Analysis latency < 200ms per block.
- [ ] Integration tests pass with SkepticAuditor.
- [ ] Audit trail captures all classification decisions.
