# Backlog Issue Index

## Quick Reference

| Issue | Phases | Dependencies |
|---|---:|---|
| **ENG-001** | 7 | ← EXT-001 (validator) |
| **ENG-002** | 6 | ← ISSUE-001 (process suite) |
| **EXT-002** | 9 | None (standalone) |
| **EXT-003** | 10 | ← DEP-001 (deprecation) |
| **EXT-005** | 6 | ← EXT-003 (omnitool kernel) |
| **EXT-006** | 7 | ← EXT-003 (omnitool kernel) |
| **EXT-007** | 3 | ← EXT-003, EXT-005 |
| **EXT-008** | 4 | ← DEP-001 (curated CLI pathway) |
| **EXT-009** | 1 | ← EXT-005 |
| **DEP-001** | 6 | None (foundational) |
| **GUARDRAIL-002** | 6 | ← 003, 004, 005 |
| **GUARDRAIL-003** | 8 | None (foundational) |
| **GUARDRAIL-004** | 9 | → 002 |
| **GUARDRAIL-005** | 10 | → 002 |
| **GUARDRAIL-006** | 9 | ← 002, 007 |
| **GUARDRAIL-007** | 10 | ← 003, → 006 |
| **ISSUE-001** | 13 | None (foundational) |
| **ISSUE-001-NEGOTIATOR** | 5 | ← GUARDRAIL-003 |
| **ISSUE-PBGEN-SKILL** | 4 | ← DEP-001, EXT-008 |

---

## Implementation Order (Critical Path)

```text
START
  -> GUARDRAIL-003 (SkepticAuditor)
  -> GUARDRAIL-004 + GUARDRAIL-005
  -> GUARDRAIL-002
  -> GUARDRAIL-007
  -> GUARDRAIL-006
  -> DEP-001
  -> EXT-003 (Omnitool kernel lockdown)
  -> EXT-005 (User-command graduation orchestration)
  -> EXT-006 (HocusFocus)
```

---

## Working Conventions

1. Graduation is **user-command only** (no agent tool-call promotion).
2. WIP hierarchy principle is `wip/<issue>/<repo>` for ledgers/workflow references.
3. Full-write agent pathways are **create-only**; existing files require surgical amend/edit.
4. Core docs describe intended policy state; implementation may be phased via issues.

---

## Statistics

- **Total Issues**: 19
- **Total Phases**: Mixed by issue (see each issue file)
- **Total Sub-Tasks**: Maintained per issue (index does not aggregate)

---

## New / Recently Updated

- **EXT-005**: Multi-repo graduation orchestrator with user-command-only promotion and auditable SHA mapping.
- **EXT-006**: HocusFocus reinjection system in omnitool: token-interval anchors + weighted blocked-attempt accelerators + anti-loop methodology.
- **EXT-007**: Buddy ledger and JSON audit linkage across omnitool workflows.
- **EXT-008**: mrmeseeks curated tool integration (non-generic shell pathway).
- **EXT-009**: Branch preflight hardening follow-up for graduation commands.

---

## Related Files

- Full Summary: `PLANS_SUMMARY.md`
- Completed Tasks: `issues/archive/`
- Active Work: `issues/active/`

---

*Last Updated*: 2026-06-17
