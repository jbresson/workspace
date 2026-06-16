# EXT-004: WIP Worktree Commands (User-Only) — Full Implementation Spec

## Status
- **Type**: Implementation-ready spec
- **Owner**: TBD
- **Scope**: Pi slash commands + helper module + tests + audit logging
- **Non-goals**: Remote push/PR automation, merge orchestration across remotes

---

## 1) Context
We are standardizing in-progress work around `~/workspace/wip` using **git worktrees**.
Each active task gets an isolated local worktree and branch. Graduation is an explicit user command that squashes and transfers commits to a target branch in the canonical repo.

This replaces file-copy proposal syncing.

---

## 2) Goals
1. Deterministic worktree lifecycle: prepare -> work -> inspect -> graduate -> prune.
2. Naming traceability: both project and issue encoded in dir + branch names.
3. Safe parallel branch work for same project.
4. Auditable graduation events with issue linkage + changed files + description.
5. Conflict flow pauses with clear user instructions.

---

## 3) Canonical Layout + Naming Contract

### Paths
- Canonical repo: `~/workspace/<project>`
- WIP root: `~/workspace/wip`
- Project wip root: `~/workspace/wip/<project>`
- Worktree path: `~/workspace/wip/<project>/<issue>__<slug>`

### Branch naming
- Worktree branch: `wip/<project>/<issue>/<slug>`

### Validation rules
- `<project>`: `[a-zA-Z0-9._-]+`
- `<issue>`: `[A-Z]+-[0-9]+` (default; configurable later)
- `<slug>`: `[a-z0-9][a-z0-9-]{1,62}`
- Reject whitespace and path separators in all three fields.

### Examples
- path: `wip/pi-agent/EXT-004__sync-worktree`
- branch: `wip/pi-agent/EXT-004/sync-worktree`

---

## 4) Command Surface (Single Source of Truth)

## 4.1 `/wip-prepare <project> <issue> <slug> [--base <ref>] [--json]`
Create or attach worktree.

**Default base behavior**
- If `--base` omitted: use canonical repo current `HEAD` symbolic branch ref if attached, else `HEAD` commit SHA.

**Behavior**
1. Resolve canonical path `~/workspace/<project>`.
2. Validate canonical path is git repo.
3. Compute branch + worktree path from naming contract.
4. If worktree exists and attached to same branch: return attach success (idempotent).
5. If branch exists but not attached: `git worktree add <path> <branch>`.
6. If branch missing: create via `git worktree add -b <branch> <path> <base>`.

**Output fields (json + text)**
- `project`, `issue`, `slug`
- `canonicalPath`, `worktreePath`
- `branch`, `baseRef`
- `created: boolean`
- `attached: boolean`

**Mutates**: yes

---

## 4.2 `/wip-list [project] [--json]`
List managed worktrees.

**Behavior**
- Enumerate via `git worktree list --porcelain` per project repo.
- If `project` omitted: scan `~/workspace/wip/*` folders and map to canonical repos.

**Per-row output**
- `project`
- `issue`
- `slug`
- `branch`
- `worktreePath`
- `headSha`
- `dirty` (true/false)
- `ahead`, `behind` (vs merge-base with canonical target if derivable; else null)

**Mutates**: no

---

## 4.3 `/wip-status <project> <issue> <slug> [--json]`
Status + diff summary for one worktree.

**Behavior**
- Resolve worktree path and branch.
- Run porcelain status + diffstat from merge-base against branch base.

**Output**
- clean/dirty
- staged/unstaged/untracked counts
- commits ahead count
- changed files list (name-status + stats)

**Mutates**: no

---

## 4.4 `/wip-graduate <project> <issue> <slug> --to <target-branch> [--no-squash] [--description "..."] [--issue-link <url>] [--no-prune] [--json]`
Graduate WIP changes into canonical repo target branch.

### Defaults
- Squash: **ON** (unless `--no-squash`)
- Auto-prune: **ON** (unless `--no-prune`)

### Preconditions
- Worktree exists.
- No unresolved index conflicts in worktree.
- Target branch exists in canonical repo (local branch required in v1).

### Graduation algorithm (transactional)

#### Phase A: Snapshot + Guard
1. Acquire global mutation lock (see section 7).
2. Capture transaction id `txId` + timestamps.
3. Verify canonical repo + worktree still valid.
4. Compute commit set `C` = commits reachable from worktree branch not in target branch.
5. If `C` empty and no dirty changes: no-op success (optionally prune if already clean and requested).

