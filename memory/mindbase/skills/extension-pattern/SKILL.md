# Extension Pattern Skill

**Identifier**: `extension-pattern`  
**Type**: Architecture / Code Pattern  
**Purpose**: Consistent dual-registration pattern for Pi extension tools  

---

## Definition

The **extension pattern** is a standardized approach to implement and expose Pi extension logic via both **tools** (for LLM-driven invocation) and **commands** (for interactive CLI use).

This pattern ensures:
- Code reuse (single helper shared across tool + command)
- Consistency (all extensions follow identical structure)
- Safety (shell escaping, error handling, timeouts)
- Discoverability (all commands appear in CLI help)
- State sharing (module-level variables for persistence)

---

## Core Capability

**What**: A 3-step pattern to extract logic → register as tool → register as command.

**When**: Building any new Pi extension or refactoring existing code.

**How**: 
1. Extract core logic into a module-level helper function
2. Register the helper as a Pi tool
3. Register the same helper as a slash command
4. Share state at module level across both registrations

---

## The Pattern

### Step 1: Extract Helper
```typescript
// Module scope - shared across tool and command
let state: Record<string, any> = {};

async function helperName(pi: ExtensionAPI, params: { key: string }) {
  // Core logic here
  return { 
    content: [{ type: "text", text: "result..." }], 
    details: { status: "ok" } 
  };
}
```

### Step 2: Register Tool
```typescript
pi.registerTool({
  name: "tool_name",
  description: "What this tool does.",
  parameters: Type.Object({ 
    key: Type.String() 
  }),
  async execute(_toolCallId: string, params: any) {
    return await helperName(pi, params);
  },
});
```

### Step 3: Register Command
```typescript
pi.registerCommand("command-name", {
  description: "What this command does.",
  handler: async (args) => await helperName(pi, args),
});
```

**Key Points:**
- `handler` property (NOT `execute`)
- Signature: `async (args) => { ... }`
- Always include `description` field
- State shared at module level
- Helper reused for both registrations

---

## Files Refactored (4)

### 1. `.pi/extensions/extension-loader.ts` (366L)
**Purpose**: Dynamically load extensions from `.pi/extensions/`

**Helper**: `loadExtension(pi, params)`
- Discovers available modules
- Validates exports
- Registers tools
- Caches results

**Registrations**:
- Tool: `load_helper_extension`
- Command: `/load_helper_extension`

**State**: `availableExtensions` (module-level cache)

---

### 2. `.pi/extensions/buddies/buddy.ts` (413L)
**Purpose**: Headless Pi CLI executor for custom reasoning tasks

**Helpers**:
- `runBuddy(params)` — Execute headless Pi CLI
- `buildPiCommand(params)` — Shell command construction
- `escapeShellArg(arg)` — Safe argument quoting

**Registrations**:
- Tool: `run_buddy`
- Command: `/buddy`

**Parameters**: systemPrompt, prompt, provider, model, thinking, tools, excludeTools, session, sessionName, fork, extensions, skills, promptTemplates, themes, outputMode, timeout

**State**: None (stateless; each buddy is isolated)

---

### 3. `.pi/extensions/lean-ctx-sse/loader.ts` (100L)
**Purpose**: Project memory via lean-ctx SSE server

**Helper**: `projectMemory(pi, params)`
- Starts lean-ctx SSE bridge
- Registers project-specific tools
- Reuses connections per project

**Registrations**:
- Tool: `project_memory_lean_ctx`
- Command: `project_memory_lean_ctx`

**State**: `bridges` (module-level connection cache)

---

### 4. `.pi/extensions/task_execution/lean-ctx-helpers.ts` (243L)
**Purpose**: Task execution lifecycle tools (phases 0-5)

**Phase Commands** (6):
- `/pi-task-ignition` (Phase 0-1)
- `/pi-task-plan` (Phase 1-2)
- `/pi-task-execute` (Phase 2-3)
- `/pi-task-validate` (Phase 3-4)
- `/pi-task-refine` (Phase 4-5)
- `/pi-task-cooldown` (Phase 5-6)

**State**: Module-level `PHASES` config

---

## Critical Fix: Command Registration

**Before (❌ Error):**
```typescript
pi.registerCommand("name", {
  execute: async (args) => { ... }  // WRONG
});
```

**After (✅ Correct):**
```typescript
pi.registerCommand("name", {
  handler: async (args) => { ... }  // CORRECT
});
```

**Issue**: Pi SDK expects `handler` property, not `execute`. Runtime error: `"command.handler is not a function"`.

---

## State Management

Module-level variables shared across tool and command:

| Extension | Variable | Purpose |
|-----------|----------|---------|
| `extension-loader.ts` | `availableExtensions` | Cache discovered modules |
| `buddy.ts` | (stateless) | Each execution is isolated |
| `lean-ctx-sse/loader.ts` | `bridges` | Reuse SSE connections per project |
| `task_execution/lean-ctx-helpers.ts` | `PHASES` | Phase definitions and config |

---

## Copy-Paste Template

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// 1. Module-level state (shared across tool + cmd)
let state: Record<string, any> = {};

// 2. Extract helper
async function myHelper(pi: ExtensionAPI, params: { key: string }) {
  // Core logic here
  return { content: [{ type: "text", text: "..." }], details: {} };
}

// 3. Register and export
export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my_tool",
    description: "What this tool does.",
    parameters: Type.Object({ key: Type.String() }),
    async execute(_toolCallId, params) {
      return await myHelper(pi, params);
    },
  });

  pi.registerCommand("my_command", {
    description: "What this command does.",
    handler: async (args) => await myHelper(pi, args),
  });
}
```

---

## Verification Checklist

- [x] All `registerCommand` calls use `handler` property
- [x] All `handler` signatures are `async (args) => { ... }`
- [x] All commands include `description` field
- [x] Helper functions extracted to module scope
- [x] State variables at module level for sharing
- [x] No overlapping registrations or conflicts
- [x] Safe shell escaping where needed
- [x] Error handling in helpers with graceful fallbacks

---

## Usage Examples

### Load Extensions
```bash
/load_helper_extension module:lean-ctx-sse
/load_helper_extension module:task_execution tool:task_ignition
```

### Run Buddy
```bash
/buddy systemPrompt:"Debug this error" prompt:"What's wrong?"
/buddy systemPrompt:"..." prompt:"..." thinking:high model:gpt-4
```

### Project Memory
```bash
project_memory_lean_ctx projectPath:/path/to/project
```

### Task Phases
```bash
/pi-task-ignition
/pi-task-plan
/pi-task-execute
/pi-task-validate
/pi-task-refine
/pi-task-cooldown
```

---

## Future Enhancements

1. **Streaming Output** — Line-by-line output for long-running tasks
2. **Result Caching** — Per-project, per-phase result memoization
3. **Batch Execution** — Run phase sequences atomically
4. **Cost Tracking** — Token/API costs per tool invocation
5. **Command Composition** — Nest helpers (e.g., `/buddy --use task_ignition`)
6. **Session Continuations** — Save/restore command contexts

---

## References

- **Implementation**: `.pi/extensions/`
- **Details**: `memory/knowledgebase/projects/extensions-pattern.md`
- **Buddy Skill**: `memory/mindbase/skills/buddy/SKILL.md`
- **Task Execution Skill**: `memory/mindbase/skills/task-execution/SKILL.md`
