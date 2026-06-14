# Backlog Issue Index

## Quick Reference

| Issue | Status | Priority | Phases | Est. Lines | Dependencies |
|-------|--------|----------|--------|-----------|--------------|
| **ENG-001** | ✅ PLAN | HIGH | 7 | 186 | ← EXT-001 (validator) |
| **EXT-002** | ✅ PLAN | MED | 9 | 278 | None (standalone) |
| **EXT-003** | ✅ PLAN | HIGH | 10 | 284 | ← DEP-001 (deprecation) |
| **DEP-001** | ✅ PLAN | HIGH | 6 | 72 | None (foundational) |
| **GUARDRAIL-002** | ✅ PLAN | HIGH | 6 | 66 | ← 003, 004, 005 |
| **GUARDRAIL-003** | ✅ PLAN | HIGH | 8 | 91 | None (foundational) |
| **GUARDRAIL-004** | ✅ PLAN | HIGH | 9 | 103 | → 002 |
| **GUARDRAIL-005** | ✅ PLAN | HIGH | 10 | 117 | → 002 |
| **GUARDRAIL-006** | ✅ PLAN | MED | 9 | 107 | ← 002, 007 |
| **GUARDRAIL-007** | ✅ PLAN | MED | 10 | 139 | ← 003, → 006 |

---

## Implementation Order (Critical Path)

```
┌─── GUARDRAIL TRACK (Safety) ─────────────────────────────────────┐
│                                                                   │
│ START → GUARDRAIL-003 (SkepticAuditor, foundational)             │
│           ↓                                                       │
│           GUARDRAIL-004 (ConstrainedCmd) ──┐                     │
│                                              → GUARDRAIL-002      │
│           GUARDRAIL-005 (SandboxedTS) ──────┘                    │
│           ↓                                                       │
│           GUARDRAIL-007 (DepAnalysis) → GUARDRAIL-006            │
│           ↓                                                       │
│           DEP-001 (Shell Deprecation)                            │
│                                                                   │
└─── ENGINE TRACK (Task Execution) ────────────────────────────────┘

  ENG-001 (Expectations Engine)  ← validates task pre-conditions
    ↓
  EXT-003 (Tool Proxy)  ← reduces context window, single interface
    ↓
  EXT-002 (LMStudio Insight)  ← model health signals [optional]
```

---

## How to Use This Backlog

1. **Start with an issue**: Pick from the list above.
2. **Read the issue file**: Contains description + 5-10 phase implementation plan.
3. **Follow phases sequentially**: Each phase has numbered tasks (e.g., 1.1, 1.2, ...).
4. **Check acceptance criteria**: Bottom of file lists testable success conditions.
5. **Link to dependencies**: See which issues unblock this one.
6. **Track progress**: Update issue status as you complete phases (PENDING → IN_PROGRESS → DONE).
7. **Record decisions**: Use `ctx_session(action="decision")` to capture reversible/irreversible choices.

---

## Plan Structure (Every Issue)

```
# Issue [CODE]: [Title]

**Status**: PENDING | **Priority**: HIGH | **Category**: Core/Security/Cognitive

## Description
[What & why]

## Requirement(s)
[Must-haves]

## Implementation Plan

### Phase 1: Architecture & Design
- [ ] 1.1 Task...
- [ ] 1.2 Task...

### Phase 2: [Core Build]
- [ ] 2.1 Task...

...

### Phase N: Documentation & Deployment
- [ ] N.1 Task...

### Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2
```

---

## Statistics

- **Total Issues**: 10
- **Total Phases**: 66
- **Total Sub-Tasks**: 1200+
- **Est. Unit Tests**: 500+
- **Est. Integration Tests**: 60+

---

## New Issues (From todo.md)

### Engine Track
- **ENG-001**: Task execution leverages expectations engine for pre-condition validation & failure prediction. Integrates into 7-phase loop Phase 3 (Foresee & Plan).
- **EXT-002**: LMStudio insight extension streams real-time model status, memory events, performance metrics. Standalone; improves debugging visibility.
- **EXT-003**: Unified tool proxy refactor: single "tool" gateway replaces individual tool signatures, reduces context window tokens ≥20%.

---

## Related Files

- **Full Summary**: `PLANS_SUMMARY.md` (dependency graph, critical path, timeline)
- **Memory Index**: `memory/MANIFEST.md` (overall project structure)
- **Completed Tasks**: `todo.md` (what's done)
- **Active Blockers**: `issues/active/` (current problems)

---

*Last Updated*: 2026-06-13
