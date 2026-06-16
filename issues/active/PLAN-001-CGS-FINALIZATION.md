# PLAN-001-CGS-FINALIZATION

## Status: ACTIVE
**Priority**: CRITICAL
**Goal**: Transform CGS from a standalone library into an active, blocking safety harness with hard code-backed validation.

## 🛠️ Execution Phases

### Phase 1: Hardening (The Truth Engine)
**Objective**: Replace mock/heuristic validations with actual shell execution.
- [x] **ConstrainedExecutor**: `helpers/services/constrained_executor.ts` implemented.
  - [x] `exec` wrapper with hard timeouts (10s).
  - [x] stdout/stderr capture with size limits (1MB).
  - [x] non-zero exit codes treated as failures.
- [x] **ValidationManager Upgrade**: `validation_strategies.ts` uses `ConstrainedExecutor` in `ConstrainedCmdStrategy`.
- [ ] **Unit Tests**: Verify failing shell command blocks resolution (evidence not attached in this issue).

### Phase 2: The Hook (The Interceptor)
**Objective**: Prevent tool bypasses by intercepting at the dispatcher level.
- [ ] **Middleware Integration**: Implement a proxy wrapper in the Pi Tool Dispatcher.
- [ ] **Dispatch Logic**: `Request` $\rightarrow$ `GuardrailOrchestrator.handleAction()` $\rightarrow$ `Allow` $\rightarrow$ `Original Tool`.
- [ ] **Error Handling**: Map `allowed: false` to a specific `GuardrailBlockException` for the TUI.

### Phase 3: Deep Audit (The Final Gate)
**Objective**: Prevent "Fake Success" through adversarial LLM verification of output.
- [x] **FinalizeChecker Upgrade**: `finalize_checker.ts` uses `LLMService.call("SKEPTIC", ...)`.
- [~] **Verification Loop**: Wired in code, but output payload still minimal (`validationResult.reason` placeholder vs full stdout artifact).

## 🚨 Risk Register
- **Infinite Loops**: A validator script that hangs could freeze the harness. (Mitigated by `ConstrainedExecutor` timeouts).
- **Bypass**: Agent finding a way to execute shell commands without going through the intercepted `bash` tool. (Mitigated by Dispatcher Middleware).
- **False Negatives**: Skeptic rejecting a valid proof due to output formatting. (Mitigated by Negotiator refinement).

## ✅ Acceptance Criteria
- [ ] A `bash` call to a blocked file is interrupted before execution.
- [ ] A "fake" proof (e.g., `echo 0`) is rejected by the Finalize Checker.
- [ ] A valid shell script proving a condition results in `RESOLVED` status in `expectations.jsonl`.
