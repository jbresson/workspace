# CTX_CALL_INDEX

Reference index for LeanCTX Intelligence, Session, Memory, Workflow & Analysis tools. Use via `ctx_call({"name": "<tool_name>", "arguments": <args>})`.

---

## Intelligence (Core)
### ctx_smart_read
- **Desc**: Adaptive file read. Auto-compresses (full/map/signatures) based on size, type, budget.
- **When**: Read file with token constraint.
- **Args**:
  ```json
  {
    "path": "string" // Required. File path.
  }
  ```

### ctx_delta
- **Desc**: Myers diff incremental update. Only sends changed lines (hunks) of cached file.
- **When**: Pull updates for already-cached file.
- **Args**:
  ```json
  {
    "path": "string" // Required. File path.
  }
  ```

### ctx_fill
- **Desc**: Priority-based file context packing within token budget.
- **When**: Load multiple files under strict budget limit.
- **Args**:
  ```json
  {
    "paths": ["string"], // Required.
    "budget": 2000,      // Required. Max tokens.
    "task": "string"     // Optional. Task details.
  }
  ```

### ctx_intent
- **Desc**: Semantic intent detector. Parses query, splits sub-intents, rates complexity, auto-loads heat-ranked files.
- **When**: Session start / parsing complex user goals.
- **Args**:
  ```json
  {
    "query": "string",       // Required. Task description.
    "project_root": "string" // Optional. Defaults to "."
  }
  ```

### ctx_context
- **Desc**: Turn-by-turn context/cache overview. Avoids duplicate reads.
- **When**: Checking what files are currently in cache.
- **Args**: `{}`

### ctx_graph
- **Desc**: Query or build project intelligence graph (symbols + deps).
- **When**: Map relationships, extract symbol source, build dep index.
- **Args**:
  ```json
  {
    "action": "build" | "related" | "symbol" | "impact" | "status", // Required.
    "path": "string",        // Required for related/symbol/impact. File/symbol name.
    "project_root": "string" // Optional.
  }
  ```

### ctx_dedup
- **Desc**: Analyzes cross-file redundancy. Reports or applies optimizations to cached files.
- **When**: Lowering token footprint of currently loaded files.
- **Args**:
  ```json
  {
    "action": "analyze" | "apply" // Optional. Default "analyze".
  }
  ```

### ctx_response
- **Desc**: Compresses response text by stripping fluff/filler.
- **When**: Verifying output compression ratios.
- **Args**:
  ```json
  {
    "text": "string" // Required.
  }
  ```

### ctx_discover
- **Desc**: Analyzes shell history for optimization/savings opportunities.
- **When**: Auditing command-line token waste.
- **Args**:
  ```json
  {
    "limit": 15 // Optional. Default 15.
  }
  ```

### ctx_edit
- **Desc**: Atomic search-and-replace edit (combines read/replace/write).
- **When**: Direct edit via single tool call without native edit.
- **Args**:
  ```json
  {
    "path": "string",           // Required.
    "new_string": "string",      // Required.
    "old_string": "string",      // Optional (omit to create new file).
    "create": false,            // Optional. Default false.
    "replace_all": false        // Optional. Default false.
  }
  ```

### ctx_preload
- **Desc**: Proactive context loader. Finds and caches relevant files for a task.
- **When**: Warm up session cache at start.
- **Args**:
  ```json
  {
    "task": "string",       // Required. Task description.
    "path": "string"        // Optional. Project root.
  }
  ```

### ctx_semantic_search
- **Desc**: Hybrid BM25 + dense HNSW semantic search.
- **When**: Query codebase by meaning/intent instead of literal string.
- **Args**:
  ```json
  {
    "query": "string",                      // Required. Search query.
    "path": "string",                       // Optional. Scope dir.
    "top_k": 10,                            // Optional. Default 10.
    "action": "reindex",                    // Optional. Rebuild index.
    "mode": "hybrid" | "dense" | "bm25",    // Optional. Default hybrid.
    "languages": ["string"],                // Optional. Filter extension (e.g. ["ts"]).
    "path_glob": "string"                   // Optional. Glob filter.
  }
  ```

