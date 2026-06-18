# OmniTool Implementation Status & Development Mitigations

**Last Updated**: 2026-06-17  
**Phase**: Development (Phases 0-9 in progress per GUARDRAIL-008)  
**Status**: **PARTIAL** (Core structure live; features incomplete)

---

## 🎯 Executive Summary

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Tool Registration** | ✓ LIVE | `omnitool` registered as single agent-callable tool in Pi |
| **Tool Surface Lockdown (RULE-12)** | ✓ LIVE | Non-omnitool calls blocked via interceptor |
| **WIP Initialization** | ✓ LIVE | `wip init` creates ledger structure |
| **Basic WIP Ops** | ✓ LIVE | `issues.init`, `issues.update_status`, `issues.transition` working |
| **Guardrails Core** | ⚠ PARTIAL | Rules defined; hard checks coded; auditor integration missing |
| **RULE-4 (Issue Quality Gate)** | ⚠ PARTIAL | Hard checks pass; auditor LLM call not integrated |
| **RULE-11 (Create-Only Full Writes)** | ⚠ PARTIAL | fs.existsSync check exists; not fully tested |
| **Mode System (DEBUG/ENFORCE)** | ✗ MISSING | Config system for mode-gated behavior not implemented |
| **Sparse Checkout** | ✗ MISSING | Git sparse-checkout integration not coded |
| **Graduation Protocol** | ✗ MISSING | User-command promotion path not implemented |
| **Session ID Passing** | ⚠ PARTIAL | Hardcoded "SESSION_UNKNOWN" in omnitool/index.ts |
| **Audit Ledger** | ✓ LIVE | tool_call.json appended-to; no schema versioning |
| **Negotiation/Resolution Proxy** | ⚠ PARTIAL | negotiation_manager & finalize_checker exist; integration unclear |

---

## 📍 Codebase Map (31 Guardrails Files)

### Core Infrastructure
- **`.pi/extensions/omnitool/index.ts`** (180L)
  - Status: ✓ LIVE
  - Responsibilities: Tool registration, RULE-12 enforcement, tool_call interceptor
  - Known Issue: sessionId hardcoded "SESSION_UNKNOWN"; needs Pi context extraction (FW-30, FW-31)

### Rule Definitions
- **`.pi/extensions/omnitool/guardrails/rules_definition.ts`** (144L)
  - Status: ✓ COMPLETE
  - Responsibilities: Schema for RULE-1 through RULE-12
  - Profiles: strict, developer, minimal

### Gatekeeper (Policy Enforcement)
- **`.pi/extensions/omnitool/guardrails/gatekeeper-rules.ts`** (262L)
  - Status: ⚠ PARTIAL
  - Responsibilities: Fast/Deep rule predicates for all 12 rules
  - Implemented: RULE-1 through RULE-12 basic structure
  - **Known Gap**: RULE-4 lacks auditor integration (FW-1, FW-2)
  - **Known Gap**: No retry logic for auditor failures (FW-3, FW-17)
  - **Known Gap**: Mode-gated behavior not implemented (FW-6, FW-7)

- **`.pi/extensions/omnitool/guardrails/gatekeeper.ts`** (62L)
  - Status: ⚠ PARTIAL
  - Responsibilities: Interception algorithm, 2-step filter
  - **Known Issue**: Does not check mode (DEBUG vs. ENFORCE)

### Orchestrator (Transaction Coordination)
- **`.pi/extensions/omnitool/guardrails/orchestrator.ts`** (62L)
  - Status: ⚠ PARTIAL
  - Responsibilities: Coordinate gatekeeper, negotiator, finalizer
  - **Known Issue**: Fail-open behavior (line 23: `return { allowed: true }` on error)
  - **Mitigation**: Loud audit log + console error; but not fail-closed in ENFORCE mode

### Expectation Service (Session State)
- **`.pi/extensions/omnitool/guardrails/expectation_service.ts`**
  - Status: ✓ LIVE
  - Responsibilities: CRUD for expectations.jsonl
  - **Known Issue**: Append-only; no cleanup/archive mechanism for resolved expectations

