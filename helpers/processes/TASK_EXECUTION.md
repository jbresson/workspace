# TASK_EXECUTION.md
## Optimal Complex Task Lifecycle

A validation-centric procedure for navigating complex tasks while maintaining trim context. Assumes no tool exists—focuses on cognitive flow and decision discipline.

---

## Phase 0: Crystallization
**Before touching code or caches.**

### Define Success Explicitly
- **Goal**: Plain-language statement of what "done" means.
- **Acceptance Criteria (AC)**: 3–5 testable, concrete conditions (e.g., "API returns 200 under 1000 RPS", "Zero regressions in test suite").
- **Hard Constraints**: Non-negotiable boundaries (e.g., "No Redis", "No schema changes", "Backward compatible").
- **Stake**: This is the North Star. All decisions are validated against it.

### Identify False Win Risks
- What does *thinking* you're done but failing look like? Record it.
- Example: "Risk: Code compiles, tests pass, but perf regresses silently in production."
- This primes you to build checks for those specific blindspots.

### Initialize Registries
- **Uncertainty Registry**: "Does cache layer support streaming? Unknown."
- **Risk Register**: High-level risks and mitigation strategies.
- **Blocker Log**: Will accumulate during task; use as escalation tracker.

---

## Phase 1: Ignition
**Orientation and cache warm-up.**

### Establish Mental Model
1. Decompose the goal into **sub-intents** (e.g., "Fix bug" → "Locate bug root cause" + "Apply fix" + "Add regression test").
2. Map **Task Dependency Graph**: Which sub-tasks depend on others? Which are parallel?
3. Identify **critical path**: The sequence determining minimum completion time.
4. Record the model explicitly; use it to detect when reality diverges.

### Assess Current State
- Scan for existing related work: branches, issues, PRs, unfinished refactors.
- Identify code owners/stakeholders who should be informed.

### Query Historical Context
- Search knowledge base for:
  - Similar problems solved before.
  - Architectural decisions that constrain this task.
  - Past decisions that might conflict with what you're about to do.

### Warm Up Caches
- Preload files strategically (not randomly).
- Prioritize files on the critical path.
- Use hierarchical loading: outline → map → full, as needed.

### Declare Checkpoints
- Decide *in advance* where you'll pause to reflect (e.g., "After reading auth layer, validate mental model").
- Record these; use them as forcing functions.

---

## Phase 2: Cycling
**Execution with continuous validation. Repeat this sub-loop until all sub-tasks complete.**

### Sub-Phase 2a: Navigate (Select Next Work)
1. Check Task Dependency Graph: Are dependencies unblocked?
2. Identify highest-priority unstarted sub-task.
3. Load context for that sub-task (files, symbols, related tests).
4. **State the micro-goal explicitly**: "I'm reading AuthService to understand JWT rotation logic."

### Sub-Phase 2b: Analyze (Gather Signal)
1. Read hierarchically: symbol → outline → map → full as needed.
2. Build a **mental model of this chunk** (document it briefly).
3. Record findings as **hypotheses**, not facts: "*I think* timeout is 30s from line 42. Need to verify."
4. Track uncertainty: Questions you can't answer yet → Uncertainty Registry.

### Sub-Phase 2c: Validate Hypothesis (Pressure Test)
**Before offloading a finding, validate it.**
1. **Cross-reference**: Does this finding contradict anything in knowledge base?
2. **Functional test**: Can you write a minimal test to confirm? (For code-related findings.)
3. **Query dependencies**: Trace callers/callees to see if mental model holds.
4. **Contradiction handling**: If detected, mark finding as "uncertain" or "in conflict". Do *not* confidently archive.

### Sub-Phase 2d: Offload Strategic Information
**Only after validation.** Record to session memory:
- **Decisions**: "We will use Redis for caching because X, Y, Z." (Include reasoning.)
- **Findings**: "Auth timeout is 30s. Verified by test_timeout_behavior()." (Include evidence.)
- **Uncertainty**: "Open question: Does DB pool support streaming? Need DB team input."
- **Progress**: "Completed auth layer analysis. Unblocked: X. Blocked on: Y."

### Sub-Phase 2e: Pressure Check (Sanity Gate)
**Every N iterations or after a major decision, pause:**
1. **Convergence**: Am I moving toward the AC? Measurable progress?
2. **Contradiction Count**: How many unresolved conflicts have accumulated?
3. **Cognitive Load**: Mental model too large? Should consolidate findings now instead of waiting?
4. **Unknowns Drift**: Are new unknowns appearing faster than resolution? (Sign: scope poorly defined or rabbit hole.)
5. **Context Trim**: Are cached files still relevant or should they be evicted?