### ctx_symbol
- **Desc**: Retreive specific code span of a named symbol.
- **When**: Pull only a function/class body, skipping rest of file.
- **Args**:
  ```json
  {
    "name": "string", // Required. Symbol name.
    "file": "string", // Optional. Narrow path.
    "kind": "fn" | "struct" | "class" | "method" | "trait" | "enum" // Optional.
  }
  ```

### ctx_outline
- **Desc**: Generates compact file outline (signatures only).
- **When**: High-level structural view of large code file.
- **Args**:
  ```json
  {
    "path": "string", // Required.
    "kind": "string"  // Optional. Filter kind.
  }
  ```

### ctx_callgraph
- **Desc**: BFS call graph analysis.
- **When**: Trace callers/callees, shortest paths, or assess refactor risk.
- **Args**:
  ```json
  {
    "symbol": "string", // Required. Symbol name.
    "action": "callers" | "callees" | "trace" | "risk", // Optional. Default "callers".
    "depth": 1          // Optional. Depth 1-5. Default 1.
  }
  ```

### ctx_routes
- **Desc**: Extracts HTTP routes and handler locations.
- **When**: Map backend endpoints to their handlers.
- **Args**:
  ```json
  {
    "method": "string", // Optional. GET/POST/etc.
    "path": "string"    // Optional. Path prefix.
  }
  ```

### ctx_compress_memory
- **Desc**: Compress markdown config/memory files with .original.md backup.
- **When**: Human-to-caveman memory reduction.
- **Args**:
  ```json
  {
    "path": "string" // Required.
  }
  ```

### ctx_impact
- **Desc**: Traces reverse dependencies through project graph. Assesses blast radius.
- **When**: Pre-edit risk check to find who imports/depends on target.
- **Args**:
  ```json
  {
    "action": "analyze" | "chain" | "build" | "status", // Required. Default "analyze".
    "root": "string" // Required for analyze/chain. Target file path.
  }
  ```

### ctx_architecture
- **Desc**: Maps project high-level architecture layers.
- **When**: Big-picture project layout, cyclic deps, layers.
- **Args**:
  ```json
  {
    "action": "overview" | "clusters" | "layers" | "cycles" | "entrypoints" | "module", // Required.
    "root": "string" // Optional. Project root.
  }
  ```

### ctx_compose
- **Desc**: Combines lexical/semantic/co-access graph into a budget-optimized context block.
- **When**: Building comprehensive context window for tricky edits.
- **Args**:
  ```json
  {
    "task": "string", // Required.
    "path": "string"  // Optional.
  }
  ```

### ctx_index
- **Desc**: Orchestrates project indexing. Built-in format extractors for PDF, HTML, CSV, Email, JSON.
- **When**: Setup initial indexing/Universal Intake.
- **Args**:
  ```json
  {
    "action": "status" | "build" | "build-full" // Optional. Default "status".
  }
  ```

### ctx_tools
- **Desc**: MCP tool catalog proxy gateway.
- **When**: Call external server tools with minimal overhead.
- **Args**:
  ```json
  {
    "action": "find" | "call" | "list" | "refresh", // Required.
    "query": "string", // Required for find. NL tool search.
    "tool": "string",  // Required for call. Formatted as "server::tool".
    "arguments": {}    // Required for call. Forwarded arguments object.
  }
  ```

## Session & Monitoring

### ctx_session
- **Desc**: Cross-chat session persistence. Saves/restores task, findings, decisions, file state. P1 positioning (primacy attention). Snapshot recovery on compaction.
- **When**: Long coding sessions, context compaction, handoffs between chats, resuming after break.
- **Args**:
  ```json
  {
    "action": "status" | "load" | "save" | "task" | "finding" | "decision" | "list" | "cleanup" | "snapshot" | "restore" | "resume" | "profile", // Required.
    "session_id": "string",    // opt. Specific session to load.
    "value": "string"           // opt. Value for task/finding/decision/profile.
  }
  ```

### ctx_checkpoint
- **Desc**: Shadow git history of agent changes (separate from repo .git). Snapshot/log/diff/restore working tree.
- **When**: Before major refactors, rollback agent edits, capture exact LLM modifications.
- **Args**:
  ```json
  {
    "action": "log" | "snapshot" | "diff" | "restore", // Required. Default "log".
    "message": "string",  // opt. Label for snapshot.
    "from": "string",      // opt. Base checkpoint sha (for diff).
    "to": "string",        // opt. Target checkpoint sha (for diff). Defaults to working tree.
    "ref": "string",       // opt. Checkpoint sha (for restore).
    "path": "string",      // opt. Limit restore to single file/dir.
    "limit": 20            // opt. Max checkpoints in log.
  }
  ```