### Skeptic Auditor (Values Alignment Check)
- **`.pi/extensions/omnitool/guardrails/skeptic_auditor.ts`**
  - Status: ✗ INCOMPLETE
  - Responsibilities: LLM-based auditor for RULE-4 quality gate
  - **Known Gap**: No actual LLM call; stub or partial implementation (FW-2)
  - **Blocking**: FW-1 (interface contract) + FW-3 (retry logic) need definition first

### Negotiation & Resolution
- **`.pi/extensions/omnitool/guardrails/negotiation_manager.ts`**
  - Status: ⚠ UNCLEAR
  - Responsibilities: Handle agent response to expectation blocks
  - **Known Gap**: Integration with omnitool dispatch not verified (FW-21)

- **`.pi/extensions/omnitool/guardrails/finalize_checker.ts`**
  - Status: ⚠ UNCLEAR
  - Responsibilities: Final resolution validation
  - **Known Gap**: Integration with omnitool dispatch not verified (FW-22)

### WIP Manager
- **`.pi/extensions/omnitool/wip-manager/manager.ts`** (79L)
  - Status: ⚠ PARTIAL
  - Responsibilities: `wip` subActions (issues.init, issues.update_status, issues.transition)
  - Implemented: Basic structure; all subActions exist
  - **Known Gap**: No sparse checkout implementation (FW-12)
  - **Known Gap**: No worktree cleanup on abort (FW-14)

- **`.pi/extensions/omnitool/wip-manager/schemas.ts`**
  - Status: ✓ LIVE
  - Responsibilities: TypeBox validation schemas for issues.*

### Testing
- **`.pi/extensions/omnitool/guardrails/*.test.ts`** (multiple)
  - Status: ⚠ PARTIAL
  - Known: T-1 through T-14 not all implemented; test suite run state unknown

### Audit Ledger
- **`.pi/logs/tool_call.json`**
  - Status: ✓ LIVE
  - Responsibilities: Authoritative audit trail
  - **Known Gap**: No schema versioning (FW-8, FW-9)

---

## ⚡ Intermediate Mitigations (Current Workarounds)

### Mitigation 1: Session ID Hardcoding
**Problem**: RULE-4 requires sessionId for expectation tracking; Pi context not integrated.  
**Current Workaround**: Hardcoded "SESSION_UNKNOWN" in omnitool/index.ts:43  
**Risk**: All blocked calls logged under same session; can't distinguish per-user per-session.  
**Exit Strategy**: FW-30, FW-31 (integrate Pi ctx.sessionId or fallback)  
**Timeline**: Phase 1 (Config), before P2 (RULE-4 auditor work)

### Mitigation 2: Fail-Open in Orchestrator
**Problem**: Orchestrator error handling returns `{ allowed: true }` (line 23 of orchestrator.ts).  
**Current Workaround**: Loud audit + console.error; blocks rarely trigger exceptions.  
**Risk**: Silent recovery of guardrail failures if exception occurs (e.g., expectation_service unavailable).  
**Exit Strategy**: FW-6 (mode system) enables fail-open in DEBUG, fail-closed in ENFORCE.  
**Timeline**: Phase 1 (Config)

### Mitigation 3: Auditor Stub (No LLM)
**Problem**: RULE-4 requires auditor.audit() call; skeptic_auditor.ts incomplete.  
**Current Workaround**: Hard checks only (dedup, delta, evidence, ownership, AC).  
**Risk**: Issue quality gate passes low-quality issues that auditor would reject.  
**Exit Strategy**: FW-1, FW-2 (implement LLM call); FW-3, FW-4 (retry + fallback).  
**Timeline**: Phase 2 (RULE-4)  
**Fallback Behavior (until implemented)**:
  - If auditor unavailable: Allow issue creation (fail-open in all modes)
  - Audit log: "RULE-4: auditor unavailable; hard checks passed, allowing creation (fallback)"

### Mitigation 4: No Mode System
**Problem**: D-5 specifies fail-open in dev, fail-closed in prod; no config.  
**Current Workaround**: Fixed behavior (fail-open in orchestrator, fail-closed in gatekeeper).  
**Risk**: Can't toggle between dev-friendly and prod-strict.  
**Exit Strategy**: FW-5 (create config.ts with GUARDRAIL_MODE env var).  
**Timeline**: Phase 1 (Config)

