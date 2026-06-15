# ISSUE: Implement Negotiator Guardrail Pattern

## Description
The current agent implementation lacks a formalized pattern for "Negotiation" between the Agent, the User (Buddy), and security/validation layers. We need to establish a standard way to handle scenarios where an agent's intent is blocked by guardrails, requiring a multi-turn negotiation with the user rather than a simple error failure.

## Proposed Pattern: The Negotiator
A three-layer defense/interaction model:
1.  **Pre-flight (Security Officer):** `beforeToolCall` hook to block unauthorized or dangerous tool calls and provide a "reason" that is injected into the conversation.
2.  **Post-execution (Privacy Officer):** `afterToolCall` hook to sanitize sensitive data from tool results before they reach the LLM context.
3.  **Interaction (The Buddy):** The agent's system prompt must be configured to recognize "block" signals as opportunities for negotiation rather than terminal errors.

## Requirements / Tasks
- [ ] **Standardize Error Injection:** Ensure that when `beforeToolCall` returns `{ block: true, reason: string }`, the error is presented to the LLM in a way that facilitates conversation (not just a raw exception).
- [ ] **Redaction Hook Pattern:** Create an example/template for using `afterToolCall` to sanitize PII from tool output.
- [ ] **System Prompt Templates:** Add "Negotiator" system prompt variants to our prompt library that instruct the agent on how to recover from blocked calls via user interaction.
- [ ] **Documentation:** Update `docs/agent-harness.md` with this pattern.

## Risk Assessment
- **False Positives:** Overly aggressive `beforeToolCall` logic might break legitimate complex queries.
- **Token Overhead:** Negotiation turns increase the number of LLM calls required to complete a task.

## Context / Links
- Related to: `@earendil-works/pi-agent-core` tool lifecycle hooks.
- Impact: High (Affects security and UX for all agentic workflows).
