# ISSUE SPECIFICATION
### 🆔 Metadata
- **ID**: AGENT-20260614-negotiation-orchestrator-agent
- **Status**: Active (Partially Implemented: manager exists; agent migration not started)
- **Severity**: High
- **Type**: Feature
- **Traceability**: `.pi/extensions/guardrails/negotiation_manager.ts`

### 🔍 Problem Statement (The "What")
> Implement a dedicated `NegotiatorAgent` to manage the multi-turn handshake process between the user and guardrail expectations.

**Observed Behavior:** The current `NegotiationManager` is an imperative orchestrator that uses direct LLM calls (`LLMService.call("NEGOTIATOR", ...)`) for reasoning. It cannot handle complex, non-linear negotiation loops (e.g., where an agent needs to check a file's content *before* deciding if a tweak is safe) without manual state management and blocking the main thread.
**Expected Behavior:** A high-intelligence negotiation process that can autonomously use tools (like `ctx_read` or specialized safety checkers) during its reasoning turns, providing granular status updates via event streaming for each iteration of the handshake.

### 🧪 Root Cause Hypothesis (The "Why")
- **Hypothesis**: The complexity of the current negotiation logic—which includes refinement, adversarial auditing, and state machine transitions—has exceeded the capacity of a simple stateless utility class.
- **Supporting Evidence**: `negotiation_manager.ts` line 52 involves an implicit reasoning step (`NEGOTIATOR`) that is tightly coupled with the management of `NegotiationState`.

### 🛠️ Proposed Resolution (The "How")
**Recommended Action:**
1.  **Implement `NegotiatorAgent`**: Create a new agent using `@earendil-works/pi-agent-core`.
2.  **Define Negotiation Tools**:
    - `refine_tweak`: A tool that allows the negotiator to call the `SkepticAuditor` as an expert witness.
    - `inspect_context`: Allows the agent to read the file it's attempting to validate before proposing a validator script.
3.  **State Transition via Events**: Instead of returning `{ status: 'NEGOTIATING', ... }`, the agent should emit `turn_end` events with structured metadata that updates the `ExpectationService`.
4.  **Multi-Turn Handshake Loop**: Implement a loop where the Agent can "propose", then wait for an event/message from the human, and then "respond" to the human's feedback using its own context.

**Risk Assessment:**
- [ ] **State Divergence**: Ensure that the `AgentState` remains synchronized with the `ExpectationService` (the source of truth for expectations).
- [ ] **Infinite Loops**: Implement a hard limit on negotiation turns within the agent loop to prevent runaway costs.
