# TASK_EXECUTION_WITH_TOOLS.md

## Rapid Index
- [Phase 0: Crystallization](#phase-0-crystallization) $\rightarrow$ Define Success & Risks
- [Phase 1: Ignition](#phase-1-ignition) $\rightarrow$ Orientation & Cache Warmup
- [Phase 2: Cycling](#phase-2-cycling) $\rightarrow$ Execute & Validate (Discovery/Confirmation)
- [Phase 3: Decision Sign-off](#phase-3-decision-sign-off) $\rightarrow$ Audit Irreversible Decisions
- [Phase 4: Convergence Proof](#phase-4-convergence-proof) $\rightarrow$ Verify AC
- [Phase 5: Cool-Down](#phase-5-cool-down) $\rightarrow$ Consolidate Knowledge
- [Phase 6: Retrospective](#phase-6-retrospective) $\rightarrow$ Procedure Audit

---


A validation-centric procedure for navigating complex tasks while maintaining trim context, augmented by `lean-ctx-helpers`.

---

## Phase 0: Crystallization
**Before touching code or caches.**

### Define Success Explicitly
- **Goal**: Plain-language "done" statement.
- **Acceptance Criteria (AC)**: 3–5 testable conditions.
- **Hard Constraints**: Boundaries.
- **Use**: North Star for all decisions.

### Identify False Win Risks
- Record blindspots: "What does thinking done but failing look like?"
- Build checks for these before work begins.

### Initialize Registries
Prevent cognitive drift by actively tracking the following in the session (L2):
- **Uncertainty Registry**: Open questions and technical unknowns $\rightarrow$ `logUncertainty(question)`.
- **Risk Register**: High-level risks + mitigation strategies $\rightarrow$ `logRisk(risk, mitigation)`.
- **Blocker Log**: Hard stops requiring external escalation $\rightarrow$ `logBlocker(issue)`.

---

## Phase 1: Ignition
**Orientation and cache warm-up.**

### Establish Mental Model & Orientation
Execute `ignitionSequence(goal)` to automate the following:
1. **Intent Decomposition**: Split goal into sub-intents.
2. **Project Mapping**: Generate task-aware overview via `ctx_overview`.
3. **Cache Warm-up**: Proactively preload critical path files via `ctx_preload`.
4. **Historical Retrieval**: Recall similar patterns/decisions via `ctx_knowledge(recall)`.

### Declare Checkpoints
- Decide in advance: pause points for validation.

---

## Phase 2: Cycling
**Execution with continuous validation. Repeat this sub-loop until all sub-tasks complete.**

### Operational Modes
1. **Discovery**: Exploration, locate code $\rightarrow$ `Navigate` $\to$ `Analyze`.
2. **Confirmation**: Root cause/solution found $\rightarrow$ `Validate` $\to$ `Offload` (mandatory).

---

### Sub-Phase 2a: Navigate (Select Next Work)
1. Check dependencies; identify highest-priority sub-task.
2. Load context using targeted helpers.
3. State micro-goal explicitly.

### Sub-Phase 2b: Analyze (Gather Signal)
1. **Read Hierarchically**: Use `hierarchicalRead(path)` to move from cheap to expensive:
   - `symbol(name)` $\rightarrow$ Extract specific logic only.
   - `outline()` $\rightarrow$ Structural view.
   - `map()` $\rightarrow$ Dependency/API map.
2. Build mental model; record hypotheses.

### Sub-Phase 2c: Validate Hypothesis (Pressure Test)
**Mandatory in Confirmation Mode.**
1. Cross-reference knowledge base; run functional tests.
2. Trace callers/callees using `ctx_callgraph` or `ctx_impact`.

### Sub-Phase 2d: Offload Strategic Information
**Mandatory in Confirmation Mode.** Prevent L1 (window) bloat by pushing to L2 (session) or L3 (knowledge):
- **Findings**: Use `offloadFinding(value)` for discoveries.
- **Uncertainties/Risks/Blockers**: Use the dedicated registry helpers (`logUncertainty`, `logRisk`, `logBlocker`) to track open issues.
- **Decisions**: Use `offloadDecision(value, reversible)` to mark as `[REVERSIBLE]` or `[IRREVERSIBLE]`.
- **Permanent Facts**: Use `rememberFact(fact, category, key)` for project-wide invariants (L3).

### Sub-Phase 2e: Pressure Check (Sanity Gate)
**Every N iterations or after major decision:**
1. **Audit State**: Run `contextPressureAudit()` to evaluate convergence and cognitive load.
2. **Context Trim**: If occupancy is high, use `evictContext(targets)` to remove stale files.

**If red**: Recalibrate breakdown or resolve critical unknowns.

---

## Phase 3: Decision Sign-off
**Before cool-down, perform a final audit of decisions recorded via `offloadDecision`.**

### Review Irreversible Decisions
For every `[IRREVERSIBLE]` decision tagged during Cycling:
- Audit necessity, alternatives, communication, and rollback paths.

### Final Contradiction Resolution
- Resolve "uncertain" findings before proceeding.

---

## Phase 4: Convergence Proof
**Verify AC from Phase 0.**

### AC Checklist & False Win Detection
- Map results to AC; verify that Phase 0 blindspots were mitigated.

---

## Phase 5: Cool-Down
**Consolidation and archive.**

Execute `coolDownSequence()` to automate the following:
1. **Knowledge Consolidation**: Move validated findings/decisions from session $\rightarrow$ knowledge base (`ctx_knowledge consolidate`).
2. **Artifact Generation**: Create a PR context pack via `ctx_pack(pr)`.
3. **State Persistence**: Save current CCP session state via `ctx_session save`.
4. **Environment Purge**: Reset stale file caches via `ctx_ledger reset`.

---

## Phase 6: Retrospective
**Procedure audit and feedback.**

### Procedure Metrics
- Evaluate token efficiency (savings from offloading) and contradiction detection rate using `ctx_gain` or `ctx_metrics`.
- Record insights into knowledge base for future sessions.

---

## Quick Reference: Tool Mapping

| Action | Helper / Tool | Cache Level |
|---|---|---|
| **Start Task** | `ignitionSequence(goal)` | L2 $\to$ L1 |
| **Deep Read** | `hierarchicalRead(path)` | L1 (Optimized) |
| **Record Discovery** | `offloadFinding(val)` | L1 $\to$ L2 |
| **Track Unknowns** | `logUncertainty(q)` / `logRisk(r, m)` / `logBlocker(i)` | L1 $\to$ L2 |
| **Log Decision** | `offloadDecision(val, rev)` | L1 $\to$ L2 |
| **Archive Fact** | `rememberFact(...)` | L1 $\to$ L3 |
| **Trim Window** | `contextPressureAudit()` / `evictContext()` | L1 Management |
| **Finish Task** | `coolDownSequence()` | L1/L2 $\to$ L3 / Archive |

---

## Core Principles (Tool-Enforced)

1. **Validation-centric**: Pressure-test hypotheses before using `offloadFinding`.
2. **Explicit decision discipline**: Enforce reversibility via `offloadDecision`.
3. **Context Minimization**: a priority of $\text{Symbol} \to \text{Outline} \to \text{Map}$ over Full Reads.
4. **Automaticity**: Use sequences (`ignition`, `coolDown`) to ensure no step is skipped.
