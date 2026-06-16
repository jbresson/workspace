# Unit Test Harness - Registry & Gatekeeper

## Overview
This directory contains the test harness for validating the core logic of the guardrail system: Registry Service and Gatekeeper. The tests verify expectation-based blocking, scope isolation, and AFK mode behavior.

## Files

- **`expectation_service.ts`**: Manages expectation persistence and retrieval.
- **`gatekeeper.ts`**: Implements safety interception logic.
- **`test_suite.ts`**: Comprehensive test suite (4 test cases).
- **`tsconfig.json`**: TypeScript compiler config for this directory.
- **`test_suite.js`**: Compiled JavaScript (auto-generated).

## Running Tests

### Direct Node Execution
```bash
node .pi/registry/test_suite.js
```

### Via npm (Recommended)
```bash
npm test
# or specifically:
npm run test:registry
```

## Build

Recompile TypeScript if source files are modified:
```bash
npm run build:registry
# or:
cd .pi/registry && tsc
```

## Test Cases

### Test 1: Global Scope Enforcement
Verifies that expectations with `scope: 'GLOBAL'` block ALL sessions, not just the originating one.

**Pass Condition**: A different session cannot bypass a global expectation.

### Test 2: Session Isolation
Verifies that expectations with `scope: 'SESSION'` only apply to the specific session.

**Pass Condition**: A different session is NOT blocked by a session-scoped expectation.

### Test 3: AFK Todo Generation
Verifies that when blocked in AFK mode, a meta-expectation (TODO) is generated for documentation.

**Pass Condition**: `handleBlock()` returns an expectation with ID format `EXP-TODO-*`.

### Test 4: Proof Persistence
Verifies that resolving a TODO does NOT resolve the original blockage (compliance ≠ correctness).

**Pass Condition**: Original expectation remains PENDING after TODO is RESOLVED.

## Success Criteria

All tests must complete with exit code `0` and terminal message:
```
✨ All logic tests passed successfully!
```

## Troubleshooting

### Issue: `npm: EPERM` errors
**Solution**: Cache corruption. Clear npm cache if necessary (or run with direct node execution).

### Issue: TypeScript compilation errors
**Solution**: Ensure tsconfig.json in `.pi/registry/` exists and `tsc` is in PATH.

### Issue: Tests fail to find modules
**Solution**: Verify working directory is `/path/to/workspace`. Tests use relative paths.

## Architecture

```
ExpectationService
    ↓ (issues expectations)
Expectation (PENDING)
    ↓ (intercepted by)
Gatekeeper
    ↓ (blocks or allows)
Action Result
    ↓ (if blocked in AFK)
handleBlock() → EXP-TODO-* (META-EXPECTATION)
```

## Future Extensions

- Add constrained command validation tests (CONSTRAINED_CMD)
- Add sandboxed TS execution validation tests (SANDBOXED_TS)
- Integrate with CI/CD pipeline
- Add performance benchmarks

