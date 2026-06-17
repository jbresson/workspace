# Task Execution Skill

**Identifier**: `task-execution`  
**Type**: Process / Workflow Engine  
**Purpose**: Multi-phase task decomposition with token-efficient sub-agent delegation  

---

## Definition

**Task Execution** is a 7-phase workflow that decomposes complex projects into focused, isolated sub-tasks, each executed by a headless Pi "specialist" with optimized thinking, model, and context window.

**Core Problem Solved**: 
- Monolithic reasoning bloats tokens and dilutes focus
- Solution: "PM vs Specialist" pattern—orchestrate phases, delegate to sub-sessions

**Core Benefit**:
- High-cognition phases (P0, P3) get `high` thinking
- Low-cognition phases (P5, P6) use `low` thinking
- Information pipeline passes only *distillates* between phases
- Token efficiency: 30-50% savings vs monolithic approach

---

## The 7 Phases

| Phase | Name | Thinking | Goal | Output |
|-------|------|----------|------|--------|
| **P0** | Crystallization | **High** | Define Success, AC, Risks, False Wins | "Done" Statement + Risk Register |
| **P1** | Ignition | Medium | Map Project, Warm Cache, Decompose Intent | Intent Tree + File Map |
| **P2** | Cycling | Medium | Execute & Validate; Iterate Navigate→Analyze→Validate→Offload | Verified Findings |
| **P3** | Decision Sign-Off | **High** | Audit Irreversible Decisions | Decision Log + Rollback Paths |
| **P4** | Convergence Proof | Medium | Verify AC from P0 | Verification Matrix (AC vs Result) |
| **P5** | Cool-Down | Low | Consolidate Knowledge to L3, Generate Artifact Packs | KB Updates + PR Pack |
| **P6** | Retrospective | Low | Audit Procedure Metrics | Token Efficiency Insights |

---

## Information Pipeline

**Core Rule**: Pass only *distillates*, not raw findings.

```
P0: Define Success
    ↓
P1: Map Project (tip: P0 Success Statement)
    ↓
P2: Execute (tip: P1 Intent Tree)
    ↓
P3: Audit Decisions (tip: P2 Findings + P0 Risks)
    ↓
P4: Verify AC (tip: P0 AC + P3 Decisions)
    ↓
P5: Consolidate (tip: P4 Verification Matrix)
    ↓
P6: Retrospective (tip: P5 Artifact Summary)
```

**No redundancy**: Each phase receives only the *essentials* from prior phases.

---

## Operational Guide

### 1. Phase 0: Crystallization

**Goal**: Define what "done" looks like before moving.

**Execution**:
```json
{
  "taskContext": "Implement OAuth2 refresh token rotation with Redis state storage",
  "tips": []
}
```

**Expected Output**:
- Success Statement (e.g., "OAuth2 tokens auto-rotate every 2 hours...")
- Acceptance Criteria (AC1, AC2, ...)
- Hard Constraints (e.g., "No rate limiting violations")
- False Win Risks (e.g., "Testing only on local Redis, not prod")

**Verification**: Confirm all AC are testable.

---

### 2. Phase 1: Ignition

**Goal**: Map the codebase and decompose the task.

**Execution**:
```json
{
  "taskContext": "Success = AC1, AC2... Constraints = C1, C2...",
  "tips": ["Use BaseService for DB access", "Config at config/oauth.ts"]
}
```

**Expected Output**:
- Intent decomposition (sub-tasks: token model, refresh logic, state management)
- File structure map (relevant files, entry points)
- Warm cache (pre-identify which files need deep reading)

**Verification**: Confirm decomposition covers all AC.

---

### 3. Phase 2: Cycling

**Goal**: Execute and validate iteratively.

**Execution**:
```json
{
  "taskContext": "Implement: token model → refresh logic → state mgmt. Map from P1",
  "tips": ["P1 identified X files", "AC require Y behavior"]
}
```

**Workflow** (repeat until verified):
1. **Navigate**: Identify next sub-task
2. **Analyze**: Read relevant code
3. **Validate**: Check against AC
4. **Offload**: Move finding to knowledge base

**Expected Output**: Verified findings (one per AC).

**Verification**: Each AC has a passing test or proof.

---

### 4. Phase 3: Decision Sign-Off

**Goal**: Audit all irreversible decisions.

**Execution**:
```json
{
  "taskContext": "Decisions made: use Redis for state, 2-hour TTL, no backup retention",
  "tips": ["P0 Risks: X, Y, Z", "Constraints: A, B, C"]
}
```

**Expected Output**:
- Decision log (what was decided, why, who verified)
- Rollback paths (if this decision proves wrong, how do we revert?)
- Risk sign-off (Risks from P0 all addressed or accepted)

**Verification**: Every irreversible decision has a rollback path.

---

### 5. Phase 4: Convergence Proof

**Goal**: Verify all AC are met.

