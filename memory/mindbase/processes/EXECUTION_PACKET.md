# Execution Packet Standard

To maximize token efficiency, Managers must dispatch Worker Agents using the following structured format.

## Packet Structure
```text
### [OBJECTIVE]
Clear, concise goal (e.g., "Update HF download timeout").

### [TARGETS]
- `path/to/file.ts`: Lines 45-60 (Focus: `timeout` variable)
- `path/to/config.json`: Key `request_timeout`

### [ACTION]
Exact modification required. Avoid ambiguity.
"Change timeout from 300 to 600."

### [VERIFICATION]
Command or check to prove success.
`ctx_shell("npm test")` or `ctx_read(path, "diff")`.
```

## Manager's Checklist for Token Efficiency:
1. **Pre-Read**: Manager should use `ctx_outline` or `ctx_symbol` to find the exact lines *before* dispatching.
2. **No Ambiguity**: Never say "Look into the config file"; say "Check `config.json` line 12".
3. **Context Pruning**: Only provide the specific fragments of memory needed for this sub-task.
