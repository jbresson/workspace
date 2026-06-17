# Issue DEP-001: Deprecate Generic Shell Access

## Context
Current philosophy shift: No generic bash/shell access for agents. Generic shell tools (like `shell` or `ctx_shell`) introduce safety risks and token inefficiency.

## Goal
Remove all generic shell execution capabilities and replace them with specialized, wrapped tools that provide safe, constrained access to necessary CLI utilities.

## Requirements
- [ ] Audit all current uses of `shell` and `ctx_shell` across the project.
- [ ] Identify high-frequency CLI needs (e.g., `git`, `npm`, `python`, `cargo`).
- [ ] Implement specialized tool wrappers for these needs that:
    - Validate inputs strictly.
    - Constrain execution scope.
    - Optimize output for token efficiency (similar to existing `shell` compression).
- [ ] Remove `shell` and `ctx_shell` from all system prompts and mandate documents.
- [ ] Verify that no critical agent workflows are broken by the removal of generic shell access.

## Success Criteria
- No tool exists that allows an agent to execute arbitrary bash commands.
- All required CLI functionality is available via specialized, safe tools.
- `MANDATES.md` and `wip-system.md` explicitly forbid generic shell access.

## Implementation Plan

### Phase 1: Audit & Discovery
- [ ] **1.1** Scan all system prompts (`memory/mindbase/wip-system.md`, `CLAUDE.md`, etc.) for references to `shell` and `ctx_shell`.
- [ ] **1.2** Grep codebase for tool invocations: `ctx_shell`, `shell` commands to identify usage patterns.
- [ ] **1.3** Analyze frequency by CLI tool: `git`, `npm`, `python`, `cargo`, `docker`, `tsc`, etc.
- [ ] **1.4** Document all discovered use cases in a mapping spreadsheet (tool -> frequency -> required args/validation).
- [ ] **1.5** Identify workflows broken if generic shell removed.

### Phase 2: Specialized Tool Wrapper Design
- [ ] **2.1** Define wrapper templates for high-frequency CLIs (git, npm, python, cargo).
  - Input validation strategy (allowlist vs. blocklist).
  - Output compression / token efficiency rules.
  - Error handling & fallback behavior.
- [ ] **2.2** Design wrapper for `git` (clone, pull, commit, push, branch, log, diff, tag).
- [ ] **2.3** Design wrapper for `npm` (install, run, list, publish, audit).
- [ ] **2.4** Design wrapper for `python` (execution, module install, version check).
- [ ] **2.5** Design wrapper for `cargo` (build, test, check, publish).
- [ ] **2.6** Design wrapper for `docker` (build, run, push, logs).
- [ ] **2.7** Document fail-safe defaults (e.g., read-only mode, dry-run).

### Phase 3: Implementation & Integration
- [ ] **3.1** Implement `GitWrapper` tool in `.pi/extensions/`.
- [ ] **3.2** Implement `NpmWrapper` tool.
- [ ] **3.3** Implement `PythonWrapper` tool.
- [ ] **3.4** Implement `CargoWrapper` tool.
- [ ] **3.5** Implement `DockerWrapper` tool.
- [ ] **3.6** Update `wip-system.md` Tools section to reference wrappers.
- [ ] **3.7** Update `MANDATES.md` to explicitly forbid `shell` and `ctx_shell`.
- [ ] **3.8** Create loader extension documentation (docs/specialized-tools.md).

### Phase 4: Validation & Removal
- [ ] **4.1** Run all existing workflows with new wrappers (no generic shell fallback).
- [ ] **4.2** Verify token efficiency: compare compression ratios old vs. new.
- [ ] **4.3** Update all agent prompts to use new wrappers only.
- [ ] **4.4** Remove `shell` and `ctx_shell` function signatures from tool lists.
- [ ] **4.5** Create deprecation warning in system prompt (if tools still exist during transition).

### Phase 5: Documentation & Communication
- [ ] **5.1** Update README.md with shell deprecation notice.
- [ ] **5.2** Create migration guide: "Shell to Specialized Tools" in docs/.
- [ ] **5.3** Document failure modes and troubleshooting per wrapper.
- [ ] **5.4** Update team wiki/onboarding with new workflow.

### Phase 6: Verification & Audit
- [ ] **6.1** Post-completion audit: grep for any remaining `shell` or `ctx_shell` in system prompts.
- [ ] **6.2** Verify `MANDATES.md` reflects ban.
- [ ] **6.3** Test edge cases: escape sequences, special chars in arguments.
- [ ] **6.4** Document any gaps or exceptions discovered during audit.
