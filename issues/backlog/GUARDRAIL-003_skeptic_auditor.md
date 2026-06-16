# GUARDRAIL-003: Skeptic Auditor Interface

**Status**: PARTIALLY IMPLEMENTED (LLM-backed, hardening pending)
**Priority**: HIGH
**Category**: Security

## Description
Develop the `SkepticAuditor` service to perform adversarial logic and safety checks on proposed proofs.

## Requirement
Use strict delimiters for agent input and a high-rigor system prompt to prevent prompt injection and "rubber stamp" approvals.

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] **1.1** Define `SkepticAuditor` interface: `audit(proof: ProofAttempt): AuditResult`.
- [ ] **1.2** Enumerate audit checks:
  - Logic consistency: Does proof claim match evidence?
  - Assumption validation: Are preconditions satisfied?
  - Contradiction detection: Does proof conflict with KB?
  - Safety boundary check: Is proof attempting bypasses?
  - False wins: Does proof achieve real victory or just pass checks?
- [ ] **1.3** Design input sanitization: strict delimiters to box agent input.
- [ ] **1.4** Define high-rigor system prompt (separate from main agent prompt).
- [ ] **1.5** Design audit result schema: checks, verdicts, evidence references.
- [ ] **1.6** Document fail-safe: If auditor crashes, proof defaults to MANUAL review.

### Phase 2: Delimiter & Injection Prevention
- [ ] **2.1** Define input delimiter scheme (e.g., `<<<PROOF_START>>>` and `<<<PROOF_END>>>`).
- [ ] **2.2** Strip/escape any delimiters found in agent-submitted proof.
- [ ] **2.3** Create validator: reject proof if suspicious delimiter patterns detected.
- [ ] **2.4** Add lexer to scan proof for prompt-injection keywords (e.g., "ignore", "bypass", "override").
- [ ] **2.5** Document delimiter rules in auditor comments.

### Phase 3: High-Rigor System Prompt
- [ ] **3.1** Write auditor-specific system prompt (separate file: `auditor-system-prompt.md`).
- [ ] **3.2** Core principles:
  - Assume proofs are adversarial by default.
  - Never trust agent assertions without evidence.
  - Require explicit contradiction-free logic chains.
  - Catch "false wins" (e.g., passing tests but missing core requirement).
- [ ] **3.3** Add explicit rubric: Logic (0-10), Evidence (0-10), Safety (0-10).
- [ ] **3.4** Define pass threshold: all rubrics >= 7.
- [ ] **3.5** Define failure modes per rubric (e.g., logic < 5 -> escalate to human).

### Phase 4: Core Audit Logic
- [ ] **4.1** Implement `auditLogic()`: verify proof steps are causally connected.
- [ ] **4.2** Implement `auditAssumptions()`: cross-check preconditions against KB.
- [ ] **4.3** Implement `auditContradictions()`: scan proof against stored findings/decisions.
- [ ] **4.4** Implement `auditSafety()`: verify proof doesn't attempt bypasses or escapes.
- [ ] **4.5** Implement `auditFalseWins()`: check if proof solves real problem or just passes metrics.
- [ ] **4.6** Add evidence tagging: each audit step links to source (KB ref, line number, etc.).

### Phase 5: Integration with ValidationManager
- [ ] **5.1** Hook `SkepticAuditor` into `ValidationManager` workflow.
- [ ] **5.2** Audit runs BEFORE strategy selection (phase-gating).
- [ ] **5.3** Failed audits escalate to human review (even if CONSTRAINED_CMD would pass).
- [ ] **5.4** Passed audits proceed to strategy validation.
- [ ] **5.5** Log audit trail: decision, evidence, rubric scores.

### Phase 6: Testing & Validation
- [ ] **6.1** Unit test: catch adversarial proof with obvious flaw.
- [ ] **6.2** Unit test: detect prompt injection patterns in proof.
- [ ] **6.3** Unit test: validate delimiter escaping works.
- [ ] **6.4** Unit test: contradiction detection against KB.
- [ ] **6.5** Unit test: false win detection (e.g., test passes, requirement not met).
- [ ] **6.6** Adversarial test: attempt to bypass auditor with creative prompts.
- [ ] **6.7** Performance test: audit latency < 2s per proof.

### Phase 7: Observability & Tuning
- [ ] **7.1** Add structured logging: audit decision, rubric scores, evidence refs.
- [ ] **7.2** Emit metrics: pass rate, fail rate, average rubric scores per check.
- [ ] **7.3** Create dashboard: audit trends over time.
- [ ] **7.4** Define tuning: adjust rubric thresholds based on false positive rate.
- [ ] **7.5** Add explainability: audit result includes human-readable explanation.

### Phase 8: Documentation & Rollout
- [ ] **8.1** Document `SkepticAuditor` architecture in safety design doc.
- [ ] **8.2** Publish high-rigor system prompt (auditor-system-prompt.md).
- [ ] **8.3** Create runbook: "How to debug failed audits".
- [ ] **8.4** Update team: explain why proofs are audited, what triggers escalation.
- [ ] **8.5** Deploy with monitoring: track audit pass/fail rates.

### Acceptance Criteria
- [~] No proof accepted without audit (orchestrated paths use audit, but coverage not fully proven).
- [ ] Delimiter scheme prevents prompt injection.
- [ ] Audit rubric enforced: all checks >= 7 to pass.
- [ ] Contradiction detection works (unit + integration tested).
- [~] False win detection attempted (heuristic + skeptic pass), needs formal test evidence.
- [ ] Audit latency < 2s per proof.
- [ ] Audit trail logged for all decisions.