#### Phase B: Prepare source commit
6. Ensure worktree working tree clean enough to squash:
   - If dirty staged/unstaged: either block with instruction or include via temporary commit.
   - v1 rule: **block dirty tree** and ask user to commit/stash first.
7. If squash ON:
   - create single squash commit on source branch message:
     - title: `wip(<project>): <issue> <slug>`
     - body includes optional `description` + `issue-link`
   - record squash commit SHA `S`.
8. If squash OFF:
   - use ordered commit list `C`.

#### Phase C: Transfer
9. Checkout target branch in canonical repo worktree.
10. Cherry-pick:
    - squash ON: cherry-pick `S`
    - squash OFF: cherry-pick commits in topo order
11. If conflict:
    - status = `conflict_paused`
    - print exact next steps (section 8)
    - write audit event
    - **do not auto-prune**
    - release lock and return conflict exit status

#### Phase D: Complete
12. On success, collect:
    - moved commit sha(s)
    - resulting target head sha
    - changed file list from cherry-pick range
13. Write success audit entry.
14. If auto-prune enabled: call prune subroutine.
15. Release lock.

### Failure + rollback semantics
- If failure before cherry-pick modifies target: abort and return error.
- If failure during cherry-pick with partial state:
  - run `git cherry-pick --abort` in canonical repo
  - verify repo returns to pre-tx head
- If squash temp commit created but transfer failed:
  - leave source branch intact; no destructive rewrite in v1
- This satisfies: revert any files already synced in current transaction.

**Mutates**: yes

---

## 4.5 `/wip-prune <project> <issue> <slug> [--force] [--json]`
Remove worktree and optional branch ref.

### Behavior
1. Resolve worktree + branch.
2. If dirty and no `--force`: block.
3. Remove worktree: `git worktree remove <path>` (`--force` when requested).
4. Branch deletion policy:
   - default: keep branch unless graduation success marker present.
   - if success marker present and branch fully merged/cherry-picked, delete local branch.

**Mutates**: yes

---

## 4.6 `/wip-seed <project> <issue> <slug> <paths...> [--overwrite] [--json]`
Helper to copy canonical repo files into worktree area when needed.

### Rules
- Skip existing by default.
- `--overwrite` replaces.
- Only paths within canonical repo.
- This is optional utility; no graduation semantics.

---

## 5) User-Only Constraints
Commands are exposed only via `pi.registerCommand` handlers (interactive pathway). No tool equivalents for mutation operations in v1.

Mutation commands: `wip-prepare`, `wip-graduate`, `wip-prune`, `wip-seed`.

Read commands: `wip-list`, `wip-status`.

---

## 6) Safety Rules
1. Agent cannot create new symlinks.
2. Resolve realpath for canonical + worktree; both must stay under `~/workspace`.
3. Reject path traversal (`..`) and absolute user path overrides.
4. Allow sensitive files (open policy) because user command is trust boundary.
5. Binary files are allowed; git handles blob transfer naturally.

---

## 7) Locking Model
- Global lock file: `.pi/state/wip-sync.lock`
- Required for all mutation commands.
- No timeout auto-break.
- Lock payload:
  - `pid` (if available)
  - `command`
  - `project/issue/slug`
  - `startedAt`
  - `txId`
- If lock exists: command exits with actionable message (`/wip-unlock` planned future; for now manual intervention).

---

## 8) Conflict Prompt Contract (Exact)
When conflict occurs during graduate, emit:

1. Summary: `CONFLICT during cherry-pick to <target-branch>`
2. Affected files list.
3. Next steps:
   - `cd ~/workspace/<project>`
   - `git status`
   - resolve files
   - `git add <resolved-files>`
   - `git cherry-pick --continue` OR `git cherry-pick --abort`
4. Reminder: after continue success, run `/wip-prune ...` if desired.

Return structured status:
- `status: "conflict_paused"`
- `resumeRequired: true`

---

## 9) Audit Log Spec (Required)
Path: `.pi/logs/wip-graduations.jsonl`

