# Omnitool Standard — Implementation Guide

## Overview

**Omnitool** is the single authorized tool interface for agent mutation. It proxies all tool calls through a centralized dispatcher that enforces safety policies (guardrails), manages WIP workspace state, and maintains authoritative ledger.

```
Agent → omnitool({ action, params }) → Dispatcher → [Action Handler] → Ledger
                                            ↓ (intercept)
                                        Gatekeeper (RULE-12, etc.)
```

---

## Architecture

### File Structure

```
.pi/extensions/omnitool/
├── index.ts                 # Entry point, dispatcher, session lifecycle
├── omnitool.ts              # Registry management + audit sink
├── wip-manager/
│   ├── manager.ts           # WipWorktreeManager class + executeWipSubAction
│   ├── schemas.ts           # TypeBox validation schemas
│   └── loader.ts            # Command handlers (legacy, kept for reference)
├── guardrails/              # RULE-1 through RULE-12 enforcement
│   ├── gatekeeper.ts        # Policy interception engine
│   ├── gatekeeper-rules.ts  # Rule predicates
│   └── rules_definition.ts  # Rule catalog
└── logs/
    └── tool_call.json       # Authoritative ledger (single writer: omnitool)
```

### Dispatcher Routing

**Omnitool accepts five action types:**

| Action | Purpose | Handler | Pi API |
|--------|---------|---------|--------|
| **`list`** | List all registered tools | `listTools()` | None |
| **`search`** | Pattern search tools by name/description | `searchTools()` | None |
| **`call`** | Direct tool invocation | `dispatch()` to target tool | Dynamic |
| **`wip`** | Workspace orchestration + git operations | `core.wip.tool.execute()` → `WipWorktreeManager` | exec, readFile, writeFile |
| **`guardrail`** | Policy negotiation/resolution | `guardrail-proxy` → gatekeeper | None |

---

## WIP Worktree Management

### Core Abstraction: `WipWorktreeManager`

**Location:** `.pi/extensions/omnitool/wip-manager/manager.ts`

**Purpose:** Encapsulates Git worktree lifecycle and cherry-pick graduation logic.

**Constructor:**
```typescript
new WipWorktreeManager(
  workspaceRoot: string,
  exec: ExecFn,                 // pi.exec closure
  readFile: ReadFn,             // pi.readFile closure
  writeFile: WriteFn            // pi.writeFile closure
)
```

### Public Methods

#### `wipPrepare(params)`
**Initialize or attach to a WIP worktree.**

```typescript
params: {
  project: string;      // e.g., "myrepo"
  issue: string;        // e.g., "TICKET-001"
  slug: string;         // e.g., "feature-xyz"
  base?: string;        // Branch to base on (default: "HEAD")
}

result: CmdResult {
  code: "WIP_OK" | "WIP_E_INPUT_INVALID" | "WIP_E_NOT_GIT_REPO" | "WIP_E_INTERNAL"
  details: {
    project, issue, slug,
    canonicalPath, worktreePath,
    branch,     // e.g., "wip/myrepo/TICKET-001/feature-xyz"
    baseRef,
    created: boolean,
    attached: boolean
  }
}
```

**Flow:**
1. Validate naming (project/issue/slug format).
2. Resolve canonical repo path + worktree path.
3. Check if worktree exists → if yes, attach.
4. Check if branch exists → if yes, create worktree on that branch.
5. If neither, create branch + worktree from baseRef.
6. Emit audit event.

---

#### `wipList(params?)`
**List all active WIP worktrees.**

```typescript
params: { project?: string }

result: CmdResult {
  code: "WIP_OK" | "WIP_E_INTERNAL"
  details: {
    rows: Array<{
      project: string
      issue: string
      slug: string
      branch: string
      worktreePath: string
      headSha: string
      dirty: null  // Reserved for future dirty-tree detection
      ahead: null
      behind: null
    }>
  }
}
```

---

#### `wipStatus(params)`
**Inspect worktree state: staged/unstaged/untracked files, commits ahead.**

```typescript
params: {
  project: string
  issue: string
  slug: string
}

result: CmdResult {
  code: "WIP_OK" | "WIP_E_INTERNAL"
  details: {
    project, issue, slug,
    clean: boolean,
    staged: number,
    unstaged: number,
    untracked: number,
    commitsAhead: number,
    changedFiles: string[]
  }
}
```

---

