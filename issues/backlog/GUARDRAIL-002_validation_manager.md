# GUARDRAIL-002: Validation Manager Implementation

**Status**: PENDING
**Priority**: HIGH
**Category**: Core

## Description
Implement the `ValidationManager` to route proof attempts to the appropriate strategy (`MANUAL`, `CONSTRAINED_CMD`, `SANDBOXED_TS`).

## Requirement
Must implement a fail-safe mechanism: if the validation type is unknown or missing, it must default to `MANUAL`.