### Mitigation 5: Sparse Checkout Missing
**Problem**: WIP Manager should clone only needed files per ticket; Git sparse-checkout not coded.  
**Current Workaround**: Full clone only; WIP trees contain entire repo.  
**Risk**: Large repos = slow clone, large disk footprint, "noisy" file scanning.  
**Exit Strategy**: FW-11, FW-12, FW-13, FW-14 (implement sparse checkout + Core Set).  
**Timeline**: Phase 5 (WIP Enhancements)  
**Fallback Behavior (until implemented)**:
  - `wip.clone` performs full `git clone` (no sparse-checkout filtering)
  - Audit log: "SPARSE_CHECKOUT: Not implemented; full clone performed"

### Mitigation 6: No Graduation Protocol
**Problem**: AGENTS.md says "graduation is user-only command"; not implemented.  
**Current Workaround**: Manual git commands required by user (external to omnitool).  
**Risk**: User error in squash/push; no auditable commit provenance from omnitool.  
**Exit Strategy**: FW-18, FW-19, FW-20 (implement squash-and-push, document user command).  
**Timeline**: Phase 8 (Docs & Graduation)

### Mitigation 7: No Session ID Context in Pi
**Problem**: Pi context not available in omnitool index.ts; can't extract sessionId.  
**Current Workaround**: Hardcoded "SESSION_UNKNOWN".  
**Risk**: Expectations not isolated per user/session; blocks may affect wrong sessions.  
**Exit Strategy**: FW-30, FW-31 (verify Pi ctx.sessionId availability; implement fallback).  
**Timeline**: Phase 1 (Config), before P2

### Mitigation 8: Incomplete Negotiation/Resolution Integration
**Problem**: negotiation_manager & finalize_checker exist but not verified as wired into omnitool dispatch.  
**Current Workaround**: Guardrail blocks issued; no user-facing resolution pathway.  
**Risk**: Blocked users can't resolve expectations via guardrail negotiation flow.  
**Exit Strategy**: FW-21, FW-22, FW-23 (verify + wire into omnitool, test E2E).  
**Timeline**: Phase 6 (Negotiation/Resolution), after P2

### Mitigation 9: No Audit Ledger Versioning
**Problem**: tool_call.json schema inline; no version field for future migrations.  
**Current Workaround**: Ad-hoc appends; format inconsistencies possible.  
**Risk**: Breaking schema changes later cause parsing failures on old logs.  
**Exit Strategy**: FW-8, FW-9, FW-10 (add version field, implement appendAudit versioning).  
**Timeline**: Phase 1 (Config)

### Mitigation 10: Test Suite Status Unknown
**Problem**: Package.json lists test scripts; unclear if all 14 tests (T-1 to T-14) exist.  
**Current Workaround**: Partial test coverage; full suite not run.  
**Risk**: AC exit evidence incomplete; unknown test failure count.  
**Exit Strategy**: FW-27, FW-28, FW-29 (run full suite, implement missing tests).  
**Timeline**: Phase 0 (Validation), Phase 9 (Final Testing)

---

## 🚧 Work-in-Progress Components

### RULE-4 Multi-Step Validation
**File**: `.pi/extensions/omnitool/guardrails/gatekeeper-rules.ts` (RULE-4 section)

**Current**:
- Hard checks implemented: dedup, delta, evidence, ownership, AC
- Auditor call: NOT implemented

**Missing**:
- [ ] FW-1: Auditor interface contract (in/out schema)
- [ ] FW-2: LLM call in skeptic_auditor.ts
- [ ] FW-3: Retry logic (max 3x) + timeout (10s)
- [ ] FW-4: Fallback per mode
- [ ] FW-15: Score evaluation (< 0.75 threshold)
- [ ] FW-16: Feedback loop (re-invoke issues.init after fixes)
- [ ] FW-17: Retry limit + escalation

**Expected Timeline**: Phase 2 (starts after P1 config complete)

### WIP Manager Enhancements
**File**: `.pi/extensions/omnitool/wip-manager/manager.ts`

**Current**:
- issues.init: ✓ creates ledger
- issues.update_status: ✓ appends log
- issues.transition: ✓ appends log
- Sparse checkout: ✗ missing

**Missing**:
- [ ] FW-11: Core Set definition
- [ ] FW-12: `wip.clone` with sparse-checkout init + add
- [ ] FW-13: Test sparse-checkout (macOS/Linux)
- [ ] FW-14: Worktree cleanup on abort

