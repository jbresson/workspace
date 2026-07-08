# ARCH-meseeks — Agent-to-Agent Handoff Chain Model

**Status**: Concept Capture  
**Priority**: Architectural  
**Date**: 2026-06-20

---

## Strategic Hypotheses

### H1: Per-LLM Context Curation Minimizes Token Usage
Each agent request is an independent LLM inference. By curating context **on a per-request basis**, the orchestrator eliminates accumulated noise:
- No bloat from previous phases' explorations or disproven hypotheses.
- Each agent gets: {original goal, relevant progress, their specific next task, evidence pointers}.
- Token savings compound: N shorter sessions << 1 long session with full accumulated context.

**Testable**: Measure tokens-per-inference and total tokens for meseeks vs. singleton session on identical task.

### H2: Selective Knowledge Injection Powers Precision Execution
The orchestrator is a **knowledge curator**, not a dumb forwarder. It:
- Holds canonical process/principles/architecture/decisions (L3 memory).
- Selects what's relevant for Agent-N's specific task.
- Injects only necessary context, guardrails, and evidence.
- Result: Agent works with confidence, **no need to ask clarifying questions**, no re-validation of prior decisions.

**Key insight**: A well-curated prompt is more powerful than a fully-available monolithic session. Agent can focus, not search.

### H3: Core Principles Stay Non-Diluted in Active Context
In long sessions, core principles risk being buried under task artifacts and session state drift. In meseeks:
- Each handoff **explicitly restates** original goal, AC, key constraints.
- Orchestrator can **tune system prompt per phase** to emphasize different principles (execution vs. audit vs. security).
- No "we forgot why we were doing this" drift.
- Principles scale: As system grows, orchestrator curator scales, not the agent.

**Hypothesis**: Principle adherence measured as "% decisions justified against guardrails" stays higher across chains than across long sessions.

---

## Vision
Replace long-running singleton agent sessions with a **turn-wise agent-to-agent handoff chain**. Each agent works until a natural checkpoint, produces a handoff prompt (not a user response), and *poof* — disappears. The `meseeks` orchestrator spawns the next agent with the updated context, continuing until completion verification.

---

## Problem
- **Long sessions**: Current model keeps one agent alive for the full task lifetime, consuming token budget across multiple decision cycles.
- **Context bleed**: Agent reasoning state accumulates; harder to reason about individual work boundaries.
- **Difficult resumability**: Session state is opaque; unclear how to resume cleanly if interrupted.
- **Hard to parallelize**: Cannot easily run multiple parallel sub-chains (e.g., two agents working on different aspects, then merge).

---

## Proposed Model

### Agent Lifecycle
```
User calls meseeks(task, originalGoals)
  ↓
[Agent-1 spawned] 
  ├─ Read task context
  ├─ Analyze work scope
  ├─ Execute first logical chunk
  ├─ Update state: {completed, discovered, remaining, goal_status}
  └─ Emit HANDOFF_PROMPT (not user response) → POOF (exit)
  ↓
meseeks orchestrator extracts HANDOFF_PROMPT
  ├─ Compose context: {original_goal, progress_so_far, next_work}
  ├─ Append system prompt tuning (for Agent-2's focus)
  └─ Spawn Agent-2 with new session
  ↓
[Agent-2 spawned]
  ├─ Read full context (original goal + what Agent-1 did)
  ├─ Continue from {remaining}
  ├─ Execute next chunk
  ├─ Emit HANDOFF_PROMPT → POOF
  ↓
[Loop continues until Agent-N emits COMPLETION_SIGNAL]
  └─ meseeks verifies: all work done, original goals met
```

### Handoff Prompt Structure
```yaml
---
STATUS: TRANSFER | COMPLETE
PHASE: N  # 1, 2, 3, etc.

ORIGINAL_GOAL: |
  [Preserved unchanged from start]

WORK_COMPLETED: |
  - Step 1: [result/evidence]
  - Step 2: [result/evidence]
  - ...

WORK_DISCOVERED: |
  - New scope item A (why it emerged)
  - New scope item B (why it emerged)
  - ...

WORK_REMAINING: |
  - Task block X: [specific next action]
  - Task block Y: [specific next action]
  - ...

CONTEXT_ARTIFACTS:
  decisions: [list of IRREVERSIBLE choices made + reasoning]
  risks_mitigated: [list of false-win checks executed]
  blockers: [any open issues + owner + when resolved]
  evidence_refs: [key files/logs/proofs for next agent]

COMPLETION_CRITERIA_STATUS:
  AC1: [PENDING | SATISFIED | BLOCKED]
  AC2: [PENDING | SATISFIED | BLOCKED]
  ...

NEXT_AGENT_FOCUS: |
  [Explicit guidance for Agent-(N+1) on what to prioritize]
  [System prompt tuning hints, if needed]

---
```

### Orchestrator Responsibilities (`meseeks` command/tool)
1. **Parse handoff prompt** from agent output (YAML boundary detection).
2. **Compose next context**:
   - Preserve original goal verbatim.
   - Summarize completed work.
   - Build "next agent to-do" from remaining + discovered.
   - Append evidence refs (file paths, decision logs).
3. **Spawn next agent** with:
   - System prompt (optionally tuned per phase).
   - Initial task prompt (composed from handoff).
   - Fixed constraints (original acceptance criteria, guardrails).
4. **Verify completion** when COMPLETION_SIGNAL emitted:
   - Check all AC satisfied.
   - Confirm no open critical blockers.
   - Ensure no false-win risks remain unmitigated.
   - Return final artifact to user.

---

## Benefits

