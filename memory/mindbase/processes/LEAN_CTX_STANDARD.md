# Lean-Ctx Operational Standard

This project uses `lean-ctx` as the primary context engineering layer. Native shell commands for reading, searching, or listing are deprecated in favor of `ctx_*` tools to ensure token efficiency and better caching.

## Tooling Mapping
| Goal | Use Tool | Logic |
| :--- | :--- | :--- |
| **Read File** | `ctx_read(path, mode)` | `full` for edits, `signatures` for API, `map` for overview |
| **Search Text** | `ctx_grep(pattern, path)` | Fast pattern search |
| **Find Files** | `ctx_find(pattern)` | For non-contract discovery only |
| **List Dir** | `ctx_ls(path)` | Compact directory summaries |
| **Complex Analysis**| `ctx_call` | Use for `ctx_impact`, `ctx_callgraph`, `ctx_architecture` |
| **ENG-002 Spec Lifecycle** | `spec` | `action=ready` gate + init/append/link operations |
| **ENG-002 Safe Edit** | `safe_edit` | targeted source edit + ledger transaction lock |
| **ENG-002 Safe Write** | `safe_write` | full-file final write + ledger lock; requires `INV-DATA-LARGEWRITE-001` pass |
| **ENG-002 Audit** | `audit_change_ledger` | synchronous Verify/Audit integrity gate |

## The Golden Workflow
1. **Orient**: `ctx_session(action="status")`.
2. **Spec Ops**: use `spec action=<init|ready|append_invariant|append_scenario|link_issue>` for work-item lifecycle.
3. **Spec Ready**: run `spec action=ready` before any Do-phase source mutation.
4. **Read**: `ctx_read(path, "full")` before proposing mutation payload.
5. **Safe Mutation Path**: apply changes through `safe_edit` (targeted) or `safe_write` (full-file).
6. **Verify/Audit**: run `audit_change_ledger` synchronously with `actualModifiedFiles`.
7. **Record**: log findings/decisions in `ctx_session` + issue progress note.
8. **Tool provenance**: ensure `tool_calls.json` captures `spec|safe_edit|safe_write|audit_change_ledger|graduate`.

## The Scientific Debugging Loop
When a bug is identified or runtime behavior is analyzed:
1. **Observe**: Capture failure (logs, test output).
2. **Hypothesize**: Propose a cause.
3. **Predict**: "If X is true, then Y should happen."
4. **Experiment**: Modify code/env to test the prediction.
5. **Verify**: Did result == prediction?

**Surprise Analysis (Trigger: Tool Output != Prediction)**:
- **Pause**: Immediately stop the edit loop.
- **Gap Analysis**: Document `Expected` vs `Observed`.
- **Assumption Inventory**: List all beliefs that led to the failed prediction.
- **Direct Proofs**: Verify each assumption with a targeted test/log before resuming.

## Risk Gates
Before high-impact changes (Exported symbols, DB schemas, multi-file refactors):
- Run `ctx_call({"name":"ctx_impact","arguments":{"action":"analyze"}})`
- Run `ctx_call({"name":"ctx_callgraph","arguments":{"action":"callers"}})`