One JSON object per event:
```json
{
  "ts": "2026-06-16T12:34:56.000Z",
  "txId": "wipgrad_20260616_123456_ab12",
  "command": "wip-graduate",
  "status": "success|conflict|failed",
  "project": "pi-agent",
  "issue": "EXT-004",
  "issueLink": "https://...",
  "slug": "sync-worktree",
  "worktreePath": "/Users/.../workspace/wip/pi-agent/EXT-004__sync-worktree",
  "sourceBranch": "wip/pi-agent/EXT-004/sync-worktree",
  "targetBranch": "main",
  "squash": true,
  "description": "short user description",
  "sourceCommits": ["abc123", "def456"],
  "movedCommits": ["789abc"],
  "filesChanged": ["src/a.ts", "README.md"],
  "preHead": "111aaa",
  "postHead": "222bbb",
  "error": null
}
```

Events required for:
- prepare success/fail
- graduate success/conflict/fail
- prune success/fail

---

## 10) Implementation Structure

### Target extension module
- `helpers/extensions/wip-worktree/loader.ts` (new)

### Internal helpers (module scope)
- `parseAndValidateNaming()`
- `resolvePaths()`
- `acquireLock()` / `releaseLock()`
- `runGit(repoPath, args[])`
- `getWorktreeMeta()`
- `graduateWorktree()`
- `pruneWorktree()`
- `appendAuditEvent()`
- `formatConflictPrompt()`

### Command registration
- `pi.registerCommand("wip-prepare", ... )`
- `pi.registerCommand("wip-list", ... )`
- `pi.registerCommand("wip-status", ... )`
- `pi.registerCommand("wip-graduate", ... )`
- `pi.registerCommand("wip-prune", ... )`
- `pi.registerCommand("wip-seed", ... )`

No `registerTool` for mutation commands in v1.

---

## 11) Error Codes / Status Contract
Every command returns structured `details.code` + human message.

Codes:
- `WIP_OK`
- `WIP_E_INPUT_INVALID`
- `WIP_E_REPO_NOT_FOUND`
- `WIP_E_NOT_GIT_REPO`
- `WIP_E_WORKTREE_EXISTS_MISMATCH`
- `WIP_E_LOCKED`
- `WIP_E_DIRTY_TREE`
- `WIP_E_TARGET_BRANCH_MISSING`
- `WIP_E_CHERRYPICK_CONFLICT`
- `WIP_E_GIT_ABORT_FAILED`
- `WIP_E_PRUNE_BLOCKED_DIRTY`
- `WIP_E_INTERNAL`

Conflict is not generic failure; it is explicit paused state.

---

## 12) Test Plan (Must Implement)

### Unit tests
1. naming parser accepts valid, rejects invalid tokens.
2. path resolver rejects traversal/escape.
3. lock acquire/release behavior.
4. audit event schema writer.

### Integration tests (temp repos)
1. prepare creates branch + worktree path.
2. list/status reflect dirty and commit-ahead state.
3. graduate squash+cherry-pick success path.
4. graduate conflict path returns `conflict_paused` + instructions.
5. graduate failure triggers cherry-pick abort and pre-head restored.
6. auto-prune on success; `--no-prune` preserves worktree.
7. prune blocks dirty tree unless `--force`.
8. parallel mutation blocked by lock.

### Edge tests
- binary file commit graduation
- issue-link + description audit presence
- branch already exists attach idempotence

---

## 13) Acceptance Criteria (Implementation Gate)
- [ ] All 6 commands registered and callable.
- [ ] Naming contract enforced in both path + branch.
- [ ] Worktree lifecycle works for multiple parallel branches per project.
- [ ] Graduation supports squash default and no-squash override.
- [ ] Conflict pauses with deterministic prompt + structured status.
- [ ] Auto-prune works by default post-success.
- [ ] Locking prevents concurrent mutation.
- [ ] Audit JSONL written with issue link, files changed, and description.
- [ ] Integration tests pass for success/conflict/failure paths.

---

## 14) Open Follow-ups (Out of Scope v1)
1. `/wip-unlock` safe recovery command.
2. Remote push/PR creation automation.
3. Branch-delete policy tuning after prune.
4. Configurable issue regex/project naming policies.

---

## 15) Notes
Earlier docs updated for WIP protocol:
- `.pi/SYSTEM.md`
- `wip/.pi/SYSTEM.md`
- `CLAUDE.md`
- `wip/CLAUDE.md`
- `memory/mindbase/wip-system.md`
- `wip/memory/mindbase/wip-system.md`
