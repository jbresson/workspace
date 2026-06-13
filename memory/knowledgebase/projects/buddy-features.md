# Pi Buddy: Headless Reasoning Executor

A fully customizable headless Pi CLI executor. Registered as:
- **Tool**: `run_buddy`
- **Command**: `/buddy`

---

## What's a Buddy?

A "buddy" is a lightweight, isolated Pi CLI instance that runs with custom system prompt + optimized thinking level. Use buddies to offload specialized reasoning tasks without polluting your main session context.

---

## Parameters

**Required:**
- `systemPrompt` (string): Custom system prompt override
- `prompt` (string): User message/task

**Optional:**

| Category | Parameters | Purpose |
|----------|------------|---------|
| **Model Control** | `provider`, `model`, `thinking` | Switch model/thinking level mid-task |
| **Tool Control** | `tools`, `excludeTools`, `noBuiltinTools`, `noTools` | Restrict/enable specific tools |
| **Session** | `session`, `sessionName`, `fork`, `noSession` | Resume, fork, or isolate state |
| **Resources** | `extensions`, `skills`, `promptTemplates`, `themes` | Load specific resources |
| **Output** | `outputMode` ("print" or "json") | Structured output for piping |
| **Performance** | `timeout` (ms, default 300000) | Execution timeout |

---

## Use Cases

1. **Specialized Reasoning**
   - Custom system prompt + high thinking
   - Example: Debug complex error, audit security decision

2. **Tool-Restricted Sub-Agent**
   - Read-only mode: `noTools: true`
   - Safe analysis without side effects

3. **Model/Thinking Per-Phase**
   - Phase 0 (high thinking): `thinking: "high"`, `model: "gpt-4"`
   - Phase 5 (low thinking): `thinking: "low"`, `model: "gpt-3.5"`

4. **Session Continuations**
   - Resume prior work: pass `sessionId` from previous call
   - Iterate without state loss

5. **Isolated Experiments**
   - Fork session: `fork: true`
   - Test risky ideas in isolation

6. **Structured Output**
   - `outputMode: "json"` for downstream pipelines
   - Parse results programmatically

---

## Example Calls

### Debug an Error (High Thinking)
```json
{
  "systemPrompt": "You are an expert debugger. Analyze errors systematically.",
  "prompt": "Why is this OAuth token refresh failing?",
  "thinking": "high",
  "timeout": 600000
}
```

### Read-Only Analysis (No Tools)
```json
{
  "systemPrompt": "Analyze code structure without making changes.",
  "prompt": "What are the N+1 query issues in this service?",
  "noTools": true
}
```

### Multi-Phase Execution (Gpt-4 + High Thinking)
```json
{
  "systemPrompt": "Phase 0: Crystallize the problem.",
  "prompt": "Define Success Criteria and Acceptance Criteria for the cache invalidation bug.",
  "model": "gpt-4",
  "thinking": "high",
  "sessionName": "oauth-p0"
}
```

---

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Core execution | ✅ | Headless Pi CLI via child_process.exec |
| System+user prompts | ✅ | Required, appended to default |
| Model selection | ✅ | provider, model, thinking level |
| Tool control | ✅ | allowlist/blacklist + no-builtin/no-tools |
| Session management | ✅ | resume, fork, ephemeral, naming |
| Resource loading | ✅ | extensions, skills, prompts, themes |
| Output modes | ✅ | print (default) + JSON |
| Timeout + buffering | ✅ | 5min default, 10MB buffer |
| Shell escaping | ✅ | Safe argument quoting |
| Error handling | ✅ | Graceful stderr capture |
| **Batch execution** | ⏳ | Run multiple prompts sequentially |
| **Caching** | ⏳ | Memoize by (systemPrompt, prompt, model, thinking) |
| **Streaming** | ⏳ | Line-by-line output for long tasks |
| **Cost tracking** | ⏳ | Token/API cost per buddy session |
| **Environment vars** | ⏳ | Pass custom env to subprocess |
| **Fallback model** | ⏳ | Retry with alternate model on failure |
| **Approval gate** | ⏳ | Block risky patterns before execution |
| **Cancellation** | ⏳ | Abort long-running buddy |

---

## Implementation Details

**Safety:**
- Shell escaping via `escapeShellArg()` prevents injection attacks
- Timeout protection (5min default) prevents hanging
- Large output buffer (10MB) handles verbose responses
- Graceful error returns with stderr capture

**Dual Registration:**
- Tool: for LLM-driven calls (`run_buddy` in tool calls)
- Command: for human-driven interactive use (`/buddy` in editor)

---

## References

- **Extension Pattern**: `memory/knowledgebase/projects/extension-refactoring.md`
- **Task Execution**: `memory/knowledgebase/projects/task-execution-runner.md`
- **Process Definition**: `memory/mindbase/processes/TASK_EXECUTION.md`
