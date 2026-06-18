# GUARDRAIL-008: WIP Consolidation + Issue Quality Gates + Global Create-Only Writes

## Description
Consolidate agent mutation workflow under a single orchestration surface (`omnitool -> action:"wip"`) and enforce deterministic guardrails for issue quality and filesystem safety.

This issue captures the agreed intended state:
1. **Omnitool owns Guardrails**: The entire Guardrail system is physically nested under and owned by the Omnitool extension (`.pi/extensions/omnitool/guardrails/`). This resolves the "ledger logging paradox" by allowing the safety interceptor to write blocked events directly to the authoritative ledger.
2. **Omnitool owns WIP Manager**: The WIP state and Git worktree management are physically nested under and owned by the Omnitool extension (`.pi/extensions/omnitool/wip-manager/`).
3. **No Root Extension Loader**: There is no top-level `.pi/extensions/extension-loader.ts`. The main `omnitool` entry is `.pi/extensions/omnitool/index.ts`, which loads everything else and serves as the single loaded extension.
4. **RULE-4 repurposed** from legacy `todo.md` semantics to **Issue Quality Gate**.
5. **RULE-11 introduced** for **global create-only full writes** (blocking agents from blind overwrites, while leaving system CLI/compiler execution unaffected).
6. **RULE-12 introduced** for **tool surface lockdown** (only `omnitool` is exposed to the agent; guardrail lifecycle tools and WIP tools are proxied through omnitool).

---

## Folder Topology

```
.pi/extensions/omnitool/
├── index.ts                 <- Entry loader, registers single "omnitool" + "tool_call" interceptor hook
├── guardrails/              <- Nested safety and policy engines (no direct filesystem writes)
│   ├── rules_definition.ts  <- Schema/definitions of Rules 1..12
│   ├── gatekeeper-rules.ts  <- Fast/Deep parameter matching predicates
│   ├── gatekeeper.ts        <- Interception algorithm
│   └── orchestrator.ts      <- Transactional flow controller
└── wip-manager/             <- Consolidated WIP engine
    ├── manager.ts           <- Combined ticket-ledger tracking & Git-worktree execution
    └── schemas.ts           <- TypeBox validation schemas for issues.* lifecycle
```

---

## Canonical Policy Decisions

### A) Path ownership & folder layout
- The Guardrails and WIP Manager codebases are completely housed inside `.pi/extensions/omnitool/`.
- Omnitool's loader file (`.pi/extensions/omnitool/index.ts`) registers the `omnitool` tool and the `tool_call` interceptor hook.

### B) Issues path canonicalization
- Canonical issue path: `issues/**`
- `.pi/issues/**` considered legacy/non-canonical and should be removed from policy/docs/tests.

### C) Full write policy (global)
- Full-content write tools (`write`, `draft`, `safe_write`, or equivalent full-file replacers) are **create-only** globally for agent toolcalls.
- If target file exists, agent full-write attempt is blocked.
- Existing files must be changed via patch/surgical edit tools (`edit`, `amend`, `safe_edit`, or future equivalent).
- Under-the-hood processes (compilers, test outputs, shell scripts) are run out-of-band of agent tool calls and are NOT blocked.

### D) Tooling direction (Omnitool-only)
- Preferred mutation interface for agents: `omnitool({ action: "wip", ... })`.
- Guardrail tools (`negotiate_guardrail`, `resolve_guardrail`, `guardrail_status`) are proxied under `omnitool` (e.g., `omnitool({ action: "guardrail", params: { subAction: "negotiate" } })`).
- This makes RULE-12 absolute: `omnitool` is the ONLY top-level tool registered.

### E) safe_* transition
- `safe_edit`/`safe_write` may be deprecated **after** proving unified `tool_call.json` coverage and equivalent provenance guarantees.
- Until proven, treat deprecation as staged migration, not immediate deletion.

---

## Rule Specifications

## RULE-4: Issue Quality Gate (repurposed)

### Intent
Prevent low-signal, duplicate, or value-misaligned issues while preserving fast execution.

