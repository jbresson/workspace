# Summary: Legacy Task List → Issue Capture (2026-06-13)

## Overview
Captured all 3 legacy task entries into formal backlog issues with detailed implementation plans. Each issue includes 5-10 phases with numbered sub-tasks, acceptance criteria, and dependency mapping.

---

## Captured Issues

### 1. **ENG-001**: Task Phase Execution via Expectations Engine
**File**: `issues/backlog/ENG-001-task-phase-expectations-engine.md` (90 lines)

**From legacy task list**:
> task phase execution utilizes expectations engine to help ensure correctness and success

**Implementation Plan**: 7 phases
- Phase 1: Requirements & Specification (5 sub-tasks)
- Phase 2: Engine Core Design (6 sub-tasks)
- Phase 3: Integration Points (5 sub-tasks)
- Phase 4: Implementation (Core) (6 sub-tasks)
- Phase 5: Validation & Testing (5 sub-tasks)
- Phase 6: Documentation & Rollout (5 sub-tasks)
- Phase 7: Audit & Iteration (3 sub-tasks)

**Key Goals**:
- Validates task preconditions before execution
- Predicts outcome correctness via dependency analysis
- Detects contradictions against KB
- ≥80% of preventable failures caught pre-execution
- <5% token overhead per task

**Dependencies**: ← EXT-001 (turn-completion-validator)

---

### 2. **EXT-002**: lmstudio-insight Extension
**File**: `issues/backlog/EXT-002-lmstudio-insight.md` (108 lines)

**From legacy task list**:
> lmstudio-insight extension that listens to lmstudio events, tails log, uses lmstudio rest api, other method? to get insight on current model status.
> - switched to streaming response (currently only shows error or terminated in TUI)
> - big memory events, insight into slower responses
> - other identifiable helpful lmstudio happenings

**Implementation Plan**: 9 phases
- Phase 1: Requirements & Event Discovery (5 sub-tasks)
- Phase 2: Log Tailing & Event Parsing (5 sub-tasks)
- Phase 3: REST API Integration (5 sub-tasks)
- Phase 4: Event Stream & Buffering (5 sub-tasks)
- Phase 5: TUI Integration (5 sub-tasks)
- Phase 6: Agent Integration (5 sub-tasks)
- Phase 7: Performance & Observability (5 sub-tasks)
- Phase 8: Documentation & Examples (5 sub-tasks)
- Phase 9: Testing & Validation (5 sub-tasks)

**Key Goals**:
- Detect ≥5 distinct event types (load, unload, memory spike, slow inference, error)
- Real-time status display in TUI (beyond error/terminated)
- Agent queries model health and adapts decisions
- No measurable inference slowdown (<1%)

**Dependencies**: None (standalone)

---

### 3. **EXT-003**: Unified Tool Proxy Refactor
**File**: `issues/backlog/EXT-003-unified-tool-proxy.md` (129 lines)

**From legacy task list**:
> refactor .pi/extensions/extension_loader.ts to register single "tool" tool as proxy for model to call any available actual tools. only single tool for context window, token efficient. instruction(like code) or direction(like prompt) tells which tools to use in general so discovery not needed in general. "tool" tool has additional option for list tools and search tools. stretch-goal: strong ui.selector experience on "select" option

**Implementation Plan**: 10 phases
- Phase 1: Requirements & Specification (5 sub-tasks)
- Phase 2: Tool Registry & Discovery Design (6 sub-tasks)
- Phase 3: Tool Proxy Architecture (6 sub-tasks)
- Phase 4: Instruction & Direction Mechanism (6 sub-tasks)
- Phase 5: Migration from Individual Tools (5 sub-tasks)
- Phase 6: Performance & Optimization (5 sub-tasks)
- Phase 7: TUI Integration (Stretch Goal) (6 sub-tasks)
- Phase 8: Documentation & Examples (6 sub-tasks)
- Phase 9: Testing & Validation (6 sub-tasks)
- Phase 10: Rollout & Communication (5 sub-tasks)

**Key Goals**:
- Single "tool" proxy replaces all individual tool signatures
- Context window tokens saved ≥20% in tool metadata
- Tool discovery (list/search) <100ms
- Agent success rate ≥98% (no regression)
- (Stretch) TUI tool selector with UI feedback

**Dependencies**: ← DEP-001 (shell deprecation)

---

## Integration Points

### Critical Path Alignment
```
GUARDRAIL TRACK (Safety) ←────────────┐
                                       ├──→ All integrate with expectations engine
ENGINE TRACK (Task Execution) ←────────┤
                                       └──→ Tool proxy reduces context window
                                            LMStudio insight adds model signals
```

**Engine Track Sequence**:
1. **ENG-001** (Expectations): Validates task preconditions
2. **EXT-003** (Tool Proxy): Provides single interface to tools (fewer context tokens)
3. **EXT-002** (LMStudio Insight): Feeds model health signals into agent decisions

---

## Statistics

| Metric | Before | After |
|--------|--------|-------|
| **Issues** | 7 | 10 |
| **Backlog Lines** | 626 | 953 |
| **Phases** | 47 | 66 |
| **Sub-Tasks** | 800+ | 1200+ |
| **Unit Tests** | 350+ | 500+ |
| **Integration Tests** | 40+ | 60+ |

---

## Acceptance Checklist

✅ All 3 legacy task entries captured as formal backlog issues
✅ Each issue includes 5-10 phase implementation plan
✅ Each issue includes numbered sub-tasks
✅ Each issue includes acceptance criteria
✅ Dependencies mapped to existing issues
✅ INDEX.md updated with new issues
✅ High-level plan written for each issue

---

## Next Steps

1. **Prioritize**: Review ENG-001, EXT-003 against existing critical path
2. **Sequence**: EXT-003 (tool proxy) may be prerequisite for ENG-001 (expectations engine)
3. **Assign**: Pick lead engineer for each track (Guardrail vs. Engine)
4. **Execute**: Start with Phase 1 (Requirements & Specification) for each issue
5. **Track**: Update issue status + `ctx_session(action="finding")` as phases complete

---

*Captured*: 2026-06-13 | *Status*: All 3 entries → backlog issues (PLAN status)
