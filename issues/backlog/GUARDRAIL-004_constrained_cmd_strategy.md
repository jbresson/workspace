# GUARDRAIL-004: Constrained Command Strategy

**Status**: PENDING
**Priority**: HIGH
**Category**: Security

## Description
Implement the `ConstrainedCmdStrategy` for shell-based proofs.

## Requirements
1. Blacklist characters: `|`, `;`, `&`, `>`, `>>`.
2. Path Pinning: All paths must be within project root and not in sensitive dirs.
3. Trigger Correlation: Verify command targets the original expectation trigger.
