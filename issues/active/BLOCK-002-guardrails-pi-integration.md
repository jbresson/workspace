# BLOCK-002-guardrails-pi-integration

## Status: PENDING
**Priority**: HIGH
**Category**: Integration / Safety

## Description
The Cognitive Guardrail System (CGS) is architected and validated in `.pi/registry/`, but remains a standalone library. It is not yet hooked into the Pi harness event loop, meaning it cannot currently intercept or block real tool calls.

## Acceptance Criteria (AC)
- [ ] **Interceptor Hook**: Create `.pi/extensions/guardrail-interceptor.ts` to intercept `edit`, `write`, `bash`, and `ctx_shell`.
- [ ] **Orchestrator Routing**: Ensure intercepted calls are routed through `GuardrailOrchestrator.handleAction()`.
- [ ] **Execution Strategy Upgrade**: Update `CONSTRAINED_CMD` strategy in `validation_strategies.ts` to include actual execution with timeout and output pattern matching (currently only syntax check).
- [ ] **Adversarial LLM Integration**: Replace heuristic-based checks in `skeptic_auditor.ts` with actual LLM calls using a `temp=0` profile.
- [ ] **End-to-End Validation**: Demonstrate a full cycle: `Action` -> `Block` -> `Negotiation` -> `Proof` -> `Resolution` -> `Execution`.

## Risks & False Wins
- **False Win**: Interceptor exists but can be bypassed by calling internal tool implementations directly.
- **Risk**: Fail-open logic in Orchestrator might hide critical safety bugs during testing.
- **Risk**: High latency introduced to every tool call by the interceptor loop.

## Dependency Graph
`Pi Event Hub` -> `Guardrail Interceptor` -> `GuardrailOrchestrator` -> `Gatekeeper` -> `RegistryService`