#### `wipGraduate(params)`
**Cherry-pick commits from WIP branch to target branch. Optional squash, atomic conflict management.**

```typescript
params: {
  project: string
  issue: string
  slug: string
  to: string;                    // Target branch (e.g., "main")
  noSquash?: boolean;            // Default: false (squash commits)
  description?: string;          // Squash commit message body
  issueLink?: string;            // Appended to squash message
  noPrune?: boolean;             // Default: false (auto-prune on success)
}
```

**Return (Success):**
```typescript
result: CmdResult {
  code: "WIP_OK"
  details: {
    txId: string,                // Transaction ID for this graduation
    status: "success" | "noop",
    movedCommits: string[],      // SHAs that were cherry-picked (or squashed into 1)
    postHead: string             // New HEAD SHA on target branch
  }
}
```

**Return (Conflict):**
```typescript
result: CmdResult {
  code: "WIP_E_CHERRYPICK_CONFLICT"
  details: {
    status: "conflict_paused",
    resumeRequired: true,
    message: string,
    nextSteps: string[],         // Shell commands for user
    files: string[]              // Conflicted file paths
  }
  isError: true
}
```

**Conflict Handling:**
- Lock acquired on entry (`.pi/state/wip-sync.lock`).
- Cherry-pick loop: if conflict detected, return `conflict_paused` **without releasing lock**.
- User must resolve conflicts manually, then run external git commands.
- Lock prevents concurrent graduation attempts.
- On resumption (manual or via retry), lock is released after success or explicit abort.

**Squash Flow (when `noSquash` is false):**
1. Soft reset worktree to target branch.
2. Commit with message: `wip(project): issue slug\n\ndescription\nissueLink`
3. One commit moves to target branch.

**Audit Trail:**
- Entry: `{ command: "wip-graduate", status: "success/conflict/failed", ... }`
- Includes: sourceCommits, movedCommits, preHead/postHead, filesChanged, error.

---

#### `wipPrune(params)`
**Remove worktree and clean up branch reference.**

```typescript
params: {
  project: string
  issue: string
  slug: string
  force?: boolean;   // Remove even if dirty
}

result: CmdResult {
  code: "WIP_OK" | "WIP_E_PRUNE_BLOCKED_DIRTY" | "WIP_E_INTERNAL"
  details: {
    removed: boolean,
    worktreePath: string,
    sourceBranch: string
  }
}
```

---

#### `wipSeed(params)`
**Copy files from canonical repo into worktree (for templates, shared configs).**

```typescript
params: {
  project: string
  issue: string
  slug: string
  paths: string[];         // Relative paths (e.g., ["README.md", "src/config.ts"])
  overwrite?: boolean;     // Default: false (copy only if not exists)
}

result: CmdResult {
  code: "WIP_OK" | "WIP_E_INPUT_INVALID" | "WIP_E_INTERNAL"
  details: {
    copied: string[],      // Paths actually copied
    overwrite: boolean
  }
}
```