### ctx_ledger
- **Desc**: Monitor context window occupancy & pressure. Evict stale entries to free space.
- **When**: Long sessions, context pressure warnings, reclaim space before compaction.
- **Args**:
  ```json
  {
    "action": "status" | "reset" | "evict", // Required. Default "status".
    "targets": ["string"]                      // opt. Entries to evict (e.g. ["F3"]).
  }
  ```

### ctx_compress
- **Desc**: Compact snapshot of all cached files. Includes top-5 function signatures per file. ~90-99% compression vs raw.
- **When**: Session checkpoint, paste into new chat, measure compression savings.
- **Args**:
  ```json
  {
    "include_signatures": true // opt. Include signatures. Default true.
  }
  ```

### ctx_analyze
- **Desc**: Information-theoretic analysis (Shannon entropy, Jaccard similarity). Recommends best compression strategy.
- **When**: Determine compression strategy, measure real information density, audit entropy distribution.
- **Args**:
  ```json
  {
    "path": "string" // Required. File to analyze.
  }
  ```

### ctx_benchmark
- **Desc**: Real token counts via tiktoken (o200k_base). Single-file or project-wide (50 representative files). All compression modes.
- **When**: Measure compression effectiveness, audit project tokens, compare strategies, generate shareable reports.
- **Args**:
  ```json
  {
    "path": "string",                                   // Required. File or directory.
    "action": "file" | "project",                      // opt. Default "file".
    "format": "terminal" | "markdown" | "json"        // opt. Default "terminal". JSON only for project mode.
  }
  ```

### ctx_metrics
- **Desc**: Session statistics snapshot. Token savings, cost estimates, per-tool and per-mode breakdowns, file ref map.
- **When**: Check current session savings, verify compression, cost audit.
- **Args**: `{}` // No parameters.

### ctx_gain
- **Desc**: Token savings report card. Period totals, top commands, cache hit rate, cost avoided. Also CEP score.
- **When**: Weekly/monthly savings review, assess optimization, wrapped summary.
- **Args**:
  ```json
  {
    "action": "report" | "score" | "live" | "json" | "reset" | "wrapped", // opt. Default "report".
    "period": "session" | "day" | "week" | "month" | "all",                // opt. Default "session".
    "model": "string"                                                       // opt. Pricing model. Default "claude-sonnet".
  }
  ```

### ctx_cache
- **Desc**: Explicit session cache control. List contents, clear all, or invalidate single file.
- **When**: Cache mismatch after compaction, clear stale entries, verify what's cached.
- **Args**:
  ```json
  {
    "action": "status" | "clear" | "invalidate", // Required.
    "path": "string"                               // opt. File path (for invalidate).
  }
  ```

### ctx_heatmap
- **Desc**: File access patterns across sessions. Shows hot/cold files, compression ratios, access frequency over time.
- **When**: Identify frequently accessed files, optimize preloading strategy, find cold files.
- **Args**:
  ```json
  {
    "action": "status" | "directory" | "dirs" | "cold" | "json", // opt. Default "status".
    "path": "string"                                                  // opt. Filter to specific directory.
  }
  ```

## Memory & Multi-Agent

### ctx_knowledge
- **Desc**: Persistent project knowledge store. Temporal fact tracking, contradiction detection, cross-session search. Automatic AAAK compact format injection (~60% token savings vs prose).
- **When**: Build cumulative project understanding, record architectural decisions, detect conflicting facts, cross-session knowledge search.
- **Args**:
  ```json
  {
    "action": "remember" | "recall" | "pattern" | "consolidate" | "timeline" | "rooms" | "search" | "wakeup" | "status" | "remove" | "export" | "gotcha" | "judge" | "embeddings_status" | "embeddings_reset" | "embeddings_reindex", // Required.
    "category": "string",      // opt. For remember/pattern/timeline/remove.
    "key": "string",           // opt. Fact key (for remember/remove/judge).
    "value": "string",         // opt. Fact value (for remember/pattern).
    "confidence": 0.9,          // opt. Confidence 0-1 (for remember).
    "pattern_type": "string",   // opt. Convention type (for pattern).
    "examples": ["string"],     // opt. Examples (for pattern).
    "query": "string",          // opt. Search query (for recall/search).
    "trigger": "string",        // opt. Gotcha trigger condition.
    "resolution": "string",     // opt. Gotcha resolution.
    "severity": "string",       // opt. Gotcha severity (low/medium/high).
    "key_a": "string",          // opt. First key (for judge).
    "key_b": "string",          // opt. Second key (for judge).
    "verdict": "string"         // opt. Verdict (supersedes/compatible/unrelated).
  }
  ```