### Trigger
- Issue creation and major transitions via `wip` issue flows:
  - `issues.init`
  - `issues.transition` (especially to `READY` or `CLOSED`)

### Hard deterministic checks (must pass)
1. **Non-duplicate issue**
   - Required `dedupCheck` payload:
     - `query`
     - `similarIssueIds[]`
     - `whyNotDuplicate`
   - Block if similar open issue exists and justification insufficient.

2. **State-valid work (real delta)**
   - Required:
     - `currentState`
     - `targetState`
     - `delta` (or equivalent explicit difference)
   - Block if current and target are equivalent/non-actionable.

3. **Work validity evidence**
   - Bug/investigation: repro/log/test evidence required.
   - Feature/process: concrete pain/impact evidence required.
   - Block on unsupported intent.

4. **Execution ownership + done-signal**
   - Required owner (or `ownerNeeded=true`) and acceptance criteria.
   - Block if no closure definition.

5. **Scope and risk framing**
   - Required affected components/paths + risk level.
   - Medium/high risk requires rollback note.

### Values alignment check (auditor-assisted)
Use a simple auditor agent to assess whether submission aligns with project values/soul.

#### Auditor input
- Issue payload
- Core values rubric
- Similar open issues

#### Auditor output
- `approved: boolean`
- `score: number (0..1)`
- `violations: string[]`
- `requiredFixes: string[]`
- `reason: string`

#### Gate behavior
- Hard checks fail -> immediate block.
- Hard checks pass, auditor score below threshold (default `0.75`) -> block with `requiredFixes`.
- Auditor network/inference timeouts and API errors: fail-closed (development frozen if auditing is frozen).

---

## RULE-11: Global Full-Write Create-Only

### Intent
Prevent blind overwrites anywhere in workspace; force grounded patching for existing files.

### Trigger
Any full-file mutation operation executed by the agent (including proxy forms):
- `write`
- `draft`
- `safe_write`
- any equivalent full-content replacer

### Condition
- Target does not exist -> allow.
- Target exists -> block.

### Guidance
Use patch tools for existing files:
- `edit` / `amend` / `safe_edit` (or future equivalent)

### Scope / Validation
- Scope: GLOBAL
- Validation: deterministic path existence check

---

## RULE-12: Tool Surface Lockdown (Omnitool-only)

### Intent
Guarantee bounded execution surface even if additional tools become available.

### Condition
- Agent-callable top-level tool surface must be restricted strictly to `omnitool`. No exceptions are needed because guardrail status/negotiation tools are proxied under the `omnitool` namespace.
- Direct invocation of legacy or raw tools outside this surface is blocked.

### Startup/runtime checks
- On boot, compare registered tools against allowlist (must only contain `omnitool`).
- Unknown or disallowed tool detected -> fail closed.

### Scope / Validation
- Scope: GLOBAL
- Validation: deterministic allowlist enforcement + audit event

---

## WIP Lifecycle API (Detailed Schema Contract)

All operations remain under:
- `omnitool({ action: "wip", params: { subAction: "issues.*", ... } })`
- `omnitool({ action: "guardrail", params: { subAction: "negotiate" | "resolve" | "status", ... } })`

### Common envelope fields (all `issues.*`)
- `ticketId: string`
- `issueId: string`
- `sessionId: string`
- `timestamp?: string` (ISO; auto-filled if omitted)
- `decisionRef?: string`
- `actor?: string`

### 1) `issues.init`
Creates new issue artifact (create-only).

Required fields:
- `title: string`
- `type: "bug" | "feature" | "task" | "risk" | "decision" | "investigation"`
- `summary: string`
- `currentState: string`
- `targetState: string`
- `delta: string`
- `acceptanceCriteria: string[]`
- `impact: string`
- `scope: { components: string[]; paths: string[] }`
- `owner?: string`
- `ownerNeeded?: boolean`
- `evidence: Array<{ type: string; ref: string; summary: string }>`
- `valuesAlignment: {
    rigorOverBrevity: string;
    auditability: string;
    safetyNoBypass: string;
  }`
- `dedupCheck: {
    query: string;
    similarIssueIds: string[];
    whyNotDuplicate: string;
  }`

