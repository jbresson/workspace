# Memory Management & Knowledge Lifecycle

This process defines how information flows from raw observation to persistent project intelligence.

## 1. The Memory Hierarchy (L1 -> L3)
| Level | Type | Scope | Tool | Lifespan |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | Working Memory | Current Window | ctx_read / Tokens | Turn-based |
| **L2** | Episodic Memory | Session Context | ctx_session(finding/decision) | Task-based |
| **L3** | Semantic Memory | Project Knowledge | .md files in /memory | Permanent |

## 2. The Capture Pipeline (Knowledge Production)
Agents must pay a "Knowledge Tax" at the end of every task (Record phase).

### L1 -> L2 (Active Capture)
During execution, immediately offload strategic info to prevent window bloat:
- **Findings**: Technical facts discovered -> ctx_session(action="finding", value="...")
- **Decisions**: Why X was chosen over Y -> ctx_session(action="decision", value="...")
- **Ambiguities**: Open questions -> ctx_session(action="finding", value="[?] ...")

### L2 -> L3 (Persistence/Migration)
During Cool-Down, promote validated info to the permanent record:
- **Procedural Truths** -> Update or create files in memory/mindbase/processes/.
- **Declarative Facts** -> Update or create files in memory/knowledgebase/projects/.
- **Architecture Shifts** -> Update ARCHITECTURE.md and MANIFEST.md.

## 3. Task & Issue Management
To maintain a clean todo.md, use the following request flow:
1. **Discovery**: Agent identifies a need or improvement.
2. **Capture**: Create a detailed issue file in .pi/issues/ (or project root issues/).
3. **Proposal**: Link the issue in memory/mindbase/processes/TASK_MANAGEMENT.md -> ideas.md.
4. **Commitment**: Human review => Move from ideas.md -> todo.md.

**Rule**: No "invisible" tasks. If it needs doing, it must be an issue -> idea -> todo.

## 4. Context Hygiene (L1 Management)
- **Min-Load**: Always start with ctx_session(status) -> ctx_knowledge(wakeup).
- **Hierarchical Reading**: signatures -> map -> full.
- **Eviction**: When context is full, explicitly identify stale files to ignore.
