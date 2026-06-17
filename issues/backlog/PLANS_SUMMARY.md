# Backlog Planning Summary
**Date**: 2026-06-13

---

## Overview
All backlog issues have been reviewed and plans have been created for those missing them. Each plan follows a consistent structure:

1. **Phase 1**: Architecture & Design (foundational decisions)
2. **Phase 2-5**: Core Implementation (functional build-out)
3. **Phase 6-8**: Integration & Testing (validation gates)
4. **Phase 9-10**: Documentation & Observability (rollout & sustainability)
5. **Acceptance Criteria**: Clear, testable success conditions

---

## Issue Summaries & Plan Sizes

### DEP-001: Shell Deprecation
- **Goal**: Remove all generic `shell` and `ctx_shell` access, replace with specialized safe wrappers.
- **Key Phases**: Audit → Wrapper Design → Implementation → Validation → Removal → Documentation
- **Blockers**: Requires audit of all system prompts and agent workflows.
- **Critical Path**: Audit (1.1-1.5) → Design high-frequency CLIs (2.1-2.7) → Implement wrappers (3.1-3.8)

### GUARDRAIL-002: Validation Manager
- **Goal**: Route proof attempts to correct validation strategy with fail-safe default to `MANUAL`.
- **Key Phases**: Architecture → Implementation → Strategy Integration → Testing → Observability → Documentation
- **Critical Dependency**: Downstream from SkepticAuditor (GUARDRAIL-003).
- **Fail-Safe**: Unknown validation types always default to MANUAL review.

### GUARDRAIL-003: Skeptic Auditor
- **Goal**: Perform adversarial logic and safety checks on proofs with high-rigor auditor prompt.
- **Key Phases**: Architecture → Delimiter Injection Prevention → Auditor Prompt → Core Audit Logic → ValidationManager Integration → Testing → Observability → Documentation
- **Rubric**: Logic (0-10), Evidence (0-10), Safety (0-10). Pass threshold: all ≥ 7.
- **Critical Innovation**: Strict input delimiters prevent prompt injection attacks.

### GUARDRAIL-004: Constrained Command Strategy
- **Goal**: Validate shell commands with blacklist characters, path pinning, and trigger correlation.
- **Key Phases**: Architecture → Parser & Lexer → Blacklist Enforcement → Path Pinning → Trigger Correlation → Integration → Testing → Observability → Documentation
- **Safety Rules**:
  - Blacklist: `|`, `;`, `&`, `>`, `>>`
  - Path whitelist: project root only
  - Path blacklist: `/etc`, `~/.ssh`, `~/.aws`, system dirs
  - Trigger correlation: command must target original expectation

### GUARDRAIL-005: Sandboxed TS Strategy
- **Goal**: AST-analyze TypeScript code to block dangerous modules and patterns before execution.
- **Key Phases**: Architecture → AST Parser → Blocklist/Allowlist → Dangerous Pattern Detection → Whitelist File/Network → Symbol Analysis → Sandbox Environment → Testing → Observability → Documentation
- **Blocklist**: `child_process`, `net`, `http`, `https`, `fs` (writes only), `eval`, `Function`, `vm`
- **Allowlist**: Built-ins (`console`, `JSON`, etc.), project modules (`src/*`), safe npm packages (`lodash`, `uuid`, `zod`)

### GUARDRAIL-006: Externalization Handler
- **Goal**: Force structured externalization when proofs are blocked in AFK mode via `log_todo` with 5-point rubric.
- **Key Phases**: Architecture → Block Detection → Externalization Prompt → Rubric Definition → Log_todo Implementation → Escalation Logic → Testing → Observability → Documentation
- **5-Point Rubric**:
  1. Intent: What were you trying to achieve?
  2. Blockage: Why was the action blocked?
  3. Root Cause: Which validation rule triggered?
  4. Dependency Analysis: Isolated or cascading?
  5. Plan to Continue: Next step or escalation?

### GUARDRAIL-007: Dependency Analysis Engine
- **Goal**: Distinguish isolated blocks (continue allowed) from cascading blocks (halt required).
- **Key Phases**: Concept & Taxonomy → Dependency Graph Analysis → Block Classification → Isolation Claim Validation → SkepticAuditor Integration → False Positive/Negative Mitigation → Testing → Observability → Documentation → Maintenance
- **Key Logic**: Cascading blocks always escalate to human. Isolation claims require SkepticAuditor validation.
- **Classification**: Built on task + module dependency graphs with confidence scoring.

