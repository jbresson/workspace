## TOOL IMPLEMENTATION ROADMAP

The following functionality should be moved from "agent instruction" to standalone tools:

### Tier 1: Core Lifecycle Tools (High ROI, Straightforward Implementation)

#### `ctx_define_success()`
**Purpose**: Crystallization phase (Phase 0).
- Input: Goal statement, plain language.
- Output: Structured AC, constraints, false-win-risks registry.
- Logic: Parse goal via NLP/LLM, prompt user for AC/constraints interactively.
- Why tool: Ensures discipline, provides checkpoint reference throughout task.
- Integration: Should create a session record that later tools can reference.

#### `ctx_task_graph()`
**Purpose**: Decompose goal into sub-tasks + dependencies (Phase 1).
- Input: Goal statement, initial codebase scoping (from `ctx_overview`).
- Output: DAG of sub-tasks, critical path, dependency warnings.
- Logic: Analyze codebase structure + goal to infer sub-task breakdown. Use static analysis to detect likely dependencies.
- Why tool: Prevents rabbit holes, guides work prioritization during Cycling.
- Integration: Should feed into Phase 2a (Navigate).

#### `ctx_pressure_check()`
**Purpose**: Real-time validation loop during Cycling (Phase 2e).
- Input: Current session state (findings, decisions, context occupancy).
- Output: Flags (convergence, contradiction count, cognitive load, unknowns drift, cache freshness).
- Logic: Query session memory for contradictions, compare findings to AC, measure token occupancy, analyze uncertainty registry growth.
- Why tool: Automated sentry that prevents "blindly push forward" behavior.
- Integration: Callable every N iterations or on-demand during Phase 2.

#### `ctx_contradiction_detect()`
**Purpose**: Active real-time conflict detection (Phase 2c + 3).
- Input: New finding (hypothesis).
- Output: List of conflicting facts in knowledge base + confidence scores.
- Logic: Semantic search knowledge base for contradictory statements. Highlight reversals or logical conflicts.
- Why tool: Catches conflicts *immediately* instead of waiting for cool-down.
- Integration: Called before offloading findings (Phase 2d).

#### `ctx_decision_genealogy()`
**Purpose**: Classify decisions + reversibility (Phase 3).
- Input: Decision statement + codebase context.
- Output: Reversibility classification (reversible/irreversible/unknown), risk assessment, sign-off checklist.
- Logic: Parse decision, query codebase for downstream impacts (schema changes, public APIs, migrations, etc.). ML/rule-based classification.
- Why tool: Enforces reversibility audit; prevents "oops we can't undo that" discoveries late.
- Integration: Called before merging any major change.

#### `ctx_convergence_proof()`
**Purpose**: Validate AC achievement (Phase 4).
- Input: Original AC (from Phase 0), current codebase/test results, PR diff.
- Output: AC coverage report, gaps, edge case suggestions.
- Logic: Map AC to test coverage, code changes, and functional behavior. Heuristic suggestions for uncovered edge cases.
- Why tool: Prevents false wins; proves victory before shipping.
- Integration: Must pass before Phase 5 cool-down.

---

### Tier 2: Enhancement Tools (Medium ROI, Requires Existing Infrastructure)

#### `ctx_session_query()`
**Purpose**: Slice + filter session state by metadata (Phase 2 + 5).
- Input: Query (e.g., "Decisions affecting /auth", "All blockers", "Uncertain findings").
- Output: Filtered session records.
- Logic: Tag session entries (finding/decision/blocker/uncertainty) + allow semantic/regex/tag-based queries.
- Why tool: Replaces manual grep through session memory. Enables targeted consolidation in cool-down.
- Integration: Should work with `ctx_session` internally.

#### `ctx_assumption_tracker()`
**Purpose**: Record + monitor assumptions throughout task (Phase 2 + 5).
- Input: Assumption statement + shelf-life (when to revisit).
- Output: Assumption registry with expiration dates.
- Logic: Store assumptions, alert when approaching shelf-life, track which assumptions were validated vs. proven wrong.
- Why tool: Ensures assumptions don't silently become stale. Feeds into future retrospectives.
- Integration: Part of cool-down lineage generation (Phase 5).

#### `ctx_false_win_verifier()`
**Purpose**: Check for specific blindspots identified in Phase 0 (Phase 4).
- Input: False-win-risk registry (from Phase 0), PR diff, test results.
- Output: Checklist of risks + whether each was mitigated.
- Logic: For each risk, suggest specific tests/checks needed. Validate those checks were added.
- Why tool: Prevents the exact failure modes identified at the start from sneaking through.
- Integration: Called during Phase 4 convergence proof.

---

### Tier 3: Observability + Learning Tools (Lower ROI, Nice-to-Have)

#### `ctx_procedure_metrics()`
**Purpose**: Procedure audit + retrospective (Phase 6).
- Input: Session log (all phases recorded with timestamps).
- Output: Metrics dashboard: checkpoint hit rate, contradiction detection rate, token efficiency, unknown resolution rate, decision reversibility ratio.
- Logic: Parse session timeline, compute statistics, generate trends over multiple sessions.
- Why tool: Enables data-driven procedure optimization. Shows which checkpoints actually help.
- Integration: Called during Phase 6; results feed into knowledge base for future tasks.

#### `ctx_unknown_priority()`
**Purpose**: Rank unknowns in Uncertainty Registry by impact (Phase 1 + 2 + 5).
- Input: Uncertainty registry, task graph, current findings.
- Output: Sorted list of unknowns by: (a) impact on AC, (b) effort to resolve, (c) blocking downstream work.
- Logic: Dependency analysis + heuristic scoring (impact/effort ratio).
- Why tool: Guides which unknowns to resolve during Cycling vs. defer to backlog.
- Integration: Informs Phase 2a (Navigate) prioritization.

---

### Implementation Priority

**Must-Have (MVP)**:
1. `ctx_define_success()` — Crystallization discipline.
2. `ctx_task_graph()` — Sub-task breakdown.
3. `ctx_pressure_check()` — Real-time sentry.
4. `ctx_contradiction_detect()` — Conflict detection.
5. `ctx_convergence_proof()` — Victory proof.

**Should-Have (V1.5)**:
6. `ctx_decision_genealogy()` — Reversibility audit.
7. `ctx_session_query()` — Session filtering.

**Nice-to-Have (V2+)**:
8. `ctx_assumption_tracker()` — Assumption lifecycle.
9. `ctx_false_win_verifier()` — Blindspot checks.
10. `ctx_procedure_metrics()` — Retrospective data.
11. `ctx_unknown_priority()` — Unknown ranking.

---

### Integration Points with Existing lean-ctx Tools

- **`ctx_define_success()`** → Creates a session record queryable by future `ctx_session` calls.
- **`ctx_task_graph()`** → Leverages `ctx_graph` (code dependency analysis) to infer task dependencies.
- **`ctx_pressure_check()`** → Queries `ctx_session` (findings), `ctx_knowledge` (for contradictions), `ctx_ledger` (context occupancy).
- **`ctx_contradiction_detect()`** → Uses `ctx_semantic_search` on knowledge base + `ctx_knowledge` "gotcha" feature.
- **`ctx_decision_genealogy()`** → Uses `ctx_impact` to trace downstream effects of decisions.
- **`ctx_convergence_proof()`** → Integrates with test runners + `ctx_verify` for validation snapshot.
- **`ctx_session_query()`** → Native extension of `ctx_session` query capabilities.
- **`ctx_assumption_tracker()`** → Stores in `ctx_knowledge` with expiration metadata.

