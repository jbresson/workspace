# ISSUE-001: Implementation of Common Process Extension Suite

## 🎯 Goal
Codify the `TASK_EXECUTION.md` and `memory_management.md` lifecycles into a set of Pi extension tools and event handlers to move from "manual process following" to "runtime enforcement".

## 🛠️ Scope & Requirements

### 1. Foundation (Memory Rigor)
- [ ] **`save_finding`**: Tool to record technical facts/hypotheses with evidence and category tags in L2.
- [ ] **`save_decision`**: Tool to record design decisions, enforcing `reversible: boolean` and `reasoning`.
- [ ] **`save_risk`**: Tool to capture "False Win" risks identified in Phase 0.

### 2. Intelligence (The Validator)
- [ ] **`validate_decision`**: Orchestrator tool that integrates `ctx_impact` and `ctx_architecture` to pressure-test decisions.
- [ ] **Contradiction Scanner**: Logic to grep L2 findings against `memory/mindbase/identity/MANDATES.md`.

### 3. Workflow (Task Engine)
- [ ] **`log_issue`**: Automate creation of issue files in `issues/backlog/`.
- [ ] **`promote_task`**: Pipeline tool to move tasks from `issue` $\rightarrow$ `ideas.md` $\rightarrow$ `todo.md`.

### 4. Guardrails (The Enforcers)
- [ ] **Irreversibility Gate**: `pi.on("session_before_compact")` handler to block session closure/migration if `irreversible` decisions are unvalidated.
- [ ] **Dangerous Tool Gate**: Standardized `ctx.ui.confirm` wrappers for high-impact operations.

## 🚩 Success Criteria
- LLM no longer forgets to record findings/decisions because tools provide a structured prompt.
- Phase 3 "Decision Sign-off" is an automated check rather than a manual checklist.
- Task promotion from idea to todo follows the strict `issues/` $\rightarrow$ `ideas.md` $\rightarrow$ `todo.md` pipeline.

## 🔗 References
- Analysis: `PROCESS_ANALYSIS.md`
- Process: `memory/mindbase/processes/TASK_EXECUTION.md`
- Memory Law: `memory/mindbase/processes/memory_management.md`