### ctx_agent
- **Desc**: Multi-agent coordination & persistent diaries. Register agents, share findings, track status, maintain structured diary (discovery/decision/blocker/progress/insight). Survives across sessions.
- **When**: Multi-agent workflows, handoffs, record agent discoveries/decisions, recall past agent work.
- **Args**:
  ```json
  {
    "action": "register" | "list" | "post" | "read" | "status" | "info" | "handoff" | "sync" | "diary" | "recall_diary" | "diaries", // Required.
    "agent_type": "string",    // opt. Agent type (for register).
    "role": "string",          // opt. Agent role description (for register).
    "message": "string",       // opt. Status/handoff/diary message.
    "category": "string",      // opt. Diary category (discovery/decision/blocker/progress/insight).
    "to_agent": "string",      // opt. Target agent (for post/handoff).
    "status": "string"         // opt. Status (active/idle/finished).
  }
  ```

### ctx_share
- **Desc**: Multi-agent context sharing. Push cached file contents to other agents, pull received contexts, list shared contexts.
- **When**: Avoid redundant reads in multi-agent workflows, efficient task handoffs, share prepared context with teammates.
- **Args**:
  ```json
  {
    "action": "push" | "pull" | "list" | "clear", // Required.
    "paths": ["string"],       // opt. File paths (for push).
    "to_agent": "string",      // opt. Target agent (for push).
    "message": "string"        // opt. Share message (for push).
  }
  ```

### ctx_overview
- **Desc**: Task-aware project map with auto wake-up briefing. Multi-resolution grouping (critical/important/reference/skip). Recommends optimal read mode per file. Includes AAAK facts, last task, recent decisions, active agents.
- **When**: Session start, new task, need file relevance ranking, prepare efficient context loading.
- **Args**:
  ```json
  {
    "task": "string",          // opt. Task description (improves relevance).
    "path": "string"           // opt. Project root (default: cwd).
  }
  ```

### ctx_task
- **Desc**: Agent-to-Agent (A2A) task delegation (Google A2A protocol). Create/update/cancel tasks, track state (Created/Working/InputRequired/Completed/Failed/Canceled), add threaded messages.
- **When**: Multi-agent workflows, task assignment, track progress, request input from other agents.
- **Args**:
  ```json
  {
    "action": "create" | "update" | "list" | "get" | "cancel" | "message" | "info", // Required.
    "title": "string",         // opt. Task title (for create).
    "description": "string",   // opt. Task description (for create).
    "to_agent": "string",      // opt. Target agent (for create).
    "task_id": "string",       // opt. Task ID (for update/get/cancel/message).
    "state": "string",         // opt. New state (for update).
    "message": "string"        // opt. Message content (for message action).
  }
  ```

### ctx_cost
- **Desc**: Token cost attribution per agent and per tool. Track which agents/tools consume most tokens, enable optimization & accountability.
- **When**: Multi-agent cost audits, identify token waste, optimize per-agent budgets.
- **Args**:
  ```json
  {
    "action": "report" | "agent" | "tool" | "session" | "json" | "reset", // opt. Default "report".
    "limit": 10,               // opt. Top N entries (for report/tool).
    "agent_id": "string"       // opt. Specific agent (for agent action).
  }
  ```

### ctx_artifacts
- **Desc**: Context artifact registry with BM25 indexing. Manage proofs, packs, and bundles generated during sessions.
- **When**: List/search/manage generated context artifacts.
- **Args**:
  ```json
  {
    "action": "list" | "status" | "index" | "reindex" | "search" | "remove", // Required.
    "query": "string"          // opt. Search query (for search action).
  }
  ```

