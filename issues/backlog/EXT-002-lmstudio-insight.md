# Issue EXT-002: lmstudio-insight Extension

## Context
LMStudio integration currently only surfaces error/terminated states in TUI. Extension lacks visibility into model performance, memory events, and response characteristics. Real-time insight into LMStudio events (model loading, token throughput, memory spikes, inference latency) would improve debugging and enable adaptive agent decision-making.

## Goal
Develop lmstudio-insight extension that streams real-time model status, memory events, and performance metrics from LMStudio via event listening, log tailing, and REST API integration.

## Requirements
- [ ] Extension listens to LMStudio process events (load, unload, inference start/end).
- [ ] Extension tails LMStudio logs and parses meaningful events.
- [ ] Extension queries LMStudio REST API for current model state.
- [ ] Extension exposes memory events (allocation, GC, spikes).
- [ ] Extension identifies slow response patterns and surfaces them to agent.
- [ ] TUI displays streaming status beyond error/terminated states.
- [ ] Low overhead: monitoring does not impact model inference performance.

## Success Criteria
- [ ] LMStudio extension discovers ≥5 distinct event types (load, unload, memory spike, slow inference, error).
- [ ] Real-time insight displayed in TUI (status bar or dedicated pane).
- [ ] Agent can query lmstudio-insight for "current model health" and make adaptive decisions.
- [ ] No measurable inference slowdown when insight extension is active.
- [ ] Integration with existing TUI keybinds (e.g., `Alt+L` to show LMStudio pane).

## Implementation Plan

### Phase 1: Requirements & Event Discovery
- [ ] **1.1** Analyze LMStudio architecture: process lifecycle, event emission points, REST endpoints.
- [ ] **1.2** Identify event categories: startup, model load, inference lifecycle, memory mgmt, errors.
- [ ] **1.3** Reverse-engineer LMStudio log format: parse useful metrics (tokens/sec, VRAM usage, latency).
- [ ] **1.4** Document LMStudio REST API endpoints for model status, health, inference queue.
- [ ] **1.5** Define event schema: timestamp, event_type, payload, severity.

### Phase 2: Log Tailing & Event Parsing
- [ ] **2.1** Implement log tail module: consume LMStudio log file in real-time.
- [ ] **2.2** Implement event parser: extract structured data from free-text logs.
- [ ] **2.3** Implement event filter: suppress noise, surface actionable events.
- [ ] **2.4** Test with multiple LMStudio versions (identify version-specific log formats).
- [ ] **2.5** Design fallback: if log tailing fails, degrade gracefully to REST API polling.

### Phase 3: REST API Integration
- [ ] **3.1** Implement REST client for LMStudio API (model endpoints, health endpoints, metrics).
- [ ] **3.2** Implement periodic polling: query model state every N seconds.
- [ ] **3.3** Implement memory metrics extraction: parse VRAM, RAM, allocation events.
- [ ] **3.4** Implement latency tracking: measure time-to-first-token, generation speed.
- [ ] **3.5** Implement circuit breaker: if API unavailable, fallback to log tailing only.

### Phase 4: Event Stream & Buffering
- [ ] **4.1** Design event buffer: store N recent events for query (sliding window).
- [ ] **4.2** Implement event aggregation: combine similar events (e.g., "slow inference" counts).
- [ ] **4.3** Implement memory event detection: flag allocation spikes, GC pauses.
- [ ] **4.4** Implement inference performance tracking: detect inference slowdown trends.
- [ ] **4.5** Design data retention: keep ≥1000 recent events in memory (configurable).

### Phase 5: TUI Integration
- [ ] **5.1** Design TUI pane: real-time status display (model, VRAM, tokens/sec, latency).
- [ ] **5.2** Implement TUI status bar indicator: green (healthy), yellow (slow), red (error).
- [ ] **5.3** Implement TUI pane for detailed event log (scrollable, searchable).
- [ ] **5.4** Implement TUI keybind to toggle LMStudio insight pane (suggest `Alt+L`).
- [ ] **5.5** Design color coding: green (event), yellow (warning), red (error), gray (debug).

### Phase 6: Agent Integration
- [ ] **6.1** Create lmstudio-insight tool: query extension for "model health" status.
- [ ] **6.2** Implement tool: "get_memory_events" (return recent memory-related events).
- [ ] **6.3** Implement tool: "get_inference_metrics" (throughput, latency, token stats).
- [ ] **6.4** Implement tool: "get_event_log" (query events by type, timestamp range, severity).
- [ ] **6.5** Design tool response format: structured JSON, suitable for agent decision-making.

### Phase 7: Performance & Observability
- [ ] **7.1** Profile extension: measure CPU overhead, memory footprint.
- [ ] **7.2** Benchmark: confirm <1% inference slowdown when insight is active.
- [ ] **7.3** Implement extension metrics: event count/sec, query latency, buffer utilization.
- [ ] **7.4** Add debug logging (configurable verbosity).
- [ ] **7.5** Create performance baseline document.

### Phase 8: Documentation & Examples
- [ ] **8.1** Create `docs/extensions/lmstudio-insight.md` architecture overview.
- [ ] **8.2** Document event schema with examples.
- [ ] **8.3** Document REST API endpoints and polling strategy.
- [ ] **8.4** Create agent integration examples: "adapt task execution based on model health".
- [ ] **8.5** Create troubleshooting guide (logs unavailable, API down, buffer overflow).

### Phase 9: Testing & Validation
- [ ] **9.1** Integration test: run inference with insight extension active, verify events captured.
- [ ] **9.2** Stress test: simulate rapid inference (verify buffer not overwhelmed).
- [ ] **9.3** Failure test: kill LMStudio process, verify graceful degradation.
- [ ] **9.4** API test: mock LMStudio API with synthetic responses.
- [ ] **9.5** TUI test: verify all event types display correctly in pane.

## Acceptance Criteria
- [ ] Extension detects and streams ≥5 distinct event types from LMStudio.
- [ ] TUI displays real-time model status beyond error/terminated states.
- [ ] Agent can query lmstudio-insight and make adaptive decisions.
- [ ] No measurable inference performance degradation (<1% slowdown).
- [ ] All events documented with examples in extension README.
- [ ] Switched to streaming response: TUI updates continuously (not just on error).

## Related Issues
- EXT-001-turn-completion-validator (may coordinate on TUI updates).
- ENG-001-task-phase-expectations-engine (expectations can factor in model health signals).

## Notes
- Scope: LMStudio insight only. Do not create general "model monitoring" framework yet.
- MVP: Log tailing + REST API polling. Event stream to agent is stretch goal.
- Start with ≥5 core events; can expand later.
- Consider rate limiting for log tail (1000s of lines/sec → must batch parse).

Compressed 1043 → 1043 tokens (0%)