### For Token Budget
- **Shorter sessions**: Each agent operates for 1–3 decision cycles, not 10+.
- **Batched context**: Handoff prompt explicitly encodes only what matters.
- **Resumability**: Can pause mid-chain, inspect state, adjust goals, continue.

### For Reasoning Clarity
- **Single responsibility**: Each agent has one job (a defined work block).
- **Clear handover**: Explicit state mutation, not implicit session drift.
- **Auditability**: Each handoff is a checkpointed decision boundary.

### For Parallelism
- **Fan-out ready**: Orchestrator can spawn multiple chains (e.g., Agent-2a and Agent-2b working in parallel), then coordinate merges.
- **Dependency injection**: A later phase can depend on outputs of earlier phases.

### For System Prompt Flexibility
- **Phase-tuned prompts**: Agent-2 can get a different system prompt than Agent-1 (e.g., "You are now the auditor phase; focus on validation and false-win risk detection").
- **Guardrail evolution**: Can update guardrails between phases without restarting entire session.

---

## Implementation Sketch

### Phase 0: Spec & Proof-of-Concept
- [ ] Define `HANDOFF_PROMPT` YAML schema and validation.
- [ ] Design orchestrator state machine (TRANSFER → SPAWN → WAIT → PARSE → VERIFY COMPLETION vs. LOOP).
- [ ] Implement minimal `meseeks` CLI stub (test scaffold).
- [ ] Proof-of-concept: 3-phase manual handoff with 3 different agents on a toy task.

### Phase 1: Orchestrator & Verification
- [ ] Build orchestrator core:
  - Handoff prompt parsing.
  - Context composition.
  - Agent spawning (session API integration).
  - Completion verification gate.
- [ ] Integrate with existing AC/false-win verification subsystem.

### Phase 2: System Prompt Tuning
- [ ] Design phase-specific system prompt templates.
- [ ] Implement "next agent focus" translation into prompt adjustments.
- [ ] Test phase-tuned behavior (e.g., Phase 2 = auditor mode).

### Phase 3: State & Resumability
- [ ] Persistent state ledger for paused chains.
- [ ] Reload mechanism (pause mid-handoff, inspect, adjust, resume).
- [ ] Lineage tracking (which agent did what, in what order).

### Phase 4: Parallelism & Merges
- [ ] Multi-chain orchestration (fan-out).
- [ ] Merge coordination (synchronization points between chains).
- [ ] Conflict detection (what if two agents touch the same file?).

---

## Acceptance Criteria

- **AC1**: Handoff prompt spec defined, validated, and documented.
- **AC2**: Orchestrator parses handoff, composes context, spawns next agent.
- **AC3**: Completion signal verified against original AC; false-win checks executed.
- **AC4**: PoC: 3-agent chain on a real task completes successfully.
- **AC5**: **Token efficiency hypothesis validated**: `tokens-per-phase (meseeks) < tokens-per-inference (singleton session)` on identical task.
- **AC6**: System prompt tuning between phases works (e.g., audit phase shows different behavior than execution phase).
- **AC7**: **Knowledge injection hypothesis**: Agent-N requires **zero clarification requests**; all context needed for independent, confident execution is provided in handoff.
- **AC8**: **Principle adherence hypothesis**: % of decisions justified against core guardrails/process ≥ 90% across all agents in chain.

---

## False Win Risks

1. **Lossy handoff**: State simplification in handoff prompt loses important reasoning → agent-N makes naive decision → regression.
   - *Mitigation*: Evidence refs mandatory; agent reads source files, not just summaries.

2. **Infinite loop**: Handoff prompt keeps generating new remaining work; never converges to completion.
   - *Mitigation*: Completion gate requires explicit AC satisfaction signal; orchestrator tracks phase count and escalates if N > threshold.

3. **Contradictory state mutation**: Agent-1 makes decision X; Agent-2 observes contradictory state and undoes it.
   - *Mitigation*: Handoff includes decision log (IRREVERSIBLE choice record); Agent-2 verifies against BUDDY.md before proceeding.

4. **Context explosion at merge**: If fan-out to 5 agents, merging their state becomes combinatorial.
   - *Mitigation*: Enforce sequential phases initially; parallelize only specific, known independent tasks (Phase 4 defer).

---

## Dependencies & Related Issues

- **Acceptance Criteria subsystem**: `issues/active/ISSUE-001-common-process-suite.md` (AC verification gates).
- **False-win risk detection**: `memory/guardrails/RULES_CATALOG.md`.
- **Session API**: Must support programmatic agent spawning (not just CLI).
- **BUDDY ledger format**: Hand-off context maps to local ledger structure for continuity.

---

## Notes & Open Questions

### Design Decisions to Lock
1. **How many phases is "too many"?** (N > 10 = escalate?)
2. **Can handoff prompt be partial/streaming**, or must it be complete?
3. **When does an agent emit COMPLETION_SIGNAL vs. TRANSFER?** Explicit flag or heuristic?
4. **Orchestrator lives where?** Standalone CLI, or integrated into core agent framework?

### Known Unknowns
- How well do agents preserve intent across handoffs in practice? (Empirical testing needed.)
- What's the ideal phase size (tokens/decisions)? (Needs tuning via PoC.)
- Can we run **true parallelism** without orchestrator bottleneck? (Scalability question.)

---

## References & Prior Art

- **Mr. Meseeks (Rick & Morty)**: Short-lived, task-focused agents that disappear on completion. ✓
- **MapReduce**: Phase-wise job orchestration; fan-out/merge patterns.
- **Kubernetes Jobs & Workflows**: Declarative handoff, state injection.
- **Erlang supervisors**: Fault-tolerant process chains.

---

## Next Step
👉 Review concept with team.  
👉 Lock AC1 (handoff spec).  
👉 Start Phase 0 PoC.