### ctx_verify
- **Desc**: Verification observability snapshot. Returns versioned JSON or compact summary of verifier stats, warnings, SLO compliance.
- **When**: Check verification status, SLO compliance, audit verifier output quality.
- **Args**:
  ```json
  {
    "action": "stats"          // opt. Default "stats" - returns versioned verification snapshot.
  }
  ```

## Workflow & Orchestration

### ctx_workflow
- **Desc**: State machine-driven workflows. Define named workflows with ordered steps, transition states, enforce evidence collection at each stage.
- **When**: Complex multi-step tasks, enforce workflow discipline, evidence-based progress tracking.
- **Args**:
  ```json
  {
    "action": "start" | "status" | "transition" | "complete" | "evidence_add" | "evidence_list" | "stop", // opt.
    "name": "string",          // opt. Workflow name (for start).
    "key": "string",           // opt. Workflow key/identifier.
    "spec": "string",          // opt. Workflow spec JSON (for start).
    "to": "string",            // opt. Target state (for transition).
    "value": "string"          // opt. Evidence value.
  }
  ```

### ctx_handoff
- **Desc**: Context transfer between sessions/agents. Save current context (files, decisions, progress, knowledge, workflow) and restore in new session without re-reading.
- **When**: End-of-session handoff, task delegation between agents, context continuity across sessions.
- **Args**:
  ```json
  {
    "action": "create" | "show" | "list" | "pull" | "clear" | "export" | "import" | "save" | "load", // Required.
    "path": "string",                  // opt. File path (for save/load).
    "paths": ["string"],               // opt. Multiple paths to include.
    "apply_knowledge": true,            // opt. Include knowledge base.
    "apply_session": true,              // opt. Include session state.
    "apply_workflow": true              // opt. Include workflow state.
  }
  ```

### ctx_execute
- **Desc**: Run code in sandboxed subprocesses. 11 languages: javascript, typescript, python, shell, ruby, go, rust, php, perl, r, elixir. Only stdout enters context.
- **When**: Execute code safely, test snippets, validate logic, avoid raw data leakage.
- **Args**: Language-specific (see ctx_execute documentation).

### ctx_feedback
- **Desc**: Record quality signals about tool usage. Latency, token counts, model info, free-form notes. Feeds adaptive optimization.
- **When**: Audit tool performance, record quality observations, improve future LLM decisions.
- **Args**:
  ```json
  {
    "action": "record" | "report" | "json" | "reset" | "status", // opt.
    "intent": "string",                // opt. What agent was trying to do.
    "model": "string",                 // opt. LLM model name.
    "latency_ms": 0,                   // opt. Time taken (ms).
    "llm_input_tokens": 0,             // opt. Input token count.
    "llm_output_tokens": 0,            // opt. Output token count.
    "note": "string"                   // opt. Free-form quality note.
  }
  ```

### ctx_pack
- **Desc**: Generate PR Context Pack. Changed files, related tests, impact summary, relevant artifacts. .ctxpkg format ideal for code reviews & handoffs.
- **When**: Prepare context for pull requests, handoff to reviewers, code review context.
- **Args**:
  ```json
  {
    "action": "pr",                    // opt. Default "pr" - generate PR pack.
    "output": "string"                 // opt. Output directory (default: stdout).
  }
  ```

### ctx_proof
- **Desc**: Export machine-readable ContextProofV1 artifact. Verifier results, SLO evaluations, pipeline metrics, provenance. Written to .lean-ctx/proofs/.
- **When**: Audit trail, proof of context correctness, compliance reporting, verifier integration.
- **Args**:
  ```json
  {
    "format": "json" | "html"          // opt. Default "json".
  }
  ```

### ctx_compile
- **Desc**: Context compilation (CFT). Builds minimal context package via greedy knapsack + Boltzmann view selection. Handles/compressed/full modes.
- **When**: Optimize context window, strict token budget, multi-view compilation.
- **Args**:
  ```json
  {
    "mode": "handles" | "compressed" | "full" // opt. Compilation mode.
  }
  ```

### ctx_plan
- **Desc**: Context planning (CFT). Computes optimal context plan with Phi scoring, budget allocation, policy-driven view selection.
- **When**: Plan optimal context layout, budget-aware compilation, policy-driven context.
- **Args**: (See full ctx_plan documentation).

