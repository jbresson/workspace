# Common Process Analysis & Extension Tool Design

## Executive Summary

Identified **6 core process categories** from memory docs, pi extension examples, and system specs. Each represents a recurring workflow pattern that could be abstracted into TypeScript extension tools. Dependencies and call-trees mapped. High-level design patterns provided for implementation.

---

## 1. KNOWLEDGE MANAGEMENT PROCESSES

### 1.1 `ctx_session(action="finding", val="...")`
**Purpose**: Capture technical facts, evidence, observations to L2 (episodic memory).

**Where Used**:
- `memory/mindbase/processes/memory_management.md` - L1→L2 pipeline during Cycling phase (Phase 2)
- `TASK_EXECUTION.md` - Phase 2b (Analyze) → record findings as hypotheses
- System prompt: "Record findings via `ctx_session(action='finding', val='...')`"

**Call Tree**:
```
ctx_session(action="finding")
  └─ Validation: Is finding already recorded?
  └─ Append to L2 (episodic memory)
  └─ [Optional] Promote to L3 if validated
```

**Dependencies**:
- `ctx_session` API (exists, native)
- Validation registry (optional, could be in-memory)
- Contradictions detector (check previous findings for conflicts)

**Extension Tool Design**:
```typescript
// tools/save-finding.ts
registerTool({
  name: "save_finding",
  label: "Save Finding",
  description: "Record technical fact to session memory with optional validation",
  parameters: Type.Object({
    finding: Type.String(),
    evidence: Type.Optional(Type.String()),
    category: StringEnum(["tech_fact", "hypothesis", "contradiction", "unknown"] as const),
    conflictsWith: Type.Optional(Type.Array(Type.String())),
  }),
  async execute(id, params, signal, onUpdate, ctx) {
    // Detect contradictions if specified
    if (params.conflictsWith?.length) {
      const existing = ctx.sessionManager.getEntries()
        .filter(e => e.type === "custom" && e.customType === "finding")
        .map(e => e.data?.text);
      const conflicts = params.conflictsWith.filter(c => existing.includes(c));
      if (conflicts.length) {
        return {
          content: [{ type: "text", text: `⚠️ Conflicts detected: ${conflicts.join(", ")}` }],
          details: { conflicts, shouldReview: true }
        };
      }
    }
    
    // Save to session
    pi.appendEntry("finding", {
      text: params.finding,
      evidence: params.evidence,
      category: params.category,
      timestamp: Date.now(),
    });
    
    ctx.ui.notify(`✓ Finding saved`, "info");
    return {
      content: [{ type: "text", text: `Recorded: ${params.finding}` }],
      details: { saved: true }
    };
  }
});
```

---

### 1.2 `ctx_session(action="decision", val="[REVERSIBLE|IRREVERSIBLE] ...")`
**Purpose**: Record design decisions with reversibility classification + reasoning.

**Where Used**:
- `TASK_EXECUTION.md` - Phase 2d (Offload) → decisions with `[REVERSIBLE]` or `[IRREVERSIBLE]` markers
- Phase 3 (Decision Sign-off) → validate all irreversible decisions
- `TASK_EXECUTION_WITH_TOOLS.md` - "offloadDecision(val, reversible)" workflow

**Call Tree**:
```
saveDecision(text, reversible)
  ├─ Validate: Is decision justified? (mandatory validation in Phase 3)
  ├─ Classify: REVERSIBLE vs IRREVERSIBLE
  ├─ Store decision + reasoning
  ├─ [Optional] Flag if unvalidated (Phase 3 gate)
  └─ [Optional] Trigger escalation if irreversible + undecided
```

**Dependencies**:
- `ctx_session` API
- Justification validator (optional)
- Prior contradictions check

