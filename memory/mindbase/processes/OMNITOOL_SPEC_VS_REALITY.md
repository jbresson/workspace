# OmniTool: Spec vs. Reality Gap (2026-06-17)

**Purpose**: Document all deviations from OMNITOOL_STANDARD.md and GUARDRAIL-008 spec to prevent confusion during development.

**Last Updated**: 2026-06-17  
**Scope**: Current implementation gaps, planned mitigations, and timelines for alignment

---

## ✓ Spec-Aligned (No Gaps)

| Spec Promise | Reality | Status | Notes |
| :--- | :--- | :--- | :--- |
| Single tool entry (omnitool only) | ✓ Implemented | LIVE | RULE-12 enforced in omnitool/index.ts |
| Tool registration in Pi | ✓ Implemented | LIVE | `pi.registerTool()` call present |
| Tool_call interceptor hook | ✓ Implemented | LIVE | `pi.on("tool_call")` present |
| Audit ledger appended-to | ✓ Implemented | LIVE | tool_call.json updated on each call |
| Rules 1-12 schema defined | ✓ Implemented | LIVE | rules_definition.ts complete |
| Gatekeeper 2-step filter | ✓ Implemented | LIVE | Exists in gatekeeper-rules.ts |
| WIP init creates ledger | ✓ Implemented | LIVE | wip-manager/manager.ts |
| issues.* subActions exist | ✓ Implemented | LIVE | init, update_status, transition coded |

---

## ✗ Spec Deviations (Major Gaps)

### Gap 1: Auditor LLM Integration Missing

**Spec Says**:
> "Auditor agent call required for RULE-4 hard checks pass → auditor score < 0.75 → blocked with requiredFixes."
> – GUARDRAIL-008 section "RULE-4: Issue Quality Gate"

**Reality**:
- Hard checks only (dedup, delta, evidence, ownership, AC)
- No actual LLM call to auditor
- `skeptic_auditor.ts` exists but incomplete
- No retry logic
- No timeout handling
- No fallback behavior on auditor unavailable

**Mitigation** (interim):
- All issues pass hard checks (auditor disabled)
- Audit log: "RULE-4: auditor not yet integrated; hard checks passed"
- Risk: Low-quality issues not caught by values-alignment check

**Exit Plan**:
- FW-1: Define auditor interface (in Q2 phase review)
- FW-2: Implement LLM call in skeptic_auditor.ts
- FW-3: Add retry logic (max 3x, 10s timeout)
- FW-4: Add fallback per mode (fail-open in DEBUG, fail-closed in ENFORCE)
- Timeline: Phase 2 (starts after P1 config complete)

**Resolution Trigger**: When skeptic_auditor.ts has actual LLM call + retry logic + test coverage (T-4, T-5 passing)

---

### Gap 2: Mode System Not Implemented

**Spec Says**:
> "D-5: Orchestrator fail-open policy (dev mode) — fail-open in development/debug to accelerate bring-up. Strong recommendation: explicit mode-gated behavior (DEBUG fail-open + loud audit; stricter modes fail-closed or user-prompt fallback)."
> – GUARDRAIL-008 session decisions

**Reality**:
- No config system for mode selection
- No env var (e.g., GUARDRAIL_MODE)
- Orchestrator hardcoded fail-open (line 23: `return { allowed: true }` on error)
- Gatekeeper always blocks violations (no mode check)

**Mitigation** (interim):
- Fail-open in orchestrator (availability over safety during dev)
- Loud audit (console.error + ledger entry)
- Risk: Guardian blocks may silently recover on exception

**Exit Plan**:
- FW-5: Create `.pi/extensions/omnitool/config.ts` with mode enum
- FW-6: Implement mode check in orchestrator + gatekeeper
- FW-7: Document rule behavior per mode
- Timeline: Phase 1 (prerequisite for P2)

**Resolution Trigger**: When config.ts exists + gatekeeper checks mode + tests verify DEBUG vs. ENFORCE behavior

---

### Gap 3: Sparse Checkout Not Implemented

**Spec Says**:
> "AC-10: Sparse Mirroring implemented (Git Sparse Checkout + Core Set)"
> "wip.clone implemented via Git Sparse Checkout with automated Core Set inclusion."
> – GUARDRAIL-008 acceptance criteria

**Reality**:
- `wip.clone` not present in wip-manager/manager.ts
- Full `git clone` would be performed (no sparse filtering)
- No Core Set definition (which files/dirs are mandatory)
- No worktree cleanup on `wip.abort`

**Mitigation** (interim):
- No sparse checkout available; full clones occur if cloning is used
- Audit log: "SPARSE_CHECKOUT: Not implemented; full clone performed"
- Risk: Large repos = slow clone, large disk footprint

