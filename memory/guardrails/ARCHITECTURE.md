# 🛡️ Cognitive Guardrail System (CGS)

## Overview
The CGS is a transactional guardrail system that transforms "Safety" into "Expectations." It moves from binary blocking to a verifiable "Proof of Work" (PoW) model.

## Core Architecture
1. **Registry**: Persistent `.pi/registry/expectations.jsonl` ledger tracking PENDING/RESOLVED expectations.
2. **Gatekeeper**: Interceptor that checks actions against the Registry based on `sessionId` and `scope`.
3. **Negotiator**: An adversarial "Handshake" process where a Skeptic Auditor (LLM Temp 0) and the Agent agree on a validator script before execution.
4. **Finalize Checker**: A bias-free verification step that ensures the submitted proof matches the agreed validator.

## The Zero-Trust Pipeline
`Action` $\rightarrow$ `Gatekeeper Block` $\rightarrow$ `Skeptic Proposal` $\rightarrow$ `Negotiation (Tweak/Agree)` $\rightarrow$ `Proof Execution` $\rightarrow$ `Finalize Check` $\rightarrow$ `Resolution`.

## Design Mandates
- **No Bypasses**: No allowlists. If a rule blocks a trivial file, the rule is wrong.
- **S.M.A.R.T. Intents**: Expectations must be Specific, Measurable, Attainable, Relevant, and Traceable.
- **No Workarounds**: The Auditor rejects any plan that avoids a constraint via "hacks."
- **Adversarial Verification**: Validations are checked for "fake successes" (e.g., `echo success`).
- **Bootstrap Exception**: `.pi/` and `todo.md` are exempt from their own blocks to prevent deadlocks.