**Extension Tool Design**:
```typescript
// tools/save-decision.ts
registerTool({
  name: "save_decision",
  label: "Save Decision",
  description: "Record design decision with reversibility & reasoning",
  parameters: Type.Object({
    decision: Type.String(),
    reasoning: Type.String(),
    reversible: Type.Boolean({ description: "true=can be undone, false=permanent" }),
    alternatives: Type.Optional(Type.Array(Type.String())),
    riskLevel: StringEnum(["low", "medium", "high"] as const),
    validated: Type.Optional(Type.Boolean({ description: "Has this been pressure-tested?" })),
  }),
  async execute(id, params, signal, onUpdate, ctx) {
    const status = params.validated ? "✓ validated" : "⚠️ unvalidated";
    
    if (params.riskLevel === "high" && !params.validated) {
      ctx.ui.notify("High-risk decision without validation—flagged for Phase 3 review", "warning");
    }
    
    // Save with full metadata
    pi.appendEntry("decision", {
      decision: params.decision,
      reasoning: params.reasoning,
      reversible: params.reversible,
      alternatives: params.alternatives,
      riskLevel: params.riskLevel,
      validated: params.validated ?? false,
      timestamp: Date.now(),
    });
    
    return {
      content: [{ type: "text", text: `Decision recorded [${params.reversible ? "REVERSIBLE" : "IRREVERSIBLE"}]:\n${params.decision}` }],
      details: { status, reversible: params.reversible }
    };
  }
});
```

---

### 1.3 `validateDecision(decisionId)` / `validateFinding(findingId)`
**Purpose**: Pressure-test findings/decisions against knowledge base, contradictions, edge cases.

**Where Used**:
- `TASK_EXECUTION.md` Phase 2c (Validate Hypothesis) → cross-reference KB, trace dependencies
- Phase 3 (Decision Sign-off) → final validation of irreversible decisions

**Call Tree**:
```
validateDecision(id)
  ├─ Load decision from L2
  ├─ Query KB for contradictions
  ├─ Trace dependencies (callers, callees)
  ├─ Check edge cases
  ├─ Return: { valid: bool, conflicts: [...], gaps: [...] }
  └─ [Optional] Block if critical gaps
```

**Dependencies**:
- Finding/Decision storage (L2)
- Knowledge base query tool (cross-reference, grep, architecture queries)
- Call-graph tool (dependency tracing)

**Extension Tool Design**:
```typescript
// tools/validate-decision.ts
registerTool({
  name: "validate_decision",
  label: "Validate Decision",
  description: "Pressure-test decision against KB, dependencies, contradictions",
  parameters: Type.Object({
    decisionId: Type.String(),
    checkDependencies: Type.Optional(Type.Boolean({ default: true })),
    checkContradictions: Type.Optional(Type.Boolean({ default: true })),
    checkEdgeCases: Type.Optional(Type.Boolean({ default: true })),
  }),
  async execute(id, params, signal, onUpdate, ctx) {
    // Find decision in session
    const decision = ctx.sessionManager.getEntries()
      .find(e => e.type === "custom" && e.customType === "decision" && e.data?.id === params.decisionId);
    if (!decision) return { content: [{ type: "text", text: "Decision not found" }], isError: true };
    
    const result = { valid: true, conflicts: [], gaps: [], warnings: [] };
    
    // Check contradictions
    if (params.checkContradictions) {
      const findings = ctx.sessionManager.getEntries()
        .filter(e => e.type === "custom" && e.customType === "finding");
      const conflicts = findings.filter(f => 
        decision.data.reasoning.includes("NOT ") && f.data.text.includes("MUST ")
      );
      if (conflicts.length > 0) {
        result.conflicts.push(...conflicts.map(c => c.data.text));
        result.valid = false;
      }
    }
    
    // Check dependencies (simplified; real impl would trace call-graph)
    if (params.checkDependencies) {
      result.gaps.push("Dependency tracing not yet implemented—manual review recommended");
    }
    
    pi.appendEntry("validation", {
      decisionId: params.decisionId,
      result,
      timestamp: Date.now(),
    });
    
    const content = result.valid 
      ? `✓ Decision validated (${result.warnings.length} warnings)`
      : `✗ Validation failed: ${result.conflicts.length} conflicts, ${result.gaps.length} gaps`;
    
    return { content: [{ type: "text", text: content }], details: result };
  }
});
```

---

## 2. TASK & ISSUE MANAGEMENT PROCESSES

### 2.1 `logIssue(task, priority)` / Create/Update Issue
**Purpose**: Add or update work directly in issue tracking system.

**Where Used**:
- `TASK_MANAGEMENT.md` - issue-only lifecycle
- `memory_management.md` - Section 3 (Task & Issue Management): capture -> triage -> execute -> archive
- System pattern: Invisible tasks forbidden; everything must exist as an issue

