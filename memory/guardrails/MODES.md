# Omnitool Mode Matrix

Omnitool uses a unified mode system to control tool registration, guardrail enforcement, and logging verbosity.

## Configuration
Mode is configured at the process level via the `OMNITOOL_MODE` environment variable.

| Mode | Registration | Guardrails | Blocking | Logging | Use Case |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **OFF** | ❌ | ❌ | ❌ | N/A | Disable omnitool entirely. |
| **DEBUG** | ✅ | ❌ | ❌ | Verbose (Internals) | Debugging tool registration & dispatch. |
| **ON** | ✅ | ❌ | ❌ | Error Only | Unrestricted proxy access. |
| **GUARDED_DEBUG**| ✅ | ✅ | ❌ | Verbose (Guardrails) | Testing rules without blocking execution. |
| **GUARDED** | ✅ | ✅ | ✅ | Error Only | Standard secure operation (Default). |
| **AFK** | ✅ | ✅ | ✅ | Error Only | Autonomous mode; forces issue creation for blockers. |

## AFK Escalation Logic
When a rule requiring oversight is triggered in `AFK` mode:
1. **Intercept**: Gatekeeper detects the oversight requirement.
2. **Expectation**: An automatic expectation is created in the Registry.
3. **Block**: Tool execution is blocked.
4. **Requirement**: Agent must create a formal issue/ticket to resolve the blockage.
5. **Clearance**: Once the expectation is resolved (manual/scripted), tool access is restored.

## Logging Rules
- **Base**: Default to error-only to prevent token saturation.
- **DEBUG / GUARDED_DEBUG**: Activates verbose lifecycle logging for registration, dispatch, and guardrail rule matching.
- **Internal Proxy**: Omnitool's internal proxy logic remains error-only even in DEBUG mode to avoid echoing proxied tool outputs twice.
