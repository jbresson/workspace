# Guardrails Operational State (2026-06-15)

## 🏗️ Current Architecture
The Guardrail system operates as a two-step interception filter integrated into the Pi Harness `tool_call` event hub.

### 1. Interception Pipeline
`Tool Call` $\rightarrow$ `GuardrailInterceptor` $\rightarrow$ `GuardrailOrchestrator` $\rightarrow$ `Gatekeeper` $\rightarrow$ `Result`

### 2. The Two-Step Filter (Gatekeeper)
- **Step 1: Global Rules (`gatekeeper-rules.ts`)**
  - **Predicate**: Fast filter via `toolGuard(toolName)`.
  - **Validation**: Deep inspection via `paramInspector(toolName, params)`.
  - **Normalization**: Each rule is responsible for its own parameter normalization (e.g., resolving relative paths).
  - **Oversight**: If `requiresOversight` is true and mode is `AFK`, a session expectation (`EXP-AFK-*`) is issued and the tool is blocked.
- **Step 2: Session Expectations (`ExpectationsService`)**
  - Checks for `PENDING` expectations linked to the current `sessionId`.
  - **Bypass**: Resolution tools (`resolve_guardrail`, `negotiate_guardrail`) bypass this check to prevent circular blocks.

## 🛠️ Component Responsibilities
| Component | Responsibility | Key Logic |
| :--- | :--- | :--- |
| `Interceptor` | Hooking & Routing | Extracts `sessionId`, routes to Orchestrator. |
| `Orchestrator` | Coordination | Manages the flow between Gatekeeper, Negotiator, and Finalizer. |
| `Gatekeeper` | Enforcement | Executes the 2-step filter; handles AFK mode logic. |
| `ExpectationsService` | State Management | CRUD for `.pi/extensions/guardrails/expectations.jsonl`. |
| `gatekeeper-rules.ts` | Policy Definition | Self-contained rules with embedded validation logic. |

## ⚙️ Operational Modes
- `OFF`: No interception.
- `DEBUG`: Log violations but allow execution.
- `ENFORCE`: Block any violation (Global or Session).
- `AFK`: Blocks actions requiring human oversight; converts them to `EXP-TODO` expectations.

## 🚨 Critical Constraints
- **Session First**: All service methods must accept `sessionId` as the first parameter.
- **Rule Autonomy**: No shared matching logic in services; rules must be self-contained units of truth.
- **Fail-Closed**: Interceptor errors result in a block to prevent accidental unsafe execution.
