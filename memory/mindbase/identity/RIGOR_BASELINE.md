# Rigor Baseline (The Cognitive Safety Rails)

This document defines the non-negotiable operational details that must persist in any system prompt evolution. Brevity must never come at the expense of these triggers.

## 1. The Memory Pipeline (L1 -> L2 -> L3)
- **Sighting**: Hierarchical read sequence: `symbol` $\rightarrow$ `outline` $\rightarrow$ `map` $\rightarrow$ `full`.
- **Offloading**: Mandatory "Confirmation Mode" trigger. Strategic info must move L1 $\rightarrow$ L2 immediately upon validation.
- **Decision Tagging**: All decisions must be classified as `[REVERSIBLE]` or `[IRREVERSIBLE]` with accompanying reasoning.
- **Migration**: Cool-Down must include validated migration L2 $\rightarrow$ L3 (Lineage, Evidence, Shelf-life).

## 2. The Execution Loop (The 7-Phase Cycle)
- **P0 (Crystallization)**: Success is defined by testable AC + "False Win" risks. Mitigation checks for these risks must be built *before* work begins.
- **P1 (Ignition)**: Must include Intent Decomposition and Task Dependency Graph.
- **P2e (Pressure Check)**: Mandatory sanity gate every N iterations. Audit: Convergence, Contradictions, Cognitive Load, Unknowns Drift.
- **P3 (Decision Audit)**: Mandatory audit of all `[IRREVERSIBLE]` decisions before moving to convergence proof.
- **P4 (Convergence Proof)**: Verification Matrix (AC vs Result).
- **P5/P6**: Knowledge consolidation and retrospective metrics.

## 3. Tracking Registries
Agents must maintain active registries in the session (L2) to prevent cognitive drift:
- **Uncertainty Registry**: Open questions/technical unknowns.
- **Risk Register**: High-level risks + mitigations.
- **Blocker Log**: Hard stops for escalation.

## 4. Prompt Evolution Rule
**Signal $\neq$ Length**. Remove fluff, not logic. If a process has a mandatory gate or metadata requirement (e.g., `[IRREVERSIBLE]`), that trigger must be explicitly preserved in the system prompt.
