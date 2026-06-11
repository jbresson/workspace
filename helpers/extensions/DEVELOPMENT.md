# Extension Development Guide

## Quick Start

```bash
mkdir helpers/extensions/my-ext
cat > helpers/extensions/my-ext/index.ts << 'EOF'
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export const tools = {
  my_tool: {
    name: "my_tool",
    description: "Does something",
    parameters: Type.Object({ input: Type.String() }),
    execute: async (toolCallId, params, pi) => ({
      content: [{ type: "text", text: "Result: " + params.input }],
    }),
  },
};

export const manifest = { id: "my-ext", tools };

export default async function (pi: ExtensionAPI) {
  for (const t of Object.values(tools)) {
    pi.registerTool({ name: t.name, description: t.description, parameters: t.parameters, async execute(id, p) { return t.execute(id, p, pi); } });
  }
}
EOF
```

Reload Pi. Tool available as `my_ext_my_tool`.

## Pattern Examples

**Pattern A (Simple):**
```typescript
export default async function (pi: ExtensionAPI) {
  pi.registerTool({ name: "action", ... });
}
```

**Pattern B (Scalable):**
```typescript
export const tools = {
  action1: { name, description, parameters, execute },
  action2: { ... },
};
export const manifest = { id: "ext", tools };
export default async function (pi) {
  for (const t of Object.values(tools)) pi.registerTool({...});
}
```

**Pattern C (Hybrid):**
```typescript
export const tools = {...};
async function onLoad(pi) { /* setup */ }
export const manifest = { id: "ext", tools, onLoad };
```

## Tool Structure

```typescript
{
  name: "tool_name",                           // snake_case
  description: "What it does",                 // 1 line
  parameters: Type.Object({                    // Typebox schema
    param1: Type.String({ description: "..." }),
    param2: Type.Optional(Type.Number()),
  }),
  execute: async (toolCallId, params, pi) => { // Returns AgentToolResult
    try {
      const result = await operation(params);
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  },
}
```

## Typebox Cheat Sheet

```typescript
Type.String()
Type.Number()
Type.Integer()
Type.Boolean()
Type.Optional(Type.String())
Type.Array(Type.String())
Type.Enum(["a", "b"])
Type.Object({ field: Type.String() })
Type.String({ description: "...", default: "..." })
```

## Using ExtensionAPI (pi)

```typescript
await pi.exec("npm", ["list"]);           // Shell
await pi.readFile("path");                // Read file
await pi.writeFile("path", "content");    // Write file
```

## Migration: A → B

1. Move tool registrations to `tools` object
2. Extract execute function to tool property
3. Add `manifest` export
4. Keep `default` export for registration
5. Update execute signature: `async (..., pi) => ...`

## Best Practices

| Item | Do | Don't |
|------|----|----|
| Names | `snake_case`, descriptive | Abbreviate, use `camelCase` |
| Params | Use Typebox, describe | String params, no schema |
| Errors | Try/catch, return isError | Throw, no error info |
| Async | Always await external calls | Block event loop |
| Patterns | Use B for growth, A for simple | Force B on everything |

## Directory Structure

```
helpers/extensions/
├── my-ext/
│   ├── index.ts         # Entry (required)
│   ├── types.ts         # Shared types (optional)
│   └── helpers.ts       # Utilities (optional)
├── GUIDE.md
├── DEVELOPMENT.md
├── API.md
└── README.md
```

## Testing

```bash
pi
load_helper_extension { module: "my-ext" }
my_ext_my_tool { input: "test" }
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | Directory/entry missing | Check `helpers/extensions/my-ext/index.ts` exists |
| Unknown extension | Module not in discovery | Restart Pi |
| Param errors | Wrong schema | Check Typebox Type matches usage |
| Tool errors | Exception in execute | Add try/catch, log params |

---

See **GUIDE.md** for patterns, **API.md** for full reference.