**Expected Timeline**: Phase 5 (parallel to P2)

### Config System (Mode Gating)
**File**: `.pi/extensions/omnitool/config.ts` (NEW)

**Current**:
- Does not exist

**Missing**:
- [ ] FW-5: Create config.ts with mode enum (DEBUG, ENFORCE, STRICT)
- [ ] FW-6: Implement mode check in orchestrator/gatekeeper
- [ ] FW-7: Audit rules for mode-specific behavior

**Expected Timeline**: Phase 1 (prerequisite for P2)

---

## 🔌 Integration Points (Status Check)

| Integration | File | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Tool Registration in Pi** | omnitool/index.ts | ✓ LIVE | `pi.registerTool()` call present |
| **Tool_call Interceptor Hook** | omnitool/index.ts | ✓ LIVE | `pi.on("tool_call")` present |
| **Tool Surface Lockdown (RULE-12)** | omnitool/index.ts | ✓ LIVE | `pi.setActiveTools(["omnitool"])` present |
| **Gatekeeper Invocation** | omnitool/index.ts | ✓ LIVE | `gatekeeper.intercept()` called |
| **Audit Logging** | omnitool/index.ts | ✓ LIVE | `appendAudit()` called |
| **Negotiation Dispatch** | omnitool/index.ts | ⚠ UNCLEAR | `guardrail` action proxy exists; verify wiring |
| **ExpectationService** | orchestrator.ts | ✓ LIVE | Passed to constructor |
| **NegotiationManager** | orchestrator.ts | ⚠ UNCLEAR | Constructor param; usage not verified |
| **FinalizeChecker** | orchestrator.ts | ⚠ UNCLEAR | Constructor param; usage not verified |

---

## 🧪 Test Matrix Status

**Total Tests Required**: 14 (T-1 through T-14)  
**Implemented**: Unknown (Phase 0 will determine)  
**Passing**: Unknown (Phase 0 will determine)

### Test Categories
- **RULE-4**: T-1, T-2, T-3, T-4, T-5 (5 tests)
- **RULE-11**: T-6, T-7, T-8 (3 tests)
- **RULE-12**: T-9, T-10 (2 tests)
- **Ledger**: T-11, T-12, T-13, T-14 (4 tests)

**Phase 0 Action**: Run `npm test`, document coverage

---

## 🎯 Exit Criteria (Before Marking COMPLETE)

### Per Phase
- **P0**: All tests run; results documented; UNC-4, UNC-5 resolved
- **P1**: config.ts exists; mode system integrated; sessionId context passing works
- **P2**: RULE-4 multi-step validation complete; auditor LLM call integrated; T-1 to T-5 passing
- **P3**: RULE-11 verified; T-6 to T-8 passing
- **P4**: RULE-12 verified; T-9 to T-10 passing
- **P5**: Sparse checkout working; worktree cleanup functional
- **P6**: Negotiation/Resolution proxy wired; E2E test passing
- **P7**: Ledger tests T-11 to T-14 passing
- **P8**: Docs updated; graduation protocol documented
- **P9**: All 14 tests passing; AC coverage 100%; exit evidence artifacts complete

### Hard AC Exit Evidence
- [ ] **EV-1**: Rule parity table (rules_definition.ts ↔ gatekeeper-rules.ts)
- [ ] **EV-2**: Tool surface dump (only omnitool registered)
- [ ] **EV-3**: Write-policy test (full-write existing file blocked)
- [ ] **EV-4**: Ledger sample (blocked + allowed calls)
- [ ] **EV-5**: Docs parity (legacy refs removed)

---

## 📋 Known Risks & Technical Debt

