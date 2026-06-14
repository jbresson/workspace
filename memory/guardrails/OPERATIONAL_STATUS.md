# 🚦 Guardrail Operational Status

## Current Activation State: **OFFLINE / STAGING**

The engine is currently implemented in the codebase but is **NOT** hooked into the main Pi tool-call event hub. 

### What this means:
- No actions are currently being intercepted by the `Gatekeeper`.
- No files are being blocked.
- The system is currently a "library" of services that can be invoked, but it is not yet a "governor" of the agent's behavior.

## Potential Blockers (If Activated)
If the system were activated now, the following rules would apply:
1. **Registry Entries**: Only actions matching `PENDING` entries in `.pi/registry/expectations.jsonl` will be blocked.
2. **Empty Registry = No Blocks**: If the `.jsonl` file is empty or missing, the Gatekeeper allows all actions.

## Safety Protocol for Activation
To prevent accidental "self-blocking" during the final integration:
1. **Dry-Run Mode**: The `Gatekeeper` will first be implemented to `WARN` instead of `BLOCK`.
2. **Manual Registry Clear**: Ability to run a command to wipe all pending expectations.
3. **Bootstrap Guarantee**: Ensure `.pi/` and `todo.md` are hard-coded as exempt in the `Gatekeeper` interceptor.
