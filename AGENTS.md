# 🚨 CORE PRINCIPLES (The Non-Negotiables)

## 1. Rigor Over Brevity
Truth and accuracy are paramount. Never sacrifice operational rigor or safety for the sake of brevity. If a process requires a check, execute it fully.

## 2. Sole Access Interface
**Only `omnitool` is available.** Any attempt to use legacy tools (`ctx_*`), native shell commands (`bash`, `sh`), or direct filesystem access is a violation of systemic law.

## 3. The Law of Graduation (Sovereign User)
No change enters the real workspace without human intervention. 
**The Flow**: `draft` (WIP) $\rightarrow$ `amend` (WIP) $\rightarrow$ `audit` (WIP) $\rightarrow$ **User executes `graduate <repo>`**.
- Graduation involves squashing commits into meaningful batches for a clean git history.
- Post-graduation, code is read from the remote branch on the correct git branch.

## 4. Memory Integrity & Ledger Hierarchy
Information is stored at the lowest possible level to prevent duplication.
- **Ticket Ledger (`wip/TICKET-ID/BUDDY.md`)**: The "Skeleton". Overall goals, cross-repo milestones, and pointers to archived repo ledgers.
- **Repo Ledger (`wip/TICKET-ID/REPO/BUDDY.md`)**: The "Meat". Granular implementation details, local struggles, and technical evidence.

---

# 🎯 OPERATIONAL WORKFLOW

## The Librarian's Registry
Use `omnitool` with the following verbs:

| Verb | Purpose | Params | Example |
| :--- | :--- | :--- | :--- |
| **`index`** | Map project structure | `{ scope?: string }` | `omnitool({ action: "index" })` |
| **`fetch`** | Direct read of file/range | `{ path: string }` | `omnitool({ action: "fetch", params: { path: "file.ts:@[10-20]" } })` |
| **`search`** | Pattern scan across code | `{ pattern: string }` | `omnitool({ action: "search", params: { pattern: "foo" } })` |
| **`knowledge`** | Query/Verify deep memory | `{ mode, query }` | `omnitool({ action: "knowledge", params: { mode: "query", query: "X" } })` |
| **`note`** | Log thought/update state | `{ scope: "ticket" \| "repo", mode, value }` | `omnitool({ action: "note", params: { scope: "repo", mode: "store", value: "..." } })` |
| **`draft`** | Full write to `wip/` | `{ path, content }` | `omnitool({ action: "draft", params: { path: "...", content: "..." } })` |
| **`amend`** | Surgical edit in `wip/` | `{ path, oldText, newText }` | `omnitool({ action: "amend", params: { ... } })` |
| **`audit`** | Verify change in `wip/` | `{ target: string }` | `omnitool({ action: "audit", params: { target: "..." } })` |

## The Workspace Orchestrator (`wip` action)
For managing the environment, use `omnitool({ action: "wip", params: { subAction: string, ... } })`:
- **`init`**: Bootstrap a ticket (Create root $\rightarrow$ Clone initial repos $\rightarrow$ Init ledgers).
- **`clone`**: Add a repo to a ticket (Requires justification $\rightarrow$ Negotiation Gate).
- **`status`** : Aggregate view of Root and Repo ledgers.
- **`sync`**: Pull latest remote $\rightarrow$ Resolve in `wip/`.
- **`diff`**: Compare `wip/` vs Remote before graduation request.
- **`abort`**: Delete entire `WIP-Issue` directory.

## Task Execution Loop
1. **Orient**: `index` structure $\rightarrow$ `fetch` target $\rightarrow$ Read `BUDDY.md` (Root & Repo).
2. **Contextualize**: `knowledge` (recall facts) $\rightarrow$ `note(scope: "repo")` (plan in local ledger).
3. **Implement**: `draft` or `amend` into the `wip/` mirror.
4. **Verify**: `audit` the `wip/` version.
5. **Request Promotion**: Update Local Ledger to `STATUS: READY_FOR_GRADUATION` $\rightarrow$ Prompt User: *"Please run 'graduate <repo>'."*

---

# 🤝 THE BUDDY PROTOCOL
`BUDDY.md` is your session ledger and working memory. It is the primary source of truth for "what is happening now."

- **Ticket-Level**: High-level milestones, cross-repo dependencies.
- **Repo-Level**: Granular implementation notes, local findings.
- **Handover**: Always update the `# HANDOVER` section before ending a turn.
