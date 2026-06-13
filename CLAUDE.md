# Project Root
```<ONLY_CARE_ABOUT_THIS_IF_YOU_ARE "Claude">
## 🎯 Quick Start
1. Load system prompt: `memory/mindbase/wip-system.md` (Your operating instructions).
2. Orient via `memory/MANIFEST.md` (Navigation index).
3. Execute tasks using coordinates: `path:@[lines]` (Zero discovery overhead).

## 🗺️ Navigation
All project intelligence is partitioned into the `/memory` directory. **Lazy load all context.**

- **System Prompt** (Canonical): `memory/mindbase/wip-system.md` (7-phase loop, tool signatures, memory pipeline).
- **Index**: `memory/MANIFEST.md` (Locate specific memory files by category).
- **Mandates** (Law): `memory/mindbase/identity/MANDATES.md` (Non-negotiable constraints, tool governance).
- **Rigor Baseline**: `memory/mindbase/identity/RIGOR_BASELINE.md` (Safety rails: never sacrifice logic for brevity).
- **Workflow**: `memory/mindbase/processes/LEAN_CTX_STANDARD.md` (Tool mapping, golden workflow, risk gates).
- **Memory Process**: `memory/mindbase/processes/memory_management.md` (L1→L2→L3 pipeline, issue flow).

## 🛠️ Execution
- **Philosophy**: Lazy-load everything. Do not auto-load files or directories.
- **Tools**: Use specialized `ctx_*` tools exclusively. Refer to `memory/mindbase/wip-system.md` (Tools section) for exact signatures.
- **Coordinates**: When provided coordinates (`path:@[start-end]`), use targeted reads via `ctx_read({path, offset, limit})`. No discovery.
  - **Format**: `path/to/file.ts:@[42-85]` (Read lines 42-85 from file.ts).
  - **Example task**: "Fix bug in memory_management.md:@[17-25] (Registry initialization)."
  - **Execution**: `ctx_read({path: "memory/mindbase/processes/memory_management.md", offset: 17, limit: 9})`.
- **Issues**: Agent-identified needs → `issues/backlog/` → `ideas.md` → `todo.md` (via human review).

## 🚨 Escalation & Blockers
**If task cannot proceed:**

1. **Blocker (Hard Stop)**: 
   - Create issue in `issues/active/` with exact blocker rationale.
   - Use format: `BLOCK-XXX-[descriptor].md`.
   - Example: `BLOCK-001-missing-file-coordinates.md`.
   - Escalate via `ctx_session(action="task", value="BLOCKER: [reason]")`.

2. **Architectural Question**:
   - Create issue in `issues/backlog/` with question + impact.
   - Link to affected memory files.
   - Flag for human review via `ideas.md`.

3. **Token Overflow**:
   - Immediately offload via `ctx_session(action="finding", value="[TRIM] files to evict: ...")`.
   - Declare which stale files can be dropped.
   - Do not proceed until context is restored.

4. **Contradictions Found**:
   - Log via `ctx_session(action="finding", value="[CONFLICT] source1 vs source2: ...")`.
   - Do not archive conflicting findings.
   - Mark as uncertain and escalate to human.

---

## 📋 Key Shortcuts
- **When stuck on tool usage**: `memory/mindbase/processes/LEAN_CTX_STANDARD.md` (Risk Gates section).
- **When uncertain about rigor**: `memory/mindbase/identity/RIGOR_BASELINE.md` (Never skip these).
- **When tracking memory**: `ctx_session(action="status")` → see all findings/decisions from current task.

</ONLY_CARE_ABOUT_THIS_IF_YOU_ARE "Claude">```
