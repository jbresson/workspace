# ISSUE SPECIFICATION
### 🆔 Metadata
- **ID**: AGENT-20260614-skeptic-auditor-migration
- **Severity**: Medium
- **Type**: Refactor
- **Traceability**: `.pi/extensions/guardrails/skeptic_auditor.ts`

### 🔍 Problem Statement (The "What")
> Transform the `SkepticAuditor` from a stateless utility class into a stateful, event-emitting `@earendil-works/pi-agent-core` Agent.

**Observed Behavior:** Currently, `audit()` and `evaluateTweak()` are single-shot LLM calls. The reasoning (the "[CRITIQUE]" or "why it failed") is returned only after the call completes, preventing real-time UI streaming of the audit process.
**Expected Behavior:** As the Auditor performs an adversarial review, the user/system should see a live stream of its thought process and intermediate critiques via `message_update` events.

### 🧪 Root Cause Hypothesis (The "Why")
- **Hypothesis**: The current implementation uses direct `LLMService.call()` which is a request-response pattern, lacking the hook-based event architecture provided by the Pi Agent core.
- **Supporting Evidence**: `skeptic_auditor.ts` lines 32-45 (single await on LLM call).

### 🛠️ Proposed Resolution (The "How")
**Recommended Action:**
1.  **Define AuditorAgent**: Create a subclass of `Agent` specifically for the Skeptic profile.
2.  **Implement AgentTools**: Wrap the core audit logic into tools that the Auditor can use to self-reflect or query project context via `ctx_read`.
3.  **Stream Audit Reasoning**: Utilize `agent.state.streamingMessage` to emit incremental reasoning steps (e.g., "Checking for hardcoded exit codes...", "Verifying file paths...") during a long audit loop.
4.  **Integration**: Update `NegotiationManager` and `FinalizeChecker` to call the Auditor via its `.prompt()` method or by subscribing to its event stream.

**Risk Assessment:**
- [ ] Potential increase in token usage if the auditor becomes too "chatty" during streaming.
- [ ] Requires careful handling of `AgentMessage` types to ensure audit findings don't conflict with user messages.
