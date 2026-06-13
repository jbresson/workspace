# Task Execution Runner Guide

The `TASK_EXECUTION` runner extension provides tools (`task_phase0` through `task_phase6`) that delegate specific stages of a task to isolated, headless Pi CLI instances. 

## Why Use This?
Instead of performing all reasoning in one massive session—which leads to **token bloat**, **cognitive drift**, and **diluted focus**—this extension implements a "PM vs Specialist" pattern:
- **Main Session (PM)**: Orchestrates the workflow, evaluates outputs, and maintains high-level state.
- **Sub-Sessions (Specialists)**: High-intensity, short-lived executions focused on one specific phase goal with optimized thinking levels.

## Tool Reference

| Tool | Phase | Thinking | Core Goal | Recommended Output |
| :--- | :--- | :--- | :--- | :--- |
| `task_phase0` | Crystallization | **High** | Define Success, AC, Risks | Clear "Done" statement + Risk Register |
| `task_phase1` | Ignition | Medium | Map Project & Warm Cache | Intent decomposition + File map |
| `task_phase2` | Cycling | Medium | Execute & Validate | Verified findings $\rightarrow$ `offloadFinding` |
| `task_phase3` | Sign-off | **High** | Audit Irreversible Decisions | Decision log with rollback paths |
| `task_phase4` | Proof | Medium | Verify AC from P0 | Verification matrix (AC vs Result) |
| `task_phase5` | Cool-Down | Low | Consolidate Knowledge | Knowledge base updates + PR pack |
| `task_phase6` | Retro | Low | Procedure Audit | Token efficiency metrics $\rightarrow$ Insights |

## Operational Guide: "The Good Run"

### 1. Triggering Specialists
Do not simply prompt the sub-session to "do work." Provide structured context.
**Example call for Phase 0:**
```json
{
  "taskContext": "Implement OAuth2 flow in the auth-service using Redis for state storage.",
  "tips": ["Use existing BaseService for DB access", "Refer to SECURITY.md for token rotation rules"]
}
```

### 2. Iterative Correction (The `sessionId` Loop)
Sub-sessions may not complete a phase perfectly in one turn. **Do not start a new session.** Use the returned `sessionId` to refine.

**Workflow:**
1. Call `task_phase0` $\to$ Result is missing "False Win Risks".
2. Call `task_phase0` again with:
    - `sessionId`: (The ID from call 1)
    - `taskContext`: "You forgot the False Win Risks. Please identify what a 'false success' looks like for this OAuth flow."

### 3. The Information Pipeline
To maximize token efficiency, pass only the *distillate* of Phase $N$ into Phase $N+1$.

**Example:**
- **P0 Result**: "Success = AC1, AC2... Risks = R1..."
- **P1 Call**: `taskContext` = (The P0 Success Statement), `tips` = [ distilled risks ].

## Pro Tips for Token Efficiency

- **Avoid Redundancy**: Use the `tips` parameter to inject facts. If you know a file path, put it in `tips` so the sub-session doesn't waste 3 turns calling `ctx_find`.
- **Isolate Noise**: Let the sub-session do the "dirty work" (reading 10 files, trial-and-error). Bring only the *final conclusion* back into your main prompt.
- **Thinking Leveling**: Trust that P0 and P3 *need* `high` thinking for architecture/audit; don't waste tokens using it for P5/P6.

---
*Reference: See `helpers/processes/TASK_EXECUTION_WITH_TOOLS.md` for the underlying process logic.*
