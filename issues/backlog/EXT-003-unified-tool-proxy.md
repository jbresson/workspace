# Issue EXT-003: Unified Tool Proxy Refactor (Single Tool Gateway)

## Context
Current extension_loader.ts registers multiple individual tools directly to the model, consuming significant context window tokens. This issue proposes consolidating all available tools behind a single "tool" proxy that acts as a gateway, with internal routing logic to dispatch to actual tool implementations. Only one tool signature is exposed to the model; discovery and selection logic happens via structured instructions.

## Goal
Refactor `.pi/extensions/extension_loader.ts` to expose a single "tool" tool proxy that dispatches to all available actual tools, reducing context window footprint and simplifying tool discovery.

## Requirements
- [ ] Single "tool" tool is the only function exposed to the model.
- [ ] Tool supports discovery: "list tools", "search tools", "get tool details".
- [ ] Tool supports invocation: "call tool X with args Y".
- [ ] Instruction/direction mechanism guides model on which tools to use (no discovery needed in steady state).
- [ ] Tool proxy handles routing, argument validation, and error handling.
- [ ] Token efficiency: <10% overhead compared to direct tool invocations (proxy + routing).
- [ ] Stretch goal: UI selector experience for tool selection in TUI.

## Success Criteria
- [ ] Single "tool" tool replaces all individual tool signatures.
- [ ] Model context window freed of individual tool definitions (savings ≥20% for tool metadata).
- [ ] Tool discovery works: list/search/details operations are fast (<100ms).
- [ ] Tool invocation works: actual tools execute correctly via proxy.
- [ ] Agent success rate unchanged (tool routing is transparent).
- [ ] Documentation demonstrates how instruction/direction guides tool selection.
- [ ] (Stretch) TUI includes interactive tool selector with UI feedback.

## Implementation Plan

### Phase 1: Requirements & Specification
- [ ] **1.1** Audit current extension_loader.ts: count registered tools, measure context footprint.
- [ ] **1.2** Catalog all available tools: name, description, required args, return type.
- [ ] **1.3** Classify tools by category (file I/O, shell, git, npm, analysis, memory, etc.).
- [ ] **1.4** Define tool proxy interface: method signatures for list/search/call.
- [ ] **1.5** Document instruction/direction design: how does model know which tools to use?

### Phase 2: Tool Registry & Discovery Design
- [ ] **2.1** Design tool registry data structure (metadata, category, priority, tags).
- [ ] **2.2** Implement "list tools" operation: return all tools or filtered by category.
- [ ] **2.3** Implement "search tools" operation: full-text search by name, description, tags.
- [ ] **2.4** Implement "get tool details" operation: return full schema for specific tool.
- [ ] **2.5** Design caching: registry should be precomputed (not built on every discovery query).
- [ ] **2.6** Implement registry persistence: serialize/deserialize tool metadata.

### Phase 3: Tool Proxy Architecture
- [ ] **3.1** Design "tool" function signature: flexible parameter structure (operation, tool_name, args, options).
- [ ] **3.2** Implement operation dispatcher: route "list" / "search" / "call" operations.
- [ ] **3.3** Implement argument validator: check tool arguments against schema.
- [ ] **3.4** Implement error handler: wrap tool failures, return structured error responses.
- [ ] **3.5** Implement call stack tracer: maintain context of tool calls for debugging.
- [ ] **3.6** Design response format: consistent JSON schema for all tool responses.

### Phase 4: Instruction & Direction Mechanism
- [ ] **4.1** Define instruction schema: how does system prompt guide tool selection?
- [ ] **4.2** Design "direction" type: structured hints (e.g., "prefer ctx_read over shell for file I/O").
- [ ] **4.3** Implement direction engine: parse direction from system prompt + session context.
- [ ] **4.4** Create direction examples in system prompt (e.g., "For file I/O, use tool:ctx_read with operation:call").
- [ ] **4.5** Document direction best practices (when tool discovery is needed vs. unnecessary).
- [ ] **4.6** Test: verify agent can execute complex tasks using directions without discovery.

### Phase 5: Migration from Individual Tools
- [ ] **5.1** Create compatibility layer: map old tool names to new "tool" proxy calls.
- [ ] **5.2** Refactor extension_loader.ts: remove individual tool registrations, add "tool" proxy.
- [ ] **5.3** Update system prompt (wip-system.md): document "tool" proxy, deprecate old direct tool references.
- [ ] **5.4** Create migration guide for agent developers: "How to call tools via proxy".
- [ ] **5.5** Test backward compatibility: old-style prompts should still work (may warn).

