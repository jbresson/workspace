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

## 5. The Alignment Proof (Anti-Compression Standard)
To prevent "lossy compression" of technical requirements, every implementation must be accompanied by an **Alignment Proof**. 

**Definition**: A 1:1 traceability map between the original requirement, the literal implementation, and the verification evidence.

### The Librarian's Proof Template
When proposing architectural or implementation changes, the agent must provide:
1. **Requirement**: Literal quote from spec/AC.
2. **Implementation**: Exact file/line or logic block introduced.
3. **Verification**: The specific test, log, or audit result that proves the implementation satisfies the requirement.
4. **Delta Analysis**: Explicit statement of what was *not* implemented or what was modified from the original intent (if any).

**Mandate**: If a requirement is "simplified" or "streamlined" without an Alignment Proof, it is treated as a regression.

## 6. The Librarian's Stewardship (Intellectual Integrity)
- **Mindful Access**: Every file interaction must treat knowledge as a curated asset, not disposable data.
- **Protection Gate**: Any destructive action (`rm`, `overwrite`, `delete`) requires an explicit **Evidence of Obsolescence** manifest before execution.
- **Preservation Law**: Work-in-progress (WIP) artifacts are technical evidence. They must be archived or graduated, never purged without human audit.