**Action if flag is red**: 
- Recalibrate task breakdown.
- Resolve critical unknowns.
- Consolidate findings early.
- Escalate blockers.

---

## Phase 3: Decision Audit
**Before cool-down, audit all decisions for reversibility and confidence.**

### Decision Genealogy
For each major decision:
- **Can we change our mind later?**
  - *Reversible*: "Use function A instead of B" → Can be refactored.
  - *Irreversible*: "Add DB column" → Affects schema, migrations, backward compat.
- Mark irreversible decisions for extra scrutiny.

### Reversible Decision Validation
- Ensure reversible decisions were hypothesis-tested.
- If uncertain: Okay—can fix later. Just flag it.

### Irreversible Decision Sign-Off
For each irreversible decision, verify:
- (a) Necessary? (Not a nice-to-have.)
- (b) No alternative that avoids it?
- (c) Team informed (or will be before merge)?
- (d) Rollback/downgrade path considered?

### Contradiction Resolution
- For unresolved contradictions: Make a call. Which is true? Mark the other as obsolete.
- If can't resolve: Escalate as Blocker in knowledge base.

---

## Phase 4: Convergence Proof
**Verify we actually met the AC from Phase 0.**

### AC Checklist
- Go through each AC. Does current work satisfy it?
- If "not yet": What's the gap? Current PR or follow-up work?

### False Win Detection
- Review "False Win Risks" from Phase 0. Did you build checks for those?
- Example: If refactored for performance, add perf regression test?

### Edge Case Sweep
- 10-minute brainstorm: What could break this in production?
- Major edge cases: Fix now or file follow-up issue.

---

## Phase 5: Cool-Down
**Consolidation and archive.**

### Migrate Session → Knowledge
- Take all validated findings/decisions from session memory.
- Migrate to persistent knowledge base with metadata: confidence, evidence, constraints.

### Generate Lineage
For each knowledge entry created/updated, record:
- **Why**: Decision logic, not just the fact.
- **When**: Date, session, PR.
- **Assumptions**: What had to be true for validity.
- **Shelf life**: When to revisit? (e.g., "Revisit if Postgres upgraded".)

### Consolidate Uncertainty
- Unresolved questions → Project Backlog (with priority).
- Blockers → Team Escalations (with owner).
- Assumptions → Risk Register (with mitigation).

### Generate Artifacts
- PR context pack (if applicable).
- Architecture Decision Record (ADR) if pattern introduced.
- Test coverage report (proof AC was met).

### Cleanup
- Delete temp files.
- Reset caches.
- Archive session snapshot.

---

## Phase 6: Retrospective
**Did the procedure itself work? What would we do differently?**

### Procedure Metrics
- How many Pressure Checks executed? How many redirected?
- Contradictions encountered vs. detected before cool-down?
- % of unknowns resolved before cool-down?
- Token efficiency: Did offloading keep context trim?

### Failure Analysis
- Were any surprises discovered in cool-down that should have been caught earlier?
- Were False Win Risks actually realized?

### Procedure Adjustment
- For similar future tasks: adjust checkpoint frequency? Sub-task breakdown?
- Was initial AC definition accurate or did scope change significantly?

### Feedback Loop
- Record retrospective insights in knowledge base so future sessions learn.

---

## Quick Reference: Phase Checklist

| Phase | Primary Gate | Output |
|-------|---|---|
| **0. Crystallization** | AC defined + Constraints clear | Goal contract + Risk registry |
| **1. Ignition** | Mental model stable + Caches warm | Task graph + Checkpoints |
| **2. Cycling** | All sub-tasks complete + Pressure checks passing | Validated findings + Decisions |
| **3. Decision Audit** | All irreversible decisions signed off + Contradictions resolved | Decision genealogy |
| **4. Convergence Proof** | AC checklist green + Edge cases addressed | Coverage proof |
| **5. Cool-Down** | All session findings migrated + Artifacts generated | Persistent knowledge |
| **6. Retrospective** | Procedure metrics collected | Feedback for future sessions |

---

## Core Principles

1. **Validation-centric**: Assume findings are wrong until proven right. Pressure-test before offloading.
2. **Explicit decision discipline**: Record *why*, not just *what*. Reversible vs. irreversible matters.
3. **Early contradiction detection**: If you find it conflicts with something you know, don't ignore it.
4. **Uncertainty is first-class**: Open questions are tracked, prioritized, and escalated.
5. **Progress is measurable**: Pressure checks and convergence proof ensure forward motion toward AC.
6. **Procedure learns**: Retrospective feeds back into how future tasks are executed.

---

---

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

