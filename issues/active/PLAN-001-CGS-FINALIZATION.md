# PLAN-001-CGS-FINALIZATION

## Status: ACTIVE
**Priority**: CRITICAL
**Goal**: Transform CGS from a standalone library into an active, blocking safety harness with hard code-backed validation.

## 🛠️ Execution Phases

### Phase 1: Hardening (The Truth Engine)
**Objective**: Replace mock/heuristic validations with actual shell execution.
- [ ] **ConstrainedExecutor**: Create `helpers/services/constrained_executor.ts`.
  - Implement `exec` wrapper with hard timeouts (10s).
  - Implement stdout/stderr capture with size limits (1MB).
  - Ensure non-zero exit codes are treated as failures.
- [ ] **ValidationManager Upgrade**: Integrate `ConstrainedExecutor` into `validation_strategies.ts`.
- [ ] **Unit Tests**: Verify that a failing shell command actually blocks resolution.

### Phase 2: The Hook (The Interceptor)
**Objective**: Prevent tool bypasses by intercepting at the dispatcher level.
- [ ] **Middleware Integration**: Implement a proxy wrapper in the Pi Tool Dispatcher.
- [ ] **Dispatch Logic**: `Request` $\rightarrow$ `GuardrailOrchestrator.handleAction()` $\rightarrow$ `Allow` $\rightarrow$ `Original Tool`.
- [ ] **Error Handling**: Map `allowed: false` to a specific `GuardrailBlockException` for the TUI.

### Phase 3: Deep Audit (The Final Gate)
**Objective**: Prevent "Fake Success" through adversarial LLM verification of output.
- [ ] **FinalizeChecker Upgrade**: Update `finalize_resolution()` to use `LLMService.call("SKEPTIC", ...)`.
- [ ] **Verification Loop**: Send `(Expectation, ValidatorScript, ActualOutput)` $\rightarrow$ Skeptic $\rightarrow$ Final Verdict.

## 🚨 Risk Register
- **Infinite Loops**: A validator script that hangs could freeze the harness. (Mitigated by `ConstrainedExecutor` timeouts).
- **Bypass**: Agent finding a way to execute shell commands without going through the intercepted `bash` tool. (Mitigated by Dispatcher Middleware).
- **False Negatives**: Skeptic rejecting a valid proof due to output formatting. (Mitigated by Negotiator refinement).

## ✅ Acceptance Criteria
- [ ] A `bash` call to a blocked file is interrupted before execution.
- [ ] A "fake" proof (e.g., `echo 0`) is rejected by the Finalize Checker.
- [ ] A valid shell script proving a condition results in `RESOLVED` status in `expectations.jsonl`.