**Call Tree**:
```
logIssue(text, priority, category)
  ├─ Check: Existing issue already tracks this work?
  ├─ If new: Create issue file in /issues/(active|backlog|archive)/
  ├─ If existing: Update status/evidence/owner in same issue
  └─ Tag metadata (owner, dependencies, milestone)
```

**Dependencies**:
- File I/O (create/update issue .md files)
- Issue status parser (status/owner/AC/evidence fields)
- Git integration (optional, for issue linking)

**Extension Tool Design**:
```typescript
// tools/log-issue.ts
registerTool({
  name: "log_issue",
  label: "Log Issue",
  description: "Create or update task in issue tracking system",
  parameters: Type.Object({
    task: Type.String(),
    priority: StringEnum(["critical", "high", "medium", "low"] as const),
    category: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    status: StringEnum(["idea", "backlog", "active", "done"] as const),
    owner: Type.Optional(Type.String()),
    dueDate: Type.Optional(Type.String()),
  }),
  async execute(id, params, signal, onUpdate, ctx) {
    // Parse existing issues and locate matching entry
    const issueRoot = resolve(ctx.cwd, "issues");
    // (Real impl: read, parse, check if exists)
    
    // Create issue file if needed
    const issueDir = resolve(ctx.cwd, `memory/knowledgebase/issues/${params.status}`);
    const issuePath = `${issueDir}/${params.task.toLowerCase().replace(/\s+/g, "-")}.md`;
    
    const issueContent = `# ${params.task}\n\n**Priority**: ${params.priority}\n**Status**: ${params.status}\n**Owner**: ${params.owner || "unassigned"}\n**Description**:\n${params.description || "N/A"}\n`;
    
    // Write issue file
    // await writeFile(issuePath, issueContent);
    
    // Update issue status/evidence directly in same issue
    // (Real impl: patch issue sections)
    
    return {
      content: [{ type: "text", text: `✓ Task logged: ${params.task} (${params.priority})` }],
      details: { issuePath, status: params.status }
    };
  }
});
```

---

## 3. SESSION & STATE PERSISTENCE

### 3.1 `pi.appendEntry(customType, data)` (Built-in)
**Purpose**: Persist extension state into session file; survives restarts, participates in branching.

**Where Used**:
- `extensions.md` - State Management section: store state in tool result `details`
- Example: `todo.ts` - reconstructs state from session entries
- `plan-mode/index.ts` - `pi.appendEntry("plan-mode", {...})`
- `bookmark.ts` / `session-name.ts` - metadata storage

**Note**: This is already built into ExtensionAPI; not a new tool.

**Design Pattern**:
```typescript
// During tool execution
pi.appendEntry("custom-type", {
  data: "state here",
  timestamp: Date.now()
});

