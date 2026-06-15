# 🛡️ Cognitive Guardrail System (CGS)

## Overview
The CGS is a transactional guardrail system that transforms "Safety" into "Expectations." It moves from binary blocking to a verifiable "Proof of Work" (PoW) model.

## Core Architecture
1. **Registry**: Persistent `.pi/extensions/guardrails/expectations.jsonl` ledger tracking PENDING/RESOLVED expectations.
2. **Gatekeeper**: Interceptor that checks actions against the Registry based on `sessionId` and `scope`.
3. **Negotiator**: An adversarial "Handshake" process where a Skeptic Auditor (LLM Temp 0) and the Agent agree on a validator script before execution.
4. **Finalize Checker**: A bias-free verification step that ensures the submitted proof matches the agreed validator.
5. **Interceptor Extension**: The bridge to the Pi Tool Hub, located at `.pi/extensions/guardrails/guardrail-interceptor.ts`, which performs the real-time blocking of sensitive tools.

### Operational Modes
- **OFF**: No interception.
- **DEBUG**: Intercept and warn, but allow execution.
- **ENFORCE**: Intercept and block based on Registry expectations.
- **AFK (Away From Keyboard)**: High-autonomy mode where real-time human confirmation is unavailable. 
  - **Behavior**: Blocks all "confirm with user" prompts.
  - **Requirement**: Forces the agent to externalize blocked work as a formal TODO/Ticket and provide a written justification for how they will proceed without human oversight.

## The Zero-Trust Pipeline
`Action` $\rightarrow$ `Gatekeeper Block` $\rightarrow$ `Skeptic Proposal` $\rightarrow$ `Negotiation (Tweak/Agree)` $\rightarrow$ `Proof Execution` $\rightarrow$ `Finalize Check` $\rightarrow$ `Resolution`.

## Design Mandates
- **No Bypasses**: No allowlists. If a rule blocks a trivial file, the rule is wrong.
- **S.M.A.R.T. Intents**: Expectations must be Specific, Measurable, Attainable, Relevant, and Traceable.
- **No Workarounds**: The Auditor rejects any plan that avoids a constraint via "hacks."
- **Adversarial Verification**: Validations are checked for "fake successes" (e.g., `echo success`).
- **Bootstrap Exception**: `.pi/` and `todo.md` are exempt from their own blocks to prevent deadlocks.
