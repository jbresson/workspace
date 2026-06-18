# Pi Guardrail Harness (Work In Progress)

**A sovereign, human-first workflow engine for AI agent codification and safe development practices.**

## What This Project Does

Pi Guardrail Harness is a **control & observation framework** designed to enable human developers to work **with** AI agents in a structured, auditable, and reversible manner. Rather than treating agents as black boxes, this system provides:

- **Omnitool**: A unified orchestration layer that manages all agent interactions with the filesystem and knowledge systems
- **Buddy Protocol**: Session-based ledgers that track decisions, findings, and progress in human-readable form
- **Guardrails**: Enforcement gates that prevent unsafe or irreversible actions without explicit human approval
- **Memory Architecture**: Three-tier knowledge management (L1 ephemeral → L2 session → L3 permanent)

The harness ensures that:
- ✅ **Every change is intentional** — drafted, audited, then graduated by human command
- ✅ **Work is always recoverable** — nothing is deleted without evidence of obsolescence
- ✅ **Decisions are visible** — critical choices tagged, reasoned, and reversibility-checked
- ✅ **Knowledge compounds** — evidence flows from session memory to permanent project memory

---

## Core Principles

### 1. The Librarian's Stewardship
Knowledge is the project's soul. All files are treated as a **curated archive of intelligence**, not disposable data.

- **Mindfulness**: Every interaction with the disk must be deliberate and preserve evidence
- **Protection**: Work-in-progress and findings are safeguarded; deletion requires "Evidence of Obsolescence"
- **Stewardship**: We organize, archive, and protect — not just clean up

### 2. Rigor Over Brevity
Truth and accuracy are paramount. Process gates are executed in full. Safety is never traded for speed.

### 3. The Law of Graduation (Sovereign User)
No change enters the real workspace without human intervention.

```
draft (WIP) → amend (WIP) → audit (WIP) → [USER graduation command]
```

- Agents request graduation readiness
- Users execute graduation with explicit approval
- Clean, auditable commit provenance is preserved

### 4. Memory Integrity & Ledger Hierarchy
Information lives at the lowest useful scope to prevent duplication.

- **Issue Root Ledger** (`wip/<issue>/BUDDY.md`): Cross-repo milestones and coordination
- **Repo Ledger** (`wip/<issue>/<repo>/BUDDY.md`): Granular implementation details and evidence

### 5. The Buddy Protocol
`BUDDY.md` is your session ledger and working memory — the primary source of truth for "what is happening now."

```markdown
# CURRENT FOCUS
One sentence defining the current sub-task scope

# EXECUTION GRAPH
- [ ] Sub-task 1 → [ ] Sub-task 2 → [ ] Victory

# WORKING NOTES
- (Timestamp) Observation: ...
- (Timestamp) Decision: ...

# THE WALL
- **Blockers**: None.
- **Risks**: ...

# HANDOVER
- **Last State**: ...
```

---

## Omnitool: The Unified Orchestrator

Omnitool is the **single interface** through which agents interact with the file system and knowledge.

| Verb | Purpose | Example |
| :--- | :--- | :--- |
| **`index`** | Map project structure | `omnitool({ action: "index" })` |
| **`fetch`** | Read file/range with caching | `omnitool({ action: "fetch", params: { path: "file.ts:@[10-20]" } })` |
| **`search`** | Pattern scan across code | `omnitool({ action: "search", params: { pattern: "foo" } })` |
| **`knowledge`** | Query/Verify deep memory | `omnitool({ action: "knowledge", params: { mode: "query", query: "X" } })` |
| **`note`** | Log thought/update session state | `omnitool({ action: "note", params: { scope: "repo", mode: "store", value: "..." } })` |
| **`draft`** | Create-only write to `wip/` | `omnitool({ action: "draft", params: { path: "...", content: "..." } })` |
| **`amend`** | Surgical edit in `wip/` | `omnitool({ action: "amend", params: { path, oldText, newText } })` |
| **`audit`** | Verify changes in `wip/` before graduation | `omnitool({ action: "audit", params: { target: "..." } })` |

### The Workspace Orchestrator (WIP Actions)

Manage the shared `wip/` environment:

```javascript
omnitool({ action: "wip", params: { subAction: string, ... } })
```

- **`init`**: Bootstrap a ticket (create root → clone repos → init ledgers)
- **`clone`**: Add a repo to a ticket
- **`status`**: Aggregate view of Root and Repo ledgers
- **`sync`**: Pull latest remote → Resolve in `wip/`
- **`diff`**: Compare `wip/` vs Remote before graduation
- **`abort`**: Delete entire WIP-Issue directory

---

## The Cognitive Engine (Operational Loop)

Every agent task cycles through:

```
1. Orient       → Load minimal truth from memory
2. Map          → Define AC, risks, dependencies
3. Foresee      → Predict failure modes
4. Do           → Navigate → Analyze → Validate → Offload
5. Verify       → Pressure checks, AC coverage, false-win detection
6. Record       → Promote findings to permanent memory
```

### Key Gates

| Gate | Trigger | Outcome |
| :--- | :--- | :--- |
| **Pressure Check (2e)** | Every N iterations | Audit convergence, contradictions, cognitive load, unknowns drift |
| **AC Checklist (P4)** | Pre-graduation | Verify all acceptance criteria satisfied |
| **False Win Scan (P4)** | Pre-graduation | Verify mitigations for phase-0 identified risks |
| **Edge Case Sweep (P4)** | Pre-graduation | Brainstorm production failure modes |
| **Decision Audit (P3)** | For [IRREVERSIBLE] decisions | Verify necessity, alternatives considered, team informed, rollback documented |

