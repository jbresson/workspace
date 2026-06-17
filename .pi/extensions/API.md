# Extension API Reference

## load_helper_extension

Main tool for managing extensions.

**Parameters:**
```typescript
{ module: string; tool?: string }
```

- `module` — Extension directory name or `"list"` to see all
- `tool` — (Optional) Specific tool to load; omit for all

**Responses:**

```
# List
load_helper_extension { module: "list" }
→ Available extensions:\n  - task_execution [...]\n  - solarwinds [...]

# Load all
load_helper_extension { module: "task_execution" }
→ ✓ Loaded extension: task_execution (10 tools)

# Load one
load_helper_extension { module: "task_execution", tool: "task_ignition" }
→ ✓ Loaded tool: task_execution.task_ignition

# Already loaded
→ ℹ️ Tool already loaded: ...

# Unknown
→ ❌ Unknown extension: ...
  Available: task_execution, solarwinds, lean_ctx_sse

# Error
→ ❌ Failed to load extension: [error details]
```

## ExtensionManifest

```typescript
interface ExtensionManifest {
  id: string;                                      // Module ID
  description?: string;                          // Description
  tools: Record<string, ExtensionToolDefinition>;
  onLoad?: (pi: ExtensionAPI) => Promise<void>;  // Setup hook
}
```

## ExtensionToolDefinition

```typescript
interface ExtensionToolDefinition {
  name: string;                                                    // Tool ID
  description?: string;                                          // Description
  parameters?: TSchema;                                          // Typebox
  execute: (toolCallId: string, params: any, pi: ExtensionAPI) => Promise<AgentToolResult>;
}
```

**execute() receives:**
- `toolCallId` — Unique execution ID
- `params` — User parameters (matches schema)
- `pi` — ExtensionAPI for shell, file ops, etc.

**Returns:**
```typescript
{
  content: [{ type: "text" | "image" | "file"; text?: string; data?: string; path?: string }];
  details?: Record<string, any>;
  isError?: boolean;
}
```

## ExtensionAPI

Methods available on `pi`:

```typescript
await pi.exec(command, args[])     // Shell: {code, stdout, stderr}
await pi.readFile(path)             // String content
await pi.writeFile(path, content)   // Void
pi.registerTool(toolDef)             // Register tool manually
```

## Typebox Types (Schema)

```typescript
Type.String()
Type.Number() / Type.Integer()
Type.Boolean()
Type.Optional(Type.String())
Type.Array(Type.String())
Type.Enum(["a", "b"])
Type.Object({ field: Type.String() })
Type.Union([Type.Literal("a"), Type.Literal("b")])

// With options
Type.String({ description: "...", default: "..." })
```

## State

**LOADED_MODULES:** Tracks which tools are loaded to prevent duplicates.
```
{ "task_execution": Set(["task_ignition", "task_log_risk"]) }
```

**Discovery Cache:** Modules cached after first scan; Pi restart needed for new extensions.

## Common Patterns

| Task | Command |
|------|---------|
| See all extensions | `load_helper_extension { module: "list" }` |
| Load full extension | `load_helper_extension { module: "my-ext" }` |
| Load 1 tool | `load_helper_extension { module: "my-ext", tool: "tool1" }` |
| Load multiple tools one-by-one | Repeat with different `tool` values |

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| Unknown extension | Module not found | Add directory to `helpers/extensions/` |
| Tool not found | Tool doesn't exist | Check manifest.tools or load full extension first |
| Already loaded | Already registered | Safe to ignore |
| Failed to load | Exception during load | Check extension code + entry point |
| Invalid structure | No default export | Export `default` function or `manifest` object |

---

See **GUIDE.md** for concepts, **DEVELOPMENT.md** for how-to.