### Phase 6: Performance & Optimization
- [ ] **6.1** Profile proxy overhead: measure latency for list/search/call operations.
- [ ] **6.2** Benchmark: compare token usage (old direct tools vs. new proxy).
- [ ] **6.3** Optimize registry lookup: index by category, tags for fast search.
- [ ] **6.4** Implement caching for frequent queries (tool details, category list).
- [ ] **6.5** Measure context window savings: quantify reduction in tool metadata.

### Phase 7: TUI Integration (Stretch Goal)
- [ ] **7.1** Design tool selector UI: list/search/detail panes, keyboard navigation.
- [ ] **7.2** Implement tool selector modal: `Ctrl+T` to open, fuzzy search by name/category.
- [ ] **7.3** Implement preview pane: show selected tool details, examples, required args.
- [ ] **7.4** Implement execution pane: agent can "preview" tool call before submitting.
- [ ] **7.5** Add keybind documentation to docs/keybindings.md.
- [ ] **7.6** Design UX for tool output preview: syntax highlighting, pagination for large results.

### Phase 8: Documentation & Examples
- [ ] **8.1** Create `docs/tool-proxy.md` architectural overview.
- [ ] **8.2** Document "tool" proxy function signature with examples.
- [ ] **8.3** Document registry schema and discovery operations.
- [ ] **8.4** Document direction mechanism with examples (file I/O, git, npm, etc.).
- [ ] **8.5** Create agent integration guide: "Using tool proxy in your tasks".
- [ ] **8.6** Create troubleshooting guide: tool not found, invalid args, call failures.

### Phase 9: Testing & Validation
- [ ] **9.1** Unit test: registry construction, search performance, caching.
- [ ] **9.2** Integration test: tool proxy successfully routes to 10+ actual tools.
- [ ] **9.3** Benchmark test: measure token savings + latency overhead.
- [ ] **9.4** Stress test: rapid tool discovery queries (verify no buffer overflow).
- [ ] **9.5** Regression test: run full task suite with proxy (no failures introduced).
- [ ] **9.6** Edge case test: invalid args, missing tools, tool errors → proxy handles gracefully.

### Phase 10: Rollout & Communication
- [ ] **10.1** Update system prompt to reference tool proxy as primary interface.
- [ ] **10.2** Create deprecation warnings for old-style direct tool calls (if applicable).
- [ ] **10.3** Announce change in project README + CHANGELOG.
- [ ] **10.4** Train team on new tool proxy workflow (if applicable).
- [ ] **10.5** Monitor adoption: track tool proxy query volume, success rates.

## Acceptance Criteria
- [ ] Single "tool" tool is the only tool exposed to model (all others hidden behind proxy).
- [ ] Context window tokens saved ≥20% in tool metadata section.
- [ ] Tool discovery (list/search) works in <100ms for all tools.
- [ ] Tool invocation (call) succeeds for all available tools.
- [ ] Agent success rate ≥98% on standard task suite (no regression vs. old direct tools).
- [ ] Documentation complete: proxy design, discovery mechanism, direction examples.
- [ ] (Stretch) TUI tool selector is functional and improves developer experience.

## Related Issues
- EXT-001-turn-completion-validator (may benefit from tool proxy access for validation).
- DEP-001-shell-deprecation (shell wrapper would be registered through tool proxy).

## Notes
- **Scope Creep Risk**: Start with proxy + registry + discovery. Defer TUI selector to Phase 7 (stretch).
- **Instruction Design Critical**: If instructions are unclear, agent reverts to discovery (defeating purpose). Need strong examples.
- **Backward Compatibility**: Consider soft launch (proxy coexists with old direct tools for 1 sprint).
- **Tool Categorization**: Categories should map to agent workflow phases (file I/O, git, npm, analysis, etc.).
- **Priority Order**: 
  1. Proxy + registry (Phase 1-3)
  2. Migration from individual tools (Phase 5)
  3. Performance optimization (Phase 6)
  4. TUI selector (Phase 7, if time permits)

Compressed 1043 → 1043 tokens (0%)