### ctx_call
- **Desc**: Invoke any of 50+ lean-ctx tools by name. Gateway to arch/debug/memory/batch/agent/util tool categories.
- **When**: Use tools not in core set, invoke by category (arch, debug, memory, batch, agent, util).
- **Args**:
  ```json
  {
    "name": "string",          // Required. Tool name (e.g. "ctx_architecture").
    "arguments": {}            // Required. Tool arguments object.
  }
  ```

### ctx_rules
- **Desc**: Cross-agent rules governance (ContextOps). Sync rules to agents, diff for drift, lint consistency, show sync state, init central config.
- **When**: Multi-agent rule governance, consistency checks, distributed rule enforcement.
- **Args**:
  ```json
  {
    "action": "sync" | "diff" | "lint" | "status" | "init" // Required.
  }
  ```

## Analysis & Navigation

### ctx_symbol
- **Desc**: Retrieve specific code span of named symbol via tree-sitter AST. Returns file path, line number, and signature. 90-97% fewer tokens vs full file.
- **When**: Extract only fn/class body, skip rest of file, quick symbol lookup.
- **Args**:
  ```json
  {
    "name": "string",          // Required. Symbol name.
    "file": "string",          // opt. Narrow to specific file.
    "kind": "function" | "class" | "type" | "const" | "struct" | "enum" | "trait" | "method" // opt. Filter by kind.
  }
  ```

### ctx_callgraph
- **Desc**: Multi-hop BFS call graph analysis. Callers/callees (depth 1-5), trace shortest path between symbols, risk classification by caller count.
- **When**: Trace callers/callees, find shortest paths, assess refactor risk, understand impact.
- **Args**:
  ```json
  {
    "symbol": "string",        // Required. Symbol name.
    "action": "callers" | "callees" | "trace" | "risk", // opt. Default "callers".
    "depth": 1,                // opt. BFS depth 1-5. Default 1.
    "file": "string"           // opt. Scope to specific file.
  }
  ```

### ctx_refactor
- **Desc**: LSP-powered refactoring (rename, references, definition, implementations). Requires running language server (rust-analyzer, typescript-language-server, pylsp, gopls).
- **When**: Rename symbols safely, find all references, navigate definitions, list implementations.
- **Args**:
  ```json
  {
    "action": "rename" | "references" | "definition" | "implementations", // Required.
    "path": "string",          // Required. File path.
    "line": 0,                 // Required. 1-indexed line number.
    "column": 0,               // opt. 0-indexed character offset.
    "new_name": "string"       // opt. New name (only for rename).
  }
  ```

### ctx_outline
- **Desc**: Compact file outline (functions, structs, classes, interfaces, types, constants) with line numbers and signatures. Lighter than full read.
- **When**: High-level structural view of large code file, quick navigation.
- **Args**:
  ```json
  {
    "path": "string",          // Required. File path.
    "kind": "string"           // opt. Filter by kind (function, class, etc.).
  }
  ```

### ctx_routes
- **Desc**: Extract HTTP routes/endpoints from web frameworks (Express, Fastify, Actix, Axum, Gin, Django, Flask, FastAPI, Spring, Rails, Next.js). Returns method, path, handler file, line number.
- **When**: Map backend endpoints to handlers, list all routes, filter by method.
- **Args**:
  ```json
  {
    "path": "string",          // opt. Project path (default: root).
    "method": "string"         // opt. Filter by HTTP method (GET, POST, etc.).
  }
  ```

### ctx_review
- **Desc**: Automated code review combining impact analysis, caller tracking, test discovery. Actions: review (single file), diff-review (git diff), checklist (structured review questions).
- **When**: Code review, pre-commit impact check, generate review checklist.
- **Args**:
  ```json
  {
    "action": "review" | "diff-review" | "checklist", // Required.
    "path": "string",          // opt. File path (for review/checklist) or git diff text (for diff-review).
    "depth": 3                 // opt. Analysis depth. Default 3.
  }
  ```

### ctx_smells
- **Desc**: Code smell detection. Scan files, summarize smells, show rules, analyze specific file.
- **When**: Code quality audit, identify anti-patterns, detect maintainability issues.
- **Args**:
  ```json
  {
    "action": "scan" | "summary" | "rules" | "file", // opt.
    "path": "string"           // opt. File path (for file action).
  }
  ```