**Safety:**
- Traversal guard: rejects absolute paths and `..` sequences.
- Uses `cp -n` (don't overwrite) by default, `cp -f` if `overwrite: true`.

---

### Internal Methods

#### `acquireLock(command, ref)` → `txId`
**Acquire exclusive lock for graduation. Fails if lock exists.**

```typescript
private async acquireLock(command: string, ref: {project, issue, slug}): Promise<string>
```

Stores lock metadata to `.pi/state/wip-sync.lock` with transaction ID.

#### `releaseLock()`
**Clear lock file.**

```typescript
private async releaseLock(): Promise<void>
```

#### `appendAuditEvent(event)`
**Append-only log to `.pi/logs/wip-graduations.jsonl`.**

```typescript
private async appendAuditEvent(event: Record<string, any>): Promise<void>
```

Each line is ISO-timestamped JSON:
```json
{ "ts": "2026-06-19T15:30:45.123Z", "command": "wip-graduate", "status": "success", ... }
```

---

## Integration: `executeWipSubAction`

**Location:** `.pi/extensions/omnitool/wip-manager/manager.ts`

**Signature:**
```typescript
export async function executeWipSubAction(
  wipRoot: string,
  params: any,
  pi?: { exec: ExecFn; readFile: ReadFn; writeFile: WriteFn }
): Promise<CmdResult>
```

**Dispatch Logic:**

1. **Git Worktree Ops** (if `pi` provided):
   - If `subAction` in `["prepare", "list", "status", "graduate", "prune", "seed"]`:
     - Instantiate `WipWorktreeManager(path.dirname(wipRoot), pi.exec, pi.readFile, pi.writeFile)`
     - Route to corresponding manager method
     - Return result

2. **Issue Ledger Ops** (no `pi` needed):
   - If `subAction === "issues.init"`:
     - Validate payload against `IssueInitSchema`
     - Create ticket directory + BUDDY.md ledger
   - If `subAction === "issues.update_status"`:
     - Append status entry to status_log.jsonl
   - If `subAction === "issues.transition"`:
     - Validate and record state transition

3. **Legacy/Fallback**:
   - If `subAction === "init"`: placeholder for legacy logic
   - Otherwise: throw `"Unknown wip subAction"`

---

## Registry & Dispatch

### In `index.ts`: `bootRegistry()`

**Entry point for tool registration.**

```typescript
async function bootRegistry() {
  const { entries } = await buildRegistryFromExtensions(EXTENSIONS_DIR);
  
  // Register core.wip pseudo-tool (omnitool-owned)
  entries.set("core.wip", {
    key: "core.wip",
    tool: {
      name: "core.wip",
      description: "...",
      parameters: Type.Object({ ... }),
      execute: async (_toolCallId, params, pi) => 
        executeWipSubAction(WIP_ROOT, params, pi)
    }
  });
  
  registry = entries;
  registryLocked = true;
}
```

### In `index.ts`: `dispatch(action, params, pi, toolCallId)`

**Main dispatcher.**

```typescript
async function dispatch(action: string, params: any, pi: any, toolCallId: string) {
  // Route by action
  if (action === "list")  return listTools();
  if (action === "search") return searchTools(params?.query);
  
  if (action === "wip") {
    const wipTool = registry.get("core.wip");
    return wipTool.tool.execute(toolCallId, params || {}, pi);
  }
  
  if (action === "guardrail") {
    const target = registry.get(`guardrails.${params?.subAction}`);
    return target.tool.execute(toolCallId, params?.params || {}, pi);
  }
  
  if (action === "call") {
    const target = registry.get(params?.tool);
    return target.tool.execute(toolCallId, params?.args || {}, pi);
  }
  
  throw new Error(`Unsupported omnitool action '${action}'`);
}
```

---

## RULE-12: Tool Surface Lockdown

### Boot-Time Enforcement

**In `index.ts`: `session_start` event handler**

```typescript
pi.on("session_start", async (_event, ctx: any) => {
  const allTools = pi.getAllTools();
  const previousActive = pi.getActiveTools();
  
  // Fail closed if omnitool not found
  const omnitoolEntry = allTools.find((t) => t.name === "omnitool");
  if (\!omnitoolEntry) {
    appendAudit(AUDIT_LOG_PATH, {
      event: "rule12_boot",
      status: "FAIL_CLOSED",
      reason: "omnitool not found in registered tools",
      registeredTools: allTools.map((t) => ({
        name: t.name,
        source: t.sourceInfo?.source,
        path: t.sourceInfo?.path
      }))
    });
    ctx.ui.notify("🚨 RULE-12 FAIL CLOSED: 'omnitool' not registered.", "error");
    return;
  }
  
  // Identify what's being removed
  const removedTools = allTools
    .filter((t) => t.name \!== "omnitool")
    .map((t) => ({
      name: t.name,
      source: t.sourceInfo?.source,
      path: t.sourceInfo?.path,
      scope: t.sourceInfo?.scope,
      origin: t.sourceInfo?.origin
    }));
  
  // Enforce
  pi.setActiveTools(["omnitool"]);
  
  // Audit
  appendAudit(AUDIT_LOG_PATH, {
    event: "rule12_boot",
    status: "PASS",
    omnitoolSource: {
      source: omnitoolEntry.sourceInfo?.source,
      path: omnitoolEntry.sourceInfo?.path
    },
    previousActive,
    removedFromSurface: removedTools,
    finalSurface: ["omnitool"]
  });
  
  ctx.ui.notify(
    `🛡️ RULE-12 Active: surface locked to [omnitool]. ${removedTools.length} tool(s) hidden.`,
    "info"
  );
});
```

**Effect:** Only `omnitool` is presented to the agent. All calls must go through the omnitool dispatcher.

### Runtime Interception

**In `index.ts`: `tool_call` event handler**

```typescript
pi.on("tool_call", async (event: any, ctx: any) => {
  if (event.toolName \!== "omnitool") {
    return {
      block: true,
      reason: `🛡️ Tool Surface Lockdown: Direct call to '${event.toolName}' is forbidden.`
    };
  }
});
```

**Effect:** Any direct tool call not named `omnitool` is blocked.

---

## Ledger & Audit

### Single Authoritative Ledger

**Location:** `.pi/logs/tool_call.json`

**Writer:** Omnitool core only (via `appendAudit`).

**Format:** JSON array of events:
```json
[
  {
    "timestamp": "2026-06-19T15:30:45.123Z",
    "action": "wip",
    "params": { "subAction": "graduate", ... },
    "status": "success",
    "result": { ... }
  },
  {
    "timestamp": "2026-06-19T15:31:00.456Z",
    "action": "call",
    "params": { "tool": "core.wip", "args": { ... } },
    "status": "blocked",
    "guardrail": { "checked": true, "allowed": false, "ruleId": "RULE-12", "reason": "..." }
  },
  ...
]
```

**Content Policy:**
- All tool calls (allowed + blocked).
- RULE-12 boot validation events.
- WIP graduation audit trail (internal to `wip-graduations.jsonl`, but summary in tool_call.json).

---

## Error Handling & Logging

### Execution Tracing

**Current:** Errors are returned in `CmdResult.isError + details.error`.

**Future Enhancement:** Add structured logging with:
- `console.log()` for development debugging
- `ctx.ui.notify()` for user-facing status updates
- Try/catch wrapper in dispatcher for unhandled exceptions

---

## Example: Full Graduation Workflow

### Agent Request

```json
{
  "action": "call",
  "params": {
    "tool": "core.wip",
    "args": {
      "subAction": "graduate",
      "project": "myrepo",
      "issue": "TICKET-42",
      "slug": "fix-auth",
      "to": "main",
      "description": "Fixes OAuth 2.0 token refresh",
      "issueLink": "https://github.com/org/repo/issues/42"
    }
  }
}
```

### Dispatch Flow

1. **Gatekeeper** intercepts: RULE-11, RULE-12, RULE-4 checks.
2. **Dispatcher** routes: `action="call"` → lookup `core.wip` → `wipTool.tool.execute(..., pi)`
3. **executeWipSubAction** instantiates `WipWorktreeManager`.
4. **wipGraduate** executes:
   - Acquire lock (`.pi/state/wip-sync.lock`)
   - Verify target branch exists
   - Check worktree is clean
   - Soft reset + commit (squash)
   - Cherry-pick to main
   - If conflict: release lock, return `conflict_paused` with instructions
   - If success: audit + prune + release lock
5. **Ledger** records:
   - `.pi/logs/tool_call.json`: `{ action, params, status: "success", result }`
   - `.pi/logs/wip-graduations.jsonl`: detailed graduation audit

---

## Constraints & Limitations

1. **No concurrent graduations** — lock file prevents race conditions.
2. **Conflicts require manual intervention** — cherry-pick conflicts pause the graduation; user must resolve manually.
3. **Squash is default** — individual commits are preserved only if `noSquash: true`.
4. **No sparse checkout yet** — full repo worktrees (TODO: implement sparse clone).
5. **No branch deletion** — pruning only removes worktree, not the branch itself (design decision: preserve history).

---

## Testing Checklist

- [ ] `wipPrepare`: create worktree from HEAD
- [ ] `wipPrepare`: attach to existing branch
- [ ] `wipStatus`: report clean state
- [ ] `wipStatus`: report dirty with staged/unstaged breakdown
- [ ] `wipGraduate`: squash + cherry-pick success path
- [ ] `wipGraduate`: cherry-pick conflict → `conflict_paused`
- [ ] `wipGraduate`: empty commits skipped
- [ ] `wipPrune`: remove clean worktree
- [ ] `wipPrune`: block on dirty unless `force: true`
- [ ] `wipSeed`: copy files from canonical
- [ ] RULE-12: boot audit event recorded
- [ ] RULE-12: non-omnitool calls blocked at runtime
- [ ] Ledger: all events recorded in `tool_call.json`

---

## References

- **GUARDRAIL-008:** Consolidated architecture decision
- **EXT-003:** Omnitool vision (kernel, single entry point)
- **AGENTS.md:** Core principles (Librarian's Stewardship, Rigor Over Brevity)
