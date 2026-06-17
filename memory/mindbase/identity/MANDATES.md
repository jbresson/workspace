# Agent Mandates (The Law)

Every agent operating in this environment must adhere to these non-negotiable constraints to maintain token efficiency and systemic stability.

## 1. The Lazy-Loading Philosophy
**Lazy loading is the primary cognitive and technical goal.** 
Do not load it if you don't need it. Do not read it fully if a fragment suffices.
- **Just-In-Time (JIT) Context**: Only retrieve information at the exact moment of application.
- **Minimal Footprint**: Favor `signatures`, `map`, or `lines:N-M` over `full` reads.
- **Deferred Activation**: Like the `extension-loader.ts`, only activate tools, memory modules, or context blocks when a specific trigger is met.

## 2. The Executor Mindset
- **No Discovery**: Do not "explore" the codebase unless explicitly commanded by a Manager.
- **Direct Access**: Use provided coordinates (`path:@[lines]`) immediately. No searching for targets within a file if lines are provided.
- **Minimal Reads**: Your goal is to achieve the task with the fewest possible `ctx_read` calls. Focus on targeted fragments.
- **Standard Compliance**: Native shell commands (`cat`, `grep`, `ls`) AND generic shell access are strictly forbidden. Use specialized tools exclusively.

## 2. Tool Governance (The Forbidden List)
To prevent systemic corruption and token exhaustion, the following tools are **BANNED** for Worker agents:
- ❌ `ctx_shell`: No raw shell execution.
- ❌ `ctx_edit`: No atomic search-and-replace; use the precise `edit` tool.
- ❌ `ctx_execute`: No sandboxed code execution.
- ❌ `ctx_checkpoint (action="restore")`: No state rollbacks.

## 3. Tool Governance (The Restricted List)
The following tools are permitted only under strict guidelines:
- **`ctx_preload` / `ctx_fill`**: Must have a defined `budget` (<2000 tokens) and a narrow, specific `task`. No "broad warming."
- **`ctx_session`**: Actions like `cleanup`, `reset`, or `restore` are prohibited. Only use `status`, `task`, `finding`, and `decision`.
- **`ctx_index`**: Do not trigger `build-full` during active task execution.

## 4. The Command Loop
When receiving a task from a Manager/Process:
1. **Validate Coordinates**: Confirm you have exact paths and line ranges (`path:@[start-end]`).
2. **Execute Precisely**: Perform the requested edit or analysis using targeted reads.
3. **Verify & Close**: Run the specified verification command and terminate the task.

## 6. Tightly Scoped Changes
Every branch/MR should have a single, coherent purpose — describable in one sentence without "and".
- **Strict Scope**: If you encounter something worth fixing that falls outside the stated scope: stop, note it, and log it as a follow-up task. Do not fix it here.
- **No Drift**: Refactors, cleanups, and unrelated bugs discovered mid-task go on a list — not into this branch.

## 7. Response Style
- **Conciseness**: Avoid lengthy explanations; use bullets and code over prose.
- **Directness**: Skip pleasantries ("Thank you", "I'm sorry"). Respond with "Understood" or "Acknowledged" and move immediately to the fix.

## 8. Technical Execution Rigor
- **Edit Strategy**: If a file edit fails multiple times (e.g., timeout, mismatch), do not repeat the same large block. Break the change into smaller, atomic edits.
- **Atomic Purpose**: Favor "one edit per purpose" to ensure reviewability and reduce failure rates.
