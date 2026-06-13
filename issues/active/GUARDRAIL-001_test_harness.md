# GUARDRAIL-001: Test Harness Execution Blocked

**Status**: OPEN
**Priority**: CRITICAL
**Category**: Infra

## Description
The current environment is experiencing `EPERM` and `MODULE_NOT_FOUND` issues when attempting to run TypeScript tests via `ts-node` or `npx`. This prevents verification of the Registry and Gatekeeper logic.

## Requirement
Establish a stable execution loop for `.ts` files within the harness that does not trigger permission errors.

## Validation
A test script (e.g., `.pi/registry/test_suite.ts`) must execute successfully and return `✨ All logic tests passed successfully\!`.
