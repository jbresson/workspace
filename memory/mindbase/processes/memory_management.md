# Memory Management & Knowledge Lifecycle
This process defines how info flows from raw observation to persistent project intelligence.
## 1. The Memory Hierarchy (L1 -> L3)
| Level | Type | Scope | Tool | Lifespan |
| **L1** | Working Memory | cur Window | ctx_read / Tokens | Turn-based |
| **L2** | Episodic Memory | Session ctx | ctx_session(finding/decision) | Task-based |
| **L3** | Semantic Memory | Project Knowledge | .md files in /memory | Permanent |
## 2. The Capture Pipeline (Knowledge prod)
Agents must pay a "Knowledge Tax" at the end of every task (Record phase).
### L1 -> L2 (Active Capture)
During exec, immediately offload strategic info to prevent window bloat:
- **Findings**: Technical facts discovered -> ctx_session(action="finding", val="...")
- **Decisions**: Why X was chosen over Y -> ctx_session(action="decision", val="...")
- **Ambiguities**: Open questions -> ctx_session(action="finding", val="[?] ...")
### L2 -> L3 (Persistence/Migration)
During Cool-Down, promote validated info to the permanent record:
- **Procedural Truths** -> Update or create files in memory/mindbase/processes/.
- **Declarative Facts** -> Update or create files in memory/knowledgebase/projects/.
- **Architecture Shifts** -> Update ARCHITECTURE.md and MANIFEST.md.
## 3. Task & Issue Management
Issues are the single source of truth for work tracking.
1. **Discovery**: Agent identifies a need or improvement.
2. **Capture**: Create a detailed issue file in `issues/` (categorized into `/active`, `/backlog`, or `/archive`).
3. **Triage**: Human review updates issue status/priority/owner directly in the issue.
4. **Execution Tracking**: Progress, blockers, AC checks, and completion evidence are updated in the same issue.
**Rule**: No "invisible" tasks. If it needs doing, it must exist as an issue.
## 4. ctx Hygiene (L1 Management)
- **Min-Load**: Always start with ctx_session(status) -> ctx_knowledge(wakeup).
- **Hierarchical Reading**: signatures -> map -> full.
- **Eviction**: When ctx is full, explicitly identify stale files to ignore.
