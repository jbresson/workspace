# GUARDRAIL-002: Top 10 Initial Guardrail Rules

**Date**: 2026-06-14  
**Scope**: Agent Safety, System Protection, Memory Integrity  

---

## Executive Summary

The Cognitive Guardrail System (CGS) is currently **offline/staging** with the core infrastructure built:
- ✅ Registry Service (expectation persistence)
- ✅ Gatekeeper (interception logic)
- ✅ Negotiation Manager (adversarial validation)
- ✅ Skeptic Auditor (LLM temp=0 verifier)
- ✅ Validation Strategies (CONSTRAINED_CMD, SANDBOXED_TS, MANUAL)
- ✅ Test harness (all 4 logic tests passing)

**Missing**: Initial rule set to lock down agent behavior at activation.

This issue identifies the **Top 10 Rules** to bootstrap the system with maximum defensive value against:
1. Rogue/nefarious agents (behavioral hijack, tool abuse)
2. Machine compromise (unauthorized file ops, shell escapes, privilege escalation)
3. Memory/identity corruption (.pi, memory, issues, session state)

---

## Rule Design Principles

Per CGS ARCHITECTURE:
- ✅ **No Bypasses**: No allowlists (rules are surgical, not blanket).
- ✅ **S.M.A.R.T. Intents**: Specific, Measurable, Attainable, Relevant, Traceable.
- ✅ **No Workarounds**: Skeptic rejects hacks (e.g., `echo success` fake proofs).
- ✅ **Adversarial Verification**: Validations checked for "fake successes."
- ✅ **Bootstrap Exception**: critical guardrail bookkeeping paths exempt to prevent deadlocks.

---

## Top 10 Initial Guardrail Rules