Optional:
- `riskLevel?: "low" | "med" | "high"`
- `rollbackPlan?: string`
- `alternativesConsidered?: string[]`
- `expiresAt?: string`

### 2) `issues.add_clone_path`
Append clone/repo path association.

Required:
- `clonePath: string`
- `reason: string`

Optional:
- `component?: string`
- `notes?: string`

**Sparse Mirroring Requirement**: 
When adding paths, the system must perform a `git sparse-checkout add <path>`. All clones automatically include the "Core Set" (all root `.md` files and top-level hidden dirs not in `.gitignore`).

### 3) `issues.update_status`
Append-only progress/status update entry.

Required:
- `status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "READY" | "CLOSED"`
- `progressNote: string`
- `componentsDone: string[]`
- `componentsInFlight: string[]`
- `blockers: string[]`

Optional:
- `percentComplete?: number` (0..100)
- `nextStep?: string`
- `eta?: string`

### 4) `issues.add_evidence`
Append evidence artifact.

Required:
- `evidenceType: "test" | "log" | "diff" | "screenshot" | "trace" | "doc" | "benchmark"`
- `uriOrPath: string`
- `summary: string`
- `supportsClaim: string`

Optional:
- `hash?: string`
- `capturedAt?: string`
- `toolCallRef?: string`

### 5) `issues.transition`
Controlled status transition with proof requirements.

Required:
- `fromStatus: string`
- `toStatus: string`
- `reason: string`

Conditional required:
- `toStatus=READY` -> AC checklist + unresolved risk note
- `toStatus=CLOSED` -> closure proof + followup/residual risk note

Optional:
- `approver?: string`

### 6) `issues.amend_field` (restricted metadata edits)

Required:
- `field: "owner" | "priority" | "labels" | "eta"`
- `oldValue: string`
- `newValue: string`
- `reason: string`

Constraint:
- Must emit append-only change-log entry; no silent replacements.

---

## Ledger & Audit Requirements

1. **Omnitool is the single authoritative ledger writer**.
- Logs to `.pi/logs/tool_call.json`.
- When Guardrails interceptor blocks a tool, it registers the block event by calling `appendAudit` **directly** from the interceptor context inside `.pi/extensions/omnitool/index.ts` before returning `{ block: true }`. This guarantees blocked events are never lost.
- Blocked entries must include `guardrail: { checked: true, allowed: false, ruleId, reason }`.

2. Every `wip` issue subAction must emit tool-call ledger event with:
- timestamp
- action/subAction
- actor/session
- target issue id/path
- result (`success|error|blocked`)
- ruleId when blocked

3. For safe_* deprecation, prove replacement ledger completeness before removal:
- equivalent provenance fields
- deterministic replayability
- no coverage gaps for blocked calls

4. **Librarian Stewardship Audit**: 
- Any destructive action (`rm`, `overwrite`, `delete`) within the `WipManager` must be logged with an associated "Evidence of Obsolescence" reference.
- Graduation must maintain `.git` metadata (via sparse worktree) to ensure a clean squash-and-push provenance chain.

---

## Acceptance Criteria (AC)
- [ ] RULE-4 rewritten to Issue Quality Gate in code + docs + tests.
- [ ] RULE-11 implemented and enforced globally for full-write create-only.
- [ ] RULE-12 implemented for tool surface lockdown (omnitool-only policy, no exceptions).
- [ ] `wip` supports `issues.*` subActions with schema validation.
- [ ] Guardrail lifecycle status/negotiation proxied under the `omnitool` namespace.
- [ ] Issue path canonicalization complete (`issues/**` only in active policy).
- [ ] Guardrail + omnitool audit behavior documented and verified with tests.
- [ ] Legacy/stale rule ids and docs reconciled (no split-brain rule maps).
- [ ] **Unified WIP Manager**: `core.wip` and `wip-worktree` consolidated into `.pi/extensions/omnitool/wip-manager/`.
- [ ] **Sparse Mirroring**: `wip.clone` implemented via Git Sparse Checkout with automated "Core Set" inclusion.
- [ ] **AC-11**: Update OMNITOOL_STANDARD.md with actual dispatch actions (call, list, search, wip, guardrail).
- [ ] **AC-12**: Document new Guardrails System (Rules 1-12, expectations, gatekeeper) in OMNITOOL_STANDARD.md.
- [ ] **AC-13**: Document WIP Manager lifecycle + schemas in OMNITOOL_STANDARD.md.
- [ ] **AC-14**: Explicitly document deferred standard verbs (knowledge, note, archive, audit, index, fetch) as Future/Out-of-Scope with rationale.
- [ ] **AC-15**: Complete graduation protocol + document in OMNITOOL_STANDARD.md.

