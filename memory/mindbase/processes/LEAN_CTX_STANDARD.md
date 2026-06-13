# Lean-Ctx Operational Standard

This project uses `lean-ctx` as the primary context engineering layer. Native shell commands for reading, searching, or listing are deprecated in favor of `ctx_*` tools to ensure token efficiency and better caching.

## Tooling Mapping
| Goal | Use Tool | Logic |
| :--- | :--- | :--- |
| **Read File** | `ctx_read(path, mode)` | `full` for edits, `signatures` for API, `map` for overview |
| **Search Text** | `ctx_grep(pattern, path)` | Fast pattern search |
| **Find Files** | `ctx_find(pattern)` | Glob-based file discovery |
| **List Dir** | `ctx_ls(path)` | Compact directory summaries |
| **Side Effects** | `ctx_shell(command)` | Build, test, git (auto-compressed) |
| **Complex Analysis**| `ctx_call` | Use for `ctx_impact`, `ctx_callgraph`, `ctx_architecture` |

## The Golden Workflow
1. **Orient**: `ctx_session(action="status")` $\rightarrow$ `ctx_knowledge(action="wakeup")`.
2. **Locate**: `ctx_grep` or `ctx_find` to identify target files.
3. **Read**: `ctx_read(path, "full")` before any edit.
4. **Edit**: Precise edits using `edit` tool.
5. **Verify**: `ctx_read(path, "diff")` + `ctx_shell` for tests.
6. **Record**: Log findings via `ctx_session(action="finding", value="...")`.

## Risk Gates
Before high-impact changes (Exported symbols, DB schemas, multi-file refactors):
- Run `ctx_call({"name":"ctx_impact","arguments":{"action":"analyze"}})`
- Run `ctx_call({"name":"ctx_callgraph","arguments":{"action":"callers"}})`