// On session_start, reconstruct
pi.on("session_start", async (_event, ctx) => {
  const entries = ctx.sessionManager.getEntries();
  const stateEntries = entries.filter(e => e.type === "custom" && e.customType === "custom-type");
  // Reconstruct state from stateEntries
});
```

---

### 3.2 `pi.setLabel(entryId, label)` / `pi.setSessionName(name)` (Built-in)
**Purpose**: Bookmark and navigate session tree; friendly session naming.

**Where Used**:
- `bookmark.ts` - `pi.setLabel(entry.id, label)` for /tree navigation
- `session-name.ts` - `pi.setSessionName(name)`

**Note**: These are built-in ExtensionAPI methods.

---

## 4. MESSAGING & USER INTERACTION

### 4.1 `pi.sendMessage(message, options)` (Built-in)
**Purpose**: Inject custom or system messages into session; visible to LLM.

**Where Used**:
- `file-trigger.ts` - `pi.sendMessage({ customType, content, display: true })`
- `message-renderer.ts` - custom message rendering
- Event-driven triggers (file watchers, webhooks)

**Design Pattern**:
```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Message text",
  display: true,
  details: { ... }
}, {
  deliverAs: "steer" | "followUp" | "nextTurn",
  triggerTurn: true
});
```

---

### 4.2 `pi.sendUserMessage(text, options)` (Built-in)
**Purpose**: Send message as if typed by user; triggers immediate LLM turn.

**Where Used**:
- `send-user-message.ts` - `/ask` command queues user message
- `handoff.ts` - cross-provider handoff
- `reload-runtime.ts` - programmatic follow-up

**Design Pattern**:
```typescript
pi.sendUserMessage("Content", {
  deliverAs: "steer" | "followUp",  // Required during streaming
  // Optional when idle; triggers turn immediately
});
```

---

### 4.3 `ctx.ui.custom(component)` / `ctx.ui.select()` / `ctx.ui.confirm()` (Built-in)
**Purpose**: User interaction dialogs and custom components.

**Where Used**:
- `timed-confirm.ts` - `ctx.ui.confirm(..., { timeout: 5000 })`
- `questionnaire.ts` - multi-step wizard with `ui.custom()`
- `question.ts` - `ctx.ui.select()`

**Note**: All built-in ExtensionAPI methods.

---

## 5. TOOL REGISTRATION & MANAGEMENT

### 5.1 `pi.registerTool(definition)` (Built-in)
**Purpose**: Register LLM-callable tools with custom logic.

**Where Used**:
- Every extension that provides LLM tools: `hello.ts`, `todo.ts`, `dynamic-tools.ts`, etc.
- Supports `renderCall()` / `renderResult()` for custom TUI rendering

**Design Pattern**:
```typescript
pi.registerTool({
  name: "tool_name",
  label: "Display Name",
  description: "What this tool does",
  promptSnippet: "Short 1-line for system prompt",
  promptGuidelines: ["Use tool_name when..."],
  parameters: Type.Object({...}),
  async execute(id, params, signal, onUpdate, ctx) {
    return { content: [...], details: {...} };
  },
  renderCall?(args, theme, context) { ... },
  renderResult?(result, options, theme, context) { ... }
});
```

---

### 5.2 `pi.registerCommand(name, handler)` (Built-in)
**Purpose**: Register slash commands (e.g., `/mycommand`).

**Where Used**:
- Commands: `/todos` (todo.ts), `/bookmark` (bookmark.ts), `/session-name`, `/reload-runtime`, etc.

**Design Pattern**:
```typescript
pi.registerCommand("mycommand", {
  description: "What it does",
  handler: async (args, ctx) => {
    // ctx: ExtensionCommandContext (has session-control methods)
    ctx.ui.notify("Done", "info");
  },
  getArgumentCompletions?(prefix) { return [...]; }  // Optional autocomplete
});
```

---

## 6. EVENT HANDLERS & GATES

### 6.1 `pi.on(event, handler)` (Built-in)
**Purpose**: Subscribe to lifecycle, tool, session, and agent events for side effects, gating, and customization.

**Key Events**:

| Event | Purpose | Use Case |
|-------|---------|----------|
| `session_start` | Session initialized | Restore state from previous session |
| `before_agent_start` | Before LLM call | Inject context, modify system prompt |
| `tool_call` | Before tool executes | Block dangerous tools, gate access |
| `tool_result` | After tool executes | Modify result, add post-processing |
| `turn_end` | After LLM turn + tools | Log metrics, save state |
| `input` | User input received | Transform/intercept input |
| `session_before_switch` | Before /new or /resume | Gate session changes |
| `session_before_fork` | Before /fork or /clone | Gate branching |
| `session_before_compact` | Before compaction | Custom compaction logic |

**Where Used**:
- `permission-gate.ts` - `on("tool_call")` blocks `rm -rf`
- `project-trust.ts` - `on("project_trust")` decides project trust
- `confirm-destructive.ts` - `on("session_before_*")` gates dangerous actions
- `custom-compaction.ts` - `on("session_before_compact")` provides custom summary
- `model-status.ts` - `on("model_select")` updates UI on model change

**Design Pattern**:
```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && event.input.command.includes("rm -rf")) {
    const ok = await ctx.ui.confirm("Dangerous", "Allow rm -rf?");
    if (!ok) return { block: true, reason: "Blocked by user" };
  }
});
```

---

## DEPENDENCY & CALL-TREE ANALYSIS

### Hierarchy of Common Processes

```
┌─────────────────────────────────────────────────────┐
│  TASK EXECUTION PHASES (TASK_EXECUTION.md)          │
│  Phase 0: Crystallization (Define AC)               │
│  Phase 1: Ignition (Warm cache)                      │
│  Phase 2: Cycling (Execute + validate)              │
│    ├─ Navigate → Analyze → Validate                 │
│    └─ Offload: saveFinding() + saveDecision()      │
│  Phase 3: Decision Sign-off (Audit)                 │
│    └─ validateDecision() for irreversible          │
│  Phase 4: Convergence Proof (AC checklist)          │
│  Phase 5: Cool-down (L2→L3 migration)              │
│  Phase 6: Retrospective (Procedure feedback)        │
└─────────────────────────────────────────────────────┘
         ↓
    Calls to:
    - saveFinding() [Phase 2d]
    - saveDecision() [Phase 2d]
    - validateDecision() [Phase 3]
    - logTodo() [End of cycle, for backlog]
         ↓
    Uses:
    - ctx_session(action="finding|decision")
    - pi.appendEntry() for persistence
    - pi.ui dialogs for validation checks
         ↓
    Stores to:
    - Session (L2): Findings, decisions, timestamps
    - Persistent KB (L3): Only after Cool-down phase