### AC Exit Evidence (artifacts, no ambiguity)
1. Rule parity artifact: table mapping `rules_definition.ts` <-> `gatekeeper-rules.ts` with exact id/trigger/condition parity.
2. Tool surface artifact: runtime dump of registered tools showing ONLY `omnitool` registered.
3. Write-policy artifact: test proof that full-write to existing file is blocked for each full-write tool variant.
4. Ledger artifact: sample blocked + allowed + error calls recorded in single omnitool-owned ledger (`tool_call.json`) with guardrail metadata.
5. Docs parity artifact: links to updated sections in `GUARDRAIL-002_top_10_initial_rules.md` and guardrails docs with removed legacy `.pi/issues`/`todo.md` references.
6. **NEW**: OMNITOOL_STANDARD.md updated with actual implementation dispatch structure (call, list, search, wip, guardrail) and new guardrails system documented.

---

## Explicit Implementation Contract (file-level, to avoid agent guessing)

### Files that MUST be touched/moved
- Move `.pi/extensions/guardrails/` $\rightarrow$ `.pi/extensions/omnitool/guardrails/`
- `.pi/extensions/omnitool/guardrails/rules_definition.ts`
- `.pi/extensions/omnitool/guardrails/gatekeeper-rules.ts`
- `.pi/extensions/omnitool/guardrails/gatekeeper.ts`
- `.pi/extensions/omnitool/guardrails/orchestrator.ts`
- Remove `.pi/extensions/extension-loader.ts` (Loader logic consolidated into `.pi/extensions/omnitool/index.ts`)
- Move `.pi/extensions/wip-worktree/` $\rightarrow$ `.pi/extensions/omnitool/wip-manager/` (Combined with core.wip logic)
- `.pi/extensions/omnitool/index.ts` (Consolidated loader to register omnitool + interceptor hook)
- `.pi/extensions/omnitool/guardrails/gatekeeper-rules.test.ts`
- `.pi/extensions/omnitool/guardrails/bootstrapper.ts` (or replacement bootstrap path)
- `issues/active/GUARDRAIL-002_top_10_initial_rules.md`

### RULE-4 deterministic minimums (must be coded)
- Reject issue creation when dedup payload missing.
- Reject when `currentState` and `targetState` are equivalent.
- Reject when evidence array empty.
- Reject when no owner and `ownerNeeded` is not true.
- Reject when acceptance criteria empty.
- Run auditor values check only after hard checks pass.

### RULE-11 deterministic minimums (must be coded)
- For every full-write path, perform existence check before write.
- Existing target -> block with RULE-11.
- Non-existing target -> allow.
- Applies globally (not scoped to issues).

### RULE-12 deterministic minimums (must be coded)
- Enforce allowlist at dispatch boundary.
- Direct calls to non-allowlisted tools blocked.
- Boot-time registry validation emits explicit pass/fail event.

### Observability contract (must be coded)
- Ledger single writer = omnitool core.
- Guardrail decision metadata must be attached to each call record.
- Blocked calls must be logged even when tool body never executes.

## Out-of-Scope (for this ticket)
- Full cryptographic chain implementation for ledger immutability (can be follow-up).
- Complete removal of `safe_*` (allowed only after parity proof).
- Non-wip unrelated extension refactors.

---

## Test Matrix (must pass before status READY_FOR_GRADUATION)

