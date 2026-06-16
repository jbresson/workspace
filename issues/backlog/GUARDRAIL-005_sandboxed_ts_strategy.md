# GUARDRAIL-005: Sandboxed TS Strategy

**Status**: PARTIALLY IMPLEMENTED (basic heuristic checks only)
**Priority**: HIGH
**Category**: Security

## Description
Implement the `SandboxedTSStrategy` for complex proof logic.

## Requirement
Perform AST analysis to block unauthorized modules (`child_process`, `net`, etc.) before execution.

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] **1.1** Define `SandboxedTSStrategy` interface: `validate(code: string): ValidationResult`.
- [ ] **1.2** Design AST parsing pipeline:
  - Parse TypeScript code to AST.
  - Scan for `import`, `require`, `import()` statements.
  - Check each import against blocklist.
  - Scan for other dangerous patterns (eval, Function constructor, etc.).
- [ ] **1.3** Define blocklist:
  - `child_process`: subprocess execution.
  - `net`, `http`, `https`, `dgram`: network I/O.
  - `fs`, `fs/promises`: file system write operations (read-only may be allowed).
  - `path` with absolute path construction: potential escape vector.
  - `eval`, `Function`, `vm`: dynamic code execution.
- [ ] **1.4** Design allowlist:
  - Safe built-ins: `console`, `JSON`, `Array`, `Object`, `Math`, `String`, `Number`, `Boolean`.
  - Project modules: anything from `src/` or approved dirs.
  - Safe npm packages: `lodash`, `uuid`, `zod` (define explicit list).
- [ ] **1.5** Document scope: what proofs this strategy handles (complex logic, no side effects).
- [ ] **1.6** Design fail-safe: reject if ANY blocklist import found, no partial approval.

### Phase 2: TypeScript AST Parser
- [ ] **2.1** Integrate TypeScript compiler API for AST parsing.
- [ ] **2.2** Implement module import visitor: extract all `import` and `require` calls.
- [ ] **2.3** Handle dynamic imports: `import()` expressions.
- [ ] **2.4** Add error handling: gracefully reject unparseable code.
- [ ] **2.5** Unit test: parse valid and invalid TypeScript.

### Phase 3: Module Blocklist & Allowlist
- [ ] **3.1** Implement blocklist matcher:
  - Match exact module names: `child_process`, `fs`.
  - Match patterns: `@dangerous/*`, `native-bindings`.
- [ ] **3.2** Implement allowlist matcher:
  - Match exact module names: `lodash`, `uuid`, `zod`.
  - Match scoped packages: `@types/*` (except dangerous).
  - Match relative paths: `./ src/utils`, but NOT `../../../etc/passwd`.
- [ ] **3.3** Add path normalization: resolve `../` chains to catch escapes.
- [ ] **3.4** Unit test: all blocklist modules rejected, all allowlist modules allowed.

### Phase 4: Dangerous Pattern Detection
- [ ] **4.1** Implement scanner for `eval()` expressions.
- [ ] **4.2** Implement scanner for `Function()` constructor.
- [ ] **4.3** Implement scanner for `vm` module usage.
- [ ] **4.4** Implement scanner for `child_process.spawn()`, `.exec()`, etc.
- [ ] **4.5** Implement scanner for global object access (e.g., `global.require`).
- [ ] **4.6** Unit test: detection of all dangerous patterns.

### Phase 5: Whitelist File/Network Access
- [ ] **5.1** Analyze `fs` imports: distinguish read vs. write.
- [ ] **5.2** If `fs.writeFile`, `fs.appendFile`, `fs.unlink` found -> REJECT.
- [ ] **5.3** If `fs.readFile`, `fs.readdir` found -> ALLOW (read-only).
- [ ] **5.4** Any `net`, `http`, `https` -> REJECT.
- [ ] **5.5** Unit test: read-only fs allowed, write/network rejected.

### Phase 6: Symbol & Type Analysis
- [ ] **6.1** Advanced: Implement symbol resolution to catch indirect dangerous calls.
  - E.g., `const cp = require('child_process'); cp.exec(...)` should be rejected.
- [ ] **6.2** Track variable assignments to dangerous modules.
- [ ] **6.3** Scan for method calls on tracked variables.
- [ ] **6.4** Unit test: indirect module usage detected.

### Phase 7: Execution Sandbox
- [ ] **7.1** Design execution environment: Node.js with restricted globals.
- [ ] **7.2** Use `vm` module to create isolated context (ironically safe here).
- [ ] **7.3** Provide safe globals: `console`, `JSON`, `Math`, etc.
- [ ] **7.4** Timeout: 5s max per proof execution.
- [ ] **7.5** Memory limit: prevent infinite loops / DoS.
- [ ] **7.6** Capture stdout/stderr for result verification.

### Phase 8: Testing & Validation
- [ ] **8.1** Unit test suite: 60+ test cases:
  - Valid proofs (safe imports, no dangerous patterns) -> PASS.
  - Blocklist imports (child_process, fs write, net) -> REJECT.
  - Dangerous patterns (eval, Function, vm) -> REJECT.
  - Indirect module usage -> REJECT.
  - Read-only fs usage -> ALLOW.
  - Relative path escapes -> REJECT.
- [ ] **8.2** Integration test: ValidationManager + SandboxedTSStrategy workflow.
- [ ] **8.3** Adversarial test: attempt to bypass via encoding, reflection, etc.
- [ ] **8.4** Performance test: AST parsing + validation < 500ms per proof.
- [ ] **8.5** Sandbox escape test: attempt code injection from proof.

### Phase 9: Observability & Monitoring
- [ ] **9.1** Add structured logging: code hash, modules found, blocklist violations.
- [ ] **9.2** Emit metrics: proofs accepted/rejected by violation type.
- [ ] **9.3** Create audit trail: all executed code + results.
- [ ] **9.4** Alert on suspicious patterns (e.g., repeated escape attempts).

### Phase 10: Documentation & Deployment
- [ ] **10.1** Document allowed modules, blocklist, dangerous patterns in spec.
- [ ] **10.2** Create guide: "How to write validatable TypeScript proofs".
- [ ] **10.3** Add troubleshooting: "Why was my code rejected?".
- [ ] **10.4** Update architecture docs: SandboxedTSStrategy in safety pipeline.
- [ ] **10.5** Deploy with monitoring: track rejection rate, sandbox escape attempts.

### Acceptance Criteria
- [~] Basic blocklist patterns rejected (string match), full AST/blocklist coverage pending.
- [ ] Dangerous patterns (eval, Function, vm) detected and rejected.
- [ ] Read-only fs allowed, write/network rejected.
- [ ] Indirect module usage tracked and rejected.
- [ ] 60+ unit tests, >80% code coverage.
- [ ] AST parsing + validation < 500ms per proof.
- [ ] Sandbox timeout + memory limits enforced.
- [ ] No way to escape sandbox or bypass blocklist.
