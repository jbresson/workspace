# Extension Tools Refactoring Summary

**Completed**: 2026-06-12  
**Scope**: Apply consistent pattern to expose logic via both Pi tools and slash commands

---

## Pattern Applied

All extension tools now follow this 3-step pattern:

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
**Purpose:** Dynamically load extensions from `helpers/extensions/`

**Changes:**
- Extracted `loadExtension(pi, params)` helper (lines 177–340)
- Module-level `availableExtensions` for caching across tool/command
- Tool: `load_helper_extension`
- Command: `/load_helper_extension`

**Key Function:**
```typescript
async function loadExtension(pi: ExtensionAPI, params: { module?: string; tool?: string }) {
  // Discover modules, validate exports, register tools
}
```

---

### 2. `.pi/extensions/pi-buddies/buddy.ts` (413L)
**Purpose:** Headless Pi CLI executor for custom reasoning tasks

**Parameters:**
- Required: `systemPrompt`, `prompt`
- Optional: provider, model, thinking, tools, excludeTools, session, sessionName, fork, extensions, skills, promptTemplates, themes, outputMode, timeout

**Changes:**
- Extracted `runBuddy(params)` helper
- Helper `buildPiCommand(params)` for shell command construction
- Safe escaping via `escapeShellArg()`
- Timeout protection (5min default) + 10MB output buffer
- Tool: `run_buddy`
- Command: `/buddy`

**Key Functions:**
```typescript
async function runBuddy(params: BuddyParams): Promise<BuddyResult> {
  // Execute headless Pi CLI
}

function buildPiCommand(params: BuddyParams): string {
  // Construct shell command with safe escaping
}
```

---

### 3. `helpers/extensions/lean-ctx-sse/loader.ts` (100L)
**Purpose:** Project memory via lean-ctx SSE server

**Changes:**
- Extracted `projectMemory(pi, params)` helper
- Module-level `bridges` cache for connection reuse
- Tool: `project_memory_lean_ctx`
- Command: `project_memory_lean_ctx`

**Key Function:**
```typescript
async function projectMemory(pi: ExtensionAPI, params: { projectPath: string }) {
  // Start lean-ctx SSE bridge, register project tools
}
```

---

### 4. `helpers/extensions/task_execution/lean-ctx-helpers.ts` (243L)
**Purpose:** Task execution lifecycle tools (phases 0-5)

**Changes:**
- Tools registry already well-structured with `tools` export + `manifest`
- Added phase command registrations:
  - `pi-task-ignition` (Phase 0-1)
  - `pi-task-plan` (Phase 1-2)
  - `pi-task-execute` (Phase 2-3)
  - `pi-task-validate` (Phase 3-4)
  - `pi-task-refine` (Phase 4-5)
  - `pi-task-cooldown` (Phase 5-6)
- All commands use corrected `handler` signature

**Phase Command Registration:**
```typescript
const phaseCommands = [
  {
    phase: 0,
    name: 'pi-task-ignition',
    tools: ['task_ignition'],
    description: 'Phase 0-1: ...',
  },
  // ... 5 more phases
];

for (const phase of phaseCommands) {
  pi.registerCommand(phase.name, {
    description: phase.description,
    handler: async (args) => ({ details: { phase: phase.phase, tools: phase.tools } }),
  });
}
```

---

## Critical Fixes

### Command Registration Signature
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

**Issue:** Pi SDK expects `handler` property, not `execute`. Runtime error: `"command.handler is not a function"`.

**Verification:** All files checked and corrected.

---

## State Management

### Module-Level Variables
Declared at top of each extension file for sharing across tool and command:

| File | Variable | Purpose |
|------|----------|---------|
| `extension-loader.ts` | `availableExtensions` | Cache discovered modules |
| `buddy.ts` | (stateless) | Executes isolated processes |
| `lean-ctx-sse/loader.ts` | `bridges` | Reuse SSE connections per project |
| `task_execution/lean-ctx-helpers.ts` | (stateless) | Tools registry in `tools` export |

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
/buddy systemPrompt:"..." prompt:"..." tools:task_ignition model:claude-opus
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

## Future Enhancements

1. **Streaming Output**: Long-running tasks (buddies, phase execution)
2. **Result Caching**: Per-project, per-phase results for replay
3. **Batch Execution**: Run phase sequences atomically
4. **Cost Tracking**: Token/API costs per buddy session
5. **Command Composition**: Use helpers from commands (e.g., `/buddy --use task_ignition`)
6. **Session Continuations**: Save/restore command contexts across invocations

---

## Files in Repo

```
.pi/
  extensions/
    extension-loader.ts         [366L] ✅ Refactored
    pi-buddies/
      buddy.ts                  [413L] ✅ Refactored
  EXTENSION-REFACTORING-SUMMARY.md [THIS FILE]
  buddies-GUIDE.md              [Feature guide & ideas]

helpers/extensions/
  lean-ctx-sse/
    loader.ts                   [100L] ✅ Refactored
  task_execution/
    lean-ctx-helpers.ts         [243L] ✅ Refactored + phase commands
```

---

**Status:** Complete. All extensions follow consistent pattern with corrected command registration signatures.
