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
