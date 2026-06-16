# GUARDRAIL-004: Constrained Command Strategy

**Status**: PARTIALLY IMPLEMENTED (baseline + executor wired)
**Priority**: HIGH
**Category**: Security

## Description
Implement the `ConstrainedCmdStrategy` for shell-based proofs.

## Requirements
1. Blacklist characters: `|`, `;`, `&`, `>`, `>>`.
2. Path Pinning: All paths must be within project root and not in sensitive dirs.
3. Trigger Correlation: Verify command targets the original expectation trigger.

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] **1.1** Define `ConstrainedCmdStrategy` interface: `validate(cmd: string): ValidationResult`.
- [ ] **1.2** Design command parsing: tokenize safely without executing.
- [ ] **1.3** Define blacklist rules:
  - Characters: `|`, `;`, `&`, `>`, `>>` (no piping, command chaining, or redirects).
  - Reserved keywords: `eval`, `exec`, `source`, `bash -c`.
- [ ] **1.4** Design path pinning:
  - Whitelist: only project root + approved subdirs.
  - Blacklist: `/etc`, `/root`, `~/.ssh`, `~/.aws`, system libs.
  - Validation: resolve symlinks, check against lists.
- [ ] **1.5** Design trigger correlation:
  - Store original expectation trigger (e.g., "test output contains error message").
  - Verify command targets same file/test/module.
- [ ] **1.6** Document fail-safe: reject if any rule violated, no fallback to dangerous execution.

### Phase 2: Command Parser & Lexer
- [ ] **2.1** Implement safe tokenizer (no shell metachar expansion).
- [ ] **2.2** Extract command name, arguments, flags from tokens.
- [ ] **2.3** Build allowlist of safe commands: `test`, `npm run`, `cargo build`, `git`, `python`, `node`, `ls`, `cat`, `find`, `grep`.
- [ ] **2.4** Reject unlisted commands (fail-safe default).
- [ ] **2.5** Add unit tests: edge cases like escaped quotes, flag parsing.

### Phase 3: Blacklist Enforcement
- [ ] **3.1** Implement character scanner: scan entire command string for banned chars.
- [ ] **3.2** Implement keyword scanner: detect `eval`, `exec`, etc.
- [ ] **3.3** Add error messaging: report which char/keyword violated rule.
- [ ] **3.4** Unit test: rejection of all banned patterns (single & combinations).
- [ ] **3.5** Unit test: allow valid commands with legitimate content (e.g., file content with `|` in it).

### Phase 4: Path Pinning
- [ ] **4.1** Implement path extractor: scan command tokens for file paths.
- [ ] **4.2** Implement symlink resolver: resolve all paths to canonical form.
- [ ] **4.3** Implement whitelist validator:
  - Project root: `${PROJECT_ROOT}`.
  - Approved dirs: `src/`, `test/`, `docs/`, `node_modules/` (if needed).
- [ ] **4.4** Implement blacklist validator:
  - Forbidden: `/etc/*`, `/root/*`, `~/.ssh/*`, `~/.aws/*`, system dirs.
- [ ] **4.5** Add logging: report all paths found and their validation status.
- [ ] **4.6** Unit test: approval of in-project paths, rejection of system paths.

### Phase 5: Trigger Correlation
- [ ] **5.1** Design trigger context: store expectation state (file, line, test name, etc.).
- [ ] **5.2** Implement target matcher: extract target from command (e.g., `npm run test` -> expect test-related changes).
- [ ] **5.3** Implement correlation logic: does command target match trigger context?
- [ ] **5.4** Add flexibility: allow related files (e.g., if trigger is `src/foo.ts`, allow `test/foo.test.ts`).
- [ ] **5.5** Document correlation rules explicitly.
- [ ] **5.6** Unit test: validate correlation for common patterns.

### Phase 6: Integration & Workflow
- [ ] **6.1** Hook into `ValidationManager` (GUARDRAIL-002).
- [ ] **6.2** Called AFTER `SkepticAuditor` (GUARDRAIL-003) passes.
- [ ] **6.3** If validation fails, return failure (no fallback to unconstrained execution).
- [ ] **6.4** If validation passes, execute command safely (in sandboxed subprocess).
- [ ] **6.5** Capture output, return to auditor for result verification.

### Phase 7: Testing & Validation
- [ ] **7.1** Unit test suite: 50+ test cases covering:
  - Valid commands (pass).
  - Blacklist characters (fail).
  - Reserved keywords (fail).
  - Out-of-project paths (fail).
  - Trigger correlation mismatches (fail).
- [ ] **7.2** Integration test: ValidationManager + ConstrainedCmdStrategy full workflow.
- [ ] **7.3** Adversarial test: attempt to bypass via encoding, unicode tricks, etc.
- [ ] **7.4** Performance test: validation latency < 100ms per command.

### Phase 8: Observability & Tuning
- [ ] **8.1** Add structured logging: command, validation decision, rule violations.
- [ ] **8.2** Emit metrics: commands accepted/rejected by rule type.
- [ ] **8.3** Create security report: audit trail of all commands attempted.
- [ ] **8.4** Alert on suspicious patterns (e.g., repeated path escapes).

### Phase 9: Documentation & Deployment
- [ ] **9.1** Document blacklist, whitelist, path pinning rules in safety spec.
- [ ] **9.2** Create user guide: "How to write validatable commands".
- [ ] **9.3** Add troubleshooting: "Why was my command rejected?".
- [ ] **9.4** Update architecture docs: ConstrainedCmdStrategy in safety pipeline.
- [ ] **9.5** Deploy with monitoring: track rejection rate.

### Acceptance Criteria
- [~] Blacklist characters rejected (baseline implemented; ambiguity/bypass testing incomplete).
- [~] Paths screened against sensitive dirs (full whitelist/canonicalization pending).
- [~] Trigger correlation enforced (string-contains check only; stronger matcher pending).
- [ ] 50+ unit tests, >85% code coverage.
- [ ] Validation latency < 100ms.
- [ ] Integration tests pass with ValidationManager + SkepticAuditor.
- [ ] No way to bypass blacklist or path pinning.