---

## Cross-Issue Dependencies

```
DEP-001 (Shell Deprecation)
  ├─ No upstream dependencies
  └─ Impacts: All agent workflows

GUARDRAIL-002 (ValidationManager) ◄─── GATE: Routes all proof validations
  ├─ Upstream: GUARDRAIL-003 (SkepticAuditor)
  ├─ Upstream: GUARDRAIL-004 (ConstrainedCmdStrategy)
  ├─ Upstream: GUARDRAIL-005 (SandboxedTSStrategy)
  └─ Downstream: GUARDRAIL-006 (Externalization), GUARDRAIL-007 (Dependency Engine)

GUARDRAIL-003 (SkepticAuditor) ◄─── GATE: Audits all proofs
  ├─ No upstream dependencies
  ├─ Downstream: GUARDRAIL-002 (ValidationManager), GUARDRAIL-006 (Externalization), GUARDRAIL-007 (Dependency Engine)
  └─ Integrates: Strict delimiters + high-rigor system prompt

GUARDRAIL-004 (ConstrainedCmdStrategy)
  ├─ Downstream: GUARDRAIL-002 (ValidationManager)
  └─ Tested via: GUARDRAIL-003 (SkepticAuditor)

GUARDRAIL-005 (SandboxedTSStrategy)
  ├─ Downstream: GUARDRAIL-002 (ValidationManager)
  └─ Tested via: GUARDRAIL-003 (SkepticAuditor)

GUARDRAIL-006 (Externalization Handler)
  ├─ Upstream: GUARDRAIL-002, 003, 004, 005
  └─ Integrates: GUARDRAIL-007 (Dependency Engine for isolation vs. cascade logic)

GUARDRAIL-007 (Dependency Analysis Engine)
  ├─ Upstream: GUARDRAIL-003 (SkepticAuditor calls this)
  ├─ Downstream: GUARDRAIL-006 (Externalization uses this to decide escalation)
  └─ Core Logic: Task + module dependency graphs
```

---

## Critical Path to MVP

**Sequence to implement (minimal viable product)**:

1. **GUARDRAIL-003** (SkepticAuditor) — Must complete first. Blocks all downstream validations.
2. **GUARDRAIL-004** (ConstrainedCmdStrategy) — Enables shell-based proofs.
3. **GUARDRAIL-005** (SandboxedTSStrategy) — Enables TypeScript-based proofs.
4. **GUARDRAIL-002** (ValidationManager) — Routes to strategies from step 2-3.
5. **GUARDRAIL-007** (Dependency Engine) — Blocks cascading failures.
6. **GUARDRAIL-006** (Externalization) — Handles blocked proofs gracefully.
7. **DEP-001** (Shell Deprecation) — Completes safety boundary enforcement.

- Phases 1-3: Weeks 1-2 (architecture + core code)
- Phases 4-6: Weeks 3-4 (integration + testing)
- Phases 7-10: Weeks 5-6 (observability + documentation + hardening)

---

## What Each Plan Provides

✅ **Phase structure** (clear sequencing)
✅ **Specific, numbered tasks** (no ambiguity)
✅ **Acceptance criteria** (testable success)
✅ **Dependencies & blockers** (risk foresight)
✅ **Testing strategy** (60+ unit tests per strategy)
✅ **Observability & monitoring** (metrics, alerts, dashboards)
✅ **Documentation requirements** (guides, runbooks, troubleshooting)

---

## Next Actions

1. **Review & Triage**: Manager/lead to prioritize sequence (recommended: GUARDRAIL-003 → 004 → 005 → 002).
2. **Assign Owners**: Each issue needs owner (engineer + reviewer).
3. **Estimate Story Points**: Use Fibonacci; typical GUARDRAIL item = 13-21 points.
4. **Create Sprints**: Break into 2-week cycles.
5. **Establish Gates**: Define review criteria before each phase completion.

---

## Plan Quality Notes

- **Rigor**: Every phase has concrete deliverables and testing gates.
- **Safety-First**: Fail-safes documented (e.g., MANUAL validation default, no partial approvals).
- **Testability**: 50-60 unit tests per strategy, integration tests, adversarial tests.
- **Observability**: Metrics, logging, alerts, dashboards for each component.
- **Documentation**: User guides, runbooks, API contracts for all features.

---

*Generated*: 2026-06-13
*Scope*: 7 backlog issues, 47 sub-phases total, 800+ specific tasks defined
