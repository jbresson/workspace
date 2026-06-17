# BLOCK-002-guardrails-pi-integration

## Description
The Cognitive Guardrail System (CGS) is architected and validated in `.pi/registry/`, but remains a standalone library. It is not yet hooked into the Pi harness event loop, meaning it cannot currently intercept or block real tool calls.

## Acceptance Criteria (AC)
- [x] **Interceptor Hook**: `.pi/extensions/guardrails/guardrail-interceptor.ts` exists and intercepts `tool_call`.
- [x] **Orchestrator Routing**: Interceptor routes through `GuardrailOrchestrator.handleAction()`.
- [x] **Execution Strategy Upgrade**: `CONSTRAINED_CMD` now executes proof via `ConstrainedExecutor` with timeout/buffer constraints.
- [~] **Adversarial LLM Integration**: `skeptic_auditor.ts` uses `LLMService.call("SKEPTIC", ...)`, but true temperature pinning in CLI path still unverified.
- [ ] **End-to-End Validation**: Full harness-level proof demo still missing in issue evidence.

## Risks & False Wins
- **False Win**: Interceptor exists but can be bypassed by calling internal tool implementations directly.
- **Risk**: Fail-open logic in Orchestrator might hide critical safety bugs during testing.
- **Risk**: High latency introduced to every tool call by the interceptor loop.

## Current Verification Notes (2026-06-15)
- Interceptor currently at `.pi/extensions/guardrails/guardrail-interceptor.ts` (path changed from original issue text).
- Extension export wired via `.pi/extensions/guardrails/index.ts`.
- Remaining blocker for closure: attach reproducible end-to-end run evidence.

## Dependency Graph
`Pi Event Hub` -> `Guardrail Interceptor` -> `GuardrailOrchestrator` -> `Gatekeeper` -> `ExpectationService`