### Guardrails
1. RULE-4: duplicate issue attempt -> blocked.
2. RULE-4: currentState == targetState -> blocked.
3. RULE-4: missing evidence -> blocked.
4. RULE-4: hard checks pass + auditor fail -> blocked with requiredFixes.
5. RULE-4: hard checks pass + auditor pass -> allowed.
6. RULE-11: full-write existing file under `src/` -> blocked.
7. RULE-11: full-write existing file under `issues/` -> blocked.
8. RULE-11: full-write new file anywhere -> allowed.
9. RULE-12: direct non-allowlisted tool call -> blocked.
10. RULE-12: omnitool call path -> allowed (subject to normal policy).

### Ledger
11. Allowed call logged with guardrail metadata.
12. Blocked call logged with `ruleId` and reason.
13. Tool execution error logged with status `error` and message.
14. No duplicate/multi-owner conflicting writes for same event.

---

## Session Decisions (2026-06-17)

### D-1: RULE-4 intent finalized
- RULE-4 remains active but repurposed to **Issue Quality Gate**.
- Focus: non-duplicate issues, valid state delta, core-values alignment (auditor-assisted), ownership, AC, and evidence quality.
- Canonical issue path is `issues/**` (not `.pi/issues/**`).

### D-2: RULE-11 accepted (global create-only full writes)
- Full-content writes are create-only across entire workspace, not issues-only.
- Existing files must be changed via surgical edit tools.
- This rule remains even if tooling surface is constrained, as defense-in-depth against unexpected tool exposure.

### D-3: RULE-12 accepted (tool surface lockdown)
- Agent-callable surface should be omnitool-centric and allowlist-gated.
- Direct legacy tool invocation should be blocked unless explicitly approved exception.

### D-4: `ctx.ui.notify` usage boundary clarified
- `ctx.ui.notify` is valid in Pi when `ctx` is in scope.
- Gatekeeper policy engine should not assume `ctx`; notify calls should stay in interceptor/context-aware layer or via injected callback.

### D-5: Orchestrator fail-open policy clarified for development
- Temporary intent: fail-open in development/debug to accelerate bring-up.
- Strong recommendation captured: explicit mode-gated behavior (`DEBUG` fail-open + loud audit; stricter modes fail-closed or user-prompt fallback).

### D-6: Ledger ownership finalized
- Single ledger ownership recommended and accepted: **omnitool core owns tool-call ledger writes**.
- Guardrails should emit decision metadata; omnitool records authoritative event.
- Avoid multi-extension concurrent writes to the same ledger file.

---

## Status
**READY_FOR_IMPLEMENTATION** — Comprehensive plan complete. 31 FW (friction-point work items) identified. Phased execution (9 phases) defined. All blocking uncertainties resolved.

## Owner
**Buddy** + **ANA** + **us** (collaborative)

## Planning Summary (2026-06-17)

### Current State Audit
✓ `.pi/extensions/omnitool/` exists with 31 guardrails files
✓ RULE-4, RULE-11, RULE-12 defined in rules_definition.ts
✓ Basic implementations in gatekeeper-rules.ts (hard checks only)
✓ WIP Manager exists with basic `issues.*` support
✗ Auditor integration incomplete
✗ Mode system not implemented
✗ Sparse checkout not implemented
✗ Graduation protocol not implemented

### Work Breakdown
- **10 Friction Points** identified (Auditor, Mode System, Versioning, Sparse Checkout, etc.)
- **31 Work Items** (FW-1 through FW-31) with explicit deliverables
- **9 Implementation Phases** with strict dependency ordering
- **14 Tests** required (T-1 through T-14) for AC convergence
- **5 Exit Evidence Artifacts** (EV-1 through EV-5)

### Critical Path
P0 (Validation) → P1 (Config) → P2 (RULE-4) → P6 (Negotiation) → P7 (Ledger) → P8 (Docs) → P9 (Final)

**Parallel Tracks**: P3 (RULE-11), P4 (RULE-12), P5 (Sparse Checkout) can start after P0.

### Reference
**Detailed plan**: `/Users/john.bresson/workspace/wip/guardrail-008/BUDDY.md` (19KB ledger with full phase breakdown, work inventory, and handoff prompt)
