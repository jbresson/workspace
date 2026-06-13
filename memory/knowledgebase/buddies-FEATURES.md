# Pi Buddy: Generic Headless Runner

## What's in `.pi/extensions/pi-buddies/buddy.ts`

A 100% customizable headless Pi CLI executor. Registered as:
- **Tool**: `run_buddy` 
- **Command**: `/buddy`

### ✅ What Makes This Good

1. **Fully Composable Params**
   - Required: `systemPrompt`, `prompt`
   - Optional: Model, thinking, tools, session, resources, output
   - Grouped into logical categories (modelOptions, toolOptions, etc.) for reuse

2. **Plumbed Pi CLI Options** (all major ones exposed)
   - **Model selection**: provider, model, thinking level
   - **Tool control**: allowlist/blacklist, no-builtin-tools, no-tools (read-only mode)
   - **Session management**: session, fork, noSession, sessionName (continuations + experiments)
   - **Resource loading**: extensions, skills, prompt-templates, themes, context-files
   - **Output modes**: print (default) or JSON
   - **Timeout**: configurable per execution

3. **Safe Shell Escaping**
   - `escapeShellArg()` prevents injection attacks
   - Handles embedded quotes in system prompts + user prompts

4. **Dual Registration (Tool + Command)**
   - Tool: for LLM-driven calls (`run_buddy` in tool calls)
   - Command: for human-driven interactive use (`/buddy` in editor)

5. **Use Cases Enabled**
   - Specialized reasoning (custom system prompt + high thinking)
   - Tool-restricted sub-agents (read-only, no-bash, no-tools)
   - Model/thinking swapping per phase (compat w/ task phases)
   - Session continuations (resume prior work)
   - Isolated experiments (fork/ephemeral)
   - Output switching (JSON for downstream pipelines)

6. **Error Handling**
   - Timeout protection (5min default)
   - Large output buffer (10MB)
   - Graceful error returns with stderr capture
   - Command validates required params before exec

### 🚀 Additional Enhancements (Ideas)

1. **Batch Execution**
   - Array of prompts, run sequentially with shared session
   - Useful for multi-turn workflows without state loss

2. **Result Post-Processing**
   - Optional `filter` param to extract/transform output (regex, JSON path)
   - Optional `callback` extension hook on completion

3. **Template Support**
   - `promptTemplate` param: expand `/templatename` in prompt
   - Avoid manual string interpolation

4. **Caching Layer**
   - Memoize results by (systemPrompt, prompt, model, thinking) hash
   - Opt-in via `useCache: boolean` param

5. **Cost Tracking**
   - Parse JSON output to extract token usage
   - Accumulate cost across buddy calls
   - Report in details

6. **Streaming Output**
   - For long-running buddies, stream stdout line-by-line
   - Push updates to UI via extension events

7. **Environment Isolation**
   - `env` param: pass custom env vars to subprocess (API keys, etc.)
   - `cwd` param: execute in different directory

8. **Model Fallback**
   - `fallbackModel` param: retry with alternate model if first fails
   - Useful for rate-limit resilience

9. **Approval Gate**
   - `requireApproval: boolean` param
   - Block execution if contains risky patterns (e.g., `rm -rf`)

10. **Abort/Cancel**
    - Return cancel token so caller can terminate long-running buddy
    - Cleanup subprocess on cancel

### 📋 Current Feature Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Core execution | ✅ | Headless Pi CLI via child_process.exec |
| System+user prompts | ✅ | Required params, appended to default |
| Model selection | ✅ | provider, model, thinking level |
| Tool control | ✅ | allowlist/blacklist + no-builtin/no-tools |
| Session management | ✅ | resume, fork, ephemeral, naming |
| Resource loading | ✅ | extensions, skills, prompts, themes |
| Output modes | ✅ | print (default) + JSON |
| Timeout + buffering | ✅ | 5min default, 10MB buffer |
| Shell escaping | ✅ | Safe argument quoting |
| Dual registration | ✅ | Tool + command |
| Error handling | ✅ | Graceful stderr capture |
| Batch execution | ⏳ | Not yet |
| Caching | ⏳ | Not yet |
| Streaming | ⏳ | Not yet |
| Cost tracking | ⏳ | Not yet |
