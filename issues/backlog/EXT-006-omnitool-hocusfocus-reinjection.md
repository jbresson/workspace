# Issue EXT-006: Omnitool HocusFocus (Rule Dilution Prevention)

## Description
Implement a rule-dilution-prevention feature inside `omnitool` named **HocusFocus** (rule-focus reinjection engine) that performs **regular token-interval reinjection** of core principles for sliding-context models, with adaptive accelerators (blocked policy attempts, occupancy, recent violations) and anti-spam safeguards.

This issue codifies the agreed constraints:
- Keep **regular reinjections based on tokens passed** (primary trigger).
- Extension maintains its **own decay model/state** (do not reuse mutable model policy in `models.json`).
- Read immutable model facts from `models.json` only (e.g. `sliding_window_size`).
- Blocked tool attempts are a **weighted signal**, not sole trigger.
- Prevent spam/loops via methodology (cooldown/hysteresis/novelty/escalation), **not** CPU/time throttling.

## Requirements
1. `omnitool` gains intercept points (pre-dispatch + post-dispatch) for salience risk evaluation and logging.
2. Reinjection system applies only to configured sliding-window models.
3. Primary reinjection cadence driven by `tokens_since_anchor >= token_interval`.
4. Reinjection decision supports weighted trigger events, including blocked tool attempts.
5. Anti-spam behavior enforced by deterministic policy controls (no resource-budget anti-spam).
6. All interventions recorded to audit log with reason codes and capsule metadata.

## Scope
### In Scope
- Reinjection engine in `omnitool` request lifecycle
- Extension-owned state/config for decay and trigger weights
- Capsule catalog (micro/standard/full)
- Observability + evaluation metrics

### Out of Scope
- Modifying `models.json` mutable behavior parameters
- Provider-specific low-level tokenizers beyond current telemetry sources
- Rewriting unrelated guardrail engines

## Architecture Spec

### A. Data Sources
1. **Immutable model facts (read-only):**
   - Source: `models.json`
   - Fields: `model_id`, `provider`, `sliding_window_size`, static caps
2. **Runtime telemetry:**
   - prompt/completion tokens per turn
   - rolling context usage
   - tool policy outcomes (allow/deny + reason)
3. **Extension-owned mutable state:**
   - `last_anchor_token_index`
   - model-specific `token_interval`
   - risk thresholds, cooldown/hysteresis markers
   - recent intervention history + outcomes

### B. Suggested Files
- `.pi/extensions/hocus-focus/index.ts`
- `.pi/extensions/hocus-focus/policy.ts`
- `.pi/extensions/hocus-focus/capsules.ts`
- `.pi/extensions/hocus-focus/state-store.ts`
- `.pi/extensions/hocus-focus/types.ts`
- `.pi/config/hocus-focus.json` (extension config)
- `.pi/logs/hocus-focus.jsonl` (optional dedicated stream; must also map to tool_call audit)

### C. Reinjection Decision Model

#### Primary Trigger (must remain)
- `tokens_since_anchor >= token_interval(model)`

#### Secondary Accelerators (weighted)
- blocked policy attempt severity
- context occupancy ratio
- recent instruction-violation indicators

#### Decision Formula (initial)
`risk = 0.50*distance_norm + 0.20*occupancy_norm + 0.20*violation_norm + 0.10*blocked_signal`

Fire if:
1. primary trigger reached **OR** `risk >= trigger_threshold`
2. cooldown inactive (except critical safety class)
3. novelty gate passes
4. reinjection level progression rule permits selected level (no same-level repetition without new evidence)

### D. Blocked Attempt Taxonomy (for weighted trigger)
- `BLOCK_HARD_POLICY` (forbidden tool class) -> high weight
- `BLOCK_SCOPE_POLICY` (path/workflow violation) -> medium
- `BLOCK_FORMAT` (invalid shape/params) -> low

Blocked event alone should not force reinjection except explicitly configured critical classes.

### E. Anti-Spam / Anti-Loop Methodology (non-resource)
1. **Cooldown/Refractory Window** after reinjection
2. **Hysteresis**: trigger threshold > clear threshold
3. **Novelty Gate**: block identical capsule+reason if no new evidence
4. **Escalation Ladder**:
   - L1 reminder
   - L2 micro-capsule
   - L3 redirect/refusal with allowed alternatives
   - L4 blocker/handoff suggestion
5. **Loop Detector**:
   - if pattern `block -> reinject -> block` repeats N times, stop reinjection, escalate explicit diagnostic