---

## Project Structure

```
pi-guardrail-harness/
├── AGENTS.md                    # Core principles & operational workflow
├── BUDDY.md                     # Session template for current work
├── package.json                 # Dependencies: @modelcontextprotocol/sdk, pi-lean-ctx
├── memory/                      # Permanent knowledge (L3)
│   ├── MANIFEST.md              # Index of all memory
│   ├── ARCHITECTURE.md          # System design & patterns
│   ├── guardrails/              # Enforcement logic
│   ├── knowledgebase/           # Declarative facts
│   └── mindbase/                # Processes & procedures
├── wip/                         # Work-in-progress (L2 session boundary)
│   └── <issue>/                 # Issue-scoped workspace
│       ├── BUDDY.md             # Root ledger (cross-repo coordination)
│       └── <repo>/BUDDY.md      # Repo ledger (implementation details)
├── issues/                      # Issue tracking & status
│   ├── active/                  # Current work
│   ├── archive/                 # Completed
│   └── backlog/                 # Proposed
├── helpers/                     # Extension modules
│   ├── lean-ctx/                # Context engine tools
│   ├── skills/                  # Reusable procedures
│   └── scripts/                 # Automation & diagnostics
└── .pi/                         # Pi agent extensions (guardrails, omnitool, doc-review)
```

---

## Getting Started

### Installation

```bash
npm install
```

### Running Tests

Verify guardrails, omnitool, and full-cycle workflows:

```bash
npm test
```

Individual test suites:

```bash
npm run test:ext:omnitool                    # Omnitool functionality
npm run test:ext:guardrails:logic            # Guardrail enforcement
npm run test:ext:guardrails:negotiation      # Multi-agent negotiation gates
npm run test:ext:guardrails:full-cycle       # End-to-end workflows
npm run test:ext:doc-review                  # Documentation validation
```

### Typical Developer Workflow

1. **Init a ticket**:
   ```javascript
   omnitool({ action: "wip", params: { subAction: "init", issueId: "123" } })
   ```

2. **Understand current state**:
   ```javascript
   omnitool({ action: "index" })
   omnitool({ action: "fetch", params: { path: "BUDDY.md" } })
   ```

3. **Make changes in draft**:
   ```javascript
   omnitool({ action: "draft", params: { path: "wip/123/src/file.ts", content: "..." } })
   omnitool({ action: "amend", params: { path: "wip/123/src/file.ts", oldText: "A", newText: "B" } })
   ```

4. **Audit before graduation**:
   ```javascript
   omnitool({ action: "audit", params: { target: "wip/123" } })
   omnitool({ action: "wip", params: { subAction: "diff", issueId: "123" } })
   ```

5. **Request human graduation** (update BUDDY.md):
   ```markdown
   ## STATUS: READY_FOR_GRADUATION
   All AC verified, no unresolved risks.
   ```

6. **User executes graduation** (outside agent scope):
   ```bash
   graduation-command <issue> --target=repo --commit-msg="..."
   ```

---

## Key Design Principles

### No Magic
Everything is explicit: every change, every decision, every risk. Traceability by default.

### Reversible by Default
Use [REVERSIBLE] tags on decisions. Mark [IRREVERSIBLE] with justification, alternatives considered, and rollback plans.

### Human is Sovereign
Agents prepare, propose, audit. Humans approve and graduate. The boundary is never blurred.

### Evidence Matters
Findings are tagged with confidence levels (Confirmed, Supported, Hypothesis, Inconclusive) and backed by evidence references.

### Memory Compounds
Session findings → permanent memory. Decisions → decision registry. Risks → risk register.

---

## FAQ

**Q: Why separate `draft` and `audit` from graduation?**  
A: Humans need time to review proposed changes. Graduation is an explicit human command, never automatic.

**Q: What if I need to rollback after graduation?**  
A: Graduated changes should have rollback plans (for [IRREVERSIBLE] decisions). Update the issue with rollback evidence and create a followup.

**Q: How do I know if a decision is reversible?**  
A: Check the decision registry in `memory/`. All decisions are tagged. Reversibility is context-dependent — ask your team.

**Q: Where does session state go?**  
A: `wip/<issue>/BUDDY.md` (root) and `wip/<issue>/<repo>/BUDDY.md` (repo-level). When the issue closes, promoted findings move to `memory/`.

**Q: Can agents delete files?**  
A: No. Agents can only draft/amend in `wip/`. Real deletions must be human decisions with evidence.

---

## Contributing

1. Read `AGENTS.md` for operational workflow
2. Review existing `wip/<issue>/BUDDY.md` to understand current state
3. Use omnitool for all filesystem & knowledge interactions
4. Audit your work in `wip/` before requesting graduation
5. Update ledgers with findings, decisions, and blockers
6. **Wait for human graduation** — do not commit directly

---

## License

[Specify your license]

## Contacts & Support

- **Architecture Questions**: See `memory/ARCHITECTURE.md`
- **Operational Questions**: See `AGENTS.md`
- **Current Work**: Check `BUDDY.md` or `wip/<issue>/`
- **Issues**: File in `issues/active/` with evidence and owner

---

**Made for developers who value safety, audibility, and intelligence that compounds over time.**
