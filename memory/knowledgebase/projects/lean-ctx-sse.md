# Project Findings

## Extension System
- **Status**: Complete.
- **Capabilities**: Auto-discovery, lazy-load, selective tool loading.
- **Patterns**: Implements 3 patterns (A/B/C).
- **Documentation**: Located at `.pi/extensions/` (`GUIDE.md`, `DEVELOPMENT.md`, `API.md`).

## Lean-Ctx SSE
- **Bridge**: `McpSseBridge` is active.
- **Lifecycle**: On first call to `project_memory_lean_ctx(projectPath)`, SSE transport connects to the server and discovers MCP tools.