## Finalized Non-Negotiables (Session Freeze)
1. **Primary cadence is token-distance based** and remains enabled (`tokens_since_anchor` trigger is mandatory).
2. **No CPU/time/GPU budgeting as anti-spam mechanism.** Non-spam is enforced through policy methodology only.
3. **Blocked tool attempts are accelerators, not sole decision authority** except explicitly critical safety classes.
4. **`models.json` is immutable input only** (e.g., `sliding_window_size`); all decay behavior lives in extension-owned config/state.
5. **Must be implemented inside `omnitool` intercept path** (pre + post dispatch), not as a disconnected sidecar.

## Deterministic Runtime Algorithm (Reference)
```ts
onPreDispatch(request, context) {
  modelFacts = loadModelFactsReadOnly(modelId) // from models.json
  if (!modelFacts.sliding_window_size) return PASS

  snapshot = buildRiskSnapshot(context, state, modelFacts)
  decision = evaluateReinjection(snapshot, config, state)

  if (decision.inject) {
    capsule = selectCapsule(decision.level, state, snapshot)
    request = composePromptWithCapsule(request, capsule) // deterministic order
    state.last_anchor_token_index = snapshot.current_token_index
    state.last_injection = mkInjectionRecord(decision, capsule, snapshot)
  }

  logPreDecision(snapshot, decision)
  return request
}

onPostDispatch(result, context) {
  event = classifyToolOutcome(result) // allow/deny + reason taxonomy
  state = updateStateFromOutcome(state, event, result.tokens)
  logPostOutcome(event, state)
}
```

## Prompt Composition Order (Must Use)
1. System prompt (canonical)
2. HocusFocus capsule (if injected)
3. Current task/process context
4. User message
5. Tool/schema context

Any change to this order requires explicit issue amendment.

## Config Contract (Initial)
```json
{
  "hocus_focus": {
    "enabled": true,
    "models": {
      "default": {
        "token_interval": 2200,
        "trigger_threshold": 0.72,
        "clear_threshold": 0.45,
        "cooldown_turns": 2,
        "cooldown_tokens": 900,
        "loop_detector_window": 6,
        "loop_detector_trip_count": 3,
        "critical_bypass_classes": ["BLOCK_HARD_POLICY"],
        "weights": {
          "distance_norm": 0.50,
          "occupancy_norm": 0.20,
          "violation_norm": 0.20,
          "blocked_signal": 0.10
        },
        "blocked_weights": {
          "BLOCK_HARD_POLICY": 1.0,
          "BLOCK_SCOPE_POLICY": 0.6,
          "BLOCK_FORMAT": 0.2
        }
      }
    }
  }
}
```

## Type Contracts (Minimum)
```ts
type TriggerEventClass = 'BLOCK_HARD_POLICY' | 'BLOCK_SCOPE_POLICY' | 'BLOCK_FORMAT' | 'NONE'

type RiskSnapshot = {
  modelId: string
  current_token_index: number
  tokens_since_anchor: number
  distance_norm: number
  occupancy_norm: number
  violation_norm: number
  blocked_signal: number
  risk: number
}

type ReinjectionDecision = {
  inject: boolean
  level: 'L1_REMINDER' | 'L2_MICRO' | 'L3_REDIRECT' | 'L4_BLOCKER'
  reason_codes: string[]
}
```

## Capsule Policy (Deterministic)
- **L1_REMINDER**: one-line pointer, no full capsule.
- **L2_MICRO**: compact core-rules capsule (default reinjection payload).
- **L3_REDIRECT**: refusal/redirect with allowed alternatives; no repeated L2 spam.
- **L4_BLOCKER**: explicit handoff/blocker message when loop detector tripped.

Rule: do not emit same level twice consecutively without new evidence.

## Auditing Requirements (Strict)
Each intervention log record must include:
- `timestamp`, `conversation_id`, `turn_id`, `model_id`
- `tokens_since_anchor`, `occupancy_norm`, `risk`, `trigger_threshold`
- `event_class`, `event_reason`
- `decision.inject`, `decision.level`, `reason_codes`
- `capsule_id`, `capsule_version`, `capsule_hash`
- `novelty_gate_pass`, `cooldown_state`, `loop_detector_state`
- post-turn outcome marker (`compliant`, `blocked_again`, `unknown`)

## Implementation Plan

### Phase 1: Design Freeze + Contracts
- [ ] 1.1 Define `HocusFocusConfig` schema and defaults (matching Config Contract above)
- [ ] 1.2 Define `TriggerEvent`, `RiskSnapshot`, `InterventionRecord`, `ReinjectionDecision` types
- [ ] 1.3 Freeze capsule text source + versioning/checksum strategy
- [ ] 1.4 Document strict precedence order for prompt composition
- [ ] 1.5 Encode non-negotiables as invariants in tests/docs