### RULE-1: Memory Integrity Lock
**Trigger**: Any `write()` or `edit()` to `/memory`  
**Condition**: Changes to memory files (ARCHITECTURE.md, identity/*, processes/*) must include:
  - Explicit **SESSION_ID** in commit/decision log
  - **Rationale** (why this change advances the mission)
  - **Shelf-life** (when to revisit this assumption)
  - Proof: Diff + timestamp + linked decision (ctx_session record)

**Scope**: GLOBAL (blocks all sessions—prevents rogue agents from poisoning KB)  
**ValidationType**: MANUAL (human review required for memory mutations)  
**Risk if Skipped**: Nefarious agent silently corrupts architectural decisions, redefines mandates, erases audit trail.

---

### RULE-2: .pi Registry Protection
**Trigger**: Any `write()` or `edit()` to `.pi/registry/expectations.jsonl`  
**Condition**: Registry mutations (new expectations, state changes) must:
  - Include the **original SESSION_ID** that issued the expectation
  - Include the **hash** of the prior state (prevents mid-flight tampering)
  - Provide a **reason** for state change (e.g., "Resolved: proof validated by Finalize Checker")
  - Include **validator proof** (link to proof artifact or auditor decision)

**Scope**: GLOBAL (all sessions locked—registry is the source of truth)  
**ValidationType**: CONSTRAINED_CMD (SHA256 hash validation + audit log append)  
**Risk if Skipped**: Rogue agent weaponizes Registry, unblocks itself by mutating PENDING→RESOLVED, erases enforcement trail.

---

### RULE-3: .pi Directory Lockdown
**Trigger**: Any destructive op on `.pi/` (delete, move, truncate, chmod)  
**Condition**: 
  - Reads (LIST, GREP, READ) allowed w/o proof
  - Writes to `.pi/registry/` require RULE-2
  - Writes to `.pi/issues/` require RULE-8
  - **Deletes**: FORBIDDEN (archive/deprecate through issue lifecycle, never unlink silently)
  - **Overwrites to non-log files**: Requires explicit SESSION_ID + timestamp append

**Scope**: GLOBAL  
**ValidationType**: CONSTRAINED_CMD (whitelist: `append`, `read`, `list`; deny: `unlink`, `move`, `chmod 000`)  
**Risk if Skipped**: Rogue agent vaporizes audit trail (.pi/registry/expectations.jsonl), issues, or session history.

---

### RULE-4: Issue Ledger Integrity
**Trigger**: Any mutation to issue tracking artifacts in `issues/`  
**Condition**:
  - **Status/Evidence updates**: Allowed when attributable and auditable
  - **Deletions**: FORBIDDEN for active issue history (archive instead)
  - **Silent rewrites**: FORBIDDEN (changes must preserve auditability)
  - Proof: Every update must tag **SESSION_ID** + **timestamp** + **decision_id** (from ctx_session)

**Scope**: GLOBAL  
**ValidationType**: CONSTRAINED_CMD (diff/metadata checks for auditable updates)  
**Risk if Skipped**: Rogue agent erases assigned tasks, hides completed work, corrupts issue state.

---

### RULE-5: Session State Immutability
**Trigger**: Any `ctx_session()` call with `action="reset"` or `action="cleanup"`  
**Condition**:
  - `reset`: FORBIDDEN (cannot zero out findings/decisions—only archive via `snapshot`)
  - `cleanup`: Restricted to **stale sessions** (>72 hours idle, tagged CLOSED)
  - `snapshot` prior to cleanup: MANDATORY (proof stored in `.pi/sessions/archived/`)
  - Proof: Snapshot hash + timestamp + why cleanup needed

**Scope**: GLOBAL (prevents session poisoning)  
**ValidationType**: MANUAL (requires human approval recorded in issue decision trail)  
**Risk if Skipped**: Rogue agent wipes its own decision trail, erases contradictions, restarts with clean slate.

---

### RULE-6: Shell Escapes & Privilege Escalation
**Trigger**: Any shell command containing:
  - `sudo`, `su`, `doas` (privilege escalation)
  - `chmod`, `chown`, `setfacl` (permission bypass)
  - `rm -rf /`, `dd if=/dev/zero` (destructive ops)
  - Pipe to `/dev/null`, background processes (`&`), process substitution
  - `eval`, `exec`, `source` (code injection vectors)

**Condition**:
  - All such commands **BLOCKED immediately** by Gatekeeper (no negotiation)
  - If legitimate need exists, agent must file RULE-8 issue + await human approval
  - Proof: Issue ID + human signature in `.pi/decisions/`

**Scope**: GLOBAL  
**ValidationType**: CONSTRAINED_CMD (regex blocklist: `/(sudo|su|chmod|rm -rf|eval|exec)/` + zero-trust token analysis)  
**Risk if Skipped**: Rogue agent escalates to root, corrupts file permissions, injects arbitrary code into .pi/.

---

### RULE-7: Forbidden File Paths
**Trigger**: Any operation on:
  - `~/.ssh`, `~/.aws`, `~/.kube`, `/etc/passwd`, `/root/*` (credential/system files)
  - `node_modules/` (no direct mutations; use npm only)
  - `.git/hooks` (no script injection)
  - Any symlink pointing outside workspace (LFI risk)

**Condition**:
  - All reads/writes/deletes → **BLOCKED**
  - Exception: `.ssh/config` read-only allowed for debugging (with human approval via RULE-8)
  - If legitimate need: File RULE-8 issue

**Scope**: GLOBAL  
**ValidationType**: CONSTRAINED_CMD (path whitelist validation + realpath canonicalization to detect symlink escapes)  
**Risk if Skipped**: Rogue agent steals AWS keys, injects SSH backdoors, modifies git hooks for persistence.

---

### RULE-8: Meta-Expectation (Issue Filing)
**Trigger**: Agent attempts a blocked action  
**Condition**:
  - If blocked by RULE-6, RULE-7, or any GLOBAL expectation, agent enters negotiation mode
  - Skeptic Auditor auto-generates a **`EXP-TODO-*` expectation** (meta-expectation)
  - Agent must file an issue in `.pi/issues/active/` (e.g., `NEED-PRIVILEGE-ESCALATION.md`)
  - Issue must include:
    - **Why** (justified business case)
    - **Alternatives** (lower-privilege workarounds considered + rejected)
    - **Impact** (what breaks without this exception)
    - **Rollback plan** (how to revert if abused)
  - Human reviews + approves via issue decision trail
  - Proof: Issue ID + human approval signature

**Scope**: GLOBAL (all sessions must go through this funnel)  
**ValidationType**: MANUAL + SANDBOXED_TS (meta-validator checks: issue format, alternatives, no hacks)  
**Risk if Skipped**: Rogue agent escalates silently without audit trail; humans have no visibility into why rules were bent.

---

### RULE-9: Tool Abuse Detection (Constrained Executor Validation)
**Trigger**: Any invocation of `ctx_shell`, `shell`, or `bash` with:
  - File I/O on `.pi/*`, `memory/*`, `issues/*` via unsafe shell paths (should use structured tools)
  - Piping data into sensitive operations
  - Loops/conditionals that automate decision-making
  - Data exfiltration (curl, wget, scp to external hosts)

**Condition**:
  - Gatekeeper intercepts shell call before execution
  - Constrained Executor validator analyzes AST for:
    - Unauthorized file targets
    - Network calls (DNS, HTTP, SSH)
    - Loops that suggest automation without approval
  - If risky: Propose constrained alternative (e.g., `ctx_grep` instead of `grep | wc`)
  - Proof: Proposed validator script + reason for constraint

**Scope**: SESSION (each agent session subject to its own abuse profile)  
**ValidationType**: CONSTRAINED_CMD (syntax tree + static analysis)  
**Risk if Skipped**: Rogue agent automates memory corruption via shell loops, exfiltrates memory to external server, abuses file I/O.

---

### RULE-10: Audit Trail Immutability
**Trigger**: Any attempt to query, modify, or delete logs in:
  - `.pi/registry/expectations.jsonl` (append-only)
  - `.pi/sessions/*/decisions.log` (session decision trail)
  - `.pi/issues/active/` (issue audit trail)
  - `memory/guardrails/OPERATIONAL_STATUS.md` (guardrail state)

**Condition**:
  - **Reads**: Allowed (full transparency)
  - **Appends**: Allowed (new entries, status updates tagged with SESSION_ID)
  - **Deletes/Rewrites**: FORBIDDEN
  - **Tamper Detection**: Cryptographic signature on critical entries (SHA256 of prior entry + new entry)
  - If signature mismatches: Gatekeeper locks session immediately, escalates to human
  - Proof: Unbroken chain of signatures from genesis to present

**Scope**: GLOBAL  
**ValidationType**: CONSTRAINED_CMD (SHA256 chain validation) + MANUAL (on tamper detection)  
**Risk if Skipped**: Rogue agent rewrites audit logs, erases evidence of prior violations, resets security posture.

---

## Threat Model Coverage

| Threat | Covered By | Mitigation |
|--------|-----------|-----------|
| Memory corruption | RULE-1 | SESSION_ID + rationale + shelf-life traceability |
| Registry tampering | RULE-2 | SHA256 hash chain + validator proof |
| .pi vaporization | RULE-3 | Append-only, no deletes, whitelist ops |
| Task erasure | RULE-4 | Issue history integrity + auditable status updates |
| Session poisoning | RULE-5 | Immutable decisions, snapshots required |
| Privilege escalation | RULE-6 | Regex blocklist + zero-trust token analysis |
| Credential theft | RULE-7 | Path whitelist + symlink escape detection |
| Silent escalation | RULE-8 | Mandatory issue filing + human approval |
| Tool abuse | RULE-9 | AST analysis + constrained executor |
| Audit tampering | RULE-10 | Cryptographic signature chain |

---

## Implementation Prerequisites

### Phase 1: Activation Safety (Pre-Deployment)
1. **Dry-Run Mode**: Gatekeeper logs blocks but allows execution (WARN vs BLOCK)
2. **Registry Wipe**: Manual ability to clear all pending expectations (bootstrap safety valve)
3. **Bootstrap Exempt**: Hardcode `.pi/registry/` and minimal issue-bookkeeping paths into Gatekeeper bypass logic
4. **Integration Point**: Hook Gatekeeper into Pi tool-call event hub (before `edit()`, `write()`, `shell` execute)
5. **Emergency Kill-Switch**: A single file (`.pi/CGS_OFF`) that, if present and signed by human, disables all guardrails immediately.

### Phase 2: Validator Implementation
- [ ] RULE-1: Manual validator (human code review)
- [ ] RULE-2: SHA256 chain validator (CONSTRAINED_CMD)
- [ ] RULE-3: Whitelist validator (CONSTRAINED_CMD)
- [ ] RULE-4: Append-only validator (CONSTRAINED_CMD diff)
- [ ] RULE-5: Snapshot validator (MANUAL + SANDBOXED_TS)
- [ ] RULE-6: Regex blocklist validator (CONSTRAINED_CMD)
- [ ] RULE-7: Path whitelist validator (CONSTRAINED_CMD)
- [ ] RULE-8: Issue format validator (MANUAL + SANDBOXED_TS)
- [ ] RULE-9: Constrained Executor validator (AST analysis)
- [ ] RULE-10: SHA256 chain validator (CONSTRAINED_CMD)

### Phase 3: Integration & Testing
- [ ] Unit tests for each validator (mimic `test_suite.ts`)
- [ ] Integration test: Gatekeeper intercepts real Pi tool calls
- [ ] Negative test: Confirm blocklist rules are unbypassable
- [ ] Rollback test: Confirm bootstrap safety valves work

---

## Success Criteria

- ✅ All 10 rules deployed in `.pi/registry/expectations.jsonl` (GLOBAL, PENDING state)
- ✅ Gatekeeper activated (hooked into Pi event hub)
- ✅ Zero false positives (legitimate agent work not blocked)
- ✅ Dry-run mode operational (WARN without blocking for 1 week)
- ✅ Audit trail complete (no missing SESSION_IDs, rationales, or proofs)
- ✅ Human approval process documented and tested
- ✅ Rogue agent simulation test: Attempt RULE-1..10 violations → all blocked with escalation

---

## Follow-up Issues

- [ ] **GUARDRAIL-003**: Validator implementations (Phase 2)
- [ ] **GUARDRAIL-004**: Integration test suite (Phase 3)
- [ ] **GUARDRAIL-005**: Bootstrap safety valve procedures (emergency registry wipe)
- [ ] **GUARDRAIL-006**: Rogue agent red-team simulation (attack vectors on all 10 rules)
- [ ] **GUARDRAIL-007**: Audit log cryptographic signing (SHA256 chain for RULE-10)

---

## Notes

- These rules assume **zero pre-existing trust** in the agent. The system is designed to force good behavior through friction, not by assuming good intent.
- Each rule is **testable** (unit + integration) and **refutable** (if a rule genuinely blocks legitimate work, the rule is wrong, not the work).
- The **Skeptic Auditor** (LLM temp=0) is the first line of defense against workarounds. It will reject any plan that technically complies but violates the *spirit* of the rule.
- **Memory is not code**: Changes to `/memory` are treated as more dangerous than changes to src/, because corrupted KB silently breaks future reasoning. Hence, RULE-1 is MANUAL validation, not automated.