```

### Tool Dependencies (Directed Graph)

```
saveDecision()
  ├─ saveFinding() [check for conflicts]
  ├─ validateDecision() [Phase 3 gate]
  └─ logIssue() [if decision affects commitments]

validateDecision()
  ├─ ctx_session (query prior findings)
  ├─ Knowledge base query [grep, cross-reference]
  └─ Dependency tracer [call-graph for dependencies]

logIssue()
  ├─ File I/O (create/update issue .md)
  ├─ issue status parser
  └─ issue linkage updater [same-file lifecycle updates]

pi.on("tool_call")
  └─ logIssue() [gate → log access for audit]

pi.sendMessage() / pi.sendUserMessage()
  ├─ Triggered by: file-trigger, event-bus, manual commands
  └─ May trigger: tool_call, tool_result chain
```

---

## IMPLEMENTATION DESIGN PATTERNS

### Pattern 1: State Reconstruction from Session
**Used by**: `todo.ts`, `plan-mode/index.ts`, `preset.ts`

```typescript
export default function (pi: ExtensionAPI) {
  let state: State = { items: [] };

  pi.on("session_start", async (_event, ctx) => {
    state = { items: [] };
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === "my-state") {
        state = entry.data;
      }
    }
  });

  pi.registerTool({
    name: "my_tool",
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      state.items.push(params.item);
      pi.appendEntry("my-state", state);
      return { content: [...], details: { state } };
    }
  });
}
```

---

### Pattern 2: Decision Recording with Validation Gate
**Used by**: `validate-decision.ts` (proposed), decision-audit workflows

```typescript
const decision = {
  id: generateId(),
  text: "Switch to Postgres from SQLite",
  reasoning: "Scale bottleneck identified",
  reversible: false,
  validated: false,
  alternatives: ["Optimize SQLite", "Use read replicas"],
};

// Phase 2d: Save
pi.appendEntry("decision", decision);

// Phase 3: Validate before sign-off
const validation = await validateDecision(decision.id, {
  checkDependencies: true,
  checkContradictions: true
});

if (validation.valid) {
  // Sign off
} else {
  // Return to Phase 2c (Validate Hypothesis)
  ctx.ui.notify(`Fix conflicts: ${validation.conflicts.join(", ")}`, "error");
}
```

---

### Pattern 3: Event-Triggered Message Injection
**Used by**: `file-trigger.ts`, `git-merge-and-resolve.ts`

```typescript
pi.on("session_start", (_event, ctx) => {
  watch("TRIGGER_FILE", (event) => {
    pi.sendMessage({
      customType: "file-trigger",
      content: `Trigger detected: ${event}`,
      display: true,
      details: { event }
    }, {
      deliverAs: "steer",
      triggerTurn: true
    });
  });
});
```

---

### Pattern 4: UI Gating for Dangerous Operations
**Used by**: `permission-gate.ts`, `confirm-destructive.ts`, `dirty-repo-guard.ts`

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (isDangerous(event)) {
    const confirmed = await ctx.ui.confirm(
      "⚠️ Dangerous Operation",
      `Allow ${event.toolName}?`,
      { timeout: 10000 }  // Auto-deny after 10s
    );
    if (!confirmed) {
      return { block: true, reason: "User declined" };
    }
  }
});

pi.on("session_before_switch", async (_event, ctx) => {
  const changed = await checkGitStatus();
  if (changed > 0) {
    const confirmed = await ctx.ui.select(
      `${changed} uncommitted file(s). Proceed?`,
      ["Yes", "Commit first", "Cancel"]
    );
    if (confirmed === "Cancel") {
      return { cancel: true };
    }
  }
});
```

