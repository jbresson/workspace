# Extensions

Pi extension system for lazy-loading tools.

## Documentation

| Document | Purpose | Read First? |
|----------|---------|-------------|
| **GUIDE.md** | Architecture, concepts, patterns, decision matrix | ✅ Start here |
| **DEVELOPMENT.md** | Step-by-step guides to build extensions, best practices | Build extensions |
| **API.md** | Complete API reference, tool structure, examples | Reference |

## Quick Links

### I want to...

**Understand the system**
→ Read GUIDE.md

**Build a new extension**
→ Read DEVELOPMENT.md → Quick Start section

**Migrate from Pattern A to B**
→ DEVELOPMENT.md → Migration section

**Look up API details**
→ API.md

**See all available tools**
```
load_helper_extension { module: "list" }
```

**Load a single tool**
```
load_helper_extension { module: "task_execution", tool: "task_ignition" }
```

## How It Works (30 seconds)

1. **Auto-discovery:** Pi scans `helpers/extensions/` directory
2. **On demand:** Call `load_helper_extension { module: "X" }` to load extension
3. **Selective:** Can load entire extension or single tools from it
4. **Backward compatible:** Legacy extensions (function-only) still work

## Current Extensions

- **task_execution** — 10 tools for task lifecycle (supports selective loading)
- **solarwinds** — Query database samples (all-or-nothing)
- **lean_ctx_sse** — MCP SSE bridge (all-or-nothing)

## Adding New Extension

```bash
mkdir helpers/extensions/my-extension
cat > helpers/extensions/my-extension/index.ts
# Write code...
# Restart Pi
# load_helper_extension { module: "my-extension" }
```

See DEVELOPMENT.md for full guide.