**Exit Plan**:
- FW-11: Define Core Set (root `.md` + `.pi/`, `issues/`, `memory/`, `wip/`, `.git/`)
- FW-12: Implement `wip.clone` with sparse-checkout init + add
- FW-13: Test on macOS + Linux (verify Git v2.37+)
- FW-14: Implement worktree cleanup on abort
- Timeline: Phase 5 (parallel to P2)

**Resolution Trigger**: When sparse-checkout working on macOS + Linux + test coverage for clone/add_path/abort

---

### Gap 4: Session ID Hardcoded (SESSION_UNKNOWN)

**Spec Says**:
> "Session First: All service methods must accept sessionId as the first parameter."
> – memory/guardrails/OPERATIONAL_STATUS.md

**Reality**:
- omnitool/index.ts line 43: `const guardResult = await gatekeeper.intercept("SESSION_UNKNOWN", ...)`
- sessionId not extracted from Pi context
- All blocked calls logged under same "SESSION_UNKNOWN" session
- Expectations not isolated per user/session

**Mitigation** (interim):
- Hardcoded sessionId for all calls
- Audit log distinguishes calls by timestamp + tool name, but not by session
- Risk: Can't distinguish which user triggered a block

**Exit Plan**:
- FW-30: Verify Pi context provides ctx.sessionId (or equivalent)
- FW-31: Replace "SESSION_UNKNOWN" with actual session context
- Timeline: Phase 1 (Config, before P2)

**Resolution Trigger**: When omnitool/index.ts extracts sessionId from Pi + fallback defined if unavailable

---

### Gap 5: Graduation Protocol Not Implemented

**Spec Says**:
> "No change enters the real workspace without human intervention. Principle: graduation is always a user-only command pathway (never an agent tool-call avenue)."
> – AGENTS.md section "The Law of Graduation"

**Reality**:
- No user command defined in omnitool or wip-manager
- No squash-and-push logic
- User must manually execute git commands
- No auditable commit provenance from omnitool

**Mitigation** (interim):
- User performs manual `git stash`, `git rebase --interactive`, `git push` (external to omnitool)
- No audit trail for graduation process
- Risk: User error; commit history cleanliness not guaranteed

**Exit Plan**:
- FW-18: Define user graduation command syntax
- FW-19: Implement squash-and-push utility in wip-manager or external CLI
- FW-20: Document graduation prompt + flow in AGENTS.md
- Timeline: Phase 8 (Docs & Graduation)

**Resolution Trigger**: When graduation command documented in AGENTS.md + squash-and-push tested + user can execute graduation

---

### Gap 6: Negotiation/Resolution Integration Unclear

**Spec Says**:
> "AC-5: Guardrail lifecycle proxied under omnitool namespace. resolve_guardrail, negotiate_guardrail tools proxied under omnitool."
> – GUARDRAIL-008 AC

**Reality**:
- negotiation_manager.ts exists
- finalize_checker.ts exists
- Integration with omnitool dispatch not verified
- No test for E2E negotiation flow (block → negotiate → resolve)

**Mitigation** (interim):
- Guardrail blocks issued
- No user-facing pathway to negotiate/resolve blocks
- Risk: Blocked users stuck; no recovery pathway

**Exit Plan**:
- FW-21: Verify negotiation_manager.ts wired into omnitool dispatch
- FW-22: Verify finalize_checker.ts wired into omnitool dispatch
- FW-23: Implement E2E test (block → negotiate → resolve)
- Timeline: Phase 6 (depends on P2 RULE-4 complete first)

**Resolution Trigger**: When E2E negotiation test passing + users can resolve expectations

---

### Gap 7: Audit Ledger No Versioning

**Spec Says**:
> "FW-8: Define formal tool_call.json schema with version field (v1.0 currently)"
> – GUARDRAIL-008 work items

**Reality**:
- tool_call.json exists and is appended-to
- No version field in schema
- No migration path for breaking changes
- appendAudit() function in omnitool/index.ts doesn't include version

**Mitigation** (interim):
- Current format: `{ action, params, status, ... }`
- No versioning; future schema changes will break old logs
- Risk: Can't migrate logs if schema changes

**Exit Plan**:
- FW-8: Add version field to schema (v1.0)
- FW-9: Update appendAudit() to include version + timestamp
- FW-10: Create migration utility (for future use)
- Timeline: Phase 1 (Config)

**Resolution Trigger**: When version field present in all new ledger entries + migration utility drafted

---

### Gap 8: Test Suite Coverage Unknown

