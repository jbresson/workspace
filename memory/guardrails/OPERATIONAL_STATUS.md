# 🚦 Guardrail Operational Status

## Current Activation State: **ACTIVE / ENFORCED**

The CGS engine is fully implemented and integrated into the Pi tool-call event hub via the `guardrail-interceptor` extension.

### Current Posture:
- ✅ **Interception**: Active. Calls to `edit`, `write`, `bash`, and `ctx_shell` are routed through the Gatekeeper.
- ✅ **Rule Set**: The "Top 10 Initial Rules" (GUARDRAIL-002) are active in the registry under the **Strict Profile**.
- ✅ **Registry**: `.pi/extensions/guardrails/expectations.jsonl` is the source of truth for all pending blocks.

### Safety Protocols
1. **Bootstrap Exemption**: Critical paths (`.pi/`, `todo.md`) are hard-coded as exempt in the interceptor to prevent system deadlocks.
2. **Profile Management**: Rules can be switched between `Strict`, `Developer`, and `Minimal` profiles via the `GuardrailBootstrapper`.
3. **Emergency Valve**: Registry can be cleared via `RegistryService.clearRegistry()`.
4. **Baseline Integrity**: The genesis state of the registry is hashed to detect unauthorized mutations.
   - **Genesis Hash (2026-06-14)**: `19b759bbec4b0270166613614b69b3a00260ab4f62b00d40f5bf778a281bf2ca`
5. **Human Override**: Mode can be switched via `/guardrail set <MODE>` command (Session-only).

## Active Constraints (Summary)
- **Memory Lock**: `/memory` mutations require human review/rationale.
- **Registry Protection**: `.pi/extensions/guardrails/expectations.jsonl` is strictly protected.
- **Dir Lockdown**: No destructive operations on `.pi/`.
- **Append-Only**: `todo.md` cannot be deleted or rewritten.
- **Shell Safety**: Privilege escalation (`sudo`, etc.) and forbidden paths are hard-blocked.
