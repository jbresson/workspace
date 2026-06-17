# Buddy Skill

**Identifier**: `buddy`  
**Type**: Executor / Reasoning Engine  
**Purpose**: Headless Pi CLI with custom system prompt + optimized thinking level  

---

## Definition

A **buddy** is an isolated, lightweight Pi CLI sub-session that executes specialized reasoning tasks without polluting the main session context. Buddies enable:
- Custom system prompts
- Per-phase thinking/model optimization
- Tool-restricted execution (read-only, safe analysis)
- Session continuations and state isolation
- Structured JSON output for piping

---

## Core Capability

**What**: Run a headless Pi instance with full control over model, thinking, tools, and resources.

**When**: 
- Phase 0-3 (high-cognition tasks): Crystallize, audit decisions, decompose intent
- Specialized reasoning: Debug, security review, architecture audit
- Read-only analysis: Extract facts without side effects
- Isolated experiments: Fork and retry safely

**How**: 
- Accepts `systemPrompt` (required), `prompt` (required), plus 10+ optional parameters
- Escapes shell safely, handles timeouts (5min default, 10MB output buffer)
- Returns structured output (text or JSON)
- Supports session continuations via `sessionId` for iterative refinement

---

## Parameters

| Category | Param | Type | Default | Purpose |
|----------|-------|------|---------|---------|
| **Core** | `systemPrompt` | string | — | Required system prompt override |
| **Core** | `prompt` | string | — | Required user message |
| **Model** | `provider` | string | (default) | LLM provider (e.g., openai, anthropic) |
| **Model** | `model` | string | (default) | Model ID (e.g., gpt-4, claude-opus) |
| **Model** | `thinking` | string | (default) | Thinking level (low, medium, high) |
| **Tools** | `tools` | string[] | — | Allowlist specific tools |
| **Tools** | `excludeTools` | string[] | — | Blacklist specific tools |
| **Tools** | `noBuiltinTools` | boolean | false | Disable built-in tools |
| **Tools** | `noTools` | boolean | false | Disable all tools (read-only mode) |
| **Session** | `session` | string | — | Session ID to resume |
| **Session** | `sessionName` | string | — | Named session for persistence |
| **Session** | `fork` | boolean | false | Spawn ephemeral session (no state leak) |
| **Session** | `noSession` | boolean | false | Run stateless |
| **Resources** | `extensions` | string[] | — | Load custom extensions |
| **Resources** | `skills` | string[] | — | Load custom skills |
| **Resources** | `promptTemplates` | string[] | — | Load prompt templates |
| **Resources** | `themes` | string[] | — | Load themes |
| **Resources** | `noContextFiles` | boolean | false | Skip context files |
| **Output** | `outputMode` | "print" \| "json" | "print" | Output format |
| **Performance** | `timeout` | number (ms) | 300000 | Execution timeout |

---

## Use Cases

### 1. Phase 0 Crystallization (High Thinking)
```json
{
  "systemPrompt": "Define Success Criteria, Acceptance Criteria, Hard Constraints, and False Win Risks.",
  "prompt": "Implement OAuth2 refresh token rotation with Redis state.",
  "thinking": "high",
  "sessionName": "oauth-p0",
  "timeout": 600000
}
```

### 2. Read-Only Analysis (No Tools)
```json
{
  "systemPrompt": "Analyze code structure. Identify N+1 queries and performance issues. Do not modify.",
  "prompt": "Review the user service for query inefficiencies.",
  "noTools": true
}
```

### 3. Iterative Refinement (Session Continuation)
```json
{
  "systemPrompt": "You forgot the False Win Risks. Identify what a 'false success' looks like.",
  "prompt": "What assumptions could lead to incorrect token invalidation?",
  "session": "oauth-p0"
}
```

### 4. Tool-Restricted Sub-Agent
```json
{
  "systemPrompt": "Debug this error without executing bash or making changes.",
  "prompt": "Why is the OAuth callback timing out?",
  "excludeTools": ["bash", "file_write"],
  "thinking": "high"
}
```

### 5. Model/Thinking Per-Phase
```json
{
  "systemPrompt": "Phase 5: Consolidate findings for knowledge base.",
  "prompt": "Summarize the OAuth implementation decisions.",
  "model": "gpt-3.5-turbo",
  "thinking": "low",
  "outputMode": "json"
}
```

---

## Implementation

**Registration**:
- Tool: `run_buddy` (for LLM-driven invocation)
- Command: `/buddy` (for interactive use)

**File**: `.pi/extensions/buddies/buddy.ts` (413L)

**Key Functions**:
- `runBuddy(params)` — Execute headless Pi CLI
- `buildPiCommand(params)` — Construct shell command with safe escaping
- `escapeShellArg(arg)` — Prevent injection attacks

**Safety**:
- Shell escaping via `escapeShellArg()`
- Timeout protection (5min default)
- 10MB output buffer for verbose responses
- Graceful stderr capture

---

## Integration with Task Execution

Buddies are **phase engines**. Each phase delegates to a buddy with:
- `systemPrompt` = Phase goal (Crystallize, Ignition, Cycling, etc.)
- `thinking` = Optimized for phase (high for P0/P3, medium for P1/P2/P4, low for P5/P6)
- `sessionName` = Phase identifier (e.g., `oauth-p0`, `oauth-p1`)
- `tips` = Distilled facts from prior phases (avoid redundancy)

**Result Pipeline**: P0 output → P1 tips → P1 output → P2 tips → ...

---

## Future Enhancements

- [ ] Batch execution (sequential prompts, shared session)
- [ ] Result caching (by hash of systemPrompt+prompt+model+thinking)
- [ ] Streaming output (line-by-line for long tasks)
- [ ] Cost tracking (token/API cost per buddy)
- [ ] Environment isolation (`env` param for subprocess vars)
- [ ] Cancellation (abort token for long-running tasks)

---

## References

- **Implementation**: `.pi/extensions/buddies/buddy.ts`
- **Feature Guide**: `memory/knowledgebase/projects/buddy-features.md`
- **Task Execution**: `memory/mindbase/skills/task-execution/SKILL.md`
