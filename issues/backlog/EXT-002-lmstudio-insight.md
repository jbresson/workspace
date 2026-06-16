# EXT-002: LMStudio Insight Extension — Full Spec (REST-first, Log-assisted)

## Status
- **Type**: Implementation-ready spec (with explicit unknowns)
- **Owner**: TBD
- **Priority**: High (unblocks adaptive runtime decisions)
- **Scope**: Extension + agent tools + optional TUI pane wiring
- **Non-goals**: Building generic multi-provider observability framework

---

## 1) Problem
Current LMStudio integration in TUI reports only `error`/`terminated` style state. Missing:
- live model/process health
- inference latency/throughput visibility
- memory pressure signals
- API readiness/degraded states

Result: agent blind to model quality drift and can make bad planning/execution choices.

---

## 2) Goal
Deliver `lmstudio-insight` extension that provides **real-time health + performance signals** for local LMStudio runtime, primarily via REST API polling/probing, with optional log tail augmentation.

Primary outcome: agent can query a single health surface and adapt behavior (chunking, retry strategy, model switch guidance, throttling).

---

## 3) Architecture (v1)

## 3.1 Signal Sources (priority order)
1. **REST API (primary, required)**
2. **Request wrapper telemetry (required)**
3. **Process probe (optional v1.1)**
4. **Log tail parsing (optional, best effort)**

Reason: REST + wrapper signals deterministic and portable; raw log formats can drift by LMStudio version.

## 3.2 Data Flow
1. `Poller` hits configured LMStudio base URL(s).
2. `ProbeRunner` performs low-cost capability checks.
3. `RequestTelemetry` captures TTFT, total latency, tok/s from actual inference calls (where available).
4. `EventEngine` classifies events + severity.
5. `HealthEngine` computes current health state.
6. `RingBuffer` stores recent events + snapshots.
7. Expose via:
   - agent tools (`get_model_health`, etc.)
   - TUI status/pane feed.

---

## 4) Explicit Unknowns + Handling

Because LMStudio API shape varies by release/config, spec uses **capability negotiation**.

Unknowns:
1. Exact endpoint availability beyond OpenAI-compat routes.
2. Presence/format of model runtime metrics (VRAM, queue depth, tokens/sec) from REST.
3. Whether per-request usage fields are consistently returned.
4. Log file locations and schema across OS/version.

Mitigation:
- startup capability probe
- endpoint fallback chain
- strict parser guards + version tagging
- confidence scores on derived metrics

---

## 5) API Capability Profile (REST)

## 5.1 Config
```yaml
lmstudioInsight:
  baseUrls:
    - http://127.0.0.1:1234
  pollIntervalMs: 1500
  timeoutMs: 1200
  maxBufferEvents: 2000
  slowInferenceMs: 8000
  errorRateWindowSec: 120
  healthWindowSec: 60
  enableLogTail: false
```

## 5.2 Endpoint Probe Matrix
At startup and every 60s, probe in order:

1. `GET /v1/models` (OpenAI-compatible; expected widely available)
2. `GET /health` (if exists)
3. `GET /api/v0/models` (tentative/custom)
4. `GET /api/v1/models` (tentative/custom)

Store per endpoint:
- `supported: boolean`
- `lastStatus`
- `latencyMs`
- `schemaFingerprint` (keys hash)
- `lastSeenAt`

## 5.3 Inference Telemetry Source
Required: instrument LMStudio-bound request path used by agent/provider wrapper.
Capture:
- start timestamp
- first token timestamp (if streaming)
- end timestamp
- prompt/output token counts (if returned)
- transport/code errors

This guarantees latency metrics even when REST metrics endpoints absent.

---

## 6) Event Model

## 6.1 Event Types (minimum)
- `LMSTUDIO_UP`
- `LMSTUDIO_DOWN`
- `MODEL_LIST_CHANGED`
- `MODEL_ACTIVE_CHANGED` (if derivable)
- `INFERENCE_STARTED`
- `INFERENCE_COMPLETED`
- `INFERENCE_SLOW`
- `INFERENCE_ERROR`
- `ERROR_RATE_SPIKE`
- `MEMORY_PRESSURE` (confidence-tagged; often inferred)
- `API_DEGRADED` (timeouts/high latency)

## 6.2 Event Schema
```ts
type InsightEvent = {
  id: string;
  ts: string; // ISO
  type: string;
  severity: 'info' | 'warn' | 'error';
  source: 'rest' | 'request-telemetry' | 'log' | 'process';
  confidence: 'high' | 'medium' | 'low';
  model?: string;
  metrics?: {
    latencyMs?: number;
    ttftMs?: number;
    tokensPerSec?: number;
    inputTokens?: number;
    outputTokens?: number;
    errorRate?: number;
    queueDepth?: number;
    memoryUsedMb?: number;
    memoryPct?: number;
  };
  payload?: Record<string, unknown>;
};
```

---

## 7) Health Model

## 7.1 Health States
- `HEALTHY`
- `DEGRADED`
- `UNHEALTHY`
- `UNKNOWN`

## 7.2 Rules (initial)
- `UNHEALTHY` if LMStudio unreachable for `>=3` consecutive polls OR error rate > 25% in 2m window.
- `DEGRADED` if p95 latency > threshold or slow inferences >= 3 within 5m.
- `HEALTHY` if reachable + error rate low + latency under threshold.
- `UNKNOWN` on startup before enough samples.