**Execution**:
```json
{
  "taskContext": "Verify AC1=✓, AC2=✓, ... against implementation",
  "tips": ["P0 AC list", "P3 Decisions", "P2 Verified Findings"]
}
```

**Expected Output**: Verification matrix (AC vs Result, all passing).

**Verification**: All AC ✅. Constraints met. False Win risks mitigated.

---

### 6. Phase 5: Cool-Down

**Goal**: Consolidate findings and prepare artifacts.

**Execution**:
```json
{
  "taskContext": "Consolidate: P4 Verification Matrix, P3 Decisions, P2 Findings",
  "tips": []
}
```

**Expected Output**:
- Knowledge base updates (docs, decision records, patterns)
- Artifact pack (PR template, commit messages, test summary)
- State cleanup (remove temp notes, finalize logs)

**Verification**: KB updated, artifacts ready for handoff.

---

### 7. Phase 6: Retrospective

**Goal**: Measure efficiency and capture insights.

**Execution**:
```json
{
  "taskContext": "Measure: total tokens, phase distribution, bottlenecks",
  "tips": ["Started with monolithic approach", "Switched to phased"]
}
```

**Expected Output**:
- Token efficiency metrics (tokens per phase, savings vs baseline)
- Bottleneck identification (which phase was slowest?)
- Insights for next task (what worked, what didn't?)

**Verification**: Metrics recorded, insights actionable.

---

## Pro Tips for Token Efficiency

1. **Avoid Redundancy**: Use `tips` to inject facts. If you know a file path, put it in `tips`.
2. **Isolate Noise**: Let sub-sessions do "dirty work" (read 10 files, trial-and-error). Bring only *conclusions* back.
3. **Thinking Leveling**: P0 and P3 need `high` thinking. Trust it; don't waste tokens on P5/P6.
4. **Iterative Correction**: If a phase doesn't complete perfectly, use `sessionId` to refine without restarting.
5. **Information Pipeline**: Each phase receives distillate from prior phase, not raw output.

---

## Iterative Refinement (The `sessionId` Loop)

A phase may not complete perfectly in one turn. **Use `sessionId` to refine.**

**Workflow**:
1. Call `task_phase0` → Missing "False Win Risks"
2. Call `task_phase0` again with same `session`:
   ```json
   {
     "session": "oauth-p0",
     "prompt": "You forgot False Win Risks. Identify assumptions that could break this."
   }
   ```
3. Sub-session resumes and completes phase in same logical context.

**Never** start a new session for refinement—reuse the `sessionId`.

---

## Registration & Invocation

**Commands** (6):
- `/pi-task-ignition` (Phase 0-1)
- `/pi-task-plan` (Phase 1-2)
- `/pi-task-execute` (Phase 2-3)
- `/pi-task-validate` (Phase 3-4)
- `/pi-task-refine` (Phase 4-5)
- `/pi-task-cooldown` (Phase 5-6)

**Tools** (7):
- `task_phase0` through `task_phase6` (via `.pi/extensions/task_execution/`)

**Implementation**: `.pi/extensions/task_execution/lean-ctx-helpers.ts` (243L)

---

## Acceptance Criteria (AC) Definition

**What**: Measurable outcomes that prove the task is complete.

**Structure**:
```
AC1: OAuth token refreshes within 5s when TTL expires
AC2: State persists in Redis with correct TTL
AC3: No 409 (conflict) errors in concurrent refresh scenarios
AC4: Token rotation is backward-compatible with existing clients
```

**Key**: AC must be **testable** before P0 concludes. No vague AC.

---

## False Win Risks

**What**: Assumptions that could make the task *appear* successful but fail in production.

**Structure**:
```
Risk 1: Testing only on local Redis, not prod cluster
        Mitigation: Include prod Redis in AC verification
        
Risk 2: Assuming all clients respect new token format
        Mitigation: Gradual rollout + compatibility layer
        
Risk 3: No monitoring of token rotation latency
        Mitigation: Add prometheus metric to P5
```

**Key**: Every risk must have a mitigation or be accepted explicitly.

---

## Future Enhancements

- [ ] Convergence proof automation (run all tests automatically)
- [ ] Decision rollback executor (one-click revert if sign-off fails)
- [ ] Token budget alerts (warn if phase exceeds budget)
- [ ] Artifact template library (PR templates, commit message patterns)
- [ ] Cross-phase knowledge linking (connect decisions to AC)
- [ ] Phase resumption from failure (restart from checkpoint)

---

## References

- **Process Definition**: `memory/mindbase/processes/TASK_EXECUTION.md`
- **With Tools**: `memory/mindbase/processes/TASK_EXECUTION_WITH_TOOLS.md`
- **Runner Guide**: `memory/knowledgebase/projects/task-execution-runner.md`
- **Buddy Skill**: `memory/mindbase/skills/buddy/SKILL.md`
- **Extension Pattern**: `memory/mindbase/skills/extension-pattern/SKILL.md`
