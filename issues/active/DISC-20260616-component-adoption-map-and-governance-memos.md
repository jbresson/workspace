# DISC-20260616 — Component Adoption Map + Governance Discussion Pack

- **Type**: Discussion / design decision packet
- **Created**: 2026-06-16

---

## Context
User requested:
1. Build adoption map from external sweep.
2. Capture in issue.
3. Draft memos for each subject requiring discussion.
4. Clean up stale root-level markdown files in cwd.

Constraints applied:
- `workspace` policy is source of truth.
- External sources used only for cherry-picked components.
- Ignore provider-security deep dive for now.
- Ignore Istio packet.

---

## Adoption Map (Decision-Oriented)

| Component | Source inspiration | Target in workspace | Adopt type | Why | Rollout gate |
|---|---|---|---|---|---|
| Concurrency-safe file mutation queue | pi extensions `withFileMutationQueue` pattern | Tool execution path for mutating tools (`edit/write/safe_*` flow) | **Adopt** | Prevent lost updates from parallel tool calls or hooks | Regression test: concurrent writes to same path preserve both edits or deterministic reject |
| Output/context budgets (configurable) | pi truncation + compaction model | Task execution + tool output handling | **Adapt** | Token and context control without forcing global policy | Feature flag OFF by default when no budgets configured |
| Session durability model | durable harness notes | Per-project sessions scoped by branch/issue | **Adapt** | Recovery + auditability aligned to current workflow model | Recovery policy defined (`mark_interrupted` default), session key schema approved |
| Eval/Fix separated rule engine | manman architecture pattern | Guardrails/validation pipelines and future lint/correction automations | **Discuss then adapt** | Clean dry-run/propose/apply separation; safer automations | Shared understanding memo approved + pilot workflow selected |
| Lifecycle lock/start/stop gates | scheduled-jobs lifecycle model | Long-running task orchestration + guardrail expectation lifecycle | **Identify & adapt** | Prevent retry loops, clarify terminal states, improve observability | Explicit state machine documented; timeout/retry semantics approved |
| OpenSpec requirements flow | opencode openspec patterns | Candidate for selective use in process-heavy changes | **Discuss** | Strong scenario contracts; may add overhead | Scope boundary decision: mandatory domains vs optional domains |
| Trust-gating extension loading | pi `project_trust` event model | Extension/resource loading boundary | **Discuss** | Strong safety boundary but may increase friction | UX + non-interactive mode policy approved |

---

## Critical path
1. Approve adoption envelope (what is in/out now).
2. Decide budget architecture defaults + utilization semantics.
3. Approve session keying scheme for per-project/branch/issue durability.
4. Review eval/fix engine memo and choose first pilot use-case.
5. Define lifecycle-gate insertion points and state machine.
6. Decide OpenSpec/trust-gating policy scope.

---

## False-win risks
1. **Queue added but bypassed by custom tools** → mandate queue wrapper for all mutating tool handlers.
2. **Budgets configured but effectively inert** → add runtime metric: truncation count + compaction trigger count.
3. **Session durability implemented but recovery unsafe** → enforce non-idempotent call no-auto-retry.
4. **Eval/fix introduced but apply phase implicit** → hard split `evaluate -> propose -> explicit apply`.
5. **Lifecycle gates documented but not wired to executor transitions** → transition audit asserts required state edges.

---

## Discussion memos linked
- `MEMO-openspec-adoption-boundary.md`
- `MEMO-trust-gating-boundary.md`
- `MEMO-budget-utilization-architecture.md`
- `MEMO-eval-fix-engine-primer.md`
- `MEMO-lifecycle-gates-utilization-map.md`

---

## Cleanup actions performed
Root stale markdown docs archived from cwd root to:
- `archive/root-md/2026-06-16/`

Files moved:
- `CAPTURE_SUMMARY.md`
- `RESEARCH_SKILLS_DELIVERY.md`
- `RESEARCH_SKILLS_CHECKLIST.md`
- `RESEARCH_SKILLS_COMPLETE_INDEX.md`
- `TASK_GUARDRAILS_EXPLORATION.md`
- `PROCESS_ANALYSIS.md`
- `GUARDRAILS_INDEX.md`
- `GUARDRAILS_REVIEW.md`

---

## Open decisions required
1. OpenSpec: where mandatory vs optional?
2. Trust-gating: global-only or project-level overrides? behavior in RPC/CI?
3. Budget model: warn-only, hard-enforce, or mixed policy?
4. Eval/fix pilot: which subsystem first?
5. Lifecycle gates: which executor transitions to enforce first?