| Risk | Likelihood | Impact | Mitigation | Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **Auditor unavailable (LLM timeout/API down)** | HIGH | RULE-4 issues pass unchecked | FW-3, FW-4: Retry + fallback per mode | P2 |
| **Session ID confusion (hardcoded SESSION_UNKNOWN)** | MEDIUM | Expectations not isolated per user | FW-30, FW-31: Integrate Pi ctx | P1 |
| **Orchestrator fail-open (error handler allows)** | MEDIUM | Silent recovery of guardrail blocks | FW-6: Mode system (fail-closed in ENFORCE) | P1 |
| **Large repo clones (no sparse checkout)** | MEDIUM | Slow WIP init; disk bloat | FW-12, FW-13: Sparse checkout implementation | P5 |
| **No graduation protocol (manual git required)** | LOW | User error; audit trail break | FW-18, FW-19: Implement squash-and-push | P8 |
| **Negotiation pathway unclear (untested)** | MEDIUM | Blocked users can't resolve expectations | FW-21, FW-22, FW-23: Wire + test | P6 |
| **Audit ledger no versioning** | LOW | Future schema migrations risky | FW-8, FW-9: Add version field | P1 |
| **Test coverage unknown** | HIGH | AC exit evidence incomplete | FW-27, FW-28: Run full suite; implement missing | P0, P9 |

---

## 🚀 Activation Checklist (When Dev Complete)

- [ ] All 14 tests passing
- [ ] All 31 FW work items completed
- [ ] All 5 exit evidence artifacts generated
- [ ] RULE-4 auditor LLM call verified working
- [ ] Sparse checkout verified on macOS + Linux
- [ ] Mode system tested (DEBUG vs. ENFORCE)
- [ ] Negotiation/Resolution pathway tested E2E
- [ ] Docs updated; legacy refs removed
- [ ] Graduation protocol tested
- [ ] AC coverage 100%

**Once complete**: Mark issue GUARDRAIL-008 as **READY_FOR_GRADUATION**; prepare for user graduation command.

---

## 📞 Decision Points Awaiting Resolution

1. **UNC-4**: Which env var for mode system? (Proposed: `GUARDRAIL_MODE`)
2. **UNC-5**: Is `git sparse-checkout` v2.37+ available in deployment environment?
3. **FW-1**: What is exact auditor interface contract (score range, failure codes, timeout)?
4. **FW-18**: How should graduation command work? (Git stash? Worktree state? Squash strategy?)

---

## 📖 Cross-References

- **GUARDRAIL-008 Issue**: `issues/active/GUARDRAIL-008-wip-consolidation-and-issue-quality-gates.md`
- **WIP Ledger**: `wip/guardrail-008/BUDDY.md` (contains detailed 9-phase plan)
- **Guardrails Architecture**: `memory/guardrails/ARCHITECTURE.md`
- **Guardrails Operational Model**: `memory/guardrails/OPERATIONAL_STATUS.md`
- **AGENTS.md Protocol**: `AGENTS.md` (WIP procedures)

---

## 🔄 Update Cadence

This document is updated:
- After each phase completion (mark checkboxes, record blockers)
- When new mitigations are deployed (add to section 2)
- When test results change (update section 5)
- When integration points shift (update section 4)

**Next Update**: After Phase 0 completion (expected 2026-06-18)

---

*Maintained by: Buddy + ANA + us (collaborative)*  
*Status*: **IN DEVELOPMENT** (Phases 0-9)

---

## 📌 CRITICAL ADDITION (2026-06-17): OMNITOOL_STANDARD.md Gap

### Gap 9: OMNITOOL_STANDARD.md Aspirational, Not Aligned with Implementation

**What Happened**: OMNITOOL_STANDARD.md was written as a vision document listing desired verbs (index, fetch, search, knowledge, note, draft, amend, archive, audit, graduate). GUARDRAIL-008 implements a different dispatch structure (call, list, search, wip, guardrail with subActions) and adds new systems (guardrails, expectations) not mentioned in the standard.

**Deviation**:
- STANDARD verbs: index, fetch, search, knowledge, note, draft, amend, archive, audit
- GUARDRAIL-008 actions: call, list, search, wip, guardrail
- Only "search" overlaps
- Dispatch nesting different (action vs. action + subAction)

**Impact**: 
- Next agent might ask "where's the `fetch` action?" or "why is dispatch structure different?"
- Spec/reality divergence causes confusion
- OMNITOOL_STANDARD.md needs updating as part of AC completion

**Resolution**: 
- AC-11 through AC-15 (new acceptance criteria) require updating OMNITOOL_STANDARD.md
- Phase 8 (Documentation) or Phase 9 (Final) timeline
- Update includes: actual dispatch structure, guardrails system, WIP manager, deferred verbs list