---

## SUMMARY TABLE: Tools to Implement

| Tool | Type | Depends On | L1 Call Site | L2 Storage | Complexity |
|------|------|-----------|--------------|-----------|-----------|
| **save_finding** | Tool | `ctx_session`, session manager | Phase 2b (Analyze) | `entry.customType="finding"` | Low |
| **save_decision** | Tool | `ctx_session`, session manager | Phase 2d (Offload) | `entry.customType="decision"` | Low |
| **validate_decision** | Tool | Session manager, KB query, call-graph | Phase 3 (Sign-off) | `entry.customType="validation"` | Medium |
| **log_issue** | Tool | File I/O, issue parser/updater | After Cycling | `issues/*/` .md files | Medium |
| **gate_tool_call** | Event Handler (pi.on) | Tool event hook | During tool_call event | Session log | Low |
| **gate_session_action** | Event Handler (pi.on) | Session event hooks | Before /fork, /new, /resume | Session log | Low |
| **inject_context_message** | Command + Event Handler | `pi.sendMessage()` | User invokes or file-trigger fires | Custom message entries | Low |
| **project_trust_prompt** | Event Handler (pi.on) | Trust resolution flow | startup, /resume, /new | Trust decision cache | Low |

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Phase 1 (Core Memory)**: `save_finding`, `save_decision` — Low complexity, foundation for other tools
2. **Phase 2 (Validation)**: `validate_decision` — Medium, enables Phase 3 workflows
3. **Phase 3 (Task Tracking)**: `log_issue` — Medium, requires issue parser integration
4. **Phase 4 (Gates & Events)**: `gate_tool_call`, `gate_session_action`, `project_trust_prompt` — Low-medium, use pi.on hooks
5. **Phase 5 (Messaging)**: `inject_context_message` — Low, uses built-in `pi.sendMessage()`

---

## Architecture Notes for Implementation

### File Structure
```
extensions/
├── common-processes/
│   ├── index.ts                  # Main export, registers all tools
│   ├── tools/
│   │   ├── save-finding.ts       # Tool: record finding
│   │   ├── save-decision.ts      # Tool: record decision
│   │   ├── validate-decision.ts  # Tool: pressure-test decision
│   │   └── log-issue.ts          # Tool: log/update issues
│   ├── handlers/
│   │   ├── tool-gate.ts          # Event: pi.on("tool_call")
│   │   ├── session-gate.ts       # Event: pi.on("session_before_*")
│   │   └── project-trust.ts      # Event: pi.on("project_trust")
│   └── utils/
│       ├── validators.ts         # Contradiction check, KB query
│       ├── parsers.ts            # issue status/metadata parsing
│       └── types.ts              # Shared TypeScript types
```

### Design Principles

1. **Lazy Registration**: Register tools/commands/handlers in `session_start`, not at module load
2. **Session-Aware**: All state stored via `pi.appendEntry()`, reconstructed on session_start
3. **Gate-First**: Event handlers should gate early, provide clear UI feedback
4. **Validation Mandatory**: Phase 3 sign-off must call `validateDecision()` for irreversible decisions
5. **L2→L3 Deferred**: Session entries are L2; L3 (persistent KB) migration happens in Cool-Down phase (manual or batch job)

---

## References

- `memory/mindbase/processes/TASK_EXECUTION.md` - 6-phase task lifecycle
- `memory/mindbase/processes/memory_management.md` - L1-L3 knowledge hierarchy
- `memory/mindbase/processes/TASK_MANAGEMENT.md` - issue-only workflow
- `/opt/homebrew/.../docs/extensions.md` - Full ExtensionAPI reference
- `/opt/homebrew/.../examples/extensions/*.ts` - 60+ working examples