**Spec Says**:
> "Test Matrix (must pass before status READY_FOR_GRADUATION)
> - [ ] **T-1**: RULE-4 duplicate issue attempt → blocked
> - [ ] **T-2**: RULE-4 currentState == targetState → blocked
> ..."
> – GUARDRAIL-008 test matrix (14 total tests)

**Reality**:
- Package.json lists test scripts
- Unclear which of T-1 to T-14 are implemented
- No documented test results
- Test coverage unknown

**Mitigation** (interim):
- Partial test coverage; insufficient for AC exit evidence
- Risk: Unknown failures; AC completeness uncertain

**Exit Plan**:
- FW-27: Run `npm test`; document results
- FW-28: Implement missing tests (if any)
- FW-29: Generate coverage report
- Timeline: Phase 0 (Validation), Phase 9 (Final Testing)

**Resolution Trigger**: When all 14 tests exist, pass, and coverage report generated

---

## ⚠️ Intentional Deviations (Approved Design Changes)

### Deviation 1: Fail-Open Default in Dev (Approved)

**Spec Intent**: Flexible mode system (fail-open in DEBUG, fail-closed in ENFORCE, STRICT).

**Actual Decision (D-5)**: Temporary fail-open in orchestrator during development for availability.

**Status**: ✓ APPROVED (D-5 explicitly states this)  
**Timeline**: Convert to mode-gated (P1, FW-6) once config system exists  
**No Resolution Needed**: This is intended interim behavior

---

### Deviation 2: Hard Checks Only for RULE-4 (Pending Auditor)

**Spec Intent**: Auditor integration required for values alignment + issue quality.

**Actual Decision (interim)**: Hard checks only until auditor LLM call integrated.

**Status**: ✓ APPROVED (D-4 documented; FW-1 to FW-4 planned)  
**Timeline**: Auditor integration Phase 2 (P2)  
**No Resolution Needed**: This is intentional interim state with exit plan

### Gap 9: OMNITOOL_STANDARD.md Not Updated with Implementation Details

**Spec Says**:
> "OMNITOOL_STANDARD.md defines target operating principles."
> – OMNITOOL_STANDARD.md itself

Implied: GUARDRAIL-008 should update OMNITOOL_STANDARD.md with actual implementation.

**Reality**:
- OMNITOOL_STANDARD.md lists verbs: index, fetch, search, knowledge, note, draft, amend, archive, audit, graduate
- GUARDRAIL-008 implements: call, list, search, wip, guardrail (+ subActions)
- **Dispatch structure different**: Standard uses `action: "fetch"`; GUARDRAIL-008 uses `action: "wip", params: { subAction: "issues.init" }`
- **Missing standard verbs**: knowledge, note, archive, audit, index, fetch not implemented
- **New systems not in standard**: Guardrails (Rules 1-12), gatekeeper, expectations, wip-manager schemas

**Mitigation** (interim):
- OMNITOOL_STANDARD.md remains aspirational; actual implementation in GUARDRAIL-008 differs
- Next agent may be confused about dispatch structure (which verbs are available?)
- Risk: Inconsistency between "standard" doc and actual implementation

**Exit Plan**:
- AC-11: Update OMNITOOL_STANDARD.md section "Core Verbs" with actual actions (call, list, search, wip, guardrail)
- AC-12: Document Guardrails System (Rules 1-12, expectations, gatekeeper)
- AC-13: Document WIP Manager lifecycle + schemas
- AC-14: Explicitly list deferred standard verbs (knowledge, note, archive, audit, index, fetch) as Future/Out-of-Scope
- AC-15: Document graduation protocol
- Timeline: Phase 8 (Docs) or Phase 9 (Final), after all code complete

**Resolution Trigger**: When OMNITOOL_STANDARD.md reflects actual implementation dispatch structure + all AC-11 through AC-15 complete

- **Spec**: `issues/active/GUARDRAIL-008-wip-consolidation-and-issue-quality-gates.md`
- **Implementation Plan**: `wip/guardrail-008/BUDDY.md`
- **Guardrails Operational**: `memory/guardrails/OPERATIONAL_STATUS.md`
- **OmniTool Standard**: `memory/mindbase/processes/OMNITOOL_STANDARD.md`

---

## ✅ Checklist: Before Marking "SPEC ALIGNED"

For each gap (1-8), verify:
- [ ] Implementation code complete
- [ ] Tests passing (relevant T-* tests)
- [ ] Audit log entries added
- [ ] Documentation updated
- [ ] No new gaps introduced
- [ ] Rollback plan (if needed) documented

---

*Maintained by: Buddy + ANA + us*  
*Last Review*: 2026-06-17  
*Next Review*: End of Phase 2 (expected 2026-06-20)
