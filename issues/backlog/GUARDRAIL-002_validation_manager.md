# GUARDRAIL-002: Validation Manager Implementation

**Status**: PENDING
**Priority**: HIGH
**Category**: Core

## Description
Implement the `ValidationManager` to route proof attempts to the appropriate strategy (`MANUAL`, `CONSTRAINED_CMD`, `SANDBOXED_TS`).

## Requirement
Must implement a fail-safe mechanism: if the validation type is unknown or missing, it must default to `MANUAL`.

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] **1.1** Define `ValidationManager` interface: routes `ProofAttempt` -> `ValidationStrategy`.
- [ ] **1.2** Enumerate validation types: `MANUAL`, `CONSTRAINED_CMD`, `SANDBOXED_TS`, `EXTERNAL_API`.
- [ ] **1.3** Design routing logic:
  - Inspect `ProofAttempt.type` field.
  - Match to strategy class.
  - Fallback to `ManualStrategy` if type unknown or missing.
- [ ] **1.4** Define error handling: log unknown types, emit warning, default gracefully.
- [ ] **1.5** Document fail-safe contract in interface comments.

### Phase 2: Core Implementation
- [ ] **2.1** Create `ValidationManager` class in `src/safety/ValidationManager.ts`.
- [ ] **2.2** Implement strategy registry (map type -> strategy class).
- [ ] **2.3** Implement `route(proofAttempt: ProofAttempt): ValidationStrategy` method.
- [ ] **2.4** Add type guards to safely extract validation type from proof.
- [ ] **2.5** Implement fallback logic: default to `ManualStrategy` with logging.
- [ ] **2.6** Add constructor-time validation: ensure all required strategies are registered.

### Phase 3: Strategy Integration
- [ ] **3.1** Ensure `ManualStrategy` exists and is always available (as fallback).
- [ ] **3.2** Verify `ConstrainedCmdStrategy` is registered (GUARDRAIL-004).
- [ ] **3.3** Verify `SandboxedTSStrategy` is registered (GUARDRAIL-005).
- [ ] **3.4** Ensure strategy interface is consistent across all implementations.
- [ ] **3.5** Add strategy capability discovery: e.g., `canValidate(proofAttempt): boolean`.

### Phase 4: Testing & Validation
- [ ] **4.1** Unit test: route to each known strategy type.
- [ ] **4.2** Unit test: unknown type falls back to `MANUAL`.
- [ ] **4.3** Unit test: missing type field defaults to `MANUAL`.
- [ ] **4.4** Unit test: null/undefined handling.
- [ ] **4.5** Integration test: ValidationManager + SkepticAuditor (GUARDRAIL-003).
- [ ] **4.6** Load test: validate routing performance under high proof volume.

### Phase 5: Error Handling & Observability
- [ ] **5.1** Add structured logging: log every route decision with proof ID, type, strategy.
- [ ] **5.2** Emit metrics: count by strategy type, fallback frequency.
- [ ] **5.3** Add alerting: warn if fallback rate exceeds threshold (e.g., >5%).
- [ ] **5.4** Document troubleshooting: "Why did my proof default to MANUAL?".

### Phase 6: Documentation & Deployment
- [ ] **6.1** Add `ValidationManager` to architecture docs.
- [ ] **6.2** Document strategy interface contract.
- [ ] **6.3** Create usage example: how to add new strategy.
- [ ] **6.4** Update safety checklist: ValidationManager deployment gate.
- [ ] **6.5** Verify no orphaned references to removed validation logic.

### Acceptance Criteria
- [x] All proof types route to correct strategy.
- [x] Unknown/missing types silently default to `MANUAL` without errors.
- [x] Logging captures all routing decisions.
- [x] Unit tests pass (>90% coverage).
- [x] Integration tests pass with all downstream services.
