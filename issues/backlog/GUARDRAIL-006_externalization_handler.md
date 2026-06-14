# GUARDRAIL-006: Externalization Handler & Prompt Injection

**Status**: PENDING
**Priority**: MEDIUM
**Category**: Cognitive

## Description
Implement the prompt injection logic that triggers when an action is blocked in AFK mode.

## Requirement
Force the agent to use `log_todo` with a 5-point structured rubric (Intent, Blockage, Dependency Analysis, Plan to Continue, etc.).

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] **1.1** Define AFK (Away From Keyboard) mode: agent operates without real-time human oversight.
- [ ] **1.2** Identify block conditions that require externalization:
  - Proof failed safety audit (GUARDRAIL-003).
  - Proof failed command validation (GUARDRAIL-004 or GUARDRAIL-005).
  - Resource limit reached (token budget, time limit).
  - External service unavailable.
- [ ] **1.3** Design externalization flow:
  - Block triggered -> inject structured prompt -> force `log_todo` call.
  - Structured rubric: Intent, Blockage, Dependency Analysis, Plan to Continue, Escalation Flag.
- [ ] **1.4** Define `log_todo` schema: 5-point rubric with required fields.
- [ ] **1.5** Design fail-safe: if agent refuses to log, escalate to human with override flag.

### Phase 2: Block Detection & Triggers
- [ ] **2.1** Hook into `SkepticAuditor` (GUARDRAIL-003): capture failed audits.
- [ ] **2.2** Hook into `ConstrainedCmdStrategy` (GUARDRAIL-004): capture command rejections.
- [ ] **2.3** Hook into `SandboxedTSStrategy` (GUARDRAIL-005): capture code rejections.
- [ ] **2.4** Hook into resource manager: capture token/time budget exhaustion.
- [ ] **2.5** Implement block context: collect all relevant metadata (proof, reason, severity).
- [ ] **2.6** Add timestamp & sequence logging.

### Phase 3: Externalization Prompt Injection
- [ ] **3.1** Design high-fidelity prompt for externalization (separate file: `externalization-prompt.md`).
- [ ] **3.2** Core message: "Action blocked. You MUST use `log_todo` to document this blockage.".
- [ ] **3.3** Provide block context: what was attempted, why it failed, what evidence exists.
- [ ] **3.4** Inject structured rubric template directly into prompt (copy-paste ready).
- [ ] **3.5** Add consequence: explain that non-compliance escalates to human override.
- [ ] **3.6** Repeat injection if agent attempts workarounds (max 3 attempts before escalation).

### Phase 4: Log_todo Rubric Definition
- [ ] **4.1** Define 5-point rubric fields:
  - **Intent**: What were you trying to achieve? (1-2 sentences)
  - **Blockage**: Why was the action blocked? (reason + evidence reference)
  - **Root Cause**: What triggered the block? (proof ID, validation rule, etc.)
  - **Dependency Analysis**: Is this block isolated or cascading? (see GUARDRAIL-007)
  - **Plan to Continue**: What's your next step? (alternative approach, escalation, or hold)
  - **Escalation Flag**: Does this need human review now? (yes/no)
- [ ] **4.2** Add validation: each field has min/max length, required keywords.
- [ ] **4.3** Make rubric machine-parseable (JSON schema).
- [ ] **4.4** Document field meanings and examples.

### Phase 5: Log_todo Implementation
- [ ] **5.1** Create `log_todo` function: accepts 5-point rubric.
- [ ] **5.2** Validate rubric completeness: reject if any field missing or too vague.
- [ ] **5.3** Persist log entry: append to `todo.md` or dedicated log file.
- [ ] **5.4** Emit metrics: log reason code (blockage type) for analytics.
- [ ] **5.5** Return receipt: confirm log entry with ID for tracking.
- [ ] **5.6** Link to block context: todo entry references original failure event.

### Phase 6: Escalation & Follow-Up
- [ ] **6.1** Design escalation criteria:
  - Cascading blocks (GUARDRAIL-007): always escalate to human.
  - High-severity proofs (security-related): always escalate.
  - Unknown block type: escalate for triage.
  - Agent refusal to log (3+ attempts): escalate with override flag.
- [ ] **6.2** Implement escalation action: create `BLOCK-XXX` issue in `issues/active/`.
- [ ] **6.3** Notify human: add to digest or high-priority queue.
- [ ] **6.4** Include full context: block reason, todo entry, suggested resolution.

### Phase 7: Testing & Validation
- [ ] **7.1** Unit test: externalization prompt injection on each block type.
- [ ] **7.2** Unit test: rubric validation (complete vs. incomplete, valid vs. invalid).
- [ ] **7.3** Unit test: escalation logic (isolated vs. cascading, severity tiers).
- [ ] **7.4** Integration test: ValidationManager -> block trigger -> externalization -> log_todo.
- [ ] **7.5** Adversarial test: agent attempts to bypass externalization or submit empty rubric.
- [ ] **7.6** Workflow test: end-to-end AFK mode scenario (block, log, escalation).

### Phase 8: Observability & Monitoring
- [ ] **8.1** Add structured logging: externalization trigger, rubric fields, escalation decision.
- [ ] **8.2** Emit metrics:
  - Externalization frequency by block type.
  - Todo completion rate (agent logs within threshold).
  - Escalation frequency.
- [ ] **8.3** Create dashboard: externalization events over time.
- [ ] **8.4** Alert on suspicious patterns (e.g., repeated same-block, no escalation).

### Phase 9: Documentation & Rollout
- [ ] **9.1** Document externalization flow in safety spec.
- [ ] **9.2** Publish externalization prompt (externalization-prompt.md).
- [ ] **9.3** Document 5-point rubric with examples in operation guide.
- [ ] **9.4** Create runbook: "What to do when externalization is triggered".
- [ ] **9.5** Train team: explain AFK mode constraints and externalization protocol.
- [ ] **9.6** Deploy with monitoring: track externalization + escalation rates.

### Acceptance Criteria
- [x] Block triggers externalization prompt injection.
- [x] Externalization prompt forces `log_todo` call.
- [x] Rubric fields validated (complete, meaningful, parseable).
- [x] Isolation vs. cascading detection works (per GUARDRAIL-007).
- [x] Escalation logic enforced: cascading blocks always escalate.
- [x] Max 3 retry attempts before human escalation.
- [x] Audit trail captures all externalization events.
- [x] Integration tests pass with all upstream safety validators.
