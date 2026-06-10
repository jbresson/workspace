# TASK_EXECUTION.md
## Optimal Complex Task Lifecycle

A validation-centric procedure for navigating complex tasks while maintaining trim context. Assumes no tool exists—focuses on cognitive flow and decision discipline.

---

## Phase 0: Crystallization
**Before touching code or caches.**

### Define Success Explicitly
- **Goal**: Plain-language "done" statement.
- **Acceptance Criteria (AC)**: 3–5 testable conditions (e.g., "API 200 <1000 RPS", "Zero regressions").
- **Hard Constraints**: Boundaries (e.g., "No Redis", "No schema changes").
- **Use**: North Star for all decisions.

### Identify False Win Risks
- Record blindspots: "What does thinking done but failing look like?"
- Example: "Code compiles, tests pass, but perf regresses in production."
- Build checks for these before work begins.

### Initialize Registries
- **Uncertainty Registry**: Open questions (e.g., "Cache streaming support?").
- **Risk Register**: High-level risks + mitigations.
- **Blocker Log**: Escalation tracker.

---

## Phase 1: Ignition
**Orientation and cache warm-up.**

### Establish Mental Model
1. Decompose goal → sub-intents (e.g., "Fix bug" → "Root cause" + "Fix" + "Test").
2. Map **Task Dependency Graph**: Dependencies? Parallel work?
3. **Critical path**: Sequence for minimum time.
4. Record; detect divergence.

### Assess Current State
- Scan: branches, PRs, issues, unfinished refactors.
- Identify owners/stakeholders.

### Query Historical Context
- Similar problems solved?
- Architectural constraints?
- Conflicting past decisions?

### Warm Up Caches
- Preload: critical path files only.
- Hierarchical: outline → map → full.

### Declare Checkpoints
- Decide in advance: pause points (e.g., "After auth layer, validate model").
- Use as forcing functions.

---

## Phase 2: Cycling
**Execution with continuous validation. Repeat this sub-loop until all sub-tasks complete.**

### Operational Modes
1. **Discovery**: Exploration, locate code, form hypotheses. Fast, lower precision. `Navigate` → `Analyze`.
2. **Confirmation**: Root cause/solution found. Full loop: `Validate` → `Offload` (mandatory).

---

### Sub-Phase 2a: Navigate (Select Next Work)
1. Check dependencies: unblocked?
2. Identify highest-priority unstarted sub-task.
3. Load context (files, symbols, tests).
4. State micro-goal explicitly.

### Sub-Phase 2b: Analyze (Gather Signal)
1. Read hierarchically: symbol → outline → map → full.
2. Build mental model; document briefly.
3. Record findings as hypotheses (e.g., "*Think* timeout 30s [line 42], verify.").
4. Track unknowns → Uncertainty Registry.

### Sub-Phase 2c: Validate Hypothesis (Pressure Test)
**Mandatory in Confirmation Mode.**
1. Cross-reference: Contradicts knowledge base?
2. Functional test: Write minimal test to confirm?
3. Query dependencies: Trace callers/callees.
4. Contradiction found? Mark uncertain/in-conflict. Do not archive.

### Sub-Phase 2d: Offload Strategic Information
**Mandatory in Confirmation Mode.** Record to session:
- **Decisions**: `[REVERSIBLE]` or `[IRREVERSIBLE]` + reasoning.
- **Findings**: Include evidence (e.g., "Auth timeout 30s (test_timeout_behavior).").
- **Uncertainty**: Open questions with owners.
- **Progress**: Completed tasks, blockers.

### Sub-Phase 2e: Pressure Check (Sanity Gate)
**Every N iterations or after major decision:**
1. **Convergence**: Progress toward AC?
2. **Contradictions**: Unresolved conflicts?
3. **Cognitive Load**: Model too large?
4. **Unknowns Drift**: New unknowns > resolutions? (Scope/rabbit hole?)
5. **Context Trim**: Cache still relevant?

**If red**: Recalibrate breakdown, resolve critical unknowns, consolidate, escalate blockers.

---

## Phase 3: Decision Sign-off
**Before cool-down, perform a final audit of the decisions recorded during Cycling.**

### Review Irreversible Decisions
For every `[IRREVERSIBLE]` decision:
- **Necessity**: Absolutely required?
- **Alternatives**: Lower-impact option considered + rejected?
- **Communication**: Team informed (or will be pre-merge)?
- **Mitigation**: Rollback path documented?

### Final Contradiction Resolution
- Remaining "uncertain"/"in conflict" findings: Final call or escalate as Blocker.

### Reversible Decision Validation
- Foundational decisions (reversible or not) must be validated.
- Scan for "assumptions" or "unvalidated".
- **If unvalidated**: Return to Phase 2c (Validate Hypothesis). Do not proceed to Cool-Down with unfounded assumptions.

---

## Phase 4: Convergence Proof
**Verify we actually met the AC from Phase 0.**

### AC Checklist
- Each AC satisfied? If not: gap? Current PR or follow-up?

### False Win Detection
- Review Phase 0 "False Win Risks". Checks built? (e.g., perf regression tests?)

### Edge Case Sweep
- Brainstorm: What breaks in production? Fix now or follow-up.

---

## Phase 5: Cool-Down
**Consolidation and archive.**

### Migrate Session → Knowledge
- Validated findings/decisions → persistent knowledge base.
- Include: confidence, evidence, constraints.

### Generate Lineage
For each knowledge entry, record:
- **Why**: Decision logic.
- **When**: Date, session, PR.
- **Assumptions**: Validity preconditions.
- **Shelf life**: Revisit trigger (e.g., "Postgres upgrade").

### Consolidate Uncertainty
- Unresolved questions → Backlog (prioritized).
- Blockers → Escalations (with owner).
- Assumptions → Risk Register (with mitigation).

### Generate Artifacts
- PR context pack.
- ADR (if pattern introduced).
- Test coverage report (AC proof).

### Cleanup
- Delete temp files, reset caches, archive snapshot.

---

## Phase 6: Retrospective
**Did the procedure itself work? What would we do differently?**

### Procedure Metrics
- Pressure Checks executed/redirected?
- Contradictions encountered vs. detected pre-cool-down?
- % unknowns resolved pre-cool-down?
- Token efficiency: Context trim via offloading?

### Failure Analysis
- Surprises in cool-down vs. caught earlier?
- False Win Risks realized?

### Procedure Adjustment
- Checkpoint frequency? Sub-task breakdown?
- Initial AC accurate or scope drifted?

### Feedback Loop
- Record insights in knowledge base for future sessions.

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

1. **Validation-centric**: Assume findings wrong until proven. Pressure-test before offload.
2. **Explicit decision discipline**: Record *why*, not just *what*. Reversible vs. irreversible matters.
3. **Early contradiction detection**: Flag conflicts immediately; don't ignore.
4. **Uncertainty is first-class**: Track, prioritize, escalate open questions.
5. **Progress is measurable**: Pressure checks + convergence proof → forward motion.
6. **Procedure learns**: Retrospective feeds back into future tasks.

---