## 7.3 Health Payload
```json
{
  "state": "DEGRADED",
  "reasonCodes": ["HIGH_P95_LATENCY", "SLOW_INFERENCE_BURST"],
  "windowSec": 60,
  "samples": 34,
  "lastUpdated": "2026-06-15T18:31:22.000Z"
}
```

---

## 8) Buffer + Retention
- Ring buffer default: 2000 events (configurable)
- Snapshot cache: last 120 health snapshots (1 per poll cycle)
- Aggregates: 1m, 5m rolling windows
- Drop policy: oldest-first, count `droppedEvents`

Performance guardrails:
- Poll work budget < 20ms average CPU per cycle
- Event parsing batch cap when log tail active

---

## 9) Agent Tool Contract

Register tools (read-only):

1. `lmstudio_get_model_health`
   - Returns current state + reasons + headline metrics.

2. `lmstudio_get_inference_metrics`
   - Args: `{ windowSec?: number, model?: string }`
   - Returns p50/p95 latency, error rate, throughput.

3. `lmstudio_get_events`
   - Args: `{ types?: string[], sinceTs?: string, severity?: string, limit?: number }`
   - Returns filtered event list.

4. `lmstudio_get_capabilities`
   - Returns probe results, supported endpoints, schema fingerprints.

All tool responses include:
- `asOf`
- `dataLatencyMs`
- `confidenceSummary`

---

## 10) TUI Integration Contract

Minimal v1:
- status indicator in existing footer/header:
  - green `HEALTHY`
  - yellow `DEGRADED`
  - red `UNHEALTHY`
  - gray `UNKNOWN`
- tooltip/compact line: model, p95 latency, err%, last event

v1.1 optional pane (`Alt+L`):
- live event stream (scrollable)
- rolling charts (latency/error)
- endpoint capability table

---

## 11) Implementation Plan

### Phase A — Capability Discovery + Skeleton
- [ ] Add extension scaffold `helpers/extensions/lmstudio-insight/`
- [ ] Add config loader + sane defaults
- [ ] Implement HTTP client with timeout/retry budget
- [ ] Implement endpoint probe engine + capability cache

### Phase B — Telemetry + Events
- [ ] Hook provider request path for timing + token usage capture
- [ ] Build event classifier + dedupe (burst suppression)
- [ ] Build ring buffer + rolling metric aggregator

### Phase C — Health Engine + Tools
- [ ] Implement health state machine/rules
- [ ] Register four read-only tools
- [ ] Add JSON schema for tool outputs

### Phase D — TUI + Logging
- [ ] Add status indicator binding
- [ ] Optional pane toggle wiring (`Alt+L`) if accepted
- [ ] Add extension debug logs with rate limiting

### Phase E — Hardening
- [ ] Fallback behavior validation (partial capability, API down)
- [ ] Perf profile (CPU/memory overhead)
- [ ] Failure-mode test matrix

---

## 12) Failure Modes + Required Behavior
1. **API unreachable** -> emit `LMSTUDIO_DOWN`; health `UNHEALTHY` after threshold.
2. **Partial endpoint support** -> continue with supported subset; mark confidence lower.
3. **No token usage data** -> latency-only metrics, set throughput unknown.
4. **Log tail parse failure** -> auto-disable parser, keep REST mode.
5. **Burst errors** -> aggregate to avoid event spam.

---

## 13) Testing Matrix

## 13.1 Unit
- health state transitions
- event classification rules
- rolling aggregation math
- endpoint probe fallback ordering

## 13.2 Integration
- mock LMStudio API with variable endpoint sets
- simulate slow/failed requests
- verify tool outputs stable + schema-valid

## 13.3 Performance
- target: <1% added inference overhead from instrumentation path
- poller CPU stable under long-run load

## 13.4 Resilience
- process restart mid-session
- timeout storms
- malformed payloads

---

## 14) Acceptance Criteria
- [ ] Detect/emit >= 8 event types (list in §6.1).
- [ ] Health state available continuously via tool call.
- [ ] Inference metrics available for 1m/5m windows.
- [ ] TUI shows health state beyond error/terminated.
- [ ] Graceful degraded mode when endpoints missing.
- [ ] Measured overhead <= 1% on representative local workload.
- [ ] Documentation includes capability probe behavior + confidence semantics.

---

## 15) Deliverables
1. Extension code + tests
2. `docs/extensions/lmstudio-insight.md`
3. Example tool call transcripts
4. Perf baseline note (before/after)
5. Endpoint capability report sample

---

## 16) Open Decisions (need human confirmation)
1. Should pane keybind be `Alt+L` (conflict check with existing map)?
2. Keep log tail disabled by default? (recommended yes)
3. Preferred source of memory pressure signal when API lacks VRAM metrics:
   - pure inference-time heuristic (safe)
   - platform process inspection (more accuracy, more complexity)
4. Should health thresholds be global config or per-model config in v1?

---

## 17) Related
- EXT-001-turn-completion-validator
- ENG-001-task-phase-expectations-engine

Notes:
- This spec intentionally assumes **REST shape variability**. Do not hardcode one undocumented endpoint family without capability probe.
- MVP can ship with REST + request telemetry only; log/process sources remain additive.