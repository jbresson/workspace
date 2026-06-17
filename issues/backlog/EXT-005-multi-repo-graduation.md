# Issue EXT-005: Multi-Repo Workspace & Graduation Orchestrator

## 🎯 Objective
Implement ticket-scoped WIP orchestration + user-sovereign graduation where code promotion is explicit, auditable, and never exposed as an agent tool-call avenue.

---

## ✅ Current State (Resolved vs Open)

## Completed
- `wip` orchestration baseline implemented with:
  - `init(ticketId, ...)`
  - `clone(ticketId, repoName, justification, ...)`
  - `status(ticketId)`
  - `abort(ticketId)`
- Ticket and repo ledgers are created under `wip/TICKET-ID/...`.
- Archived repo ledgers can be restored on re-clone (`.archives/<repo>/BUDDY.md`, `tool_call.json`).
- Gatekeeper policy added to block any tool-call graduation avenue (`graduate`-intent blocked in tool interception).
- Command surface migrated to final contracts: `/graduate <issue> [<repo>]`, `/graduate-force <issue> [<repo>]`, `/graduate-status <issue> [<repo>]`.

## Corrective Decisions Locked
- **No agent graduation avenue**: graduation must not be callable as an omnitool/wip sub-action for agents.
- Graduation is a **user command** only.
- Treat local source cache (`~/workspace`) as integration target (“our remote” for graduation step); user pushes at their own discretion.

## Still Open
- `sync` and `diff` wip sub-actions remain outside this command-contract update.
- Optional stricter branch policy gates tracked in follow-up (`EXT-005-followup-graduate-branch-gates.md`).

---

## 🧱 Ledger Hierarchy (Invariant)
- **Root Ledger**: `wip/TICKET-ID/BUDDY.md` + `tool_call.json`
- **Repo Ledger**: `wip/TICKET-ID/REPO/BUDDY.md` + `tool_call.json`
- **Invariant**: information stored at lowest useful scope. Root ledger carries cross-repo coordination only.

---

## 🛠️ `wip` Tool Scope (omnitool dispatcher)

### Implemented
- `init({ ticketId, goals?, repos? })`
- `clone({ ticketId, repoName, justification, repoPath? })`
- `status({ ticketId })`
- `abort({ ticketId })`

### Pending
- `sync({ ticketId, repoName })`
- `diff({ ticketId, repoName })`

---

## 🚀 Graduation Spec (Full Detail)

## Command Contracts (Final)

### 1) Review
`/graduate <issue> [<repo>]`
- User command only.
- If `<repo>` provided: review single repo, stop.
- If `<repo>` omitted: traversal mode picks alphabetical first active repo under `wip/<issue>/`.
- Emits review payload only (no destination mutation).
- Checkpoints ticket milestone: `repo <name> reviewed`.

### 2) Execute
`/graduate-force <issue> [<repo>]`
- Explicit user “yes” command, no extra confirmation gate.
- If `<repo>` provided: execute single repo.
- If omitted: execute current traversal target (alphabetical first not-done).
- Runs curated cherry-pick bucket flow into destination local source cache.
- On success checkpoint milestone: `repo <name> done`.

### 3) Status
`/graduate-status <issue> [<repo>]`
- Shows self + children status.
- Includes last reviewed/forced timestamps.
- Includes pending/done traversal repos.
- Includes latest outcome (`success` | `conflict_paused` | `force_failed_rolled_back` | `noop`).

## Safety Preconditions (Hard Gates)
1. Destination source cache repo exists (default `~/workspace/<repo>` or configured canonical path).
2. Destination is a git repo.
3. Destination branch determinable (not detached HEAD).
4. Destination working tree clean.
5. WIP repo exists at `wip/<issue>/<repo>` and is git.
6. Tool-call path to graduation remains blocked by gatekeeper (no agent tool-call graduation avenue).

## SHA Visibility Problem + Resolution
- WIP commit SHAs do not inherently exist in local src repo object database.
- Therefore local src cannot cherry-pick unknown WIP SHAs directly.

### Required resolution sequence
1. Add WIP repo as temporary remote in destination source cache.
2. Fetch remote.
3. Resolve ordered candidate source SHA list via branch delta.
4. Apply ordered curated flow.

## Promotion Strategy: Curated Ordered Buckets
Locked policy for now:
- Deterministic bucketization: `1 source SHA = 1 bucket`.
- Preserve source SHA order.

Per bucket:
1. `cherry-pick -n <sha>`
2. Validate staged scope is non-empty.
3. Commit with structured message containing source SHA(s).

### Phase D — Verify + finalize
- Run required checks (at minimum clean index + expected file set + no unresolved conflicts).
- Record mapping: source WIP SHAs -> destination curated commit SHA(s).
- Update ledgers, archive repo ledger, purge `wip/<ticket>/<repo>`.
- **No auto-push** in graduation command (user pushes manually later).

---

## ❗Conflict & Failure Behavior

## Cherry-pick conflict
- Pause with explicit `conflict_paused` contract.
- Provide next commands/instructions to resolve.
- No archive/purge until completion.

## Fatal failure during apply
- Abort in-progress cherry-pick state.
- Restore pre-graduation HEAD in local src cache when possible.
- Keep WIP repo intact.
- Log failure in repo ledger and root ledger handover.

## Partial success policy
- Rollback-all policy locked.
- No partial finalized graduation state.
- Archive/purge only on successful finalize.

---

## 📝 Audit / Ledger Requirements
On successful graduation record:
- issue, repo, timestamp
- source SHAs selected
- curated bucket definitions
- resulting destination SHA mapping (source->destination)
- archive path confirmation

Markdown ledgers (`# GRADUATION` section required):
- current status (self + children)
- ordered timestamped milestones/checkpoints
- summary list of completed graduations

JSON system ledgers:
- ticket-level: `wip/<issue>/graduation.events.json`
- repo-level: `wip/<issue>/<repo>/graduation.events.json`

Required event types:
- `review_created`
- `force_started`
- `conflict_paused`
- `force_failed_rolled_back`
- `force_succeeded_finalized`

Finalize:
- archive repo ledger to `.archives/<repo>/`
- purge active `wip/<issue>/<repo>/` only after successful finalize

---

## 4. Session Identification
- `sessionId = TICKET-ID` for internal calls, guardrails, and audit correlation.

---

## ✅ Acceptance Criteria (Updated)
1. Agent can initialize ticket and clone multiple repos with separate ledgers.
2. Re-clone restores archived repo ledger artifacts for same ticket/repo.
3. User can run `/graduate <issue> [<repo>]` for review and `/graduate-force <issue> [<repo>]` for execution using curated cherry-pick flow.
4. Graduation is blocked from all tool-call avenues (policy enforced in gatekeeper).
5. Graduation does not auto-push; user push remains explicit/manual.
6. Archive + purge happen only after successful promotion finalization.
7. Graduation emits auditable source->destination SHA mapping.

---

## Follow-up Links
- `MEMO-graduate-squash-push-followup.md` (design clarifications and open policy questions)