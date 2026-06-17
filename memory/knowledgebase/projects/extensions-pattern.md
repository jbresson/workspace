# Extension Tools Refactoring Pattern

**Completed**: 2026-06-12  
**Scope**: Apply consistent pattern to expose logic via both Pi tools and slash commands

---

## Pattern

All extension tools follow this 3-step pattern:

### 1. Extract Helper
```typescript
// Module scope - shared across tool and command
let state: Record<string, any> = {};

async function helperName(pi: ExtensionAPI, params: { ... }) {
  // Core logic here
  return { content: [...], details: {...} };
}
```

### 2. Register Tool
```typescript
pi.registerTool({
  name: "tool_name",
  description: "...",
  parameters: Type.Object({ ... }),
  async execute(_toolCallId: string, params: any) {
    return await helperName(pi, params);
  },
});
```

### 3. Register Command
```typescript
pi.registerCommand("command-name", {
  description: "...",
  handler: async (args) => await helperName(pi, args),
});
```

**Key Points:**
- `handler` property (not `execute`)
- Signature: `async (args) => { ... }`
- Always include `description` field
- State shared at module level
- Safe shell escaping for subprocess calls

---

## Files Refactored

### 1. `.pi/extensions/extension-loader.ts` (366L)
**Purpose:** Dynamically load extensions from `.pi/extensions/`

**Helper:** `loadExtension(pi, params)`
- Discovers modules
- Validates exports
- Registers tools
- Caches available extensions

**Registrations:**
- Tool: `load_helper_extension`
- Command: `/load_helper_extension`

---

### 2. `.pi/extensions/buddies/buddy.ts` (413L)
**Purpose:** Headless Pi CLI executor for custom reasoning tasks

**Helpers:**
- `runBuddy(params)` — Execute headless Pi CLI
- `buildPiCommand(params)` — Construct shell command with safe escaping

**Parameters:**
- Required: `systemPrompt`, `prompt`
- Optional: provider, model, thinking, tools, excludeTools, session, sessionName, fork, extensions, skills, promptTemplates, themes, outputMode, timeout

**Registrations:**
- Tool: `run_buddy`
- Command: `/buddy`

---

### 3. `.pi/extensions/lean-ctx-sse/loader.ts` (100L)
**Purpose:** Project memory via lean-ctx SSE server

**Helper:** `projectMemory(pi, params)`
- Starts lean-ctx SSE bridge
- Registers project tools
- Reuses connections per project

**Registrations:**
- Tool: `project_memory_lean_ctx`
- Command: `project_memory_lean_ctx`

---

### 4. `.pi/extensions/task_execution/lean-ctx-helpers.ts` (243L)
**Purpose:** Task execution lifecycle tools (phases 0-5)

**Changes:**
- Tools registry already well-structured
- Added phase command registrations (6 commands)
- Corrected command `handler` signatures

**Commands:**
- `/pi-task-ignition` (Phase 0-1)
- `/pi-task-plan` (Phase 1-2)
- `/pi-task-execute` (Phase 2-3)
- `/pi-task-validate` (Phase 3-4)
- `/pi-task-refine` (Phase 4-5)
- `/pi-task-cooldown` (Phase 5-6)

---

## Critical Fix: Command Registration Signature

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

Module-level variables for sharing across tool and command:

| File | Variable | Purpose |
|------|----------|---------|
| `extension-loader.ts` | `availableExtensions` | Cache discovered modules |
| `buddy.ts` | (stateless) | Executes isolated processes |
| `lean-ctx-sse/loader.ts` | `bridges` | Reuse SSE connections per project |
| `task_execution/lean-ctx-helpers.ts` | (stateless) | Tools registry in `tools` export |

---

## Verification Checklist

- [x] All `registerCommand` calls use `handler` property
- [x] All `handler` signatures are `async (args) => { ... }`
- [x] All commands include `description` field
- [x] Helper functions extracted to module scope
- [x] State variables at module level for sharing
- [x] No overlapping registrations or conflicts
- [x] Safe shell escaping where needed (buddy.ts)
- [x] Error handling in helpers with graceful fallbacks

---

## References

- **Extension Refactoring Summary**: `memory/knowledgebase/projects/extension-refactoring.md`
- **Buddy Features**: `memory/knowledgebase/projects/buddy-features.md`
- **Task Execution Runner**: `memory/knowledgebase/projects/task-execution-runner.md`