### Phase 2: Omnitool Hook Integration
- [ ] 2.1 Add pre-dispatch hook to compute risk snapshot
- [ ] 2.2 Add post-dispatch hook to capture outcomes + blocked events
- [ ] 2.3 Wire immutable model facts loader from `models.json` (read-only)
- [ ] 2.4 Ensure failure-safe behavior: if guard fails, request still processed without corruption

### Phase 3: Policy Engine
- [ ] 3.1 Implement token-distance primary trigger
- [ ] 3.2 Implement weighted accelerators + risk formula
- [ ] 3.3 Implement cooldown/hysteresis/novelty checks
- [ ] 3.4 Implement loop detector and escalation transitions

### Phase 4: Capsule Injection Layer
- [ ] 4.1 Build capsule catalog (micro/standard/full)
- [ ] 4.2 Implement deterministic selection rules
- [ ] 4.3 Inject metadata tag: capsule id/version/hash in audit context
- [ ] 4.4 Prevent duplicate immediate reinjection on unchanged evidence

### Phase 5: Observability + Audit
- [ ] 5.1 Log intervention reason codes and trigger evidence
- [ ] 5.2 Add counters: reinjections/100 turns, duplicate ratio, first-intervention success
- [ ] 5.3 Add report view for per-model effectiveness
- [ ] 5.4 Correlate blocked attempts and post-anchor compliance

### Phase 6: Testing + Evaluation
- [ ] 6.1 Unit tests for decision function and gates
- [ ] 6.2 Property tests for no-spam invariants (novelty + cooldown + no same-level repeat)
- [ ] 6.3 Simulation tests with synthetic long sessions
- [ ] 6.4 A/B harness: baseline vs HocusFocus
- [ ] 6.5 Regression test: token-interval reinjection continues to fire even with no blocked attempts
- [ ] 6.6 Regression test: blocked attempt alone does not force reinjection for non-critical classes

### Phase 7: Rollout Strategy
- [ ] 7.1 Feature flag (`hocus_focus.enabled`)
- [ ] 7.2 Shadow mode (log-only, no injection)
- [ ] 7.3 Gradual enable by model cohort
- [ ] 7.4 Rollback path and operator playbook

## Acceptance Criteria
- [ ] AC1: Sliding-window models receive regular token-interval reinjections per config.
- [ ] AC2: `models.json` is read-only input for immutable facts; decay policy remains extension-owned.
- [ ] AC3: Blocked attempts influence risk scoring but do not dominate unless critical severity configured.
- [ ] AC4: No repeated identical reinjection without new evidence (novelty gate enforced).
- [ ] AC5: Deadlock pattern (`block -> reinject -> block`) detected and escalated without reinjection spam.
- [ ] AC6: Audit logs contain reason codes, evidence snapshot, capsule metadata, and outcome markers.
- [ ] AC7: A/B evaluation demonstrates improved policy adherence with acceptable token overhead.

## Direct Responses to Known Integration Cons (2/3/4)
1. **False positives from blocked attempts (Con #2)**
   - Addressed via taxonomy weighting + multi-signal quorum + non-critical non-forcing behavior.
2. **Latency/complexity tax (Con #3)**
   - Addressed by deterministic lightweight scoring path and fixed contracts (not by skipping correctness checks).
3. **Policy deadlock loops (Con #4)**
   - Addressed by cooldown + hysteresis + novelty gate + loop detector + escalation ladder.

## False-Win Risks + Mitigations
1. **Looks active but no quality gain**
   - Mitigation: require adherence delta metrics, not event count.
2. **Overfitting to blocked events**
   - Mitigation: enforce multi-signal quorum and taxonomy weights.
3. **Spam through fixed cadence**
   - Mitigation: cadence + cooldown + novelty gate + escalation ladder.
4. **Capsule drift vs canonical rules**
   - Mitigation: versioned capsule registry with checksum + change review.

## Open Questions
- What default `token_interval` per model family should be seed values?
- Should critical safety classes bypass cooldown globally or only per class?
- Where should adherence scoring live (in omnitool or separate evaluator)?

## Explicitly Rejected Approach
- Using CPU/time/GPU budget limits as primary anti-spam control is rejected for this issue.
- Rationale: risk of masking logic flaws and causing missed interventions.
- Required alternative: policy-method controls (cooldown, hysteresis, novelty, escalation, loop detection).

## Dependencies
- Related: `issues/backlog/EXT-003-unified-tool-proxy.md`
- Related: guardrail policy enforcement and tool deny reason taxonomy
- Optional: telemetry enhancement for more accurate token distance estimates

## Status
PENDING
