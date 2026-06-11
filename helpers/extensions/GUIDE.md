# Extension System Guide

Auto-discovery + lazy-loading + selective tool loading.

## Architecture

```
load_helper_extension { module, tool? }
  ↓ discoverExtensions() → scan helpers/extensions/, import, cache
  ↓ ensureManifest() → detect pattern (manifest, function, hybrid)
  ↓ Tool loading → run onLoad? + registerTool(pi, moduleId, toolDef)
  ↓ Track → LOADED_MODULES[moduleId] += toolNames
```

**Entry point detection:** `loader.ts` → `index.ts` → `{name}.ts` → first `.ts`

## Three Patterns

| Pattern | Use When | Loads | Example |
|---------|----------|-------|---------|
| **A: Function** | ≤3 tools, simple | All always | `solarwinds` |
| **B: Manifest** | ≥5 tools, growth | All or 1 | `task_execution` |
| **C: Hybrid** | Migrating/mixed | All + onLoad | Legacy → B |

**Pattern A** — Minimal boilerplate:
```typescript
export default async function (pi: ExtensionAPI) {
  pi.registerTool({ name: "tool1", ... });
}
```

**Pattern B** — Selective loading:
```typescript
export const tools = { tool1: {...}, tool2: {...} };
export const manifest = { id: "ext", tools };
export default async function (pi: ExtensionAPI) {
  for (const toolDef of Object.values(tools)) pi.registerTool({...});
}
```

**Pattern C** — Manifest + hook:
```typescript
export const tools = {...};
export const manifest = { id: "ext", tools, onLoad };
async function onLoad(pi) { /* extra setup */ }
```

## Current Extensions

| Module | Pattern | Tools | Selective |
|--------|---------|-------|-----------|
| task_execution | B | 10 | ✅ |
| solarwinds | A | 2 | ⚠️ |
| lean_ctx_sse | A | N/A | ⚠️ |

---

See **DEVELOPMENT.md** for how-to, **API.md** for reference.
