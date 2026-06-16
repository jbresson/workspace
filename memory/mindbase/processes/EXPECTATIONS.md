# Expectations Registry

Expectations are hard-coded quality gates that must be satisfied before a phase is considered complete. They transform procedural guidelines into verifiable requirements.

## 1. SPEC_READY_GATE
**Phase**: Map (Crystallization)
**Trigger**: Transition from Planning $\rightarrow$ Implementation.
**Requirement**:
- A formal specification (`plan.md` or equivalent) must exist.
- The spec must contain: Objective, Invariants, and Verifiable Success Criteria (Scenarios).
- **Failure Mode**: If spec is missing/incomplete, agent MUST halt and request clarification. No "best effort" implementation allowed.

## 2. IMPLEMENTATION_LOG_SYNC
**Phase**: Do (Cycling)
**Trigger**: Completion of any atomic code change.
**Requirement**:
- Every change must be recorded in a persistent log (`code.md` or `ctx_session`).
- **Log Entries MUST include**:
    - `Change`: What was modified and why.
    - `Decision`: Any implementation choice made using "AI Freedom" (discretion).
    - `Gap`: Any contradiction found between the spec and the codebase.
    - `Verification`: Result of the immediate test/build for that change.
- **Failure Mode**: Change is marked "Incomplete" if the log entry is missing.

## 3. PROCESS_FEEDBACK_LOOP
**Phase**: Verify & Audit (Pressure Check)
**Trigger**: Task Completion / Graduation.
**Requirement**:
- Produce a "Process Reflection" targeting the system's own intelligence.
- **Analysis**: "Why did this take $N$ iterations? Was the prompt/mandate insufficient?"
- **Artifact**: A concrete recommendation to update `.pi/SYSTEM.md` or `memory/`.
- **Failure Mode**: Task cannot be closed without a process evaluation.
